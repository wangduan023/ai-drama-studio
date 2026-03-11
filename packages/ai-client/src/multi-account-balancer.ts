/**
 * 多账号负载均衡器
 *
 * 专为同一渠道多账号场景设计：
 * - 支持多账号轮询
 * - 自动失败切换
 * - 速率限制追踪
 * - 请求统计
 *
 * @example
 * ```typescript
 * // 创建多账号负载均衡器（同一渠道多个 API Key）
 * const balancer = createMultiAccountBalancer({
 *   provider: 'openai',
 *   modelId: 'gpt-4o',
 *   accounts: [
 *     { apiKey: 'sk-xxx1', name: 'account-1' },
 *     { apiKey: 'sk-xxx2', name: 'account-2' },
 *     { apiKey: 'sk-xxx3', name: 'account-3' },
 *   ],
 *   strategy: 'round-robin',
 * })
 *
 * // 生成文本（自动轮询账号）
 * const result = await balancer.generateText({
 *   messages: [{ role: 'user', content: '你好' }],
 * })
 *
 * // 生成图片（自动轮询账号）
 * const imageResult = await balancer.generateImage({
 *   prompt: '一只猫咪',
 * })
 *
 * // 获取账号使用统计
 * console.log(balancer.getUsageStats())
 * ```
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
  AIError,
} from './types'
import { createAIClient } from './factory'
import type { AIClientType } from './factory'
import { getLogger } from './logger'

/**
 * 账号配置
 */
export interface AccountConfig {
  /** API Key */
  apiKey: string
  /** 账号名称（可选，用于标识） */
  name?: string
  /** Base URL（可选，用于自定义端点） */
  baseURL?: string
  /** 权重（用于加权轮询） */
  weight?: number
  /**
   * 速率限制（每分钟请求数）
   * 注意：当前版本仅作统计参考，未实现实际限流
   */
  rateLimit?: number
}

/**
 * 多账号负载均衡器配置
 */
export interface MultiAccountBalancerConfig {
  /** 提供商 */
  provider: AIProvider | string
  /** 模型 ID */
  modelId: string
  /** 账号列表 */
  accounts: AccountConfig[]
  /** 负载均衡策略 */
  strategy?: 'round-robin' | 'weighted' | 'least-loaded'
  /** 超时时间（毫秒） */
  timeout?: number
  /** 额外配置 */
  extra?: Record<string, unknown>
}

/**
 * 账号状态
 */
interface AccountState {
  /** API Key */
  apiKey: string
  /** 账号名称 */
  name: string
  /** Base URL */
  baseURL?: string
  /** 权重 */
  weight: number
  /** 速率限制 */
  rateLimit?: number
  /** 客户端实例 */
  client: AIClientType
  /** 是否可用 */
  isAvailable: boolean
  /** 连续失败次数 */
  consecutiveFailures: number
  /** 当前负载（正在处理的请求数） */
  currentLoad: number
  /** 总请求数 */
  totalRequests: number
  /** 成功请求数 */
  successRequests: number
  /** 失败请求数 */
  failedRequests: number
  /** 最后请求时间 */
  lastRequestTime: number
  /** 最后失败时间 */
  lastFailureTime: number
  /** 恢复可用时间（用于速率限制） */
  recoverAt?: number
}

/**
 * 多账号负载均衡器
 */
export class MultiAccountBalancer {
  /** 提供商 */
  private readonly provider: AIProvider | string

  /** 模型 ID */
  private readonly modelId: string

  /** 账号池 */
  private readonly accounts: Map<string, AccountState>

  /** 账号列表（用于轮询） */
  private readonly accountList: string[]

  /** 负载均衡策略 */
  private readonly strategy: 'round-robin' | 'weighted' | 'least-loaded'

  /** 轮询索引 */
  private roundRobinIndex = 0

  /** 超时时间 */
  private readonly timeout: number

  /** 额外配置 */
  private readonly extra?: Record<string, unknown>

  /** 失败阈值 */
  private readonly failureThreshold = 3

  /** 恢复时间（毫秒） */
  private readonly recoverTimeMs = 60000 // 1 分钟

