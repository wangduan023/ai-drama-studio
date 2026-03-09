/**
 * OpenAI 客户端实现
 *
 * 支持：
 * - GPT-4, GPT-4 Turbo, GPT-3.5-Turbo
 * - DALL-E 3 图像生成
 * - TTS 语音生成
 * - 流式输出
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
import { createAIError, toAIError } from '../errors'

/**
 * OpenAI 客户端
 */
export class OpenAIClient extends BaseAIClient {
  constructor(config: AIModelConfig) {
    super({
      ...config,
      baseURL: config.baseURL || 'https://api.openai.com/v1',
    })
  }

  // ============================================================
  // 文本生成
  // ============================================================

  async generateText(
    params: TextGenerateParams,
    onStream?: StreamCallback
  ): Promise<TextGenerateResult> {
    return this.withRetry(async (attempt) => {
      const { messages, stream, temperature, maxTokens, topP, frequencyPenalty, presencePenalty, stop, seed } = params

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
        seed,
        stream_options: stream ? { include_usage: true } : undefined,
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

          // 处理推理内容（o1 等模型）
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
      throw createAIError('EMPTY_RESPONSE', 'OpenAI 未返回任何选择', { provider: this.provider })
    }

    const message = choices[0].message as Record<string, unknown> | undefined
    if (!message) {
      throw createAIError('EMPTY_RESPONSE', 'OpenAI 未返回消息', { provider: this.provider })
    }

    const text = (message.content as string) || ''
    const reasoning = (message.reasoning_content as string) || undefined

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
  // 图像生成 (DALL-E 3)
  // ============================================================

  async generateImage(params: ImageGenerateParams): Promise<ImageGenerateResult> {
    return this.withRetry(async () => {
      const {
        prompt,
        negativePrompt,
        referenceImages,
        aspectRatio,
        resolution,
        outputFormat = 'url',
        n = 1,
      } = params

      // DALL-E 3 不支持负向提示词和参考图片
      if (negativePrompt) {
        console.warn('[OpenAI] DALL-E 3 不支持负向提示词')
      }
      if (referenceImages && referenceImages.length > 0) {
        console.warn('[OpenAI] DALL-E 3 不支持参考图片')
      }

      // 映射宽高比到 DALL-E 3 支持的尺寸
      const size = this.mapAspectRatioToSize(aspectRatio, resolution)

      const body: Record<string, unknown> = {
        model: this.modelId || 'dall-e-3',
        prompt,
        n,
        size,
        response_format: outputFormat === 'base64' ? 'b64_json' : 'url',
        quality: resolution === '4K' ? 'hd' : 'standard',
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
      const imageData = data.data?.[0] as Record<string, unknown> | undefined

      if (!imageData) {
        throw createAIError('EMPTY_RESPONSE', 'OpenAI 未返回图像', { provider: this.provider })
      }

      return {
        success: true,
        imageUrl: imageData.url as string | undefined,
        imageBase64: imageData.b64_json as string | undefined,
        requestId: data.id as string | undefined,
      }
    })
  }

  /**
   * 映射宽高比到 DALL-E 3 支持的尺寸
   */
  private mapAspectRatioToSize(aspectRatio?: string, resolution?: string): string {
    // DALL-E 3 支持的尺寸：1024x1024, 1024x1792, 1792x1024
    const isHD = resolution === '4K'

    switch (aspectRatio) {
      case '16:9':
        return isHD ? '1792x1024' : '1024x1024'
      case '9:16':
        return isHD ? '1024x1792' : '1024x1024'
      case '1:1':
      default:
        return '1024x1024'
    }
  }

  // ============================================================
  // 视频生成
  // ============================================================

  async generateVideo(params: VideoGenerateParams): Promise<VideoGenerateResult> {
    // OpenAI 目前不支持视频生成
    return {
      success: false,
      error: 'OpenAI 不支持视频生成',
    }
  }

  // ============================================================
  // 语音生成
  // ============================================================

  async generateAudio(params: AudioGenerateParams): Promise<AudioGenerateResult> {
    return this.withRetry(async () => {
      const { text, voice = 'alloy', rate, outputFormat = 'mp3' } = params

      const body: Record<string, unknown> = {
        model: this.modelId || 'tts-1',
        input: text,
        voice,
        response_format: outputFormat,
        speed: rate ? Math.max(0.25, Math.min(4.0, rate)) : undefined,
      }

      const response = await fetch(this.getAbsoluteURL('/audio/speech'), {
        method: 'POST',
        headers: this.getHeaders({
          'Authorization': `Bearer ${this.apiKey}`,
        }),
        body: JSON.stringify(body),
        signal: this.createAbortController().controller.signal,
      })

      await this.validateResponse(response)

      // 返回音频二进制
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      return {
        success: true,
        audioUrl,
      }
    })
  }
}
