/**
 * 腾讯混元 (Hunyuan) 客户端实现
 *
 * 支持：
 * - 混元 Pro/Lite/Standard
 * - 腾讯云混元大模型 API
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
 * 腾讯混元客户端
 */
export class TencentClient extends BaseAIClient {
  constructor(config: AIModelConfig) {
    super({
      ...config,
      baseURL: config.baseURL || 'https://hunyuan.tencentcloudapi.com',
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

      // 腾讯云 API 签名
      const timestamp = Math.floor(Date.now() / 1000)
      const body = JSON.stringify({
        Model: this.modelId || 'hunyuan-pro',
        Messages: this.normalizeMessages(messages),
        Temperature: temperature ?? 0.7,
        MaxTokens: maxTokens,
        TopP: topP,
        Stream: stream ?? false,
      })

      const authorization = await this.getAuthorization(body, timestamp, 'hunyuan')

      // 流式输出
      if (stream && onStream) {
        return this.handleTextStream(body, authorization, timestamp, 'hunyuan', onStream)
      }

      // 非流式输出
      const response = await fetch(this.getAbsoluteURL('/'), {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Authorization': authorization,
          'X-TC-Action': 'ChatCompletions',
          'X-TC-Version': '2023-09-01',
          'X-TC-Timestamp': timestamp.toString(),
          'X-TC-Region': 'ap-beijing',
        },
        body,
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
    body: string,
    authorization: string,
    timestamp: number,
    service: string,
    onStream: StreamCallback
  ): Promise<TextGenerateResult> {
    const response = await fetch(this.getAbsoluteURL('/'), {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'Authorization': authorization,
        'X-TC-Action': 'ChatCompletions',
        'X-TC-Version': '2023-09-01',
        'X-TC-Timestamp': timestamp.toString(),
        'X-TC-Region': 'ap-beijing',
      },
      body,
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
            const choices = data.Choices as Array<Record<string, unknown>> | undefined

            if (choices && choices.length > 0) {
              const delta = choices[0].Delta as Record<string, unknown> | undefined
              if (delta?.Content && typeof delta.Content === 'string') {
                accumulatedText += delta.Content
                onStream({ type: 'text', content: delta.Content })
              }

              // 使用统计
              const usageData = data.Usage as Record<string, unknown> | undefined
              if (usageData) {
                usage = {
                  promptTokens: Number(usageData.InputTokens) || 0,
                  completionTokens: Number(usageData.OutputTokens) || 0,
                  totalTokens: Number(usageData.TotalTokens) || 0,
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
    const response = data.Response as Record<string, unknown> | undefined
    if (!response) {
      throw createAIError('EMPTY_RESPONSE', '混元未返回任何内容', {
        provider: this.provider as AIProvider,
      })
    }

    const choices = response.Choices as Array<Record<string, unknown>> | undefined
    if (!choices || choices.length === 0) {
      throw createAIError('EMPTY_RESPONSE', '混元未返回任何选择', {
        provider: this.provider as AIProvider,
      })
    }

    const message = choices[0].Message as Record<string, unknown> | undefined
    const text = (message?.Content as string) || ''

    const usageData = response.Usage as Record<string, unknown> | undefined
    const usage: TokenUsage = {
      promptTokens: Number(usageData?.InputTokens) || 0,
      completionTokens: Number(usageData?.OutputTokens) || 0,
      totalTokens: Number(usageData?.TotalTokens) || 0,
    }

    return {
      text,
      usage,
      rawResponse: data,
      requestId: response.RequestId as string | undefined,
    }
  }

  /**
   * 标准化消息格式
   */
  private normalizeMessages(messages: ChatMessage[]): Array<Record<string, unknown>> {
    return messages.map((msg) => ({
      Role: msg.role === 'assistant' ? 'assistant' : msg.role === 'system' ? 'system' : 'user',
      Content: typeof msg.content === 'string' ? msg.content :
        msg.content.map((item) => item.type === 'text' ? item.text : '[Image]').join(''),
    }))
  }

  /**
   * 获取腾讯云 API 授权签名
   */
  private async getAuthorization(body: string, timestamp: number, service: string = 'hunyuan'): Promise<string> {
    // 从 API Key 提取 SecretId 和 SecretKey
    const [secretId, secretKey] = this.apiKey.split(':')
    if (!secretKey) {
      throw createAIError('AUTH_ERROR', '腾讯 API Key 格式错误，应为 SecretId:SecretKey 格式', {
        provider: this.provider as AIProvider,
      })
    }

    const date = new Date(timestamp * 1000).toISOString().split('T')[0]
    const host = `${service}.tencentcloudapi.com`

    // 签名算法
    const encoder = new TextEncoder()

    // HMAC-SHA256 辅助函数
    const hmac = async (key: ArrayBuffer, data: string): Promise<ArrayBuffer> => {
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      )
      return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data))
    }

    const sha256 = async (data: string): Promise<ArrayBuffer> => {
      const buffer = encoder.encode(data)
      return crypto.subtle.digest('SHA-256', buffer)
    }

    // 1. 拼接规范请求串
    const httpRequestMethod = 'POST'
    const canonicalUri = '/'
    const canonicalQueryString = ''
    const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\n`
    const signedHeaders = 'content-type;host'
    const hashedRequestPayload = await this.sha256Hex(body)
    const canonicalRequest = [
      httpRequestMethod,
      canonicalUri,
      canonicalQueryString,
      canonicalHeaders,
      signedHeaders,
      hashedRequestPayload,
    ].join('\n')

    // 2. 拼接待签名字符串
    const action = 'ChatCompletions'
    const version = '2023-09-01'
    const credentialScope = `${date}/${service}/tc3_request`
    const hashedCanonicalRequest = await this.sha256Hex(canonicalRequest)
    const stringToSign = [
      'TC3-HMAC-SHA256',
      timestamp.toString(),
      credentialScope,
      hashedCanonicalRequest,
    ].join('\n')

    // 3. 计算签名
    const secretDate = await hmac(encoder.encode('TC3' + secretKey).buffer, date)
    const secretService = await hmac(secretDate, service)
    const secretSigning = await hmac(secretService, 'tc3_request')

    const signature = await this.arrayBufferToHex(
      await hmac(secretSigning, stringToSign)
    )

    // 4. 拼接 Authorization
    return `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  }

  private async sha256Hex(data: string): Promise<string> {
    const buffer = encoder.encode(data)
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    return this.arrayBufferToHex(hashBuffer)
  }

  private async arrayBufferToHex(buffer: ArrayBuffer): Promise<string> {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  // ============================================================
  // 图像生成 (腾讯混元图像 API)
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

      // 腾讯云 API 签名
      const timestamp = Math.floor(Date.now() / 1000)

      // 映射宽高比到尺寸
      const size = this.mapAspectRatioToSize(aspectRatio, resolution)
      const [width, height] = size.split('x').map(Number)

      const body = JSON.stringify({
        Num: n,
        Prompt: prompt,
        NegativePrompt: negativePrompt,
        Resolution: `${width}x${height}`,
        PictureSpec: 'hunyuan-picture-v2',
      })

      const authorization = await this.getAuthorization(body, timestamp, 'hunyuan')

      const response = await fetch(this.getAbsoluteURL('/'), {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Authorization': authorization,
          'X-TC-Action': 'HunyuanImageGeneration',
          'X-TC-Version': '2023-09-01',
          'X-TC-Timestamp': timestamp.toString(),
          'X-TC-Region': 'ap-beijing',
        },
        body,
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
    const response = data.Response as Record<string, unknown> | undefined
    if (!response) {
      return {
        success: false,
        error: '腾讯混元图像未返回任何内容',
      }
    }

    const images = response.Images as Array<Record<string, unknown>> | undefined
    if (!images || images.length === 0) {
      return {
        success: false,
        error: '腾讯混元图像未返回任何图片',
      }
    }

    return {
      success: true,
      imageUrl: images[0].ImageUrl as string | undefined,
      imageBase64: images[0].ImageBase64 as string | undefined,
      requestId: response.RequestId as string | undefined,
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
  // 视频生成 - 不支持
  // ============================================================

  async generateVideo(_params: VideoGenerateParams): Promise<VideoGenerateResult> {
    return {
      success: false,
      error: '混元不支持视频生成',
    }
  }

  // ============================================================
  // 语音生成 - 不支持
  // ============================================================

  async generateAudio(_params: AudioGenerateParams): Promise<AudioGenerateResult> {
    return {
      success: false,
      error: '混元不支持语音生成',
    }
  }
}

const encoder = new TextEncoder()
