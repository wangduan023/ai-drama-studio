/**
 * 商汤科技 (SenseTime) 客户端实现
 *
 * 支持:
 * - 日日新 SenseNova 大模型
 * - SenseChat 文本生成
 * - SenseVision 图像生成
 * - 商汤开放平台 API
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
 * 商汤科技客户端
 */
export class SenseTimeClient extends BaseAIClient {
  private accessToken?: string
  private tokenExpiresAt?: number

  constructor(config: AIModelConfig) {
    super({
      ...config,
      baseURL: config.baseURL || 'https://api.sensetime.com',
    })
  }

  // ============================================================
  // 认证 Token 获取
  // ============================================================

  private async getAccessToken(): Promise<string> {
    // 如果 token 有效，直接返回
    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      return this.accessToken
    }

    // 从 API Key 获取 token (API Key:SecretKey 格式)
    const [apiKey, secretKey] = this.apiKey.split(':')
    if (!secretKey) {
      throw createAIError('AUTH_ERROR', '商汤 API Key 格式错误，应为 APIKey:SecretKey 格式', {
        provider: this.provider as AIProvider,
      })
    }

    const response = await fetch(
      `https://api.sensetime.com/oauth/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: apiKey,
          client_secret: secretKey,
        }),
      }
    )

    const data = await response.json()
    if (!data.access_token) {
      throw createAIError('AUTH_ERROR', data.error_description || '获取商汤 Access Token 失败', {
        provider: this.provider as AIProvider,
      })
    }

    this.accessToken = data.access_token
    // token 有效期通常 24 小时，提前 5 分钟刷新
    this.tokenExpiresAt = Date.now() + (Number(data.expires_in) - 300) * 1000

    return this.accessToken!
  }

  // ============================================================
  // 文本生成
  // ============================================================

  async generateText(
    params: TextGenerateParams,
    onStream?: StreamCallback
  ): Promise<TextGenerateResult> {
    return this.withRetry(async () => {
      const { messages, stream, temperature, maxTokens, topP, stop } = params
      const accessToken = await this.getAccessToken()

      const body: Record<string, unknown> = {
        model: this.modelId || 'sensechat-5',
        messages: this.normalizeMessages(messages),
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens,
        top_p: topP,
        stop,
        stream: stream ?? false,
      }

      // 流式输出
      if (stream && onStream) {
        return this.handleTextStream(`${accessToken}`, body, onStream)
      }

      // 非流式输出
      const response = await fetch(this.getAbsoluteURL('/v1/chat/completions'), {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
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
    accessToken: string,
    body: Record<string, unknown>,
    onStream: StreamCallback
  ): Promise<TextGenerateResult> {
    const response = await fetch(this.getAbsoluteURL('/v1/chat/completions'), {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
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

              // 使用统计
              if (data.usage) {
                usage = {
                  promptTokens: Number(data.usage.prompt_tokens) || 0,
                  completionTokens: Number(data.usage.completion_tokens) || 0,
                  totalTokens: Number(data.usage.total_tokens) || 0,
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
      throw createAIError('EMPTY_RESPONSE', '商汤日日新未返回任何内容', {
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
      content: msg.content,
    }))
  }

  // ============================================================
  // 图像生成
  // ============================================================

  async generateImage(params: ImageGenerateParams): Promise<ImageGenerateResult> {
    return this.withRetry(async () => {
      const { prompt, negativePrompt, resolution, aspectRatio, n = 1 } = params
      const accessToken = await this.getAccessToken()

      // 解析分辨率
      const [width, height] = this.parseResolution(resolution, aspectRatio)

      const body: Record<string, unknown> = {
        model: this.modelId || 'sensevision',
        prompt,
        negative_prompt: negativePrompt,
        width,
        height,
        n,
      }

      const response = await fetch(this.getAbsoluteURL('/v1/images/generations'), {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: this.createAbortController().controller.signal,
      })

      await this.validateResponse(response)

      const data = await response.json()
      return this.parseImageResponse(data)
    })
  }

  /**
   * 解析图像响应
   */
  private parseImageResponse(data: Record<string, unknown>): ImageGenerateResult {
    const images = data.images as Array<Record<string, unknown>> | undefined
    if (!images || images.length === 0) {
      return {
        success: false,
        error: '商汤日日新未返回任何图片',
      }
    }

    const imageUrl = images[0].url as string | undefined
    const imageBase64 = images[0].image_base64 as string | undefined

    return {
      success: true,
      imageUrl,
      imageBase64,
      requestId: data.request_id as string | undefined,
    }
  }

  /**
   * 解析分辨率
   */
  private parseResolution(resolution?: string, aspectRatio?: string): [number, number] {
    if (resolution) {
      const [w, h] = resolution.split('x').map(Number)
      if (w && h) return [w, h]
    }

    // 默认 1024x1024
    switch (aspectRatio) {
      case '16:9':
        return [1024, 576]
      case '9:16':
        return [576, 1024]
      case '4:3':
        return [1024, 768]
      case '3:4':
        return [768, 1024]
      case '1:1':
      default:
        return [1024, 1024]
    }
  }

  // ============================================================
  // 视频生成
  // ============================================================

  async generateVideo(params: VideoGenerateParams): Promise<VideoGenerateResult> {
    return {
      success: false,
      error: '商汤日日新视频生成请使用 SenseVideo API',
    }
  }

  // ============================================================
  // 语音生成 - 不支持
  // ============================================================

  async generateAudio(_params: AudioGenerateParams): Promise<AudioGenerateResult> {
    return {
      success: false,
      error: '商汤日日新不支持语音生成',
    }
  }
}
