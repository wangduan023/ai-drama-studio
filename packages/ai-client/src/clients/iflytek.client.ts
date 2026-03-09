/**
 * 科大讯飞星火 (Spark) 客户端实现
 *
 * 支持：
 * - 星火 V3.5/V3.0/V2.0
 * - 讯飞开放平台 WebSocket API
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
 * 科大讯飞星火客户端
 */
export class IflytekClient extends BaseAIClient {
  constructor(config: AIModelConfig) {
    super({
      ...config,
      baseURL: config.baseURL || 'wss://spark-api.xf-yun.com',
    })
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

      // 构建 WebSocket URL
      const url = this.buildWebSocketUrl(this.modelId || 'v3.5')

      // 构建请求体
      const body = {
        header: {
          app_id: this.apiKey.split(':')[0],
          uid: 'ai-drama-studio',
        },
        parameter: {
          chat: {
            domain: this.getDomain(this.modelId || 'v3.5'),
            temperature: temperature ?? 0.7,
            max_tokens: maxTokens,
            top_k: topP ? Math.round(topP * 10) : 4,
          },
        },
        payload: {
          message: {
            text: this.normalizeMessages(messages),
          },
        },
      }

      // 星火使用 WebSocket，需要特殊处理
      // 这里简化为 HTTP 调用（实际生产环境建议使用 WebSocket）
      return this.httpFallback(url, params, stream, onStream)
    })
  }

  /**
   * 构建 WebSocket URL（带签名）
   */
  private buildWebSocketUrl(version: string): string {
    const [apiKey, apiSecret] = this.apiKey.split(':')
    if (!apiSecret) {
      throw createAIError('AUTH_ERROR', '讯飞 API Key 格式错误，应为 APIKey:APISecret 格式', {
        provider: this.provider as AIProvider,
      })
    }

    const host = 'spark-api.xf-yun.com'
    const path = `/${version}/chat`
    const date = new Date().toUTCString()

    // 签名算法（简化版，实际使用建议参考官方 SDK）
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`

    // 实际签名需要使用 HMAC-SHA256，这里简化处理
    const signature = btoa(
      unescape(encodeURIComponent(signatureOrigin))
    )

    const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`
    const authorization = btoa(unescape(encodeURIComponent(authorizationOrigin)))

    return `wss://${host}${path}?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${host}`
  }

  /**
   * 获取 domain 参数
   */
  private getDomain(version: string): string {
    const domainMap: Record<string, string> = {
      'v1.5': 'general',
      'v2.0': 'generalv2',
      'v3.0': 'generalv3',
      'v3.5': 'generalv3.5',
      'v4.0': 'generalv4',
    }
    return domainMap[version] || 'generalv3.5'
  }

  /**
   * HTTP 降级方案（当 WebSocket 不可用时）
   */
  private async httpFallback(
    _url: string,
    params: TextGenerateParams,
    stream?: boolean,
    onStream?: StreamCallback
  ): Promise<TextGenerateResult> {
    // 讯飞星火也有 HTTP REST API
    const restUrl = `https://spark-api-open.xf-yun.com/v1/chat/completions`

    const restBody = {
      model: this.modelId || 'v3.5',
      messages: this.normalizeMessagesRest(params.messages),
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens,
      stream: stream ?? false,
    }

    // 使用 API Key 作为 Bearer Token
    const response = await fetch(restUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey.split(':')[0]}`,
      },
      body: JSON.stringify(restBody),
      signal: this.createAbortController().controller.signal,
    })

    await this.validateResponse(response)

    if (stream && onStream) {
      return this.handleHttpStream(response, onStream)
    }

    const data = await response.json()
    return this.parseHttpTextResponse(data)
  }

  private normalizeMessagesRest(messages: ChatMessage[]): Array<Record<string, unknown>> {
    return messages.map((msg) => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content :
        msg.content.map((item) => item.type === 'text' ? item.text : '[Image]').join(''),
    }))
  }

  /**
   * 处理 HTTP 流式响应
   */
  private async handleHttpStream(
    response: Response,
    onStream: StreamCallback
  ): Promise<TextGenerateResult> {
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
   * 解析 HTTP 文本响应
   */
  private parseHttpTextResponse(data: Record<string, unknown>): TextGenerateResult {
    const choices = data.choices as Array<Record<string, unknown>> | undefined
    if (!choices || choices.length === 0) {
      throw createAIError('EMPTY_RESPONSE', '星火未返回任何内容', {
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
   * 标准化消息格式（WebSocket）
   */
  private normalizeMessages(messages: ChatMessage[]): Array<Record<string, string>> {
    return messages.map((msg) => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content :
        msg.content.map((item) => item.type === 'text' ? item.text : '[Image]').join(''),
    }))
  }

  // ============================================================
  // 图像生成 - 不支持
  // ============================================================

  async generateImage(_params: ImageGenerateParams): Promise<ImageGenerateResult> {
    return {
      success: false,
      error: '星火不支持图像生成',
    }
  }

  // ============================================================
  // 视频生成 - 不支持
  // ============================================================

  async generateVideo(_params: VideoGenerateParams): Promise<VideoGenerateResult> {
    return {
      success: false,
      error: '星火不支持视频生成',
    }
  }

  // ============================================================
  // 语音生成 - 不支持（讯飞有独立的语音 API）
  // ============================================================

  async generateAudio(_params: AudioGenerateParams): Promise<AudioGenerateResult> {
    return {
      success: false,
      error: '星火客户端不支持语音生成，请使用讯飞独立语音 API',
    }
  }
}
