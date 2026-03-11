/**
 * Anthropic Claude 提供商实现
 *
 * 实现统一的 AIProvider 接口，支持：
 * - Claude 3, Claude 3.5, Claude 3.7 系列文本生成
 * - 流式输出
 * - 图像输入（Vision）
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
import { AnthropicClient } from '../clients/anthropic.client'
import { calculateTextCost } from '../utils/cost-calculator'

/**
 * Anthropic 提供商配置选项
 */
export interface AnthropicProviderOptions {
  /** 模型 ID */
  model: string
  /** API Key */
  apiKey: string
  /** Base URL（可选） */
  baseURL?: string
  /** 超时时间（毫秒） */
  timeout?: number
  /** 成本配置（每 1000 tokens，单位：USD） */
  costs?: {
    inputCost: number
    outputCost: number
  }
  /** API 版本（可选） */
  apiVersion?: string
}

/**
 * Anthropic Claude 提供商
 *
 * 实现了统一的 AIProvider 接口
 *
 * @example
 * ```typescript
 * const provider = new AnthropicProvider({
 *   model: 'claude-3-7-sonnet-20250219',
 *   apiKey: process.env.ANTHROPIC_API_KEY,
 *   costs: { inputCost: 0.003, outputCost: 0.015 },
 * })
 *
 * const result = await provider.generateText({
 *   model: 'claude-3-7-sonnet-20250219',
 *   prompt: 'Hello, world!',
 *   systemPrompt: 'You are a helpful assistant.',
 * })
 * ```
 */
export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic'
  private client: AnthropicClient
  private model: string
  private costs?: { inputCost: number; outputCost: number }
  private healthStatus: ProviderHealthStatus

  constructor(options: AnthropicProviderOptions) {
    this.model = options.model
    this.costs = options.costs

    const config: AIModelConfig = {
      provider: 'anthropic',
      modelId: options.model,
      apiKey: options.apiKey,
      baseURL: options.baseURL,
      timeout: options.timeout,
    }

    this.client = new AnthropicClient(config, options.apiVersion)

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

      // 添加系统提示词（Anthropic 特殊处理，在 generateText 内部处理）
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
      const cost = this.calculateCost(result.usage.promptTokens, result.usage.completionTokens)

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
   * 生成图像
   *
   * Anthropic 不支持图像生成
   */
  async generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
    return {
      success: false,
      cost: 0,
      error: 'Anthropic 不支持图像生成',
    }
  }

  /**
   * 生成视频
   *
   * Anthropic 不支持视频生成
   */
  async generateVideo(options: VideoGenerationOptions): Promise<VideoGenerationResult> {
    return {
      success: false,
      cost: 0,
      error: 'Anthropic 不支持视频生成',
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
   * 计算成本
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    if (this.costs) {
      return calculateTextCost(
        { inputCost: this.costs.inputCost, outputCost: this.costs.outputCost },
        { inputTokens, outputTokens }
      )
    }

    // 默认成本（基于 Anthropic 2024 定价）
    const defaultCosts: Record<string, { input: number; output: number }> = {
      'claude-3-7-sonnet-20250219': { input: 0.003, output: 0.015 },
      'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
      'claude-3-5-haiku-20241022': { input: 0.0008, output: 0.004 },
      'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
      'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
      'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
    }

    const costs = defaultCosts[this.model] || { input: 0.003, output: 0.015 }
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
 * 创建 Anthropic 提供商实例
 *
 * @param options - 提供商配置选项
 * @returns Anthropic 提供商实例
 *
 * @example
 * ```typescript
 * const provider = createAnthropicProvider({
 *   model: 'claude-3-7-sonnet-20250219',
 *   apiKey: process.env.ANTHROPIC_API_KEY,
 * })
 * ```
 */
export function createAnthropicProvider(options: AnthropicProviderOptions): AnthropicProvider {
  return new AnthropicProvider(options)
}

export default AnthropicProvider
