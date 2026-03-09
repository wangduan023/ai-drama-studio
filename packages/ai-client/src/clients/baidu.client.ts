/**
 * 百度文心一言 (ERNIE Bot) 客户端实现
 *
 * 支持：
 * - 文心一言 4.0/3.5/4.0-turbo
 * - 千帆大模型平台 API
 * - 流式输出
 * - 多模态输入
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
 * 百度文心一言客户端
 */
export class BaiduClient extends BaseAIClient {
  private accessToken?: string
  private tokenExpiresAt?: number

  constructor(config: AIModelConfig) {
    super({
      ...config,
      baseURL: config.baseURL || 'https://qianfan.baidubce.com',
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

    // 从 API Key 和 Secret Key 获取 token
    const [apiKey, secretKey] = this.apiKey.split(':')
    if (!secretKey) {
      throw createAIError('AUTH_ERROR', '百度 API Key 格式错误，应为 apiKey:secretKey 格式', {
        provider: this.provider as AIProvider,
      })
    }

    const response = await fetch(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`,
      { method: 'POST' }
    )

    const data = await response.json()
    if (!data.access_token) {
      throw createAIError('AUTH_ERROR', data.error_description || '获取百度 Access Token 失败', {
        provider: this.provider as AIProvider,
      })
    }

    this.accessToken = data.access_token
    // token 有效期通常 30 天，提前 5 分钟刷新
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

      // 构建请求体
      const body: Record<string, unknown> = {
        messages: this.normalizeMessages(messages),
        temperature: temperature ?? 0.7,
        max_output_tokens: maxTokens,
        top_p: topP,
        stop,
      }

      const modelId = this.modelId || 'ernie-4.0-turbo-8k'
      const endpoint = `/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/${modelId}`

      // 流式输出
      if (stream && onStream) {
        return this.handleTextStream(`${endpoint}?access_token=${accessToken}`, body, onStream)
      }

      // 非流式输出
      const response = await fetch(this.getAbsoluteURL(`${endpoint}?access_token=${accessToken}`), {
        method: 'POST',
        headers: this.getHeaders(),
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
    endpoint: string,
    body: Record<string, unknown>,
    onStream: StreamCallback
  ): Promise<TextGenerateResult> {
    const response = await fetch(this.getAbsoluteURL(endpoint), {
      method: 'POST',
      headers: this.getHeaders(),
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

            // 千帆返回格式
            const result = data.result as string | undefined
            if (result) {
              accumulatedText += result
              onStream({ type: 'text', content: result })
            }

            // 处理 token 使用统计
            if (data.usage) {
              usage = {
                promptTokens: Number(data.usage.prompt_tokens) || 0,
                completionTokens: Number(data.usage.completion_tokens) || 0,
                totalTokens: Number(data.usage.total_tokens) || 0,
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
    const result = data.result as string | undefined
    if (!result) {
      throw createAIError('EMPTY_RESPONSE', '文心一言未返回任何内容', {
        provider: this.provider as AIProvider,
      })
    }

    const usageData = data.usage as Record<string, unknown> | undefined
    const usage: TokenUsage = {
      promptTokens: Number(usageData?.prompt_tokens) || 0,
      completionTokens: Number(usageData?.completion_tokens) || 0,
      totalTokens: Number(usageData?.total_tokens) || 0,
    }

    return {
      text: result,
      usage,
      rawResponse: data,
      requestId: data.id as string | undefined,
    }
  }

  /**
   * 标准化消息格式
   */
  private normalizeMessages(messages: ChatMessage[]): Array<Record<string, unknown>> {
    return messages.map((msg) => {
      const normalized: Record<string, unknown> = {
        role: msg.role === 'assistant' ? 'assistant' : 'user',
      }

      if (typeof msg.content === 'string') {
        normalized.content = msg.content
      } else {
        // 多模态内容
        const content: Array<Record<string, unknown>> = []
        for (const item of msg.content) {
          if (item.type === 'text') {
            content.push({ type: 'text', text: item.text })
          } else if (item.type === 'image_url') {
            content.push({ type: 'image', image_url: item.image_url.url })
          }
        }
        normalized.content = content
      }

      return normalized
    })
  }

  // ============================================================
  // 图像生成 (百度文心一格)
  // ============================================================

  async generateImage(params: ImageGenerateParams): Promise<ImageGenerateResult> {
    return this.withRetry(async () => {
      const {
        prompt,
        negativePrompt,
        aspectRatio,
        resolution,
        n = 1,
      } = params
      const accessToken = await this.getAccessToken()

      // 映射宽高比到尺寸
      const size = this.mapAspectRatioToSize(aspectRatio, resolution)
      const [width, height] = size.split('x').map(Number)

      // 文心一格 API
      const body: Record<string, unknown> = {
        prompt,
        negative_prompt: negativePrompt,
        width,
        height,
        n,
        model: this.modelId || 'sd-xl',
      }

      const response = await fetch(
        `https://aip.baidubce.com/rpc/2.0/ernievilg/v1/txt2imgv2?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: this.getHeaders({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(body),
          signal: this.createAbortController().controller.signal,
        }
      )

      await this.validateResponse(response)

      const data = await response.json()
      return this.parseImageResponse(data)
    })
  }

  /**
   * 解析图像响应
   */
  private parseImageResponse(data: Record<string, unknown>): ImageGenerateResult {
    const subTaskResult = data.data as Record<string, unknown> | undefined
    if (!subTaskResult) {
      return {
        success: false,
        error: '百度文心一格未返回任何内容',
      }
    }

    const imgUrls = subTaskResult.imgUrls as string[] | undefined
    if (!imgUrls || imgUrls.length === 0) {
      return {
        success: false,
        error: '百度文心一格未返回任何图片',
      }
    }

    return {
      success: true,
      imageUrl: imgUrls[0],
      requestId: data.log_id as string | undefined,
    }
  }

  /**
   * 映射宽高比到尺寸
   */
  private mapAspectRatioToSize(aspectRatio?: string, resolution?: string): string {
    const isHD = resolution === '4K' || resolution === '2K'

    switch (aspectRatio) {
      case '16:9':
        return isHD ? '1920x1080' : '1280x720'
      case '9:16':
        return isHD ? '1080x1920' : '720x1280'
      case '4:3':
        return isHD ? '1600x1200' : '1024x768'
      case '3:4':
        return isHD ? '1200x1600' : '768x1024'
      case '1:1':
      default:
        return isHD ? '1024x1024' : '512x512'
    }
  }

  // ============================================================
  // 视频生成 - 不支持
  // ============================================================

  async generateVideo(_params: VideoGenerateParams): Promise<VideoGenerateResult> {
    return {
      success: false,
      error: '文心一言不支持视频生成',
    }
  }

  // ============================================================
  // 语音生成 - 不支持
  // ============================================================

  async generateAudio(_params: AudioGenerateParams): Promise<AudioGenerateResult> {
    return {
      success: false,
      error: '文心一言不支持语音生成',
    }
  }
}
