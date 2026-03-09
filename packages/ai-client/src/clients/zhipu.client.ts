/**
 * 智谱 AI GLM 客户端实现
 *
 * 支持：
 * - GLM-4/GLM-4-Flash/GLM-3-Turbo
 * - CogView 图像生成
 * - 智谱开放平台 API
 * - 流式输出
 */

import type {
  AIProvider,
  TextGenerateParams,
  TextGenerateResult,
  ImageGenerateParams,
  ImageGenerateResult,
  VideoGenerateParams,
  VideoGenerateResult,
  AudioGenerateParams,
  AudioGenerateResult,
  StreamCallback,
  TokenUsage,
  ChatMessage,
} from '../types'
import type { AIModelConfig } from '../types'
import { BaseAIClient } from '../base'
import { createAIError } from '../errors'

/**
 * 智谱 AI GLM 客户端
 */
export class ZhipuClient extends BaseAIClient {
  private accessToken?: string
  private tokenExpiresAt?: number

  constructor(config: AIModelConfig) {
    super({
      ...config,
      baseURL: config.baseURL || 'https://open.bigmodel.cn/api/paas/v4',
    })
  }

  // ============================================================
  // 认证 Token 获取（JWT）
  // ============================================================

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      return this.accessToken
    }

    // 智谱使用 JWT 认证，需要生成 token
    const [apiKey, secretKey] = this.apiKey.split('.')
    if (!secretKey) {
      throw createAIError('AUTH_ERROR', '智谱 API Key 格式错误，应为 apiKey.secretKey 格式', {
        provider: this.provider as AIProvider,
      })
    }

    // 生成 JWT（简化版，实际建议使用官方 SDK）
    const header = { alg: 'HS256', sign_type: 'SIGN', typ: 'JWT' }
    const payload = {
      api_key: apiKey,
      exp: Date.now() + 3600000, // 1 小时
      timestamp: Date.now(),
    }

    // 实际签名需要使用 HMAC-SHA256
    const signature = await this.signJWT(header, payload, secretKey)

    const token = `${this.base64UrlEncode(JSON.stringify(header))}.${this.base64UrlEncode(JSON.stringify(payload))}.${signature}`
    this.accessToken = token
    this.tokenExpiresAt = Date.now() + 3300000 // 55 分钟

    return this.accessToken
  }

  private async signJWT(header: unknown, payload: unknown, secret: string): Promise<string> {
    const headerB64 = this.base64UrlEncode(JSON.stringify(header))
    const payloadB64 = this.base64UrlEncode(JSON.stringify(payload))
    const toSign = `${headerB64}.${payloadB64}`

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(toSign))
    return this.arrayBufferToBase64Url(signature)
  }

  private base64UrlEncode(str: string): string {
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  private arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  // ============================================================
  // 文本生成
  // ============================================================

  async generateText(
    params: TextGenerateParams,
    onStream?: StreamCallback
  ): Promise<TextGenerateResult> {
    return this.withRetry(async () => {
      const { messages, stream, temperature, maxTokens, topP } = params
      const token = await this.getAccessToken()

      const body: Record<string, unknown> = {
        model: this.modelId || 'glm-4',
        messages: this.normalizeMessages(messages),
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens,
        top_p: topP,
        stream: stream ?? false,
      }

      if (stream && onStream) {
        return this.handleTextStream(body, token, onStream)
      }

      const response = await fetch(this.getAbsoluteURL('/chat/completions'), {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        signal: this.createAbortController().controller.signal,
      })

      await this.validateResponse(response)

      const data = await response.json()
      return this.parseTextResponse(data)
    })
  }

  /**
   * 处理文本流式输出
   */
  private async handleTextStream(
    body: Record<string, unknown>,
    token: string,
    onStream: StreamCallback
  ): Promise<TextGenerateResult> {
    const response = await fetch(this.getAbsoluteURL('/chat/completions'), {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ ...body, stream: true }),
      signal: this.createAbortController().controller.signal,
    })

    await this.validateResponse(response)

    let accumulatedText = ''
    let usage: TokenUsage | undefined

    await this.handleStreamResponse(
      response,
      (chunk) => {
        const lines = chunk.split('\n').filter((line) => line.trim())

        for (const line of lines) {
          if (!line.startsWith('data:')) continue

          const dataStr = line.slice(5).trim()
          if (dataStr === '[DONE]') continue

          try {
            const data = JSON.parse(dataStr)
            const choices = data.choices as Array<Record<string, unknown>> | undefined

            if (choices && choices.length > 0) {
              const delta = choices[0].delta as Record<string, unknown> | undefined
              if (delta?.content && typeof delta.content === 'string') {
                accumulatedText += delta.content
                onStream({ type: 'text', content: delta.content })
              }

              const usageData = data.usage as Record<string, unknown> | undefined
              if (usageData) {
                usage = {
                  promptTokens: Number(usageData.prompt_tokens) || 0,
                  completionTokens: Number(usageData.completion_tokens) || 0,
                  totalTokens: Number(usageData.total_tokens) || 0,
                }
              }
            }
          } catch {
            // 忽略解析错误
          }
        }
      },
      this.createAbortController().signal
    )

    onStream({
      type: 'done',
      usage,
    })

    return {
      text: accumulatedText,
      usage: usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    }
  }

  /**
   * 解析文本响应
   */
  private parseTextResponse(data: Record<string, unknown>): TextGenerateResult {
    const choices = data.choices as Array<Record<string, unknown>> | undefined
    if (!choices || choices.length === 0) {
      throw createAIError('EMPTY_RESPONSE', 'GLM 未返回任何内容', {
        provider: this.provider as AIProvider,
      })
    }

    const message = choices[0].message as Record<string, unknown> | undefined
    const text = (message?.content as string) || ''

    const usageData = data.usage as Record<string, unknown> | undefined
    const usage: TokenUsage = {
      promptTokens: Number(usageData?.prompt_tokens) || 0,
      completionTokens: Number(usageData?.completion_tokens) || 0,
      totalTokens: Number(usageData?.total_tokens) || 0,
    }

    return {
      text,
      usage,
      rawResponse: data,
      requestId: data.id as string | undefined,
    }
  }

  /**
   * 标准化消息格式
   */
  private normalizeMessages(messages: ChatMessage[]): Array<Record<string, unknown>> {
    return messages.map((msg) => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content :
        msg.content.map((item) => item.type === 'text' ? item.text : '[Image]').join(''),
    }))
  }

  // ============================================================
  // 图像生成 (CogView)
  // ============================================================

  async generateImage(params: ImageGenerateParams): Promise<ImageGenerateResult> {
    return this.withRetry(async () => {
      const token = await this.getAccessToken()
      const { prompt, aspectRatio, resolution, n = 1 } = params

      const body: Record<string, unknown> = {
        model: this.modelId || 'cogview-3',
        prompt,
        n,
        size: this.mapAspectRatioToSize(aspectRatio, resolution),
      }

      const response = await fetch(this.getAbsoluteURL('/images/generations'), {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        signal: this.createAbortController().controller.signal,
      })

      await this.validateResponse(response)

      const data = await response.json()
      const imageData = data.data?.[0] as Record<string, unknown> | undefined

      if (!imageData) {
        throw createAIError('EMPTY_RESPONSE', 'CogView 未返回图像', {
          provider: this.provider as AIProvider,
        })
      }

      return {
        success: true,
        imageUrl: imageData.url as string | undefined,
        imageBase64: imageData.b64_json as string | undefined,
      }
    })
  }

  /**
   * 映射宽高比到尺寸
   */
  private mapAspectRatioToSize(aspectRatio?: string, resolution?: string): string {
    // CogView 支持的尺寸：1024x1024, 1024x1792, 1792x1024
    switch (aspectRatio) {
      case '16:9':
        return resolution === '4K' ? '1792x1024' : '1024x1024'
      case '9:16':
        return resolution === '4K' ? '1024x1792' : '1024x1024'
      case '1:1':
      default:
        return '1024x1024'
    }
  }

  // ============================================================
  // 视频生成 - 不支持
  // ============================================================

  async generateVideo(_params: VideoGenerateParams): Promise<VideoGenerateResult> {
    return {
      success: false,
      error: 'GLM 不支持视频生成',
    }
  }

  // ============================================================
  // 语音生成 - 不支持
  // ============================================================

  async generateAudio(_params: AudioGenerateParams): Promise<AudioGenerateResult> {
    return {
      success: false,
      error: 'GLM 不支持语音生成',
    }
  }
}
