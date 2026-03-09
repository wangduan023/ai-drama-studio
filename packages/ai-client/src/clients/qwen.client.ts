/**
 * 阿里云 Qwen 客户端实现
 *
 * 支持：
 * - Qwen2.5, Qwen-Max, Qwen-Plus
 * - 通义万相图像生成
 * - 流式输出
 * - 多模态输入
 */

import type {
  AIModelConfig,
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
import { BaseAIClient } from '../base'
import { createAIError } from '../errors'

/**
 * 阿里云 Qwen 客户端
 */
export class QwenClient extends BaseAIClient {
  constructor(config: AIModelConfig) {
    super({
      ...config,
      baseURL: config.baseURL || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
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
      const { messages, stream, temperature, maxTokens, topP, stop } = params

      // 构建请求体
      const body: Record<string, unknown> = {
        model: this.modelId,
        messages: this.normalizeMessages(messages),
        stream: stream ?? false,
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens,
        top_p: topP,
        stop,
      }

      // 流式输出
      if (stream && onStream) {
        return this.handleTextStream(body, onStream)
      }

      // 非流式输出
      const response = await fetch(this.getAbsoluteURL('/chat/completions'), {
        method: 'POST',
        headers: this.getHeaders({
          'Authorization': `Bearer ${this.apiKey}`,
        }),
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
    onStream: StreamCallback
  ): Promise<TextGenerateResult> {
    const response = await fetch(this.getAbsoluteURL('/chat/completions'), {
      method: 'POST',
      headers: this.getHeaders({
        'Authorization': `Bearer ${this.apiKey}`,
      }),
      body: JSON.stringify(body),
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
          const parsed = this.parseSSELine(line)
          if (!parsed?.data) continue

          const data = this.parseSSEData(parsed.data)
          if (!data || typeof data !== 'object') continue

          const choices = (data as Record<string, unknown>).choices as Array<Record<string, unknown>> | undefined
          if (!choices || choices.length === 0) continue

          const choice = choices[0]
          if (!choice || typeof choice !== 'object') continue

          const delta = choice.delta as Record<string, unknown> | undefined
          if (!delta) continue

          // 处理正常内容
          if (delta.content && typeof delta.content === 'string') {
            accumulatedText += delta.content
            onStream({ type: 'text', content: delta.content })
          }

          // 处理 finish_reason
          const finishReason = (choice as Record<string, unknown>).finish_reason
          if (finishReason === 'stop' || finishReason === 'length') {
            // 处理 token 使用统计
            const usageData = (data as Record<string, unknown>).usage as Record<string, unknown> | undefined
            if (usageData) {
              usage = {
                promptTokens: Number(usageData.prompt_tokens) || 0,
                completionTokens: Number(usageData.completion_tokens) || 0,
                totalTokens: Number(usageData.total_tokens) || 0,
              }
            }
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
      throw createAIError('EMPTY_RESPONSE', 'Qwen 未返回任何内容', { provider: this.provider })
    }

    const message = choices[0].message as Record<string, unknown> | undefined
    if (!message) {
      throw createAIError('EMPTY_RESPONSE', 'Qwen 未返回消息', { provider: this.provider })
    }

    const text = (message.content as string) || ''

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
    return messages.map((msg) => {
      const normalized: Record<string, unknown> = {
        role: msg.role,
      }

      if (typeof msg.content === 'string') {
        normalized.content = msg.content
      } else {
        normalized.content = msg.content.map((item) => {
          if (item.type === 'text') {
            return { type: 'text', text: item.text }
          }
          // Qwen 支持多模态输入
          return {
            type: 'image_url',
            image_url: { url: item.image_url.url },
          }
        })
      }

      if (msg.name) {
        normalized.name = msg.name
      }

      return normalized
    })
  }

  // ============================================================
  // 图像生成 (通义万相)
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

      // 映射宽高比
      const size = this.mapAspectRatioToSize(aspectRatio, resolution)

      const body: Record<string, unknown> = {
        model: this.modelId || 'wanx-v1',
        prompt,
        negative_prompt: negativePrompt,
        n,
        size,
      }

      const response = await fetch(this.getAbsoluteURL('/images/generations'), {
        method: 'POST',
        headers: this.getHeaders({
          'Authorization': `Bearer ${this.apiKey}`,
        }),
        body: JSON.stringify(body),
        signal: this.createAbortController().controller.signal,
      })

      await this.validateResponse(response)

      const data = await response.json()

      // 通义万相返回格式
      const output = data.output as Record<string, unknown> | undefined
      const results = output?.results as Array<Record<string, unknown>> | undefined

      if (!results || results.length === 0) {
        throw createAIError('EMPTY_RESPONSE', 'Qwen 未返回图像', { provider: this.provider })
      }

      return {
        success: true,
        imageUrl: results[0].url as string | undefined,
      }
    })
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
      error: 'Qwen 不支持视频生成',
    }
  }

  // ============================================================
  // 语音生成 - 不支持
  // ============================================================

  async generateAudio(_params: AudioGenerateParams): Promise<AudioGenerateResult> {
    return {
      success: false,
      error: 'Qwen 不支持语音生成',
    }
  }
}
