/**
 * Hugging Face 客户端实现
 *
 * 支持:
 * - Inference API
 * - 文本生成 (Llama, Mistral 等)
 * - 图像生成 (SD, Flux 等)
 * - 语音生成
 * - 模型托管服务
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
 * Hugging Face 客户端
 */
export class HuggingFaceClient extends BaseAIClient {
  constructor(config: AIModelConfig) {
    super({
      ...config,
      baseURL: config.baseURL || 'https://api-inference.huggingface.co',
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
      const { messages, temperature, maxTokens, topP } = params

      // 提取用户消息
      const userMessage = this.extractUserMessage(messages)

      // Hugging Face Inference API
      const body: Record<string, unknown> = {
        inputs: userMessage,
        parameters: {
          max_new_tokens: maxTokens ?? 1024,
          temperature: temperature ?? 0.7,
          top_p: topP ?? 0.95,
          return_full_text: false,
        },
      }

      const model = this.modelId || 'mistralai/Mistral-Large-Instruct-2407'

      const response = await fetch(this.getAbsoluteURL(`/models/${model}`), {
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
      return this.parseTextResponse(data)
    })
  }

  /**
   * 解析文本响应
   */
  private parseTextResponse(data: unknown): TextGenerateResult {
    // HF 返回格式：[{ generated_text: "..." }]
    if (Array.isArray(data) && data.length > 0) {
      const item = data[0] as Record<string, unknown>
      const generatedText = item.generated_text as string || ''

      return {
        text: generatedText,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        rawResponse: data,
      }
    }

    // 或者错误响应
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>
      if (obj.error) {
        throw createAIError('INTERNAL_ERROR', `HF API 错误：${obj.error}`, {
          provider: this.provider as AIProvider,
        })
      }
    }

    throw createAIError('EMPTY_RESPONSE', 'Hugging Face 未返回任何内容', {
      provider: this.provider as AIProvider,
    })
  }

  /**
   * 提取用户消息
   */
  private extractUserMessage(messages: ChatMessage[]): string {
    const userMessage = messages.find((m) => m.role === 'user')
    if (!userMessage) return ''
    return typeof userMessage.content === 'string' ? userMessage.content : ''
  }

  // ============================================================
  // 图像生成
  // ============================================================

  async generateImage(params: ImageGenerateParams): Promise<ImageGenerateResult> {
    return this.withRetry(async () => {
      const { prompt, negativePrompt, resolution, aspectRatio } = params

      // 映射尺寸
      const size = this.mapAspectRatioToSize(aspectRatio, resolution)
      const [width, height] = size.split('x').map(Number)

      const body: Record<string, unknown> = {
        inputs: prompt,
        parameters: {
          negative_prompt: negativePrompt,
          width,
          height,
          num_inference_steps: 25,
          guidance_scale: 7.5,
        },
      }

      const model = this.modelId || 'stabilityai/stable-diffusion-3.5-large'

      const response = await fetch(this.getAbsoluteURL(`/models/${model}`), {
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

      // 返回的是图像 Blob
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
  // 视频生成 - 不支持 (HF 有但需要特定模型)
  // ============================================================

  async generateVideo(params: VideoGenerateParams): Promise<VideoGenerateResult> {
    return this.withRetry(async () => {
      const { imageUrl, prompt } = params

      // 使用 HF 上的视频生成模型 (如 Zeroscope)
      const body: Record<string, unknown> = {
        inputs: prompt,
        parameters: {
          video_length: 24,
          fps: 8,
        },
      }

      const model = this.modelId || 'cerspense/zeroscope_v2_576w'

      const response = await fetch(this.getAbsoluteURL(`/models/${model}`), {
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

      // 返回视频 Blob
      const videoBlob = await response.blob()
      const videoUrl = URL.createObjectURL(videoBlob)

      return {
        success: true,
        videoUrl,
        requestId: response.headers.get('x-request-id') || undefined,
      }
    })
  }

  // ============================================================
  // 语音生成
  // ============================================================

  async generateAudio(params: AudioGenerateParams): Promise<AudioGenerateResult> {
    return this.withRetry(async () => {
      const { text, voice } = params

      // 使用 HF 上的 TTS 模型
      const body: Record<string, unknown> = {
        inputs: text,
      }

      if (voice) {
        body.parameters = {
          speaker_id: voice,
        }
      }

      const model = this.modelId || 'microsoft/speecht5_tts'

      const response = await fetch(this.getAbsoluteURL(`/models/${model}`), {
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

      // 返回音频 Blob
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      return {
        success: true,
        audioUrl,
        requestId: response.headers.get('x-request-id') || undefined,
      }
    })
  }
}
