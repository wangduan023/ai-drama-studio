/**
 * Luma AI 客户端实现
 *
 * 支持:
 * - Dream Machine 视频生成
 * - 图生视频
 * - 文本生成视频
 * - 异步任务轮询
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
 * Luma AI 客户端
 */
export class LumaClient extends BaseAIClient {
  constructor(config: AIModelConfig) {
    super({
      ...config,
      baseURL: config.baseURL || 'https://api.lumalabs.ai/dream-machine/v1',
    })
  }

  // ============================================================
  // 文本生成 - 不支持 (Luma 专注于视频)
  // ============================================================

  async generateText(_params: TextGenerateParams, _onStream?: StreamCallback): Promise<TextGenerateResult> {
    throw createAIError('INTERNAL_ERROR', 'Luma AI 不支持文本生成', {
      provider: this.provider as AIProvider,
    })
  }

  // ============================================================
  // 图像生成 - 不支持
  // ============================================================

  async generateImage(_params: ImageGenerateParams): Promise<ImageGenerateResult> {
    return {
      success: false,
      error: 'Luma AI 不支持图像生成',
    }
  }

  // ============================================================
  // 视频生成 (Dream Machine)
  // ============================================================

  async generateVideo(params: VideoGenerateParams): Promise<VideoGenerateResult> {
    return this.withRetry(async () => {
      const {
        imageUrl,
        prompt,
        duration = 5,
      } = params

      // Luma Dream Machine API
      const body: Record<string, unknown> = {
        prompt,
      }

      // 如果有起始图片
      if (imageUrl) {
        ;(body as Record<string, unknown>).image = imageUrl
      }

      // 扩展视频时长选项
      if (duration > 5) {
        ;(body as Record<string, unknown>).extend = true
      }

      const model = this.modelId || 'dream-machine'

      const response = await fetch(this.getAbsoluteURL(`/generations`), {
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
      return this.parseVideoResponse(data)
    })
  }

  /**
   * 解析视频响应
   */
  private parseVideoResponse(data: Record<string, unknown>): VideoGenerateResult {
    const id = data.id as string | undefined
    const state = data.state as string | undefined

    if (!id) {
      return {
        success: false,
        error: 'Luma AI 未返回任务 ID',
      }
    }

    // 检查是否已有结果
    if (state === 'completed' && data.video) {
      const video = data.video as Record<string, unknown>
      return {
        success: true,
        videoUrl: video.url as string,
        requestId: id,
      }
    }

    // 检查是否失败
    if (state === 'failed') {
      return {
        success: false,
        error: (data.failure_reason as string) || '视频生成失败',
      }
    }

    // 异步任务，需要轮询
    return {
      success: true,
      async: true,
      externalId: id,
      endpoint: `/generations/${id}`,
    }
  }

  /**
   * 轮询视频结果
   */
  async pollForResult(id: string, timeoutMs: number = 300000): Promise<VideoGenerateResult> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      const response = await fetch(this.getAbsoluteURL(`/generations/${id}`), {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        continue
      }

      const data = await response.json()
      const state = data.state as string | undefined

      if (state === 'completed') {
        const video = data.video as Record<string, unknown> | undefined
        if (video?.url) {
          return {
            success: true,
            videoUrl: video.url as string,
            requestId: id,
          }
        }
      }

      if (state === 'failed') {
        return {
          success: false,
          error: (data.failure_reason as string) || '视频生成失败',
        }
      }

      if (state === 'cancelled') {
        return {
          success: false,
          error: '视频生成已取消',
        }
      }

      // 等待 3 秒后重试
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }

    return {
      success: false,
      error: '轮询超时',
    }
  }

  // ============================================================
  // 语音生成 - 不支持
  // ============================================================

  async generateAudio(_params: AudioGenerateParams): Promise<AudioGenerateResult> {
    return {
      success: false,
      error: 'Luma AI 不支持语音生成',
    }
  }
}
