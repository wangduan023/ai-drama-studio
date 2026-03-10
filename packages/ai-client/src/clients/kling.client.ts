/**
 * 生数科技可灵 Kling 客户端实现
 *
 * 支持：
 * - 可灵 AI 视频生成
 * - 图像生成
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
} from '../types'
import { BaseAIClient } from '../base'

/**
 * 可灵 AI 客户端
 */
export class KlingClient extends BaseAIClient {
  constructor(config: AIModelConfig) {
    super({
      ...config,
      baseURL: config.baseURL || 'https://api.kuaishou.com/ai/aigc',
    })
  }

  async generateText(_params: TextGenerateParams): Promise<TextGenerateResult> {
    return { text: '', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }
  }

  async generateImage(params: ImageGenerateParams): Promise<ImageGenerateResult> {
    return this.withRetry(async () => {
      const { prompt, aspectRatio, resolution } = params

      const body: Record<string, unknown> = {
        prompt,
        aspect_ratio: this.mapAspectRatio(aspectRatio),
        resolution: resolution || '1024x1024',
      }

      const response = await fetch(this.getAbsoluteURL('/images/generate'), {
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
      return {
        success: true,
        imageUrl: data.image_url as string | undefined,
        requestId: data.request_id as string | undefined,
      }
    })
  }

  async generateVideo(params: VideoGenerateParams): Promise<VideoGenerateResult> {
    return this.withRetry(async () => {
      const { imageUrl, prompt, duration = 5 } = params

      const body: Record<string, unknown> = {
        image_url: imageUrl,
        prompt,
        duration,
      }

      const response = await fetch(this.getAbsoluteURL('/videos/generate'), {
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
      return {
        success: true,
        videoUrl: data.video_url as string | undefined,
        requestId: data.request_id as string | undefined,
        async: data.async ?? false,
      }
    })
  }

  async generateAudio(_params: AudioGenerateParams): Promise<AudioGenerateResult> {
    return { success: false, error: '可灵不支持语音生成' }
  }

  private mapAspectRatio(aspectRatio?: string): string {
    switch (aspectRatio) {
      case '16:9': return '16:9'
      case '9:16': return '9:16'
      case '1:1': return '1:1'
      default: return '1:1'
    }
  }
}
