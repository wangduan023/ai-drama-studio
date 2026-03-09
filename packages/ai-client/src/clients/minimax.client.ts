/**
 * MiniMax (海螺 AI) 客户端实现
 *
 * 支持：
 * - abab6.5/abab5.5
 * - 开放平台 API
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
 * MiniMax 客户端
 */
export class MiniMaxClient extends BaseAIClient {
  constructor(config: AIModelConfig) {
    super({
      ...config,
      baseURL: config.baseURL || 'https://api.minimax.chat/v1',
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
      const { messages, stream, temperature, maxTokens, topP } = params

      // MiniMax API 格式
      const body: Record<string, unknown> = {
        model: this.modelId || 'abab6.5-chat',
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
      throw createAIError('EMPTY_RESPONSE', 'MiniMax 未返回任何内容', {
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
   * 标准化消息格式（MiniMax 使用 ROLE 字段）
   */
  private normalizeMessages(messages: ChatMessage[]): Array<Record<string, unknown>> {
    return messages.map((msg) => {
      const role = msg.role === 'assistant' ? 'assistant' : msg.role === 'system' ? 'system' : 'user'
      return {
        role,
        content: typeof msg.content === 'string' ? msg.content :
          msg.content.map((item) => item.type === 'text' ? item.text : '[Image]').join(''),
      }
    })
  }

  // ============================================================
  // 视频生成 (MiniMax 视频模型)
  // ============================================================

  async generateVideo(params: VideoGenerateParams): Promise<VideoGenerateResult> {
    return this.withRetry(async () => {
      const {
        imageUrl,
        prompt,
        duration = 5,
      } = params

      // MiniMax 视频生成 API
      const body: Record<string, unknown> = {
        model: this.modelId || 'video-01',
        input_image_url: imageUrl,
        prompt,
        duration,
      }

      const response = await fetch(this.getAbsoluteURL('/video/generations'), {
        method: 'POST',
        headers: this.getHeaders({
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify(body),
        signal: this.createAbortController().controller.signal,
      })

      await this.validateResponse(response)

      const data = await response.json()
      return this.parseVideoResponse(data)
    })
  }

  /**
   * 解析视频响应
   */
  private parseVideoResponse(data: Record<string, unknown>): VideoGenerateResult {
    // MiniMax 视频 API 返回格式
    const videoUrl = data.video_url as string | undefined
    const taskId = data.task_id as string | undefined

    if (!videoUrl && !taskId) {
      return {
        success: false,
        error: 'MiniMax 未返回视频结果',
      }
    }

    // 如果有 taskId，说明是异步任务
    if (taskId && !videoUrl) {
      return {
        success: true,
        async: true,
        externalId: taskId,
        endpoint: `/video/result?task_id=${taskId}`,
      }
    }

    return {
      success: true,
      videoUrl,
      requestId: data.request_id as string | undefined,
    }
  }

  // ============================================================
  // 图像生成 - 不支持
  // ============================================================

  async generateImage(_params: ImageGenerateParams): Promise<ImageGenerateResult> {
    return {
      success: false,
      error: 'MiniMax 不支持图像生成',
    }
  }

  // ============================================================
  // 语音生成 - 不支持（MiniMax 有独立语音 API）
  // ============================================================

  async generateAudio(_params: AudioGenerateParams): Promise<AudioGenerateResult> {
    return {
      success: false,
      error: 'MiniMax 客户端不支持语音生成，请使用 MiniMax 语音 API',
    }
  }
}
