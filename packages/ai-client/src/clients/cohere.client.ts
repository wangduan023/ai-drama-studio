/**
 * Cohere 客户端实现
 *
 * 支持:
 * - Command R/R+
 * - Command Light
 * - RAG 优化
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
 * Cohere 客户端
 */
export class CohereClient extends BaseAIClient {
  constructor(config: AIModelConfig) {
    super({
      ...config,
      baseURL: config.baseURL || 'https://api.cohere.ai/v1',
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

      // Cohere API 格式
      const body: Record<string, unknown> = {
        model: this.modelId || 'command-r-plus',
        message: this.extractUserMessage(messages),
        chat_history: this.normalizeChatHistory(messages),
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens,
        p: topP,
        stop_sequences: stop,
        stream: stream ?? false,
      }

      // 流式输出
      if (stream && onStream) {
        return this.handleTextStream(body, onStream)
      }

      // 非流式输出
      const response = await fetch(this.getAbsoluteURL('/chat'), {
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
    const response = await fetch(this.getAbsoluteURL('/chat'), {
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

            // Cohere 流式响应格式
            if (data.event_type === 'text-generation') {
              const text = data.text as string
              if (text) {
                accumulatedText += text
                onStream({ type: 'text', content: text })
              }
            }

            // 使用统计
            if (data.response && data.response.meta && data.response.meta.tokens) {
              const tokens = data.response.meta.tokens
              usage = {
                promptTokens: Number(tokens.input_tokens) || 0,
                completionTokens: Number(tokens.output_tokens) || 0,
                totalTokens: Number(tokens.total_tokens) || 0,
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
    const text = (data.text as string) || ''
    if (!text) {
      throw createAIError('EMPTY_RESPONSE', 'Cohere 未返回任何内容', {
        provider: this.provider as AIProvider,
      })
    }

    const usage: TokenUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    }

    const meta = data.meta as Record<string, unknown> | undefined
    if (meta?.tokens) {
      const tokens = meta.tokens as Record<string, unknown>
      usage.promptTokens = Number(tokens.input_tokens) || 0
      usage.completionTokens = Number(tokens.output_tokens) || 0
      usage.totalTokens = Number(tokens.total_tokens) || 0
    }

    return {
      text,
      usage,
      rawResponse: data,
      requestId: data.response_id as string | undefined,
    }
  }

  /**
   * 提取用户消息
   */
  private extractUserMessage(messages: ChatMessage[]): string {
    const userMessage = messages.find((m) => m.role === 'user')
    if (!userMessage) return ''
    return typeof userMessage.content === 'string' ? userMessage.content : ''
  }

  /**
   * 标准化聊天历史
   */
  private normalizeChatHistory(messages: ChatMessage[]): Array<Record<string, string>> {
    return messages
      .filter((m) => m.role !== 'system')
      .map((msg) => ({
        role: msg.role === 'assistant' ? 'CHATBOT' : 'USER',
        message: typeof msg.content === 'string' ? msg.content : '[Content]',
      }))
  }

  // ============================================================
  // 图像生成 - 不支持
  // ============================================================

  async generateImage(_params: ImageGenerateParams): Promise<ImageGenerateResult> {
    return {
      success: false,
      error: 'Cohere 不支持图像生成',
    }
  }

  // ============================================================
  // 视频生成 - 不支持
  // ============================================================

  async generateVideo(_params: VideoGenerateParams): Promise<VideoGenerateResult> {
    return {
      success: false,
      error: 'Cohere 不支持视频生成',
    }
  }

  // ============================================================
  // 语音生成 - 不支持
  // ============================================================

  async generateAudio(_params: AudioGenerateParams): Promise<AudioGenerateResult> {
    return {
      success: false,
      error: 'Cohere 不支持语音生成',
    }
  }
}