  constructor(config: MultiAccountBalancerConfig) {
    this.provider = config.provider
    this.modelId = config.modelId
    this.strategy = config.strategy || 'round-robin'
    this.timeout = config.timeout || 120000
    this.extra = config.extra
    this.accounts = new Map()
    this.accountList = []

    // 初始化账号池
    for (const account of config.accounts) {
      const name = account.name || this.generateAccountName(account.apiKey)
      const client = createAIClient({
        provider: config.provider as AIProvider,
        modelId: config.modelId,
        apiKey: account.apiKey,
        baseURL: account.baseURL,
        timeout: this.timeout,
        extra: config.extra,
      })

      const state: AccountState = {
        apiKey: account.apiKey,
        name,
        baseURL: account.baseURL,
        weight: account.weight ?? 1,
        rateLimit: account.rateLimit,
        client,
        isAvailable: true,
        consecutiveFailures: 0,
        currentLoad: 0,
        totalRequests: 0,
        successRequests: 0,
        failedRequests: 0,
        lastRequestTime: 0,
        lastFailureTime: 0,
      }

      this.accounts.set(name, state)
      this.accountList.push(name)
    }
  }

  /**
   * 生成账号名称（如果未提供）
   */
  private generateAccountName(apiKey: string): string {
    // 使用 API Key 的后 8 位作为标识
    const suffix = apiKey.slice(-8)
    return `account-${suffix}`
  }

  /**
   * 获取可用账号（根据策略）
   */
  private getAvailableAccount(): AccountState | null {
    const now = Date.now()

    // 过滤可用账号
    const availableAccounts = this.accountList
      .map((name) => this.accounts.get(name)!)
      .filter((account) => {
        // 检查是否被标记为不可用
        if (!account.isAvailable) {
          // 检查是否已恢复（仅适用于有恢复时间的情况）
          if (account.recoverAt && now >= account.recoverAt) {
            account.isAvailable = true
            account.consecutiveFailures = 0
            account.recoverAt = undefined
            return true
          }
          return false
        }
        // 检查速率限制恢复时间
        if (account.recoverAt && now < account.recoverAt) {
          return false
        }
        return true
      })

    if (availableAccounts.length === 0) {
      return null
    }

    switch (this.strategy) {
      case 'round-robin':
        return this.getRoundRobinAccount(availableAccounts)
      case 'weighted':
        return this.getWeightedAccount(availableAccounts)
      case 'least-loaded':
        return this.getLeastLoadedAccount(availableAccounts)
      default:
        return this.getRoundRobinAccount(availableAccounts)
    }
  }

  /**
   * 轮询策略
   */
  private getRoundRobinAccount(accounts: AccountState[]): AccountState {
    const account = accounts[this.roundRobinIndex % accounts.length]
    this.roundRobinIndex = (this.roundRobinIndex + 1) % accounts.length
    return account
  }

  /**
   * 加权策略
   */
  private getWeightedAccount(accounts: AccountState[]): AccountState {
    const totalWeight = accounts.reduce((sum, acc) => sum + acc.weight, 0)
    let random = Math.random() * totalWeight

    for (const account of accounts) {
      random -= account.weight
      if (random <= 0) {
        return account
      }
    }

    return accounts[0]
  }

  /**
   * 最少负载策略
   */
  private getLeastLoadedAccount(accounts: AccountState[]): AccountState {
    return accounts.reduce((min, acc) =>
      acc.currentLoad < min.currentLoad ? acc : min
    )
  }

  /**
   * 生成文本（自动轮询账号）
   */
  async generateText(
    params: TextGenerateParams,
    onStream?: StreamCallback
  ): Promise<TextGenerateResult> {
    return this.executeWithFailover(async (account) => {
      return await account.client.generateText(params, onStream)
    }, 'text')
  }

  /**
   * 生成图片（自动轮询账号）
   */
  async generateImage(params: ImageGenerateParams): Promise<ImageGenerateResult> {
    return this.executeWithFailover(async (account) => {
      return await account.client.generateImage(params)
    }, 'image')
  }

  /**
   * 生成视频（自动轮询账号）
   */
  async generateVideo(params: VideoGenerateParams): Promise<VideoGenerateResult> {
    return this.executeWithFailover(async (account) => {
      return await account.client.generateVideo(params)
    }, 'video')
  }

  /**
   * 生成语音（自动轮询账号）
   */
  async generateAudio(params: AudioGenerateParams): Promise<AudioGenerateResult> {
    return this.executeWithFailover(async (account) => {
      return await account.client.generateAudio(params)
    }, 'audio')
  }

