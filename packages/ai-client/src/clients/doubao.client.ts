/**
 * 豆包 (Doubao/Seedance) 客户端实现
 *
 * 支持：
 * - 豆包文本模型 (Seedance)
 * - 豆包图像模型 (Seedream)
 * - 豆包视频模型 (Seedance Video)
 * - 火山引擎 ARK API 兼容
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
  TokenUsage,
  ChatMessage,
  MessageContent,
} from '../types'
import { BaseAIClient } from '../base'
import { createAIError } from '../errors'

/**
 * 豆包客户端
 */
export class DoubaoClient extends BaseAIClient {
  /** API 端点类型 */
  private readonly endpointType: 'doubao' | 'ark'

  constructor(
    config: AIModelConfig,
    endpointType: 'doubao' | 'ark' = 'ark'
  ) {
    super({
      ...config,
      baseURL:
        config.baseURL ||
        (endpointType === 'ark'
          ? 'https://ark.cn-beijing.volces.com/api/v3'
          : 'https://doubao.com/api/v1'),
    })
    this.endpointType = endpointType
  }

  // ============================================================
  // 文本生成
  // ============================================================

  async generateText(
    params: TextGenerateParams,
    onStream?: StreamCallback
  ): Promise<TextGenerateResult> {
    return this.withRetry(async () => {
      const { messages, stream, temperature, maxTokens, topP, stop, seed } = params

      // 构建请求体（OpenAI 兼容格式）
      const body: Record<string, unknown> = {
        model: this.modelId,
        messages: this.normalizeMessages(messages),
        stream: stream ?? false,
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens,
        top_p: topP,
        stop,
        seed,
        stream_options: stream ? { include_usage: true } : undefined,
      }

      // 流式输出
      if (stream && onStream) {
        return this.handleTextStream(body, onStream)
      }

      // 非流式输出
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
      body: JSON.stringify(body),
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

              // 检查 finish_reason
              if (choices[0].finish_reason) {
                const usageData = data.usage as Record<string, unknown> | undefined
                if (usageData) {
                  usage = {
                    promptTokens: Number(usageData.prompt_tokens) || 0,
                    completionTokens: Number(usageData.completion_tokens) || 0,
                    totalTokens: Number(usageData.total_tokens) || 0,
                  }
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
      throw createAIError('EMPTY_RESPONSE', '豆包未返回任何选择', { provider: this.provider })
    }

    const message = choices[0].message as Record<string, unknown> | undefined
    if (!message) {
      throw createAIError('EMPTY_RESPONSE', '豆包未返回消息', { provider: this.provider })
    }

    const text = (message.content as string) || ''

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
   * 标准化消息格式
   */
  private normalizeMessages(messages: ChatMessage[]): Array<Record<string, unknown>> {
    return messages.map((msg) => {
      const normalized: Record<string, unknown> = {
        role: msg.role,
      }

      if (typeof msg.content === 'string') {
        normalized.content = msg.content
      } else {
        normalized.content = msg.content.map((item) => {
          if (item.type === 'text') {
            return { type: 'text', text: item.text }
          }
          return {
            type: 'image_url',
            image_url: { url: item.image_url.url },
          }
        })
      }

      if (msg.name) {
        normalized.name = msg.name
      }

      return normalized
    })
  }

  // ============================================================
  // 图像生成 (Seedream)
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
      } = params

      // 映射宽高比到 Seedream 格式
      const size = this.mapAspectRatioToSize(aspectRatio, resolution)

      // 构建请求体
      const body: Record<string, unknown> = {
        model: this.modelId || 'doubao-seedream-4-5-251128',
        prompt,
        negative_prompt: negativePrompt,
        n,
        size,
        response_format: 'url',
        stream: false,
      }

      // 处理参考图片
      if (referenceImages && referenceImages.length > 0) {
        // 转换参考图片为 base64
        const base64Images = await Promise.all(
          referenceImages.map((url) => this.urlToBase64(url))
        )
        body.image = base64Images
      }

      const response = await fetch(this.getAbsoluteURL('/images/generations'), {
        method: 'POST',
        headers: this.getHeaders({
          'Authorization': `Bearer ${this.apiKey}`,
        }),
        body: JSON.stringify(body),
        signal: this.createAbortController().controller.signal,
      })

      await this.validateResponse(response)

      const data = await response.json()
      const imageData = data.data?.[0] as Record<string, unknown> | undefined

      if (!imageData) {
        throw createAIError('EMPTY_RESPONSE', '豆包未返回图像', { provider: this.provider })
      }

      return {
        success: true,
        imageUrl: imageData.url as string | undefined,
        imageBase64: imageData.b64_json as string | undefined,
        requestId: data.id as string | undefined,
      }
    })
  }

