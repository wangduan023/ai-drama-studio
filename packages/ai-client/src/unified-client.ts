/**
 * Unified AI Client
 * 统一 AI 服务客户端
 * 
 * 功能特性:
 * - 集成数据库密钥管理（自动选择可用密钥）
 * - 集成代理支持
 * - 自动重试和失败切换
 * - 负载均衡
 * - 成本追踪
 * 
 * @module unified-client
 */

import {
  AiApiKeyRepository,
  AiProxyRepository,
  prisma,
  type AiApiKey,
  type AiProxy,
} from '@ai-drama-studio/db'
import {
  createAIClient,
  type AIClientType,
  type ClientFactoryOptions,
} from './factory'
import {
  isRetryableError,
  createAIError,
  type AIError,
} from './errors'
import { getLogger } from './logger'
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
  RetryConfig,
} from './types'

// ============================================================
// 类型定义
// ============================================================

export interface UnifiedClientConfig {
  /** 提供商 ID */
  providerId: string
  /** 模型 ID（可选，用于选择特定密钥） */
  modelId?: string
  /** 能力类型（用于筛选密钥） */
  capability?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'VOICE' | 'CHAT' | 'VISION'
  /** 重试配置 */
  retryConfig?: RetryConfig
  /** 是否使用代理 */
  useProxy?: boolean
  /** 代理位置偏好 */
  proxyLocation?: string
  /** 超时时间（毫秒） */
  timeout?: number
}

export interface KeySelectionResult {
  key: AiApiKey
  proxy: AiProxy | null
  client: AIClientType
}

export interface UnifiedGenerateOptions {
  /** 是否流式输出 */
  stream?: boolean
  /** 流式回调 */
  onStream?: StreamCallback
  /** 超时时间（毫秒） */
  timeout?: number
  /** 重试次数（覆盖默认配置） */
  retries?: number
  /** 附加元数据 */
  metadata?: Record<string, unknown>
}

// ============================================================
// 默认配置
// ============================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  retryDelayMultiplier: 2,
  maxRetryDelay: 30000,
  retryableErrors: ['RATE_LIMIT', 'TIMEOUT', 'SERVICE_UNAVAILABLE', 'NETWORK_ERROR'],
}

const DEFAULT_TIMEOUT = 60000 // 60秒

// ============================================================
// Unified AI Client
// ============================================================

export class UnifiedAIClient {
  private keyRepo: AiApiKeyRepository
  private proxyRepo: AiProxyRepository
  private logger = getLogger()
  private retryConfig: RetryConfig
  private config: UnifiedClientConfig

