/**
 * AI Client - 成本计算工具
 *
 * 提供统一的成本计算功能，支持多种计费模式
 */

import type { CostCalculation, ModelConfig } from '../types/enhanced'

// ============================================================
// 成本计算函数
// ============================================================

/**
 * 计算文本生成成本
 *
 * @param costs - 成本配置（每 1000 tokens）
 * @param usage - Token 使用统计
 * @param currency - 货币单位（默认 USD）
 * @returns 成本计算结果
 *
 * @example
 * ```typescript
 * const cost = calculateTextCost(
 *   { inputCost: 0.005, outputCost: 0.015 },
 *   { inputTokens: 1000, outputTokens: 500 }
 * )
 * console.log(cost.totalCost) // 0.0125 USD
 * ```
 */
export function calculateTextCost(
  costs: { inputCost: number; outputCost: number },
  usage: { inputTokens: number; outputTokens: number },
  currency: string = 'USD'
): number {
  const inputCost = (usage.inputTokens / 1000) * costs.inputCost
  const outputCost = (usage.outputTokens / 1000) * costs.outputCost
  return inputCost + outputCost
}

/**
 * 计算图像生成成本
 *
 * @param modelConfig - 模型配置
 * @param imageCount - 图像数量
 * @returns 成本计算结果
 */
export function calculateImageCost(
  modelConfig: ModelConfig,
  imageCount: number = 1
): CostCalculation {
  const costPerImage = modelConfig.imageCost || 0
  const totalCost = costPerImage * imageCount

  return {
    inputCost: 0,
    outputCost: totalCost,
    totalCost,
    currency: modelConfig.currency,
  }
}

/**
 * 计算视频生成成本
 *
 * @param modelConfig - 模型配置
 * @param videoCount - 视频数量
 * @returns 成本计算结果
 */
export function calculateVideoCost(
  modelConfig: ModelConfig,
  videoCount: number = 1
): CostCalculation {
  const costPerVideo = modelConfig.videoCost || 0
  const totalCost = costPerVideo * videoCount

  return {
    inputCost: 0,
    outputCost: totalCost,
    totalCost,
    currency: modelConfig.currency,
  }
}

// ============================================================
// 成本计算器类
// ============================================================

/**
 * 默认成本计算器实现
 *
 * 基于模型配置中的成本信息进行计算
 */
export class DefaultCostCalculator {
  /**
   * 计算文本生成成本
   */
  calculateTextCost(
    modelConfig: ModelConfig,
    usage: { inputTokens: number; outputTokens: number }
  ): CostCalculation {
    const inputCostPer1K = modelConfig.inputCost || 0
    const outputCostPer1K = modelConfig.outputCost || 0

    const inputCost = (usage.inputTokens / 1000) * inputCostPer1K
    const outputCost = (usage.outputTokens / 1000) * outputCostPer1K

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      currency: modelConfig.currency,
    }
  }

  /**
   * 计算图像生成成本
   */
  calculateImageCost(
    modelConfig: ModelConfig,
    imageCount: number = 1
  ): CostCalculation {
    return calculateImageCost(modelConfig, imageCount)
  }

  /**
   * 计算视频生成成本
   */
  calculateVideoCost(
    modelConfig: ModelConfig,
    videoCount: number = 1
  ): CostCalculation {
    return calculateVideoCost(modelConfig, videoCount)
  }
}

// ============================================================
// 预定义成本表
// ============================================================

/**
 * OpenAI 模型成本表（每 1000 tokens，单位：USD）
 * 基于 2024 年定价
 */
export const OPENAI_COSTS: Record<string, { input: number; output: number }> = {
  // GPT-4o 系列
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4o-2024-11-20': { input: 0.005, output: 0.015 },
  'gpt-4o-2024-08-06': { input: 0.005, output: 0.015 },

  // GPT-4 Turbo 系列
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },

  // GPT-4 系列
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-32k': { input: 0.06, output: 0.12 },

  // GPT-3.5 Turbo 系列
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'gpt-3.5-turbo-16k': { input: 0.001, output: 0.002 },
}

/**
 * Anthropic 模型成本表（每 1000 tokens，单位：USD）
 * 基于 2024 年定价
 */
export const ANTHROPIC_COSTS: Record<string, { input: number; output: number }> = {
  // Claude 3.7 系列
  'claude-3-7-sonnet-20250219': { input: 0.003, output: 0.015 },

  // Claude 3.5 系列
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
  'claude-3-5-haiku-20241022': { input: 0.0008, output: 0.004 },

  // Claude 3 系列
  'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
  'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
}

