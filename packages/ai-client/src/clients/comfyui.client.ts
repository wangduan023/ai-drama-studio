/**
 * ComfyUI 客户端实现
 *
 * 支持：
 * - ComfyUI 工作流执行
 * - 图像生成 (Stable Diffusion, Flux 等)
 * - 视频生成 (SVD, AnimateDiff 等)
 * - 异步任务轮询
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
} from '../types'
import { BaseAIClient } from '../base'
import { createAIError } from '../errors'

/**
 * ComfyUI 客户端
 */
export class ComfyUIClient extends BaseAIClient {
  private workflowId?: string

  constructor(config: AIModelConfig) {
    super({
      ...config,
      baseURL: config.baseURL || 'http://localhost:8188',
    })
    this.workflowId = config.extra?.workflowId as string | undefined
  }

  // ============================================================
  // 文本生成 - 不支持 (ComfyUI 专注于媒体生成)
  // ============================================================

  async generateText(_params: TextGenerateParams, _onStream?: StreamCallback): Promise<TextGenerateResult> {
    return {
      text: '',
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    }
  }

  // ============================================================
  // 图像生成
  // ============================================================

  async generateImage(params: ImageGenerateParams): Promise<ImageGenerateResult> {
    return this.withRetry(async () => {
      const {
        prompt,
        negativePrompt,
        referenceImages,
        aspectRatio,
        resolution,
        n = 1,
        seed,
      } = params

      // 构建 ComfyUI 工作流
      const workflow = this.buildImageWorkflow({
        prompt,
        negativePrompt,
        referenceImages,
        aspectRatio,
        resolution,
        n,
        seed,
      })

      // 提交工作流
      const response = await fetch(this.getAbsoluteURL('/prompt'), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          prompt: workflow,
          client_id: this.generateClientId(),
        }),
        signal: this.createAbortController().controller.signal,
      })

      await this.validateResponse(response)

      const data = await response.json()
      const promptId = data.prompt_id as string | undefined

      if (!promptId) {
        throw createAIError('INTERNAL_ERROR', 'ComfyUI 未返回 prompt_id', { provider: this.provider })
      }

