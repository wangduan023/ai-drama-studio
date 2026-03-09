/**
 * Mistral AI 客户端实现
 *
 * 支持:
 * - Mistral Large/Large 2
 * - Mistral Medium/Small
 * - Codestral (代码专用)
 * - Pixtral (多模态)
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
 * Mistral AI 客户端
 */
export class MistralClient extends BaseAIClient {
  constructor(config: AIModelConfig) {
    super({
      ...config,
      baseURL: config.baseURL || 'https://api.mistral.ai/v1',
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

      const body: Record<string, unknown> = {
        model: this.modelId || 'mistral-large-latest',
        messages: this.normalizeMessages(messages),
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens,
        top_p: topP,
        stop,
        stream: stream ?? false,
      }

      // 流式输出
      if (stream && onStream) {
        return this.handleTextStream(body, onStream)
      }

      // 非流式输出
      const response = await fetch(this.getAbsoluteURL('/chat/completions'), {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Authorization': `Bearer ${this.apiKey}`,
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
    body: Record<string, unknown>,
    onStream: StreamCallback
  ): Promise<TextGenerateResult> {
    const response = await fetch(this.getAbsoluteURL('/chat/completions'), {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Authorization': `Bearer ${this.apiKey}`,
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
      throw createAIError('EMPTY_RESPONSE', 'Mistral 未返回任何内容', {
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
      name: msg.name,
    }))
  }

  // ============================================================
  // 图像生成 - 不支持 (Mistral 有 Pixtral 多模态但不直接生成图像)
  // ============================================================

  async generateImage(_params: ImageGenerateParams): Promise<ImageGenerateResult> {
    return {
      success: false,
      error: 'Mistral AI 不支持图像生成，请使用 Pixtral 进行图像理解',
    }
  }

  // ============================================================
  // 视频生成 - 不支持
  // ============================================================

  async generateVideo(_params: VideoGenerateParams): Promise<VideoGenerateResult> {
    return {
      success: false,
      error: 'Mistral AI 不支持视频生成',
    }
  }

  // ============================================================
  // 语音生成 - 不支持
  // ============================================================

  async generateAudio(_params: AudioGenerateParams): Promise<AudioGenerateResult> {
    return {
      success: false,
      error: 'Mistral AI 不支持语音生成',
    }
  }
}