  /**
   * 映射宽高比到 Seedream 尺寸
   */
  private mapAspectRatioToSize(aspectRatio?: string, resolution?: string): string {
    // Seedream 4K 分辨率映射表
    const sizeMap: Record<string, string> = {
      '1:1': '4096x4096',
      '16:9': '5456x3072',
      '9:16': '3072x5456',
      '4:3': '4728x3544',
      '3:4': '3544x4728',
      '3:2': '5016x3344',
      '2:3': '3344x5016',
      '21:9': '6256x2680',
      '9:21': '2680x6256',
    }

    return aspectRatio ? sizeMap[aspectRatio] || '4096x4096' : '4096x4096'
  }

  /**
   * URL 转 Base64
   */
  private async urlToBase64(url: string): Promise<string> {
    // 如果已经是 data URL，直接返回
    if (url.startsWith('data:')) {
      return url.split(',')[1] || url
    }

    try {
      const response = await fetch(url)
      const blob = await response.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const result = reader.result as string
          resolve(result.split(',')[1] || result)
        }
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch {
      return url
    }
  }

  // ============================================================
  // 视频生成 (Seedance)
  // ============================================================

  async generateVideo(params: VideoGenerateParams): Promise<VideoGenerateResult> {
    return this.withRetry(async () => {
      const {
        imageUrl,
        prompt = '',
        duration,
        resolution,
        aspectRatio,
        generateAudio,
        lastFrameImageUrl,
        seed,
      } = params

      // 转换图片为 base64
      const imageBase64 = await this.urlToBase64(imageUrl)

      // 构建 content 数组
      const content: Array<Record<string, unknown>> = []

      if (prompt.trim()) {
        content.push({ type: 'text', text: prompt })
      }

      // 处理首尾帧模式
      if (lastFrameImageUrl) {
        const lastImageBase64 = await this.urlToBase64(lastFrameImageUrl)
        content.push({
          type: 'image_url',
          image_url: { url: imageBase64 },
          role: 'first_frame',
        })
        content.push({
          type: 'image_url',
          image_url: { url: lastImageBase64 },
          role: 'last_frame',
        })
      } else {
        content.push({
          type: 'image_url',
          image_url: { url: imageBase64 },
        })
      }

      // 构建请求体
      const body: Record<string, unknown> = {
        model: this.modelId || 'doubao-seedance-1-0-pro-fast-251015',
        content,
      }

      // 可选参数
      if (resolution === '480p' || resolution === '720p' || resolution === '1080p') {
        body.resolution = resolution
      }
      if (aspectRatio) {
        body.ratio = aspectRatio
      }
      if (typeof duration === 'number') {
        body.duration = duration
      }
      if (typeof seed === 'number') {
        body.seed = seed
      }
      if (typeof generateAudio === 'boolean') {
        body.generate_audio = generateAudio
      }

      const response = await fetch(this.getAbsoluteURL('/videos/generations'), {
        method: 'POST',
        headers: this.getHeaders({
          'Authorization': `Bearer ${this.apiKey}`,
        }),
        body: JSON.stringify(body),
        signal: this.createAbortController().controller.signal,
      })

      await this.validateResponse(response)

      const data = await response.json()

      // 豆包视频是异步任务
      const taskId = data.id as string | undefined
      if (!taskId) {
        throw createAIError('EMPTY_RESPONSE', '豆包未返回任务 ID', { provider: this.provider })
      }

      return {
        success: true,
        async: true,
        requestId: taskId,
        externalId: `DOUBAO:VIDEO:${taskId}`,
      }
    })
  }

  // ============================================================
  // 语音生成
  // ============================================================

  async generateAudio(params: AudioGenerateParams): Promise<AudioGenerateResult> {
    return this.withRetry(async () => {
      const { text, voice = 'zh_female_wanwanxiao', rate, outputFormat = 'mp3' } = params

      // 构建请求体
      const body: Record<string, unknown> = {
        model: this.modelId || 'speech-20240619',
        input: text,
        voice_id: voice,
        response_format: outputFormat,
        speed: rate ? Math.max(0.5, Math.min(2.0, rate)) : undefined,
      }

      const response = await fetch(this.getAbsoluteURL('/audio/speech'), {
        method: 'POST',
        headers: this.getHeaders({
          'Authorization': `Bearer ${this.apiKey}`,
        }),
        body: JSON.stringify(body),
        signal: this.createAbortController().controller.signal,
      })

      await this.validateResponse(response)

      // 返回音频二进制
      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      return {
        success: true,
        audioUrl,
      }
    })
  }
}
