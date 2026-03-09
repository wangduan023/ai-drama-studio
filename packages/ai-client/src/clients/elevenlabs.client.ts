/**
 * ElevenLabs 客户端实现
 *
 * 支持:
 * - 语音合成 (TTS)
 * - 多语言支持
 * - 情感语音
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
 * ElevenLabs 客户端
 */
export class ElevenLabsClient extends BaseAIClient {
  constructor(config: AIModelConfig) {
    super({
      ...config,
      baseURL: config.baseURL || 'https://api.elevenlabs.io/v1',
    })
  }

  // ============================================================
  // 文本生成 - 不支持 (ElevenLabs 专注于语音)
  // ============================================================

  async generateText(_params: TextGenerateParams, _onStream?: StreamCallback): Promise<TextGenerateResult> {
    throw createAIError('INTERNAL_ERROR', 'ElevenLabs 不支持文本生成', {
      provider: this.provider as AIProvider,
    })
  }

  // ============================================================
  // 图像生成 - 不支持
  // ============================================================

  async generateImage(_params: ImageGenerateParams): Promise<ImageGenerateResult> {
    return {
      success: false,
      error: 'ElevenLabs 不支持图像生成',
    }
  }

  // ============================================================
  // 视频生成 - 不支持
  // ============================================================

  async generateVideo(_params: VideoGenerateParams): Promise<VideoGenerateResult> {
    return {
      success: false,
      error: 'ElevenLabs 不支持视频生成',
    }
  }

  // ============================================================
  // 语音生成
  // ============================================================

  async generateAudio(params: AudioGenerateParams): Promise<AudioGenerateResult> {
    return this.withRetry(async () => {
      const {
        text,
        voice = 'Rachel',
        rate,
        outputFormat = 'mp3_44100_128',
      } = params

      // ElevenLabs TTS API
      const body: Record<string, unknown> = {
        text,
        model_id: this.modelId || 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }

      // 语速处理
      if (rate !== undefined) {
        ;(body.voice_settings as Record<string, unknown>).speed = rate
      }

      const response = await fetch(this.getAbsoluteURL(`/text-to-speech/${voice}`), {
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

      // 返回音频
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      // 如果格式是 base64 请求
      if (outputFormat.includes('base64')) {
        const arrayBuffer = await audioBlob.arrayBuffer()
        const base64 = this.arrayBufferToBase64(arrayBuffer)
        return {
          success: true,
          audioBase64: base64,
          requestId: response.headers.get('x-request-id') || undefined,
        }
      }

      return {
        success: true,
        audioUrl,
        requestId: response.headers.get('x-request-id') || undefined,
      }
    })
  }

  /**
   * 流式语音生成
   */
  async generateAudioStream(
    params: AudioGenerateParams,
    onStream?: StreamCallback
  ): Promise<AudioGenerateResult> {
    return this.withRetry(async () => {
      const {
        text,
        voice = 'Rachel',
        outputFormat = 'mp3_44100_128',
      } = params

      const body: Record<string, unknown> = {
        text,
        model_id: this.modelId || 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }

      const response = await fetch(this.getAbsoluteURL(`/text-to-speech/${voice}/stream`), {
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

      // 处理流式响应
      const reader = response.body?.getReader()
      if (!reader) {
        return {
          success: false,
          error: '无法获取流式读取器',
        }
      }

      const chunks: ArrayBuffer[] = []
      let totalLength = 0

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          if (value) {
            chunks.push(value.buffer)
            totalLength += value.byteLength

            // 通知回调
            if (onStream) {
              onStream({
                type: 'text',
                content: `Received ${totalLength} bytes...`,
              })
            }
          }
        }

        // 合并所有块
        const audioBlob = new Blob(chunks, { type: 'audio/mpeg' })
        const audioUrl = URL.createObjectURL(audioBlob)

        if (onStream) {
          onStream({
            type: 'done',
          })
        }

        return {
          success: true,
          audioUrl,
          requestId: response.headers.get('x-request-id') || undefined,
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : '流式音频生成失败',
        }
      }
    })
  }

  /**
   * 获取可用语音列表
   */
  async getVoices(): Promise<Array<{ id: string; name: string; category: string }>> {
    try {
      const response = await fetch(this.getAbsoluteURL('/voices'), {
        headers: {
          ...this.getHeaders(),
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        return []
      }

      const data = await response.json()
      const voices = data.voices as Array<Record<string, unknown>> | undefined

      if (!voices) return []

      return voices.map((v) => ({
        id: v.voice_id as string,
        name: v.name as string,
        category: v.category as string,
      }))
    } catch {
      return []
    }
  }

  /**
   * ArrayBuffer 转 Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }
}