/**
 * Google Gemini 模型成本表（每 1000 tokens，单位：USD）
 * 基于 2024 年定价
 */
export const GOOGLE_COSTS: Record<string, { input: number; output: number }> = {
  // Gemini 2.0 系列
  'gemini-2.0-flash-exp': { input: 0.000075, output: 0.0003 },
  'gemini-2.0-flash-thinking-exp': { input: 0.000075, output: 0.0003 },

  // Gemini 1.5 系列
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  'gemini-1.5-pro-latest': { input: 0.00125, output: 0.005 },
  'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
  'gemini-1.5-flash-latest': { input: 0.000075, output: 0.0003 },

  // Gemini 1.0 系列
  'gemini-1.0-pro': { input: 0.0005, output: 0.0015 },
  'gemini-1.0-pro-vision': { input: 0.0005, output: 0.0015 },
}

/**
 * 阿里云通义千问模型成本表（每 1000 tokens，单位：CNY）
 * 基于 2024 年定价
 */
export const QWEN_COSTS: Record<string, { input: number; output: number; currency: string }> = {
  // Qwen-Max 系列
  'qwen-max': { input: 0.005, output: 0.015, currency: 'CNY' },
  'qwen-max-2025-01-25': { input: 0.005, output: 0.015, currency: 'CNY' },

  // Qwen-Plus 系列
  'qwen-plus': { input: 0.002, output: 0.006, currency: 'CNY' },
  'qwen-plus-2025-01-25': { input: 0.002, output: 0.006, currency: 'CNY' },

  // Qwen-Turbo 系列
  'qwen-turbo': { input: 0.0005, output: 0.0015, currency: 'CNY' },

  // Qwen2.5 系列
  'qwen2.5-72b-instruct': { input: 0.004, output: 0.004, currency: 'CNY' },
  'qwen2.5-32b-instruct': { input: 0.003, output: 0.003, currency: 'CNY' },
  'qwen2.5-14b-instruct': { input: 0.002, output: 0.002, currency: 'CNY' },
}

/**
 * DALL-E 图像生成成本表（每张图片，单位：USD）
 */
export const DALLE_COSTS: Record<string, number> = {
  'dall-e-3': 0.04,
  'dall-e-3-hd': 0.08,
  'dall-e-2': 0.02,
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 获取模型成本配置
 *
 * @param provider - 提供商名称
 * @param modelId - 模型 ID
 * @returns 成本配置或 undefined
 */
export function getModelCost(
  provider: string,
  modelId: string
): { input: number; output: number; currency: string } | undefined {
  const normalizedProvider = provider.toLowerCase()
  const normalizedModelId = modelId.toLowerCase()

  switch (normalizedProvider) {
    case 'openai':
      const openaiCost = OPENAI_COSTS[normalizedModelId]
      if (openaiCost) {
        return { ...openaiCost, currency: 'USD' }
      }
      break

    case 'anthropic':
      const anthropicCost = ANTHROPIC_COSTS[normalizedModelId]
      if (anthropicCost) {
        return { ...anthropicCost, currency: 'USD' }
      }
      break

    case 'google':
    case 'gemini':
      const googleCost = GOOGLE_COSTS[normalizedModelId]
      if (googleCost) {
        return { ...googleCost, currency: 'USD' }
      }
      break

    case 'qwen':
      const qwenCost = QWEN_COSTS[normalizedModelId]
      if (qwenCost) {
        return qwenCost
      }
      break
  }

  return undefined
}

/**
 * 货币转换（粗略汇率）
 *
 * @param amount - 金额
 * @param from - 源货币
 * @param to - 目标货币
 * @returns 转换后的金额
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string = 'USD'
): number {
  if (from === to) {
    return amount
  }

  // 粗略汇率（实际应用中应该使用实时汇率 API）
  const rates: Record<string, number> = {
    'USD': 1,
    'CNY': 0.139, // 1 CNY = 0.139 USD (约 1 USD = 7.2 CNY)
    'EUR': 1.08,
    'GBP': 1.26,
    'JPY': 0.0067,
  }

  const fromRate = rates[from] || 1
  const toRate = rates[to] || 1

  // 先转换为 USD，再转换为目标货币
  const inUSD = amount * fromRate
  return inUSD / toRate
}

/**
 * 格式化成本显示
 *
 * @param cost - 成本金额
 * @param currency - 货币单位
 * @returns 格式化后的字符串
 */
export function formatCost(cost: number, currency: string = 'USD'): string {
  const symbols: Record<string, string> = {
    'USD': '$',
    'CNY': '¥',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
  }

  const symbol = symbols[currency] || currency
  return `${symbol}${cost.toFixed(6)}`
}