  /**
   * 执行带失败重试的操作
   */
  private async executeWithFailover<T>(
    fn: (account: AccountState) => Promise<T>,
    operationType: string
  ): Promise<T> {
    let lastError: AIError | null = null
    const triedAccounts = new Set<string>()

    while (triedAccounts.size < this.accountList.length) {
      const account = this.getAvailableAccount()

      if (!account) {
        throw new Error('所有账号都不可用，请稍后重试')
      }

      if (triedAccounts.has(account.name)) {
        break // 已经试过了所有账号
      }

      triedAccounts.add(account.name)

      // 更新负载和请求计数
      account.currentLoad++
      account.totalRequests++
      account.lastRequestTime = Date.now()

      try {
        const result = await fn(account)

        // 成功
        account.consecutiveFailures = 0
        account.successRequests++
        account.isAvailable = true

        return result
      } catch (error) {
        const aiError = this.toAIError(error, account.name)
        lastError = aiError

        // 失败
        account.consecutiveFailures++
        account.failedRequests++
        account.lastFailureTime = Date.now()

        // 检查是否需要暂时禁用账号
        if (this.shouldDisableAccount(account, aiError)) {
          account.isAvailable = false
          account.recoverAt = Date.now() + this.recoverTimeMs
          getLogger().warn(
            `[MultiAccountBalancer] 账号 ${account.name} 暂时禁用，` +
            `原因：${aiError.code}, 将在 ${this.recoverTimeMs / 1000}秒后恢复`
          )
        }

        // 检查错误是否可重试（如速率限制）
        if (this.isRetryableError(aiError)) {
          getLogger().info(
            `[MultiAccountBalancer] 账号 ${account.name} ${operationType} 失败，` +
            `切换到下一个账号...`
          )
          continue // 重试下一个账号
        }

        // 不可重试的错误，直接抛出
        throw aiError
      } finally {
        account.currentLoad--
      }
    }

    // 所有账号都失败了
    throw lastError || new Error(`${operationType} 生成失败`)
  }

  /**
   * 判断是否应该禁用账号
   */
  private shouldDisableAccount(account: AccountState, error: AIError): boolean {
    // 速率限制错误，暂时禁用
    if (error.code === 'RATE_LIMIT') {
      return true
    }

    // 认证错误，直接禁用（需要人工介入，不自动恢复）
    if (error.code === 'AUTH_ERROR') {
      account.recoverAt = undefined
      return true
    }

    // 连续失败超过阈值，暂时禁用
    if (account.consecutiveFailures >= this.failureThreshold) {
      return true
    }

    return false
  }

  /**
   * 判断错误是否可重试（切换到其他账号）
   */
  private isRetryableError(error: AIError): boolean {
    const retryableCodes = ['RATE_LIMIT', 'TIMEOUT', 'NETWORK_ERROR', 'INTERNAL_ERROR']
    return retryableCodes.includes(error.code)
  }

