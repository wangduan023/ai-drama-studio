/**
 * Ollama 客户端实现
 *
 * 支持：
 * - 本地 Ollama 服务
 * - Llama, Mistral, Qwen 等开源模型
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
 * Ollama 客户端
 */
export class OllamaClient extends BaseAIClient {
  constructor(config: AIModelConfig) {
    super({
      ...config,
      baseURL: config.baseURL || 'http://localhost:11434/api',
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
        options: {
          temperature: temperature ?? 0.7,
          num_predict: maxTokens,
          top_p: topP,
          stop,
        },
      }

      // 流式输出
      if (stream && onStream) {
        return this.handleTextStream(body, onStream)
      }

      // 非流式输出 - 使用 /api/chat 端点
      const response = await fetch(this.getAbsoluteURL('/chat'), {
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
    body: Record<string, unknown>,
    onStream: StreamCallback
  ): Promise<TextGenerateResult> {
    const response = await fetch(this.getAbsoluteURL('/chat'), {
      method: 'POST',
      headers: this.getHeaders(),
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
          try {
            const data = JSON.parse(line)

            // 提取消息内容
            const message = data.message as Record<string, unknown> | undefined
            if (message) {
              const content = message.content as string | undefined
              if (content) {
                accumulatedText += content
                onStream({ type: 'text', content })
              }
            }

            // 提取 token 使用统计 (Ollama 在最后一个 chunk 返回)
            if (data.done) {
              usage = {
                promptTokens: Number(data.prompt_eval_count) || 0,
                completionTokens: Number(data.eval_count) || 0,
                totalTokens: (Number(data.prompt_eval_count) || 0) + (Number(data.eval_count) || 0),
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
    const message = data.message as Record<string, unknown> | undefined
    if (!message) {
      throw createAIError('EMPTY_RESPONSE', 'Ollama 未返回任何内容', { provider: this.provider })
    }

    const text = (message.content as string) || ''

    const usage: TokenUsage = {
      promptTokens: Number(data.prompt_eval_count) || 0,
      completionTokens: Number(data.eval_count) || 0,
      totalTokens: (Number(data.prompt_eval_count) || 0) + (Number(data.eval_count) || 0),
    }

    return {
      text,
      usage,
      rawResponse: data,
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
        // Ollama 多模态支持
        const images: string[] = []
        let textContent = ''

        for (const item of msg.content) {
          if (item.type === 'text') {
            textContent += item.text
          } else if (item.type === 'image_url') {
            // 提取 base64 图片数据
            const base64Data = this.extractBase64FromUrl(item.image_url.url)
            if (base64Data) {
              images.push(base64Data)
            }
          }
        }

        normalized.content = textContent
        if (images.length > 0) {
          normalized.images = images
        }
      }

      return normalized
    })
  }

  /**
   * 从 URL 提取 Base64 数据
   */
  private extractBase64FromUrl(url: string): string | null {
    // 如果是 data URL，提取 base64 部分
    const dataUrlMatch = url.match(/^data:[^;]+;base64,(.+)$/)
    if (dataUrlMatch) {
      return dataUrlMatch[1]
    }

    // 普通 URL 无法直接使用，需要下载
    console.warn('[Ollama] 普通图片 URL 需要下载后才能使用:', url)
    return null
  }

  // ============================================================
  // 图像生成 - 不支持 (Ollama 专注于文本)
  // ============================================================

  async generateImage(_params: ImageGenerateParams): Promise<ImageGenerateResult> {
    return {
      success: false,
      error: 'Ollama 不支持图像生成',
    }
  }

  // ============================================================
  // 视频生成 - 不支持
  // ============================================================

  async generateVideo(_params: VideoGenerateParams): Promise<VideoGenerateResult> {
    return {
      success: false,
      error: 'Ollama 不支持视频生成',
    }
  }

  // ============================================================
  // 语音生成 - 不支持
  // ============================================================

  async generateAudio(_params: AudioGenerateParams): Promise<AudioGenerateResult> {
    return {
      success: false,
      error: 'Ollama 不支持语音生成',
    }
  }
}
