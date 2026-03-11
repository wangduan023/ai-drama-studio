/**
 * AI Providers - 统一导出
 *
 * 提供所有 AI 提供商的统一接口实现
 *
 * @packageDocumentation
 */

// ============================================================
// OpenAI 提供商
// ============================================================

export {
  OpenAIProvider,
  createOpenAIProvider,
  type OpenAIProviderOptions,
} from './openai'

// ============================================================
// Anthropic 提供商
// ============================================================

export {
  AnthropicProvider,
  createAnthropicProvider,
  type AnthropicProviderOptions,
} from './anthropic'

// ============================================================
// Google / Gemini 提供商
// ============================================================

export {
  GoogleProvider,
  GeminiProvider,
  createGoogleProvider,
  createGeminiProvider,
  type GoogleProviderOptions,
} from './google'

// ============================================================
// 阿里云通义千问提供商
// ============================================================

export {
  QwenProvider,
  createQwenProvider,
  type QwenProviderOptions,
} from './qwen'

// ============================================================
// 统一的 AIProvider 接口类型
// ============================================================

export type {
  AIProvider,
  TextGenerationOptions,
  TextGenerationResult,
  ImageGenerationOptions,
  ImageGenerationResult,
  VideoGenerationOptions,
  VideoGenerationResult,
  ProviderConfig,
  ModelConfig,
  ProviderHealthStatus,
  HealthStatus,
  CostCalculation,
  CostCalculator,
  RateLimitStatus,
  RateLimiter,
} from '../types/enhanced'

// ============================================================
// 提供商工厂函数
// ============================================================

import type { AIProvider } from '../types/enhanced'
import { OpenAIProvider, type OpenAIProviderOptions } from './openai'
import { AnthropicProvider, type AnthropicProviderOptions } from './anthropic'
import { GoogleProvider, type GoogleProviderOptions } from './google'
import { QwenProvider, type QwenProviderOptions } from './qwen'

/**
 * 支持的提供商类型
 */
export type ProviderType = 'openai' | 'anthropic' | 'google' | 'gemini' | 'qwen'

/**
 * 提供商配置联合类型
 */
export type ProviderOptions =
  | ({ type: 'openai' } & OpenAIProviderOptions)
  | ({ type: 'anthropic' } & AnthropicProviderOptions)
  | ({ type: 'google' | 'gemini' } & GoogleProviderOptions)
  | ({ type: 'qwen' } & QwenProviderOptions)

/**
 * 创建 AI 提供商实例
 *
 * @param options - 提供商配置
 * @returns AI 提供商实例
 *
 * @example
 * ```typescript
 * const provider = createProvider({
 *   type: 'openai',
 *   model: 'gpt-4o',
 *   apiKey: process.env.OPENAI_API_KEY,
 * })
 * ```
 */
export function createProvider(options: ProviderOptions): AIProvider {
  switch (options.type) {
    case 'openai':
      return new OpenAIProvider(options)

    case 'anthropic':
      return new AnthropicProvider(options)

    case 'google':
    case 'gemini':
      return new GoogleProvider(options)

    case 'qwen':
      return new QwenProvider(options)

    default:
      throw new Error(`Unknown provider type: ${(options as ProviderOptions).type}`)
  }
}

/**
 * 批量创建提供商实例
 *
 * @param optionsList - 提供商配置列表
 * @returns 提供商实例映射
 *
 * @example
 * ```typescript
 * const providers = createProviders([
 *   { type: 'openai', model: 'gpt-4o', apiKey: '...', name: 'openai-primary' },
 *   { type: 'anthropic', model: 'claude-3', apiKey: '...', name: 'anthropic-backup' },
 * ])
 *
 * const openai = providers.get('openai-primary')
 * ```
 */
export function createProviders(
  optionsList: Array<ProviderOptions & { name: string }>
): Map<string, AIProvider> {
  const providers = new Map<string, AIProvider>()

  for (const options of optionsList) {
    const { name, ...providerOptions } = options
    providers.set(name, createProvider(providerOptions as ProviderOptions))
  }

  return providers
}
