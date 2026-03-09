/**
 * Anthropic 客户端实现
 *
 * 支持：
 * - Claude 3, Claude 3.5, Claude 3.7 系列模型
 * - 流式输出
 * - 图像输入（Vision）
 * - 长篇上下文（200K tokens）
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
  MessageContent,
} from '../types'
import { BaseAIClient } from '../base'
import { createAIError } from '../errors'

/**
 * Anthropic 客户端
 */
export class AnthropicClient extends BaseAIClient {
  /** API 版本 */
  private readonly apiVersion: string

  constructor(config: AIModelConfig, apiVersion: string = '2023-06-01') {
    super({
      ...config,
      baseURL: config.baseURL || 'https://api.anthropic.com',
    })
    this.apiVersion = apiVersion
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

      // 分离 system 消息
      const systemMessages = messages.filter((msg) => msg.role === 'system')
      const systemContent = systemMessages.map((msg) => this.getContentString(msg.content)).join('\n\n')

      // 转换消息格式
      const anthropicMessages = this.normalizeMessages(messages.filter((msg) => msg.role !== 'system'))

      // 构建请求体
      const body: Record<string, unknown> = {
        model: this.modelId,
        messages: anthropicMessages,
        max_tokens: maxTokens || 4096,
        stream: stream ?? false,
        temperature: temperature ?? 0.7,
        top_p: topP,
        stop_sequences: stop,
      }

      if (systemContent) {
        body.system = systemContent
      }

      // 流式输出
      if (stream && onStream) {
        return this.handleTextStream(body, onStream)
      }

      // 非流式输出
      const response = await fetch(this.getAbsoluteURL('/v1/messages'), {
        method: 'POST',
        headers: this.getHeaders({
          'Authorization': `Bearer ${this.apiKey}`,
          'anthropic-version': this.apiVersion,
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
    const response = await fetch(this.getAbsoluteURL('/v1/messages'), {
      method: 'POST',
      headers: this.getHeaders({
        'Authorization': `Bearer ${this.apiKey}`,
        'anthropic-version': this.apiVersion,
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
          if (!line.startsWith('data:')) continue

          const dataStr = line.slice(5).trim()
          if (dataStr === '[DONE]') continue

          try {
            const data = JSON.parse(dataStr)
            const type = data.type as string

            switch (type) {
              case 'content_block_delta': {
                const delta = data.delta as Record<string, unknown>
                if (delta.type === 'text_delta') {
                  const text = delta.text as string
                  accumulatedText += text
                  onStream({ type: 'text', content: text })
                }
                break
              }
              case 'message_delta': {
                const usageData = data.usage as Record<string, unknown> | undefined
                if (usageData) {
                  usage = {
                    promptTokens: 0, // Anthropic 在流式中不提供 prompt_tokens
                    completionTokens: Number(usageData.output_tokens) || 0,
                    totalTokens: Number(usageData.output_tokens) || 0,
                  }
                }
                break
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
    const content = data.content as Array<Record<string, unknown>> | undefined
    if (!content || content.length === 0) {
      throw createAIError('EMPTY_RESPONSE', 'Anthropic 未返回任何内容', { provider: this.provider })
    }

    // 提取文本内容
    let text = ''
    for (const block of content) {
      if (block.type === 'text') {
        text += (block.text as string) || ''
      }
    }

    const usageData = data.usage as Record<string, unknown> | undefined
    const usage: TokenUsage = {
      promptTokens: Number(usageData?.input_tokens) || 0,
      completionTokens: Number(usageData?.output_tokens) || 0,
      totalTokens:
        (Number(usageData?.input_tokens) || 0) + (Number(usageData?.output_tokens) || 0),
    }

    return {
      text,
      usage,
      rawResponse: data,
      requestId: data.id as string | undefined,
    }
  }

  /**
   * 标准化消息格式为 Anthropic 格式
   */
  private normalizeMessages(messages: ChatMessage[]): Array<Record<string, unknown>> {
    const anthropicMessages: Array<Record<string, unknown>> = []

    for (const msg of messages) {
      if (msg.role === 'system') {
        continue // system 消息已单独处理
      }

      const anthropicMessage: Record<string, unknown> = {
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: this.normalizeContent(msg.content),
      }

      anthropicMessages.push(anthropicMessage)
    }

    return anthropicMessages
  }

  /**
   * 标准化内容格式
   */
  private normalizeContent(content: MessageContent): Array<Record<string, unknown>> | string {
    if (typeof content === 'string') {
      return content
    }

    return content.map((item) => {
      if (item.type === 'text') {
        return {
          type: 'text',
          text: item.text,
        }
      }

      // 图像内容
      return {
        type: 'image',
        source: {
          type: 'url',
          url: item.image_url.url,
        },
      }
    })
  }

  /**
   * 获取内容的字符串形式
   */
  private getContentString(content: MessageContent): string {
    if (typeof content === 'string') {
      return content
    }

    return content
      .map((item) => {
        if (item.type === 'text') {
          return item.text
        }
        return '[Image]'
      })
      .join('')
  }

  // ============================================================
  // 图像生成
  // ============================================================

  async generateImage(params: ImageGenerateParams): Promise<ImageGenerateResult> {
    // Anthropic 不支持图像生成
    return {
      success: false,
      error: 'Anthropic 不支持图像生成',
    }
  }

  // ============================================================
  // 视频生成
  // ============================================================

  async generateVideo(params: VideoGenerateParams): Promise<VideoGenerateResult> {
    // Anthropic 不支持视频生成
    return {
      success: false,
      error: 'Anthropic 不支持视频生成',
    }
  }

  // ============================================================
  // 语音生成
  // ============================================================

  async generateAudio(params: AudioGenerateParams): Promise<AudioGenerateResult> {
    // Anthropic 不支持语音生成
    return {
      success: false,
      error: 'Anthropic 不支持语音生成',
    }
  }
}
