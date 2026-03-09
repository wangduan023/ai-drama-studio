/**
 * DeepSeek 客户端实现
 *
 * 支持：
 * - DeepSeek-V3, DeepSeek-R1 (推理模型)
 * - OpenAI 兼容的 API 格式
 * - 流式输出
 * - 推理过程展示 (R1 模型)
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
 * DeepSeek 客户端
 */
export class DeepSeekClient extends BaseAIClient {
  constructor(config: AIModelConfig) {
    super({
      ...config,
      baseURL: config.baseURL || 'https://api.deepseek.com/v1',
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
      const { messages, stream, temperature, maxTokens, topP, frequencyPenalty, presencePenalty, stop } = params

      // 构建请求体
      const body: Record<string, unknown> = {
        model: this.modelId,
        messages: this.normalizeMessages(messages),
        stream: stream ?? false,
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        stop,
      }

      // DeepSeek-R1 支持推理输出
      if (this.modelId.includes('r1') || this.modelId.includes('R1')) {
        body.stream_options = stream ? { include_usage: true } : undefined
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
    let accumulatedReasoning = ''
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

          // 处理推理内容（R1 模型）
          if (delta.reasoning_content && typeof delta.reasoning_content === 'string') {
            accumulatedReasoning += delta.reasoning_content
            onStream({ type: 'reasoning', content: delta.reasoning_content })
          }

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
      reasoning: accumulatedReasoning || undefined,
      usage: usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    }
  }

  /**
   * 解析文本响应
   */
  private parseTextResponse(data: Record<string, unknown>): TextGenerateResult {
    const choices = data.choices as Array<Record<string, unknown>> | undefined
    if (!choices || choices.length === 0) {
      throw createAIError('EMPTY_RESPONSE', 'DeepSeek 未返回任何内容', { provider: this.provider })
    }

    const message = choices[0].message as Record<string, unknown> | undefined
    if (!message) {
      throw createAIError('EMPTY_RESPONSE', 'DeepSeek 未返回消息', { provider: this.provider })
    }

    const text = (message.content as string) || ''
    const reasoning = message.reasoning_content as string | undefined

    const usageData = data.usage as Record<string, unknown> | undefined
    const usage: TokenUsage = {
      promptTokens: Number(usageData?.prompt_tokens) || 0,
      completionTokens: Number(usageData?.completion_tokens) || 0,
      totalTokens: Number(usageData?.total_tokens) || 0,
    }

    return {
      text,
      reasoning,
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
  // 图像生成 - 不支持
  // ============================================================

  async generateImage(_params: ImageGenerateParams): Promise<ImageGenerateResult> {
    return {
      success: false,
      error: 'DeepSeek 不支持图像生成',
    }
  }

  // ============================================================
  // 视频生成 - 不支持
  // ============================================================

  async generateVideo(_params: VideoGenerateParams): Promise<VideoGenerateResult> {
    return {
      success: false,
      error: 'DeepSeek 不支持视频生成',
    }
  }

  // ============================================================
  // 语音生成 - 不支持
  // ============================================================

  async generateAudio(_params: AudioGenerateParams): Promise<AudioGenerateResult> {
    return {
      success: false,
      error: 'DeepSeek 不支持语音生成',
    }
  }
}
