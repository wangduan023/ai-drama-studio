/**
 * OpenAI 提供商实现
 *
 * 实现统一的 AIProvider 接口，支持：
 * - GPT-4, GPT-4 Turbo, GPT-3.5-Turbo 文本生成
 * - DALL-E 3 图像生成
 * - TTS 语音生成
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
  ModelConfig,
} from '../types/enhanced'
import type { AIModelConfig, ChatMessage } from '../types'
import { OpenAIClient } from '../clients/openai.client'
import { calculateTextCost, calculateImageCost } from '../utils/cost-calculator'

/**
 * OpenAI 提供商配置选项
 */
export interface OpenAIProviderOptions {
  /** 模型 ID */
  model: string
  /** API Key */
  apiKey: string
  /** Base URL（可选，用于自定义端点或代理） */
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
 * OpenAI 提供商
 *
 * 实现了统一的 AIProvider 接口
 *
 * @example
 * ```typescript
 * const provider = new OpenAIProvider({
 *   model: 'gpt-4o',
 *   apiKey: process.env.OPENAI_API_KEY,
 *   textCosts: { inputCost: 0.005, outputCost: 0.015 },
 * })
 *
 * const result = await provider.generateText({
 *   model: 'gpt-4o',
 *   prompt: 'Hello, world!',
 * })
 *
 * console.log(result.content)
 * console.log(result.cost) // 自动计算的成本
 * ```
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai'
  private client: OpenAIClient
  private model: string
  private textCosts?: { inputCost: number; outputCost: number }
  private imageCost?: number
  private healthStatus: ProviderHealthStatus

  constructor(options: OpenAIProviderOptions) {
    this.model = options.model
    this.textCosts = options.textCosts
    this.imageCost = options.imageCost

    const config: AIModelConfig = {
      provider: 'openai',
      modelId: options.model,
      apiKey: options.apiKey,
      baseURL: options.baseURL,
      timeout: options.timeout,
    }

    this.client = new OpenAIClient(config)

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
    // 增加负载计数
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

      // 更新健康状态
      this.recordSuccess()

      return {
        content: result.text,
        reasoning: result.reasoning,
        usage: {
          inputTokens: result.usage.promptTokens,
          outputTokens: result.usage.completionTokens,
        },
        cost,
        rawResponse: result.rawResponse,
        requestId: result.requestId,
      }
    } catch (error) {
      // 记录失败
      this.recordFailure()
      throw error
    } finally {
      // 减少负载计数
      this.healthStatus.currentLoad = Math.max(0, this.healthStatus.currentLoad - 1)
    }
  }

  /**
   * 生成图像（使用 DALL-E 3）
   *
   * @param options - 图像生成选项
   * @returns 包含成本的图像生成结果
   */
  async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    this.healthStatus.currentLoad++

    try {
      const result = await this.client.generateImage({
        model: options.model || 'dall-e-3',
        prompt: options.prompt,
        negativePrompt: options.negativePrompt,
        referenceImages: options.referenceImages,
        aspectRatio: options.aspectRatio,
        resolution: options.resolution,
        outputFormat: options.outputFormat,
        n: options.n,
        userId: options.userId,
      })

      // 计算成本
      const imageCount = options.n || 1
      const cost = this.imageCost ? this.imageCost * imageCount : this.calculateDalleCost(options.resolution, imageCount)

      this.recordSuccess()

      return {
        success: result.success,
        imageUrl: result.imageUrl,
        imageBase64: result.imageBase64,
        cost,
        error: result.error,
        requestId: result.requestId,
        async: result.async,
        endpoint: result.endpoint,
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
   * OpenAI 目前不支持视频生成
   */
  async generateVideo(options: VideoGenerationOptions): Promise<VideoGenerationResult> {
    return {
      success: false,
      cost: 0,
      error: 'OpenAI 不支持视频生成',
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
   * 计算文本生成成本
   */
  private calculateTextCost(inputTokens: number, outputTokens: number): number {
    if (this.textCosts) {
      return calculateTextCost(
        { inputCost: this.textCosts.inputCost, outputCost: this.textCosts.outputCost },
        { inputTokens, outputTokens }
      )
    }

    // 默认成本（基于 OpenAI 2024 定价）
    const defaultCosts: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
    }

    const costs = defaultCosts[this.model] || { input: 0.005, output: 0.015 }
    return calculateTextCost(
      { inputCost: costs.input, outputCost: costs.output },
      { inputTokens, outputTokens }
    )
  }

  /**
   * 计算 DALL-E 成本
   */
  private calculateDalleCost(resolution?: string, count: number = 1): number {
    // DALL-E 3 定价（每张图片，单位：USD）
    const costs: Record<string, number> = {
      '1024x1024': 0.04,
      '1024x1792': 0.08,
      '1792x1024': 0.08,
    }

    const costPerImage = costs[resolution || '1024x1024'] || 0.04
    return costPerImage * count
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
 * 创建 OpenAI 提供商实例
 *
 * @param options - 提供商配置选项
 * @returns OpenAI 提供商实例
 *
 * @example
 * ```typescript
 * const provider = createOpenAIProvider({
 *   model: 'gpt-4o',
 *   apiKey: process.env.OPENAI_API_KEY,
 * })
 * ```
 */
export function createOpenAIProvider(options: OpenAIProviderOptions): OpenAIProvider {
  return new OpenAIProvider(options)
}

export default OpenAIProvider