  constructor(config: UnifiedClientConfig) {
    this.config = config
    this.keyRepo = new AiApiKeyRepository(prisma)
    this.proxyRepo = new AiProxyRepository(prisma)
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retryConfig }
  }

  // ============================================================
  // 密钥选择和负载均衡
  // ============================================================

  /**
   * 选择最佳密钥
   * 
   * 选择逻辑:
   * 1. 根据 providerId 和 capability 筛选可用密钥
   * 2. 按优先级和权重排序
   * 3. 选择健康的密钥
   * 4. 根据需要选择代理
   */
  private async selectKey(): Promise<KeySelectionResult | null> {
    const { providerId, modelId, capability, useProxy, proxyLocation } = this.config

    // 1. 获取可用密钥
    let keys = await this.keyRepo.findAvailableByProvider(providerId, modelId)

    // 2. 按能力筛选
    if (capability && keys.length > 0) {
      keys = keys.filter(key => {
        if (!key.capabilities) return true // 通用密钥
        const caps = key.capabilities as string[]
        return caps.includes(capability)
      })
    }

    if (keys.length === 0) {
      this.logger.warn(`No available API keys for provider: ${providerId}`)
      return null
    }

    // 3. 按优先级和权重排序（简单实现：优先级升序，权重降序）
    keys.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      return b.weight - a.weight
    })

    // 4. 选择第一个可用密钥
    const selectedKey = keys[0]

    // 5. 选择代理
    let selectedProxy: AiProxy | null = null
    if (useProxy && selectedKey.proxyMode !== 'NONE') {
      if (selectedKey.proxyMode === 'SPECIFIC' && selectedKey.proxyId) {
        selectedProxy = await this.proxyRepo.findById(selectedKey.proxyId)
      } else if (selectedKey.proxyMode === 'AUTO') {
        const healthyProxies = await this.proxyRepo.findHealthy()
        if (healthyProxies.length > 0) {
          // 按位置筛选
          if (proxyLocation) {
            const locationMatch = healthyProxies.find(p => p.location === proxyLocation)
            selectedProxy = locationMatch || healthyProxies[0]
          } else {
            selectedProxy = healthyProxies[0]
          }
        }
      }
    }

    // 6. 创建客户端
    const clientOptions: ClientFactoryOptions = {
      provider: this.mapProviderName(selectedKey.providerId),
      modelId: modelId || this.inferModelId(selectedKey),
      apiKey: selectedKey.apiKey,
      ...(selectedKey.apiSecret ? { apiSecret: selectedKey.apiSecret } : {}),
      timeout: this.config.timeout || DEFAULT_TIMEOUT,
    }

    // 添加代理配置
    if (selectedProxy) {
      clientOptions.proxy = {
        host: selectedProxy.host,
        port: selectedProxy.port,
        protocol: selectedProxy.protocol.toLowerCase() as 'http' | 'https' | 'socks5',
        ...(selectedProxy.username ? { username: selectedProxy.username } : {}),
        ...(selectedProxy.password ? { password: selectedProxy.password } : {}),
      }
    }

    const client = createAIClient(clientOptions)

    return {
      key: selectedKey,
      proxy: selectedProxy,
      client,
    }
  }

  /**
   * 映射提供商名称
   */
  private mapProviderName(providerId: string): AIProvider {
    // 从数据库 provider ID 映射到客户端提供商名称
    const providerMap: Record<string, AIProvider> = {
      'openai': 'openai',
      'anthropic': 'anthropic',
      'google': 'google',
      'gemini': 'google',
      'deepseek': 'deepseek',
      'qwen': 'qwen',
      'doubao': 'doubao',
      'baidu': 'baidu',
      'zhipu': 'zhipu',
      'moonshot': 'moonshot',
      'minimax': 'minimax',
      'lingyi': 'lingyi',
      'baichuan': 'baichuan',
      'sensetime': 'sensetime',
      'iflytek': 'iflytek',
      'mistral': 'mistral',
      'cohere': 'cohere',
      'groq': 'groq',
      'ollama': 'ollama',
    }

    const mapped = providerMap[providerId.toLowerCase()]
    if (!mapped) {
      this.logger.warn(`Unknown provider: ${providerId}, using as-is`)
      return providerId as AIProvider
    }
    return mapped
  }

  /**
   * 推断模型 ID
   */
  private inferModelId(key: AiApiKey): string {
    // 如果密钥绑定了模型，使用模型 ID
    if (key.modelId) {
      return key.modelId
    }
    // 否则使用默认模型
    return 'default'
  }

  // ============================================================
  // 带重试的执行
  // ============================================================

  /**
   * 带重试的执行函数
   */
  private async executeWithRetry<T>(
    operation: (client: AIClientType) => Promise<T>,
    retries: number = this.retryConfig.maxRetries
  ): Promise<T> {
    let lastError: Error | null = null
    let delay = this.retryConfig.retryDelay

    for (let attempt = 0; attempt <= retries; attempt++) {
      const selection = await this.selectKey()
      
      if (!selection) {
        throw createAIError(
          'CONFIGURATION_ERROR',
          'No available API keys',
          'No available API keys for the specified provider'
        )
      }

      const { key, proxy, client } = selection

      try {
        // 记录使用
        await this.keyRepo.incrementQuota(key.id)
        if (proxy) {
          await this.proxyRepo.incrementConcurrent(proxy.id)
        }

        const startTime = Date.now()
        const result = await operation(client)
        const latency = Date.now() - startTime

        // 记录成功
        await this.keyRepo.recordSuccess(key.id)
        if (proxy) {
          await this.proxyRepo.updateStats(proxy.id, 'success', latency)
        }

        return result
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        
        // 记录失败
        await this.keyRepo.recordFail(key.id, errorMsg)
        if (proxy) {
          await this.proxyRepo.updateStats(proxy.id, 'failed', 0)
          await this.proxyRepo.decrementConcurrent(proxy.id)
        }

        lastError = error instanceof Error ? error : new Error(errorMsg)

        // 检查是否可重试
        if (attempt < retries && this.shouldRetry(error)) {
          this.logger.warn(
            `Request failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms: ${errorMsg}`
          )
          await this.sleep(delay)
          delay = Math.min(
            delay * (this.retryConfig.retryDelayMultiplier || 2),
            this.retryConfig.maxRetryDelay
          )
          continue
        }

        // 不可重试，抛出错误
        throw error
      }
    }

    throw lastError || createAIError('UNKNOWN_ERROR', 'All retries failed')
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(error: unknown): boolean {
    if (error instanceof Error) {
      return isRetryableError(error)
    }
    return false
  }

  /**
   * 休眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // ============================================================
  // 公开 API
  // ============================================================

  /**
   * 生成文本
   */
  async generateText(
    params: TextGenerateParams,
    options?: UnifiedGenerateOptions
  ): Promise<TextGenerateResult> {
    return this.executeWithRetry(async (client) => {
      if (options?.stream && options.onStream) {
        return client.generateText(params, options.onStream)
      }
      return client.generateText(params)
    }, options?.retries)
  }

  /**
   * 生成图片
   */
  async generateImage(
    params: ImageGenerateParams,
    options?: UnifiedGenerateOptions
  ): Promise<ImageGenerateResult> {
    return this.executeWithRetry(async (client) => {
      return client.generateImage(params)
    }, options?.retries)
  }

  /**
   * 生成视频
   */
  async generateVideo(
    params: VideoGenerateParams,
    options?: UnifiedGenerateOptions
  ): Promise<VideoGenerateResult> {
    return this.executeWithRetry(async (client) => {
      return client.generateVideo(params)
    }, options?.retries)
  }

  /**
   * 生成语音
   */
  async generateAudio(
    params: AudioGenerateParams,
    options?: UnifiedGenerateOptions
  ): Promise<AudioGenerateResult> {
    return this.executeWithRetry(async (client) => {
      return client.generateAudio(params)
    }, options?.retries)
  }
}

// ============================================================
// 工厂函数
// ============================================================

/**
 * 创建统一 AI 客户端
 */
export function createUnifiedAIClient(
  config: UnifiedClientConfig
): UnifiedAIClient {
  return new UnifiedAIClient(config)
}

// ============================================================
// 默认导出
// ============================================================

export default UnifiedAIClient