      // 轮询等待结果
      return this.pollForImageResult(promptId)
    })
  }

  /**
   * 构建图像生成工作流
   */
  private buildImageWorkflow(params: {
    prompt: string
    negativePrompt?: string
    referenceImages?: string[]
    aspectRatio?: string
    resolution?: string
    n: number
    seed?: number
  }): Record<string, Record<string, unknown>> {
    const { prompt, negativePrompt, aspectRatio, resolution, seed } = params
    const [width, height] = this.mapAspectRatioToResolution(aspectRatio, resolution)

    // 标准 SDXL 工作流模板
    const workflow: Record<string, Record<string, unknown>> = {
      '3': {
        class_type: 'KSampler',
        inputs: {
          cfg: 8,
          denoise: 1,
          model: ['4', 0],
          latent_image: ['5', 0],
          sampler_name: 'euler',
          scheduler: 'normal',
          seed: seed ?? Math.floor(Math.random() * 2 ** 32),
          steps: 20,
          positive: ['6', 0],
          negative: ['7', 0],
        },
      },
      '4': {
        class_type: 'CheckpointLoaderSimple',
        inputs: {
          ckpt_name: 'sd_xl_base_1.0.safetensors',
        },
      },
      '5': {
        class_type: 'EmptyLatentImage',
        inputs: {
          batch_size: 1,
          height,
          width,
        },
      },
      '6': {
        class_type: 'CLIPTextEncode',
        inputs: {
          clip: ['4', 1],
          text: prompt,
        },
      },
      '7': {
        class_type: 'CLIPTextEncode',
        inputs: {
          clip: ['4', 1],
          text: negativePrompt || 'nsfw, nude, low quality, worst quality',
        },
      },
    }

    return workflow
  }

  /**
   * 轮询图像生成结果
   */
  private async pollForImageResult(promptId: string): Promise<ImageGenerateResult> {
    const maxAttempts = 60 // 最多等待 60 秒 (假设每秒轮询一次)
    let attempts = 0

    while (attempts < maxAttempts) {
      await this.sleep(1000)

      const response = await fetch(this.getAbsoluteURL(`/history/${promptId}`), {
        method: 'GET',
        headers: this.getHeaders(),
        signal: this.createAbortController().controller.signal,
      })

      if (response.ok) {
        const data = await response.json()
        const output = data?.outputs

        if (output) {
          // 查找图像输出
          for (const nodeId of Object.keys(output)) {
            const nodeOutput = output[nodeId] as Record<string, unknown>
            const images = nodeOutput.images as Array<Record<string, unknown>> | undefined

            if (images && images.length > 0) {
              const image = images[0]
              const filename = image.filename as string | undefined
              const subtype = image.subtype as string | undefined
              const type = image.type as string | undefined

              if (filename) {
                // 构建图像 URL
                const imageUrl = `${this.baseURL}/view?filename=${filename}&type=${type || 'output'}&subtype=${subtype || ''}`
                return {
                  success: true,
                  imageUrl,
                }
              }
            }
          }
        }
      }

      attempts++
    }

    throw createAIError('TIMEOUT', 'ComfyUI 图像生成超时', { provider: this.provider })
  }

  // ============================================================
  // 视频生成
  // ============================================================

  async generateVideo(params: VideoGenerateParams): Promise<VideoGenerateResult> {
    return this.withRetry(async () => {
      const {
        imageUrl,
        prompt,
        duration = 4,
        fps = 24,
      } = params

      // 构建 ComfyUI 视频生成工作流 (使用 SVD 或 AnimateDiff)
      const workflow = this.buildVideoWorkflow({
        imageUrl,
        prompt: prompt || '',
        duration,
        fps,
      })

      // 提交工作流
      const response = await fetch(this.getAbsoluteURL('/prompt'), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          prompt: workflow,
          client_id: this.generateClientId(),
        }),
        signal: this.createAbortController().controller.signal,
      })

      await this.validateResponse(response)

      const data = await response.json()
      const promptId = data.prompt_id as string | undefined

      if (!promptId) {
        throw createAIError('INTERNAL_ERROR', 'ComfyUI 未返回 prompt_id', { provider: this.provider })
      }

      // 轮询等待结果
      return this.pollForVideoResult(promptId)
    })
  }

  /**
   * 构建视频生成工作流
   */
  private buildVideoWorkflow(params: {
    imageUrl: string
    prompt: string
    duration: number
    fps: number
  }): Record<string, Record<string, unknown>> {
    const { imageUrl, prompt, duration, fps } = params

    // SVD 工作流模板
    const workflow: Record<string, Record<string, unknown>> = {
      '1': {
        class_type: 'LoadImage',
        inputs: {
          image: imageUrl,
          upload: 'image',
        },
      },
      '2': {
        class_type: 'SVD_img2vid_Conditioning',
        inputs: {
          clip_vision: ['3', 0],
          image: ['1', 0],
          vae: ['4', 0],
          width: 1024,
          height: 576,
          motion_bucket_id: 127,
          fps: fps,
          augmentation_level: 0,
        },
      },
      '3': {
        class_type: 'CLIPVisionLoader',
        inputs: {
          clip_name: 'clip_vision.safetensors',
        },
      },
      '4': {
        class_type: 'VAELoader',
        inputs: {
          vae_name: 'svd.safetensors',
        },
      },
      '5': {
        class_type: 'KSampler',
        inputs: {
          cfg: 2.5,
          denoise: 1,
          model: ['6', 0],
          latent_image: ['2', 0],
          sampler_name: 'euler_ancestral',
          scheduler: 'karras',
          seed: Math.floor(Math.random() * 2 ** 32),
          steps: 20,
          positive: ['2', 1],
          negative: ['2', 2],
        },
      },
      '6': {
        class_type: 'unCLIPCheckpointLoader',
        inputs: {
          ckpt_name: 'svd.safetensors',
        },
      },
    }

    return workflow
  }

  /**
   * 轮询视频生成结果
   */
  private async pollForVideoResult(promptId: string): Promise<VideoGenerateResult> {
    const maxAttempts = 120 // 最多等待 2 分钟
    let attempts = 0

    while (attempts < maxAttempts) {
      await this.sleep(1000)

      const response = await fetch(this.getAbsoluteURL(`/history/${promptId}`), {
        method: 'GET',
        headers: this.getHeaders(),
        signal: this.createAbortController().controller.signal,
      })

      if (response.ok) {
        const data = await response.json()
        const output = data?.outputs

        if (output) {
          // 查找视频输出
          for (const nodeId of Object.keys(output)) {
            const nodeOutput = output[nodeId] as Record<string, unknown>
            const gifs = nodeOutput.gifs as Array<Record<string, unknown>> | undefined
            const videos = nodeOutput.videos as Array<Record<string, unknown>> | undefined

            const mediaArray = gifs || videos

            if (mediaArray && mediaArray.length > 0) {
              const media = mediaArray[0]
              const filename = media.filename as string | undefined

              if (filename) {
                const videoUrl = `${this.baseURL}/view?filename=${filename}`
                return {
                  success: true,
                  videoUrl,
                }
              }
            }
          }
        }
      }

      attempts++
    }

    throw createAIError('TIMEOUT', 'ComfyUI 视频生成超时', { provider: this.provider })
  }

  // ============================================================
  // 语音生成 - 不支持
  // ============================================================

  async generateAudio(_params: AudioGenerateParams): Promise<AudioGenerateResult> {
    return {
      success: false,
      error: 'ComfyUI 不支持语音生成',
    }
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  /**
   * 生成客户端 ID
   */
  private generateClientId(): string {
    return `ai-drama-studio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  /**
   * 映射宽高比到分辨率
   */
  private mapAspectRatioToResolution(aspectRatio?: string, resolution?: string): [number, number] {
    const isHD = resolution === '4K' || resolution === '2K' || resolution === 'HD'

    switch (aspectRatio) {
      case '16:9':
        return isHD ? [1920, 1080] : [1024, 576]
      case '9:16':
        return isHD ? [1080, 1920] : [576, 1024]
      case '4:3':
        return isHD ? [1600, 1200] : [1024, 768]
      case '3:4':
        return isHD ? [1200, 1600] : [768, 1024]
      case '1:1':
      default:
        return isHD ? [1024, 1024] : [832, 832]
    }
  }
}
