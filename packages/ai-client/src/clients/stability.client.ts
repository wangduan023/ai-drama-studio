/**
 * Stability AI 客户端实现
 *
 * 支持:
 * - Stable Diffusion 3/3.5
 * - Stable Image Ultra/Core
 * - Stable Video Diffusion
 * - 图像生成/编辑
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
 * Stability AI 客户端
 */
export class StabilityClient extends BaseAIClient {
  constructor(config: AIModelConfig) {
    super({
      ...config,
      baseURL: config.baseURL || 'https://api.stability.ai/v2beta',
    })
  }

  // ============================================================
  // 文本生成 - 不支持 (Stability 专注于图像/视频)
  // ============================================================

  async generateText(_params: TextGenerateParams, _onStream?: StreamCallback): Promise<TextGenerateResult> {
    return {
      text: '',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      error: 'Stability AI 不支持文本生成',
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

      const formData = new FormData()
      formData.append('prompt', prompt)
      if (negativePrompt) {
        formData.append('negative_prompt', negativePrompt)
      }
      formData.append('width', width.toString())
      formData.append('height', height.toString())
      formData.append('samples', n.toString())
      formData.append('seed', (params.seed ?? Math.floor(Math.random() * 1000000)).toString())

      const model = this.modelId || 'sd3.5-large-turbo'

      const response = await fetch(this.getAbsoluteURL(`/image/generation/${model}`), {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'image/*',
        },
        body: formData,
        signal: this.createAbortController().controller.signal,
      })

      await this.validateResponse(response)

      // 检查返回类型
      const contentType = response.headers.get('content-type')

      // JSON 响应 (异步任务)
      if (contentType?.includes('application/json')) {
        const data = await response.json()
        return this.parseImageResponse(data)
      }

      // 直接图像响应
      const imageBlob = await response.blob()
      const imageUrl = URL.createObjectURL(imageBlob)

      return {
        success: true,
        imageUrl,
        requestId: response.headers.get('x-request-id') || undefined,
      }
    })
  }

  /**
   * 解析图像响应 (JSON 格式)
   */
  private parseImageResponse(data: Record<string, unknown>): ImageGenerateResult {
    // Stability AI 可能返回任务 ID 用于轮询
    const taskId = data.id as string | undefined

    if (taskId) {
      return {
        success: true,
        async: true,
        externalId: taskId,
        endpoint: `/image/generation/result/${taskId}`,
      }
    }

    // 或者返回图像 URLs
    const images = data.images as Array<Record<string, unknown>> | undefined
    if (images && images.length > 0) {
      return {
        success: true,
        imageUrl: images[0].url as string | undefined,
        imageBase64: images[0].base64 as string | undefined,
      }
    }

    return {
      success: false,
      error: 'Stability AI 未返回图像',
    }
  }

  /**
   * 映射宽高比到尺寸
   */
  private mapAspectRatioToSize(aspectRatio?: string, resolution?: string): string {
    const isHD = resolution === '4K' || resolution === '2K'

    switch (aspectRatio) {
      case '16:9':
        return isHD ? '1920x1080' : '1280x720'
      case '9:16':
        return isHD ? '1080x1920' : '720x1280'
      case '4:3':
        return isHD ? '1600x1200' : '1024x768'
      case '3:4':
        return isHD ? '1200x1600' : '768x1024'
      case '1:1':
      default:
        return isHD ? '1024x1024' : '512x512'
    }
  }

  // ============================================================
  // 视频生成 (Stable Video Diffusion)
  // ============================================================

  async generateVideo(params: VideoGenerateParams): Promise<VideoGenerateResult> {
    return this.withRetry(async () => {
      const { imageUrl, duration = 4, fps = 24 } = params

      // 下载图片并转换为 Blob
      const imageResponse = await fetch(imageUrl)
      const imageBlob = await imageResponse.blob()

      const formData = new FormData()
      formData.append('start_image', imageBlob, 'start.png')
      formData.append('video_frames', duration ? (duration * fps).toString() : '120')
      formData.append('motion_bucket_strength', '0.5')
      formData.append('seed', (params.seed ?? Math.floor(Math.random() * 1000000)).toString())

      const model = 'stable-video-diffusion:gen-3a-turbo'

      const response = await fetch(this.getAbsoluteURL(`/video/${model}/generate`), {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
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
    const videoUrl = data.video_url as string | undefined
    const taskId = data.id as string | undefined

    if (!videoUrl && !taskId) {
      return {
        success: false,
        error: 'Stability AI 未返回视频结果',
      }
    }

    // 异步任务
    if (taskId && !videoUrl) {
      return {
        success: true,
        async: true,
        externalId: taskId,
        endpoint: `/video/${taskId}/result`,
      }
    }

    return {
      success: true,
      videoUrl,
      requestId: data.id as string | undefined,
    }
  }

  // ============================================================
  // 语音生成 - 不支持
  // ============================================================

  async generateAudio(_params: AudioGenerateParams): Promise<AudioGenerateResult> {
    return {
      success: false,
      error: 'Stability AI 不支持语音生成',
    }
  }
}
