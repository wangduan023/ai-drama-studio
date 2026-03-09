/**
 * Google Gemini 客户端实现
 *
 * 支持：
 * - Gemini 2.0, Gemini 1.5 Pro/Flash
 * - Imagen 图像生成
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
  MessageContent,
} from '../types'
import { BaseAIClient } from '../base'
import { createAIError } from '../errors'

/**
 * Google Gemini 客户端
 */
export class GeminiClient extends BaseAIClient {
  constructor(config: AIModelConfig) {
    super({
      ...config,
      baseURL: config.baseURL || 'https://generativelanguage.googleapis.com',
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

      // 转换消息格式
      const geminiContents = this.normalizeMessages(messages)

      // 构建请求体
      const body: Record<string, unknown> = {
        contents: geminiContents,
        generationConfig: {
          temperature: temperature ?? 0.7,
          maxOutputTokens: maxTokens,
          topP: topP,
          stopSequences: stop,
        },
      }

      // 处理 system 指令
      const systemMessages = messages.filter((msg) => msg.role === 'system')
      if (systemMessages.length > 0) {
        body.systemInstruction = {
          parts: [{ text: systemMessages.map((msg) => this.getContentString(msg.content)).join('\n\n') }],
        }
      }

      // 流式输出
      if (stream && onStream) {
        return this.handleTextStream(body, onStream)
      }

      // 非流式输出
      const endpoint = `/v1beta/models/${this.modelId}:generateContent?key=${this.apiKey}`
      const response = await fetch(this.getAbsoluteURL(endpoint), {
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
    const endpoint = `/v1beta/models/${this.modelId}:streamGenerateContent?key=${this.apiKey}&alt=sse`
    const response = await fetch(this.getAbsoluteURL(endpoint), {
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
          if (!line.startsWith('data:')) continue

          const dataStr = line.slice(5).trim()
          if (dataStr === '[DONE]') continue

          try {
            const data = JSON.parse(dataStr)

            // 提取文本
            const candidates = data.candidates as Array<Record<string, unknown>> | undefined
            if (candidates && candidates.length > 0) {
              const content = candidates[0].content as Record<string, unknown> | undefined
              if (content) {
                const parts = content.parts as Array<Record<string, unknown>> | undefined
                if (parts) {
                  for (const part of parts) {
                    if (part.text && typeof part.text === 'string') {
                      accumulatedText += part.text
                      onStream({ type: 'text', content: part.text })
                    }
                  }
                }
              }

              // 提取 token 使用统计
              const usageMetadata = data.usageMetadata as Record<string, unknown> | undefined
              if (usageMetadata) {
                usage = {
                  promptTokens: Number(usageMetadata.promptTokenCount) || 0,
                  completionTokens: Number(usageMetadata.candidatesTokenCount) || 0,
                  totalTokens: Number(usageMetadata.totalTokenCount) || 0,
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
    const candidates = data.candidates as Array<Record<string, unknown>> | undefined
    if (!candidates || candidates.length === 0) {
      throw createAIError('EMPTY_RESPONSE', 'Gemini 未返回任何内容', { provider: this.provider })
    }

    const content = candidates[0].content as Record<string, unknown> | undefined
    if (!content) {
      throw createAIError('EMPTY_RESPONSE', 'Gemini 未返回内容', { provider: this.provider })
    }

    const parts = content.parts as Array<Record<string, unknown>> | undefined
    let text = ''
    if (parts) {
      for (const part of parts) {
        if (part.text && typeof part.text === 'string') {
          text += part.text
        }
      }
    }

    const usageMetadata = data.usageMetadata as Record<string, unknown> | undefined
    const usage: TokenUsage = {
      promptTokens: Number(usageMetadata?.promptTokenCount) || 0,
      completionTokens: Number(usageMetadata?.candidatesTokenCount) || 0,
      totalTokens: Number(usageMetadata?.totalTokenCount) || 0,
    }

    return {
      text,
      usage,
      rawResponse: data,
    }
  }

  /**
   * 标准化消息格式为 Gemini 格式
   */
  private normalizeMessages(messages: ChatMessage[]): Array<Record<string, unknown>> {
    const geminiContents: Array<Record<string, unknown>> = []

    for (const msg of messages) {
      // Gemini 不支持 system 角色，转换为 user 消息
      const role = msg.role === 'assistant' ? 'model' : 'user'

      const parts = this.normalizeContent(msg.content)

      geminiContents.push({
        role,
        parts,
      })
    }

    return geminiContents
  }

  /**
   * 标准化内容格式
   */
  private normalizeContent(content: MessageContent): Array<Record<string, unknown>> {
    if (typeof content === 'string') {
      return [{ text: content }]
    }

    return content.map((item) => {
      if (item.type === 'text') {
        return { text: item.text }
      }

      // 图像内容 - 需要从 URL 提取数据
      return {
        inlineData: {
          mimeType: 'image/jpeg',
          data: this.extractBase64FromUrl(item.image_url.url),
        },
      }
    })
  }

  /**
   * 从 URL 提取 Base64 数据
   */
  private extractBase64FromUrl(url: string): string {
    // 如果是 data URL，提取 base64 部分
    const dataUrlMatch = url.match(/^data:[^;]+;base64,(.+)$/)
    if (dataUrlMatch) {
      return dataUrlMatch[1]
    }

    // 否则返回原始 URL（假设是普通 URL）
    return url
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
  // 图像生成 (Imagen)
  // ============================================================

  async generateImage(params: ImageGenerateParams): Promise<ImageGenerateResult> {
    return this.withRetry(async () => {
      const { prompt, aspectRatio, resolution, n = 1 } = params

      // 映射宽高比到 Imagen 格式
      const aspectRatioValue = this.mapAspectRatioToValue(aspectRatio)

      // 构建请求体
      const body: Record<string, unknown> = {
        instances: [
          {
            prompt,
          },
        ],
        parameters: {
          sampleCount: n,
          aspectRatio: aspectRatioValue,
          safetySetting: 'block_some',
          negativePrompt: params.negativePrompt,
        },
      }

      // 使用 Imagen 模型
      const imageModelId = this.modelId.startsWith('imagen') ? this.modelId : 'imagen-3.0-generate-002'
      const endpoint = `/v1/projects/YOUR_PROJECT_ID/locations/us-central1/publishers/google/models/${imageModelId}:predict?key=${this.apiKey}`

      const response = await fetch(this.getAbsoluteURL(endpoint), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
        signal: this.createAbortController().controller.signal,
      })

      await this.validateResponse(response)

      const data = await response.json()
      const predictions = data.predictions as Array<Record<string, unknown>> | undefined

      if (!predictions || predictions.length === 0) {
        throw createAIError('EMPTY_RESPONSE', 'Imagen 未返回图像', { provider: this.provider })
      }

      // 提取图像 URL 或 base64
      const firstImage = predictions[0]
      const imageUrl = firstImage.bytesBase64Encoded as string | undefined
        ? `data:image/png;base64,${firstImage.bytesBase64Encoded}`
        : undefined

      return {
        success: true,
        imageUrl: imageUrl || (firstImage.url as string | undefined),
        imageBase64: firstImage.bytesBase64Encoded as string | undefined,
      }
    })
  }

  /**
   * 映射宽高比到 Imagen 值
   */
  private mapAspectRatioToValue(aspectRatio?: string): string {
    switch (aspectRatio) {
      case '16:9':
        return '16_9'
      case '9:16':
        return '9_16'
      case '4:3':
        return '4_3'
      case '3:4':
        return '3_4'
      case '1:1':
      default:
        return '1_1'
    }
  }

  // ============================================================
  // 视频生成
  // ============================================================

  async generateVideo(params: VideoGenerateParams): Promise<VideoGenerateResult> {
    // Gemini 目前不直接支持视频生成（需要调用 Veo 或其他模型）
    return {
      success: false,
      error: 'Gemini 不直接支持视频生成',
    }
  }

  // ============================================================
  // 语音生成
  // ============================================================

  async generateAudio(params: AudioGenerateParams): Promise<AudioGenerateResult> {
    // Gemini 不支持语音生成
    return {
      success: false,
      error: 'Gemini 不支持语音生成',
    }
  }
}
