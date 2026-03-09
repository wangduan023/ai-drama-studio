/**
 * Runway ML 客户端实现
 *
 * 支持:
 * - Gen-3 Alpha
 * - Gen-2
 * - 视频生成专用 API
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
 * Runway ML 客户端
 */
export class RunwayClient extends BaseAIClient {
  constructor(config: AIModelConfig) {
    super({
      ...config,
      baseURL: config.baseURL || 'https://api.runwayml.com/v1',
    })
  }

  // ============================================================
  // 文本生成 - 不支持 (Runway 专注于视频)
  // ============================================================

  async generateText(_params: TextGenerateParams, _onStream?: StreamCallback): Promise<TextGenerateResult> {
    return {
      text: '',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      error: 'Runway ML 不支持文本生成',
    } as TextGenerateResult
  }

  // ============================================================
  // 图像生成 - 不支持 (Runway 专注于视频)
  // ============================================================

  async generateImage(_params: ImageGenerateParams): Promise<ImageGenerateResult> {
    return {
      success: false,
      error: 'Runway ML 不支持图像生成，请使用 Gen-2/Gen-3 进行视频生成',
    }
  }

  // ============================================================
  // 视频生成
  // ============================================================

  async generateVideo(params: VideoGenerateParams): Promise<VideoGenerateResult> {
    return this.withRetry(async () => {
      const {
        imageUrl,
        prompt,
        duration = 5,
        resolution = '720p',
      } = params

      // Runway Gen-3 Alpha API
      const body: Record<string, unknown> = {
        taskId: this.generateTaskId(),
        prompt,
        image: imageUrl,
        duration_seconds: duration,
        resolution,
        seed: params.seed ?? Math.floor(Math.random() * 1000000),
      }

      const model = this.modelId || 'gen3a_turbo'

      const response = await fetch(this.getAbsoluteURL(`/tasks/${model}/text_to_video`), {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-Runway-Version': '1',
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
    const taskId = data.taskId as string | undefined
    const status = data.status as string | undefined

    if (!taskId) {
      return {
        success: false,
        error: 'Runway ML 未返回任务 ID',
      }
    }

    // 检查是否已有结果
    if (status === 'SUCCEEDED' && data.output) {
      const output = data.output as Record<string, unknown>
      const videoUrl = output.output as string | undefined
      if (videoUrl) {
        return {
          success: true,
          videoUrl,
          requestId: taskId,
        }
      }
    }

    // 异步任务，需要轮询
    return {
      success: true,
      async: true,
      externalId: taskId,
      endpoint: `/tasks/${taskId}`,
    }
  }

  /**
   * 轮询视频结果
   */
  async pollForResult(taskId: string, timeoutMs: number = 300000): Promise<VideoGenerateResult> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      const response = await fetch(this.getAbsoluteURL(`/tasks/${taskId}`), {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Runway-Version': '1',
        },
      })

      if (!response.ok) {
        continue
      }

      const data = await response.json()
      const status = data.status as string | undefined

      if (status === 'SUCCEEDED') {
        const output = data.output as Record<string, unknown> | undefined
        if (output?.output) {
          return {
            success: true,
            videoUrl: output.output as string,
            requestId: taskId,
          }
        }
      }

      if (status === 'FAILED') {
        return {
          success: false,
          error: (data.failure as string) || '视频生成失败',
        }
      }

      if (status === 'CANCELED') {
        return {
          success: false,
          error: '视频生成已取消',
        }
      }

      // 等待 2 秒后重试
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }

    return {
      success: false,
      error: '轮询超时',
    }
  }

  /**
   * 生成任务 ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  // ============================================================
  // 语音生成 - 不支持
  // ============================================================

  async generateAudio(_params: AudioGenerateParams): Promise<AudioGenerateResult> {
    return {
      success: false,
      error: 'Runway ML 不支持语音生成',
    }
  }
}
