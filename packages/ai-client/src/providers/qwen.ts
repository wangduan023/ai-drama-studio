/**
 * 阿里云通义千问 (Qwen) 提供商实现
 *
 * 实现统一的 AIProvider 接口，支持：
 * - Qwen2.5, Qwen-Max, Qwen-Plus 文本生成
 * - 通义万相图像生成
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
import { QwenClient } from '../clients/qwen.client'
import { calculateTextCost } from '../utils/cost-calculator'

/**
 * 阿里云通义千问提供商配置选项
 */
export interface QwenProviderOptions {
  /** 模型 ID */
  model: string
  /** API Key */
  apiKey: string
  /** Base URL（可选，默认使用阿里云 DashScope） */
  baseURL?: string
  /** 超时时间（毫秒） */
  timeout?: number
  /** 文本模型成本配置（每 1000 tokens，单位：USD 或 CNY） */
  textCosts?: {
    inputCost: number
    outputCost: number
    currency?: string
  }
  /** 图像模型成本配置（每次调用） */
  imageCost?: {
    cost: number
    currency?: string
  }
}

/**
 * 阿里云通义千问提供商
 *
 * 实现了统一的 AIProvider 接口
 *
 * @example
 * ```typescript
 * const provider = new QwenProvider({
 *   model: 'qwen-max',
 *   apiKey: process.env.QWEN_API_KEY,
 *   textCosts: { inputCost: 0.003, outputCost: 0.009, currency: 'CNY' },
 * })
 *
 * const result = await provider.generateText({
 *   model: 'qwen-max',
 *   prompt: '你好，世界！',
 * })
 * ```
 */
export class QwenProvider implements AIProvider {
  readonly name = 'qwen'
  private client: QwenClient
  private model: string
  private textCosts?: { inputCost: number; outputCost: number; currency: string }
  private imageCost?: { cost: number; currency: string }
  private healthStatus: ProviderHealthStatus

  constructor(options: QwenProviderOptions) {
    this.model = options.model
    this.textCosts = options.textCosts
      ? {
          inputCost: options.textCosts.inputCost,
          outputCost: options.textCosts.outputCost,
          currency: options.textCosts.currency || 'CNY',
        }
      : undefined
    this.imageCost = options.imageCost
      ? {
          cost: options.imageCost.cost,
          currency: options.imageCost.currency || 'CNY',
        }
      : undefined

    const config: AIModelConfig = {
      provider: 'qwen',
      modelId: options.model,
      apiKey: options.apiKey,
      baseURL: options.baseURL,
      timeout: options.timeout,
    }

    this.client = new QwenClient(config)

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
   * 生成图像（使用通义万相）
   *
   * @param options - 图像生成选项
   * @returns 包含成本的图像生成结果
   */
  async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    this.healthStatus.currentLoad++

    try {
      const result = await this.client.generateImage({
        model: options.model || 'wanx-v1',
        prompt: options.prompt,
        negativePrompt: options.negativePrompt,
        aspectRatio: options.aspectRatio,
        resolution: options.resolution,
        n: options.n,
        userId: options.userId,
      })

      // 计算成本
      const imageCount = options.n || 1
      const currency = this.imageCost?.currency || 'CNY'
      let cost: number

      if (this.imageCost) {
        cost = this.imageCost.cost * imageCount
      } else {
        // 通义万相默认定价：0.16 CNY/张
        cost = 0.16 * imageCount
      }

      // 转换为 USD（粗略汇率 1 USD = 7.2 CNY）
      const costInUSD = currency === 'CNY' ? cost / 7.2 : cost

      this.recordSuccess()

      return {
        success: result.success,
        imageUrl: result.imageUrl,
        imageBase64: result.imageBase64,
        cost: costInUSD,
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
   * 通义千问目前不支持视频生成
   */
  async generateVideo(options: VideoGenerationOptions): Promise<VideoGenerationResult> {
    return {
      success: false,
      cost: 0,
      error: '通义千问不支持视频生成（请使用通义万相视频生成或其他视频生成服务）',
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
      const cost = calculateTextCost(
        { inputCost: this.textCosts.inputCost, outputCost: this.textCosts.outputCost },
        { inputTokens, outputTokens }
      )
      // 转换为 USD
      return this.textCosts.currency === 'CNY' ? cost / 7.2 : cost
    }

    // 默认成本（基于阿里云 2024 定价，转换为 USD）
    const defaultCosts: Record<string, { input: number; output: number }> = {
      'qwen-max': { input: 0.00069, output: 0.00207 }, // 0.005 CNY / 0.015 CNY
      'qwen-plus': { input: 0.00028, output: 0.00083 }, // 0.002 CNY / 0.006 CNY
      'qwen-turbo': { input: 0.00007, output: 0.00021 }, // 0.0005 CNY / 0.0015 CNY
      'qwen2.5-72b-instruct': { input: 0.00056, output: 0.00056 }, // 0.004 CNY / 0.004 CNY
    }

    const costs = defaultCosts[this.model] || { input: 0.00028, output: 0.00083 }
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
 * 创建阿里云通义千问提供商实例
 *
 * @param options - 提供商配置选项
 * @returns 通义千问提供商实例
 *
 * @example
 * ```typescript
 * const provider = createQwenProvider({
 *   model: 'qwen-max',
 *   apiKey: process.env.QWEN_API_KEY,
 * })
 * ```
 */
export function createQwenProvider(options: QwenProviderOptions): QwenProvider {
  return new QwenProvider(options)
}

export default QwenProvider