  /**
   * 转换为 AI 错误
   */
  private toAIError(error: unknown, accountName: string): AIError {
    // 如果已经是 AIError，直接返回
    if (error && typeof error === 'object' && 'code' in error) {
      return error as AIError
    }

    // 处理 HTTP 响应错误
    if (error instanceof Response) {
      const statusCode = error.status
      if (statusCode === 429) {
        return {
          code: 'RATE_LIMIT',
          message: '速率限制',
          retryable: true,
          provider: `${this.provider}/${accountName}`,
          statusCode,
        }
      }
      if (statusCode === 401 || statusCode === 403) {
        return {
          code: 'AUTH_ERROR',
          message: '认证失败',
          retryable: false,
          provider: `${this.provider}/${accountName}`,
          statusCode,
        }
      }
      if (statusCode >= 500) {
        return {
          code: 'INTERNAL_ERROR',
          message: `服务器错误：${statusCode}`,
          retryable: true,
          provider: `${this.provider}/${accountName}`,
          statusCode,
        }
      }
    }

    // 处理普通 Error
    const message = error instanceof Error ? error.message : String(error)

    // 检查错误消息中的关键字
    const lowerMessage = message.toLowerCase()
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
      return {
        code: 'RATE_LIMIT',
        message,
        retryable: true,
        provider: `${this.provider}/${accountName}`,
      }
    }
    if (lowerMessage.includes('auth') || lowerMessage.includes('unauthorized') || lowerMessage.includes('api key')) {
      return {
        code: 'AUTH_ERROR',
        message,
        retryable: false,
        provider: `${this.provider}/${accountName}`,
      }
    }
    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      return {
        code: 'TIMEOUT',
        message,
        retryable: true,
        provider: `${this.provider}/${accountName}`,
      }
    }
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return {
        code: 'NETWORK_ERROR',
        message,
        retryable: true,
        provider: `${this.provider}/${accountName}`,
      }
    }

    // 默认错误
    return {
      code: 'INTERNAL_ERROR',
      message,
      retryable: true,
      provider: `${this.provider}/${accountName}`,
    }
  }

  /**
   * 获取账号使用统计
   */
  getUsageStats(): Array<{
    name: string
    apiKey: string
    isAvailable: boolean
    currentLoad: number
    totalRequests: number
    successRate: number
    consecutiveFailures: number
    rateLimit?: number
  }> {
    return this.accountList.map((name) => {
      const account = this.accounts.get(name)!
      const successRate = account.totalRequests > 0
        ? (account.successRequests / account.totalRequests) * 100
        : 100

      return {
        name: account.name,
        apiKey: this.maskApiKey(account.apiKey),
        isAvailable: account.isAvailable,
        currentLoad: account.currentLoad,
        totalRequests: account.totalRequests,
        successRate,
        consecutiveFailures: account.consecutiveFailures,
        rateLimit: account.rateLimit,
      }
    })
  }

  /**
   * 获取可用账号数量
   */
  getAvailableCount(): number {
    const now = Date.now()
    return this.accountList.filter((name) => {
      const account = this.accounts.get(name)!
      if (!account.isAvailable) {
        return account.recoverAt && now >= account.recoverAt
      }
      return !account.recoverAt || now >= account.recoverAt
    }).length
  }

  /**
   * 获取总账号数量
   */
  getTotalCount(): number {
    return this.accountList.length
  }

  /**
   * 重置账号状态
   */
  resetAccount(name: string): void {
    const account = this.accounts.get(name)
    if (account) {
      account.isAvailable = true
      account.consecutiveFailures = 0
      account.recoverAt = undefined
      getLogger().info(`[MultiAccountBalancer] 账号 ${name} 状态已重置`)
    }
  }

  /**
   * 手动禁用账号
   */
  disableAccount(name: string, recoverTimeMs?: number): void {
    const account = this.accounts.get(name)
    if (account) {
      account.isAvailable = false
      account.recoverAt = recoverTimeMs ? Date.now() + recoverTimeMs : undefined
      getLogger().info(`[MultiAccountBalancer] 账号 ${name} 已手动禁用`)
    }
  }

  /**
   * 手动启用账号
   */
  enableAccount(name: string): void {
    const account = this.accounts.get(name)
    if (account) {
      account.isAvailable = true
      account.recoverAt = undefined
      getLogger().info(`[MultiAccountBalancer] 账号 ${name} 已手动启用`)
    }
  }

  /**
   * 移除账号
   */
  removeAccount(name: string): void {
    const index = this.accountList.indexOf(name)
    if (index !== -1) {
      this.accountList.splice(index, 1)
      this.accounts.delete(name)
      getLogger().info(`[MultiAccountBalancer] 账号 ${name} 已移除`)
    }
  }

  /**
   * 获取账号详情
   */
  getAccount(name: string): {
    name: string
    apiKey: string
    isAvailable: boolean
    currentLoad: number
    totalRequests: number
    successRequests: number
    failedRequests: number
    consecutiveFailures: number
    recoverAt?: number
  } | null {
    const account = this.accounts.get(name)
    if (!account) {
      return null
    }
    return {
      name: account.name,
      apiKey: this.maskApiKey(account.apiKey),
      isAvailable: account.isAvailable,
      currentLoad: account.currentLoad,
      totalRequests: account.totalRequests,
      successRequests: account.successRequests,
      failedRequests: account.failedRequests,
      consecutiveFailures: account.consecutiveFailures,
      recoverAt: account.recoverAt,
    }
  }

  /**
   * 隐藏 API Key（用于日志输出）
   */
  private maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) {
      return '***'
    }
    return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`
  }

  /**
   * 销毁负载均衡器
   */
  destroy(): void {
    this.accounts.clear()
    this.accountList.length = 0
    getLogger().info('[MultiAccountBalancer] 已销毁')
  }

  /**
   * 资源清理（Symbol.dispose 支持）
   *
   * @example
   * ```typescript
   * using balancer = createMultiAccountBalancer({...})
   * // 自动调用 dispose
   * ```
   */
  [Symbol.dispose](): void {
    this.destroy()
  }
}

/**
 * 创建多账号负载均衡器
 */
export function createMultiAccountBalancer(
  config: MultiAccountBalancerConfig
): MultiAccountBalancer {
  return new MultiAccountBalancer(config)
}
