/**
 * Fal.ai 客户端实现
 *
 * 支持:
 * - Fast Stable Diffusion
 * - Flux Schnell/Dev/Pro
 * - LCM LoRA
 * - 图像/视频生成专用 API
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
 * Fal.ai 客户端
 */
export class FalClient extends BaseAIClient {
  constructor(config: AIModelConfig) {
    super({
      ...config,
      baseURL: config.baseURL || 'https://api.fal.ai/v1',
    })
  }

  // ============================================================
  // 文本生成 - 不支持 (Fal 专注于图像/视频)
  // ============================================================

  async generateText(_params: TextGenerateParams, _onStream?: StreamCallback): Promise<TextGenerateResult> {
    return {
      text: '',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      error: 'Fal.ai 不支持文本生成',
    } as TextGenerateResult
  }

  // ============================================================
  // 图像生成
  // ============================================================

  async generateImage(params: ImageGenerateParams): Promise<ImageGenerateResult> {
    return this.withRetry(async () => {
      const {
        prompt,
        negativePrompt,
        aspectRatio,
        resolution,
        n = 1,
      } = params

      // 映射宽高比到尺寸
      const size = this.mapAspectRatioToSize(aspectRatio, resolution)
      const [width, height] = size.split('x').map(Number)

      // Fal.ai 使用队列系统，先提交任务
      const body: Record<string, unknown> = {
        prompt,
        image_size: { width, height },
        num_inference_steps: 28,
        guidance_scale: 7.5,
        num_images: n,
        seed: params.seed ?? Math.floor(Math.random() * 1000000),
        enable_safety_checker: false,
      }

      if (negativePrompt) {
        body['negative_prompt'] = negativePrompt
      }

      const model = this.modelId || 'fal-ai/fast-sd'

      // 提交异步任务
      const response = await fetch(this.getAbsoluteURL(`/endpoints/${model}/run`), {
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
      return this.parseImageResponse(data)
    })
  }

  /**
   * 解析图像响应
   */
  private parseImageResponse(data: Record<string, unknown>): ImageGenerateResult {
    // Fal.ai 返回请求 ID，需要轮询结果
    const requestId = data.request_id as string | undefined

    if (requestId) {
      return {
        success: true,
        async: true,
        externalId: requestId,
        endpoint: `/requests/${requestId}/status`,
      }
    }

    // 同步返回图像
    const images = data.images as Array<Record<string, unknown>> | undefined
    if (images && images.length > 0) {
      const imageUrl = images[0].url as string | undefined
      const imageWidth = images[0].width as number | undefined
      const imageHeight = images[0].height as number | undefined

      return {
        success: true,
        imageUrl,
        requestId: data.request_id as string | undefined,
      }
    }

    // 或者返回图像 URLs 数组
    const output = data.output as Record<string, unknown> | undefined
    if (output?.images) {
      const outputImages = output.images as Array<Record<string, unknown>>
      if (outputImages.length > 0) {
        return {
          success: true,
          imageUrl: outputImages[0].url as string | undefined,
          requestId: data.request_id as string | undefined,
        }
      }
    }

    return {
      success: false,
      error: 'Fal.ai 未返回图像',
    }
  }

  /**
   * 轮询图像结果
   */
  async pollForResult(requestId: string, timeoutMs: number = 60000): Promise<ImageGenerateResult> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      const response = await fetch(this.getAbsoluteURL(`/requests/${requestId}/status`), {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        continue
      }

      const data = await response.json()
      const status = data.status as string | undefined

      if (status === 'COMPLETED') {
        const result = data.response as Record<string, unknown> | undefined
        if (result?.images) {
          const images = result.images as Array<Record<string, unknown>>
          if (images.length > 0) {
            return {
              success: true,
              imageUrl: images[0].url as string | undefined,
              requestId,
            }
          }
        }
      }

      if (status === 'FAILED') {
        return {
          success: false,
          error: data.error as string || '图像生成失败',
        }
      }

      // 等待 500ms 后重试
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    return {
      success: false,
      error: '轮询超时',
    }
  }

  /**
   * 映射宽高比到尺寸
   */
  private mapAspectRatioToSize(aspectRatio?: string, resolution?: string): [number, number] {
    const isHD = resolution === '4K' || resolution === '2K'

    switch (aspectRatio) {
      case '16:9':
        return isHD ? [1920, 1080] : [1280, 720]
      case '9:16':
        return isHD ? [1080, 1920] : [720, 1280]
      case '4:3':
        return isHD ? [1600, 1200] : [1024, 768]
      case '3:4':
        return isHD ? [1200, 1600] : [768, 1024]
      case '1:1':
      default:
        return isHD ? [1024, 1024] : [512, 512]
    }
  }

  // ============================================================
  // 视频生成
  // ============================================================

  async generateVideo(params: VideoGenerateParams): Promise<VideoGenerateResult> {
    return this.withRetry(async () => {
      const { imageUrl, prompt, duration = 4 } = params

      // Fal.ai 视频生成 (如 Luma Dream Machine 集成)
      const body: Record<string, unknown> = {
        prompt,
        image_url: imageUrl,
        duration,
      }

      const model = this.modelId || 'fal-ai/luma-dream-machine'

      const response = await fetch(this.getAbsoluteURL(`/endpoints/${model}/run`), {
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
    const requestId = data.request_id as string | undefined

    if (requestId) {
      return {
        success: true,
        async: true,
        externalId: requestId,
        endpoint: `/requests/${requestId}/status`,
      }
    }

    // 同步返回
    const video = data.video as Record<string, unknown> | undefined
    if (video?.url) {
      return {
        success: true,
        videoUrl: video.url as string,
        requestId: data.request_id as string | undefined,
      }
    }

    return {
      success: false,
      error: 'Fal.ai 未返回视频结果',
    }
  }

  // ============================================================
  // 语音生成 - 不支持
  // ============================================================

  async generateAudio(_params: AudioGenerateParams): Promise<AudioGenerateResult> {
    return {
      success: false,
      error: 'Fal.ai 不支持语音生成',
    }
  }
}
