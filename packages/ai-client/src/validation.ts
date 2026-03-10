/**
 * 配置验证模块
 *
 * 提供客户端配置的输入验证
 */

import type { AIModelConfig, AIProvider, ProxyConfig } from './types'
import { createAIError } from './errors'

/**
 * 验证错误
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * 支持的提供商列表
 */
export const SUPPORTED_PROVIDERS: AIProvider[] = [
  // 国际厂商
  'openai',
  'anthropic',
  'google',
  'mistral',
  'cohere',
  'groq',
  'stability',
  'fal',
  'runway',
  'elevenlabs',
  'luma',
  'huggingface',
  'openai-compatible',
  // 本地部署
  'ollama',
  'comfyui',
  // 国内厂商
  'doubao',
  'deepseek',
  'qwen',
  'baidu',
  'tencent',
  'iflytek',
  'zhipu',
  'moonshot',
  'minimax',
  'lingyi',
  'kling',
  'stepfun',
  'baichuan',
  'sensetime',
  // 图像生成专用
  'wanxiang',
  'hunyuan-image',
  'gewang',
]

/**
 * 验证 API Key 格式
 */
export function validateApiKey(apiKey: string, provider: string): void {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new ValidationError(`[${provider}] API Key 不能为空`)
  }

  if (apiKey.trim().length === 0) {
    throw new ValidationError(`[${provider}] API Key 不能为空白字符串`)
  }

  // 基本长度检查（仅作为最低要求）
  const trimmedKey = apiKey.trim()
  if (trimmedKey.length < 4) {
    throw new ValidationError(`[${provider}] API Key 长度过短，请检查是否完整`)
  }
}

/**
 * 验证 Base URL 格式
 */
export function validateBaseURL(baseURL: string, provider: string): void {
  if (!baseURL || typeof baseURL !== 'string') {
    throw new ValidationError(`[${provider}] Base URL 必须是字符串`)
  }

  try {
    const url = new URL(baseURL)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new ValidationError(
        `[${provider}] Base URL 协议必须是 http:// 或 https://`
      )
    }
  } catch {
    throw new ValidationError(`[${provider}] Base URL 格式不正确: ${baseURL}`)
  }
}

/**
 * 验证代理配置
 */
export function validateProxyConfig(proxy: ProxyConfig, provider: string): void {
  if (!proxy || typeof proxy !== 'object') {
    throw new ValidationError(`[${provider}] 代理配置必须是对象`)
  }

  if (!proxy.host || typeof proxy.host !== 'string') {
    throw new ValidationError(`[${provider}] 代理主机不能为空`)
  }

  if (typeof proxy.port !== 'number') {
    throw new ValidationError(`[${provider}] 代理端口必须是数字`)
  }

  if (proxy.port <= 0 || proxy.port > 65535) {
    throw new ValidationError(
      `[${provider}] 代理端口必须在 1-65535 范围内，当前: ${proxy.port}`
    )
  }
}

/**
 * 验证模型 ID
 */
export function validateModelId(modelId: string, provider: string): void {
  // 某些本地服务（如 ComfyUI）可能不需要模型 ID
  if (provider === 'comfyui' || provider === 'ollama') {
    return
  }

  if (!modelId || typeof modelId !== 'string') {
    throw new ValidationError(`[${provider}] 模型 ID 不能为空`)
  }

  if (modelId.trim().length === 0) {
    throw new ValidationError(`[${provider}] 模型 ID 不能为空白字符串`)
  }
}

/**
 * 验证提供商
 */
export function validateProvider(provider: string): asserts provider is AIProvider {
  if (!provider || typeof provider !== 'string') {
    throw new ValidationError('提供商不能为空')
  }

  // 允许 openai-compatible 作为通配符
  if (provider === 'openai-compatible') {
    return
  }

  // 检查是否在支持的列表中（使用类型断言）
  const supportedProviders = SUPPORTED_PROVIDERS as string[]
  if (!supportedProviders.includes(provider)) {
    throw new ValidationError(
      `不支持的提供商: ${provider}。支持的提供商: ${SUPPORTED_PROVIDERS.join(', ')}`
    )
  }
}

/**
 * 验证完整的模型配置
 */
export function validateModelConfig(config: AIModelConfig): void {
  if (!config || typeof config !== 'object') {
    throw new ValidationError('配置必须是对象')
  }

  // 验证提供商
  validateProvider(config.provider)

  // 验证模型 ID
  validateModelId(config.modelId, config.provider)

  // 验证 API Key
  validateApiKey(config.apiKey, config.provider)

  // 验证 Base URL（如果提供）
  if (config.baseURL !== undefined) {
    validateBaseURL(config.baseURL, config.provider)
  }

  // 验证超时时间（如果提供）
  if (config.timeout !== undefined) {
    if (typeof config.timeout !== 'number' || config.timeout <= 0) {
      throw new ValidationError(
        `[${config.provider}] 超时时间必须是正数，当前: ${config.timeout}`
      )
    }
  }

  // 验证代理配置（如果提供）
  if (config.proxy !== undefined) {
    validateProxyConfig(config.proxy, config.provider)
  }
}

/**
 * 将验证错误转换为 AIError
 */
export function validationErrorToAIError(
  error: ValidationError,
  provider?: string
): ReturnType<typeof createAIError> {
  return createAIError('INVALID_REQUEST', error.message, {
    provider,
    retryable: false,
    cause: error,
  })
}
