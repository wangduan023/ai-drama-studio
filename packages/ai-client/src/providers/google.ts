/**
 * Google Gemini 提供商实现
 *
 * 实现统一的 AIProvider 接口，支持：
 * - Gemini 2.0, Gemini 1.5 Pro/Flash 文本生成
 * - Imagen 图像生成
 * - 流式输出
 * - 多模态输入
 * - 自动成本计算
 * - 速率限制处理
 */

import type {
  AIProvider,
  TextGenerationOptions,
  TextGenerationResult,
  ImageGenerationOptions,
  ImageGenerationResult,
  VideoGenerationOptions,
  VideoGenerationResult,
  ProviderHealthStatus,
} from '../types/enhanced'
import type { AIModelConfig, ChatMessage } from '../types'
import { GeminiClient } from '../clients/gemini.client'
import { calculateTextCost } from '../utils/cost-calculator'

/**
 * Google 提供商配置选项
 */
export interface GoogleProviderOptions {
  /** 模型 ID */
  model: string
  /** API Key */
  apiKey: string
  /** Base URL（可选） */
  baseURL?: string
  /** 超时时间（毫秒） */
  timeout?: number
  /** 文本模型成本配置（每 1000 tokens，单位：USD） */
  textCosts?: {
    inputCost: number
    outputCost: number
  }
  /** 图像模型成本配置（每次调用，单位：USD） */
  imageCost?: number
}

/**
 * Google Gemini 提供商
 *
 * 实现了统一的 AIProvider 接口
 *
 * @example
 * ```typescript
 * const provider = new GoogleProvider({
 *   model: 'gemini-2.0-flash-exp',
 *   apiKey: process.env.GOOGLE_API_KEY,
 *   textCosts: { inputCost: 0.000075, outputCost: 0.0003 },
 * })
 *
 * const result = await provider.generateText({
 *   model: 'gemini-2.0-flash-exp',
 *   prompt: 'Hello, world!',
 * })
 * ```
 */
export class GoogleProvider implements AIProvider {
  readonly name = 'google'
  private client: GeminiClient
  private model: string
  private textCosts?: { inputCost: number; outputCost: number }
  private imageCost?: number
  private healthStatus: ProviderHealthStatus

  constructor(options: GoogleProviderOptions) {
    this.model = options.model
    this.textCosts = options.textCosts
    this.imageCost = options.imageCost

    const config: AIModelConfig = {
      provider: 'google',
      modelId: options.model,
      apiKey: options.apiKey,
      baseURL: options.baseURL,
      timeout: options.timeout,
    }

    this.client = new GeminiClient(config)

    this.healthStatus = {
      name: this.name,
      isHealthy: true,
      currentLoad: 0,
      consecutiveFailures: 0,
      lastChecked: new Date(),
    }
  }

  /**
   * 生成文本
   *
   * @param options - 文本生成选项
   * @returns 包含成本和用量的文本生成结果
   */
  async generateText(options: TextGenerationOptions): Promise<TextGenerationResult> {
    this.healthStatus.currentLoad++

    try {
      const messages: ChatMessage[] = []

      // 添加系统提示词
      if (options.systemPrompt) {
        messages.push({
          role: 'system',
          content: options.systemPrompt,
        })
      }

      // 添加用户提示词
      messages.push({
        role: 'user',
        content: options.prompt,
      })

      const result = await this.client.generateText({
        model: options.model || this.model,
        messages,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        topP: options.topP,
        stop: options.stopSequences,
        stream: options.stream,
      })

      // 计算成本
      const cost = this.calculateTextCost(result.usage.promptTokens, result.usage.completionTokens)

      this.recordSuccess()

      return {
        content: result.text,
        usage: {
          inputTokens: result.usage.promptTokens,
          outputTokens: result.usage.completionTokens,
        },
        cost,
        rawResponse: result.rawResponse,
        requestId: result.requestId,
      }
    } catch (error) {
      this.recordFailure()
      throw error
    } finally {
      this.healthStatus.currentLoad = Math.max(0, this.healthStatus.currentLoad - 1)
    }
  }

  /**
   * 生成图像（使用 Imagen）
   *
   * @param options - 图像生成选项
   * @returns 包含成本的图像生成结果
   */
  async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    this.healthStatus.currentLoad++

    try {
      const result = await this.client.generateImage({
        model: options.model || 'imagen-3.0-generate-002',
        prompt: options.prompt,
        aspectRatio: options.aspectRatio,
        resolution: options.resolution,
        n: options.n,
      })

      // 计算成本
      const imageCount = options.n || 1
      const cost = this.imageCost ? this.imageCost * imageCount : 0.02 * imageCount // Imagen 默认 $0.02/张

      this.recordSuccess()

      return {
        success: result.success,
        imageUrl: result.imageUrl,
        imageBase64: result.imageBase64,
        cost,
        error: result.error,
        requestId: result.requestId,
      }
    } catch (error) {
      this.recordFailure()
      throw error
    } finally {
      this.healthStatus.currentLoad = Math.max(0, this.healthStatus.currentLoad - 1)
    }
  }

  /**
   * 生成视频
   *
   * Google 目前不直接支持视频生成（需要调用 Veo）
   */
  async generateVideo(options: VideoGenerationOptions): Promise<VideoGenerationResult> {
    return {
      success: false,
      cost: 0,
      error: 'Google Gemini 不直接支持视频生成（请使用 Veo API）',
    }
  }

  /**
   * 获取提供商健康状态
   */
  getHealth(): ProviderHealthStatus {
    return {
      ...this.healthStatus,
      lastChecked: new Date(),
    }
  }

  /**
   * 计算文本成本
   */
  private calculateTextCost(inputTokens: number, outputTokens: number): number {
    if (this.textCosts) {
      return calculateTextCost(
        { inputCost: this.textCosts.inputCost, outputCost: this.textCosts.outputCost },
        { inputTokens, outputTokens }
      )
    }

    // 默认成本（基于 Google 2024 定价）
    const defaultCosts: Record<string, { input: number; output: number }> = {
      'gemini-2.0-flash-exp': { input: 0.000075, output: 0.0003 },
      'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
      'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
      'gemini-1.0-pro': { input: 0.0005, output: 0.0015 },
    }

    const costs = defaultCosts[this.model] || { input: 0.000075, output: 0.0003 }
    return calculateTextCost(
      { inputCost: costs.input, outputCost: costs.output },
      { inputTokens, outputTokens }
    )
  }

  /**
   * 记录成功
   */
  private recordSuccess(): void {
    this.healthStatus.consecutiveFailures = 0
    this.healthStatus.isHealthy = true
  }

  /**
   * 记录失败
   */
  private recordFailure(): void {
    this.healthStatus.consecutiveFailures++
    if (this.healthStatus.consecutiveFailures >= 3) {
      this.healthStatus.isHealthy = false
    }
  }
}

/**
 * Google 提供商别名（与 GeminiClient 保持一致）
 */
export const GeminiProvider = GoogleProvider

/**
 * 创建 Google 提供商实例
 *
 * @param options - 提供商配置选项
 * @returns Google 提供商实例
 *
 * @example
 * ```typescript
 * const provider = createGoogleProvider({
 *   model: 'gemini-2.0-flash-exp',
 *   apiKey: process.env.GOOGLE_API_KEY,
 * })
 * ```
 */
export function createGoogleProvider(options: GoogleProviderOptions): GoogleProvider {
  return new GoogleProvider(options)
}

/**
 * 创建 Gemini 提供商实例（别名）
 */
export const createGeminiProvider = createGoogleProvider

export default GoogleProvider
