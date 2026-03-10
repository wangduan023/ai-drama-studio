/**
 * 阶跃星辰 StepFun (跃问) 客户端实现
 *
 * 支持：
 * - step-1v/step-1k
 * - 开放平台 API
 * - 流式输出
 */

import type {
  AIProvider,
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
 * 阶跃星辰 StepFun 客户端
 */
export class StepfunClient extends BaseAIClient {
  constructor(config: AIModelConfig) {
    super({
      ...config,
      baseURL: config.baseURL || 'https://api.stepfun.com/v1',
    })
  }

  async generateText(
    params: TextGenerateParams,
    onStream?: StreamCallback
  ): Promise<TextGenerateResult> {
    return this.withRetry(async () => {
      const { messages, stream, temperature, maxTokens, topP } = params

      const body: Record<string, unknown> = {
        model: this.modelId || 'step-1v-8k',
        messages: this.normalizeMessages(messages),
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens,
        top_p: topP,
        stream: stream ?? false,
      }

      if (stream && onStream) {
        return this.handleTextStream(body, onStream)
      }

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

  private async handleTextStream(
    body: Record<string, unknown>,
    onStream: StreamCallback
  ): Promise<TextGenerateResult> {
    const response = await fetch(this.getAbsoluteURL('/chat/completions'), {
      method: 'POST',
      headers: this.getHeaders({
        'Authorization': `Bearer ${this.apiKey}`,
      }),
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
              const usageData = data.usage as Record<string, unknown> | undefined
              if (usageData) {
                usage = {
                  promptTokens: Number(usageData.prompt_tokens) || 0,
                  completionTokens: Number(usageData.completion_tokens) || 0,
                  totalTokens: Number(usageData.total_tokens) || 0,
                }
              }
            }
          } catch {
            // 忽略
          }
        }
      },
      this.createAbortController().signal
    )

    onStream({ type: 'done', usage })

    return {
      text: accumulatedText,
      usage: usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    }
  }

  private parseTextResponse(data: Record<string, unknown>): TextGenerateResult {
    const choices = data.choices as Array<Record<string, unknown>> | undefined
    if (!choices || choices.length === 0) {
      throw createAIError('EMPTY_RESPONSE', '阶跃星辰未返回任何内容', {
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

    return { text, usage, rawResponse: data, requestId: data.id as string | undefined }
  }

  private normalizeMessages(messages: ChatMessage[]): Array<Record<string, unknown>> {
    return messages.map((msg) => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content :
        msg.content.map((item) => item.type === 'text' ? item.text : '[Image]').join(''),
    }))
  }

  async generateImage(_params: ImageGenerateParams): Promise<ImageGenerateResult> {
    return { success: false, error: '阶跃星辰不支持图像生成' }
  }

  async generateVideo(_params: VideoGenerateParams): Promise<VideoGenerateResult> {
    return { success: false, error: '阶跃星辰不支持视频生成' }
  }

  async generateAudio(_params: AudioGenerateParams): Promise<AudioGenerateResult> {
    return { success: false, error: '阶跃星辰不支持语音生成' }
  }
}
