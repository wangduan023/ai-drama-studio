/**
 * AI Client - 负载均衡器
 *
 * 支持策略：
 * - 轮询 (Round-Robin)
 * - 权重 (Weighted)
 * - 最少负载 (Least-Loaded)
 */

import type { AIClientType, ClientFactoryOptions } from './factory'
import { createAIClient } from './factory'
import type { AIError } from './types'

/**
 * 客户端包装器（带状态）
 */
interface ClientWrapper {
  /** 客户端实例 */
  client: AIClientType
  /** 权重 */
  weight: number
  /** 当前负载（正在处理的请求数） */
  currentLoad: number
  /** 连续失败次数 */
  consecutiveFailures: number
  /** 是否健康 */
  isHealthy: boolean
  /** 最后健康检查时间 */
  lastHealthCheck: number
  /** 配置选项 */
  options: ClientFactoryOptions
}

/**
 * 负载均衡策略
 */
export type LoadBalanceStrategy = 'round-robin' | 'weighted' | 'least-loaded' | 'priority'

/**
 * 负载均衡器配置
 */
export interface LoadBalancerConfig {
  /** 负载均衡策略 */
  strategy?: LoadBalanceStrategy
  /** 健康检查间隔 (毫秒) */
  healthCheckInterval?: number
  /** 失败阈值（超过此值标记为不健康） */
  failureThreshold?: number
  /** 恢复阈值（连续成功次数，超过此值恢复健康） */
  recoveryThreshold?: number
  /** 超时时间 (毫秒) */
  timeout?: number
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: Required<LoadBalancerConfig> = {
  strategy: 'round-robin',
  healthCheckInterval: 30000, // 30 秒
  failureThreshold: 3,
  recoveryThreshold: 2,
  timeout: 120000,
}

/**
 * AI 客户端负载均衡器
 */
export class LoadBalancer {
  /** 客户端池 */
  private readonly pool: Map<string, ClientWrapper>

  /** 配置 */
  private readonly config: Required<LoadBalancerConfig>

  /** 轮询索引 */
  private roundRobinIndex = 0

  /** 健康检查定时器 */
  private healthCheckTimer?: NodeJS.Timeout

  /** 构造函数 */
  constructor(
    clients: Array<ClientFactoryOptions & { name?: string; weight?: number }>,
    config: LoadBalancerConfig = {}
  ) {
    this.pool = new Map()
    this.config = { ...DEFAULT_CONFIG, ...config }

    // 初始化客户端池
    for (const clientConfig of clients) {
      const name = clientConfig.name || clientConfig.provider
      const weight = clientConfig.weight ?? 1

      this.pool.set(name, {
        client: createAIClient(clientConfig),
        weight,
        currentLoad: 0,
        consecutiveFailures: 0,
        isHealthy: true,
        lastHealthCheck: Date.now(),
        options: clientConfig,
      })
    }

    // 启动健康检查
    this.startHealthCheck()
  }

  /**
   * 获取客户端（根据策略）
   */
  getClient(): AIClientType | null {
    const allEntries = Array.from(this.pool.entries())
    const healthyClients = allEntries.filter(([, wrapper]) => wrapper.isHealthy) as Array<[string, ClientWrapper]>

    if (healthyClients.length === 0) {
      // 所有客户端都不健康，返回权重最高的（即使不健康）
      const allClients = allEntries as Array<[string, ClientWrapper]>
      const sorted = allClients.sort((a, b) => b[1].weight - a[1].weight)
      return sorted[0] ? sorted[0][1].client : null
    }

    switch (this.config.strategy) {
      case 'round-robin':
        return this.getRoundRobinClient(healthyClients)

      case 'weighted':
        return this.getWeightedClient(healthyClients)

      case 'least-loaded':
        return this.getLeastLoadedClient(healthyClients)

      case 'priority':
        return this.getPriorityClient(healthyClients)

      default:
        return this.getRoundRobinClient(healthyClients)
    }
  }

  /**
   * 轮询策略
   */
  private getRoundRobinClient(
    healthyClients: Array<[string, ClientWrapper]>
  ): AIClientType {
    const client = healthyClients[this.roundRobinIndex % healthyClients.length]
    this.roundRobinIndex = (this.roundRobinIndex + 1) % healthyClients.length
    this.incrementLoad(client[1])
    return client[1].client
  }

  /**
   * 权重策略（按权重比例选择）
   */
  private getWeightedClient(healthyClients: Array<[string, ClientWrapper]>): AIClientType {
    const totalWeight = healthyClients.reduce((sum, [, wrapper]) => sum + wrapper.weight, 0)
    let random = Math.random() * totalWeight

    for (const [, wrapper] of healthyClients) {
      random -= wrapper.weight
      if (random <= 0) {
        this.incrementLoad(wrapper)
        return wrapper.client
      }
    }

    //  fallback to first
    const first = healthyClients[0]
    this.incrementLoad(first[1])
    return first[1].client
  }

  /**
   * 最少负载策略
   */
  private getLeastLoadedClient(healthyClients: Array<[string, ClientWrapper]>): AIClientType {
    // 按负载/权重 比率排序
    const sorted = healthyClients.sort(
      (a, b) => a[1].currentLoad / a[1].weight - b[1].currentLoad / b[1].weight
    )

    const selected = sorted[0]
    this.incrementLoad(selected[1])
    return selected[1].client
  }

  /**
   * 优先级策略（按权重降序）
   */
  private getPriorityClient(healthyClients: Array<[string, ClientWrapper]>): AIClientType {
    const sorted = healthyClients.sort((a, b) => b[1].weight - a[1].weight)
    const selected = sorted[0]
    this.incrementLoad(selected[1])
    return selected[1].client
  }

  /**
   * 增加负载计数
   */
  private incrementLoad(wrapper: ClientWrapper): void {
    wrapper.currentLoad++
  }

  /**
   * 减少负载计数
   */
  decrementLoad(name: string): void {
    const wrapper = this.pool.get(name)
    if (wrapper) {
      wrapper.currentLoad = Math.max(0, wrapper.currentLoad - 1)
    }
  }

  /**
   * 记录成功
   */
  recordSuccess(name: string): void {
    const wrapper = this.pool.get(name)
    if (wrapper) {
      wrapper.consecutiveFailures = 0
      if (!wrapper.isHealthy && wrapper.consecutiveFailures >= this.config.recoveryThreshold) {
        wrapper.isHealthy = true
      }
    }
  }

  /**
   * 记录失败
   */
  recordFailure(name: string, error: AIError): void {
    const wrapper = this.pool.get(name)
    if (wrapper) {
      wrapper.consecutiveFailures++
      if (wrapper.consecutiveFailures >= this.config.failureThreshold) {
        wrapper.isHealthy = false
        console.warn(`[LoadBalancer] 客户端 ${name} 标记为不健康，连续失败 ${wrapper.consecutiveFailures} 次`)
      }
    }
  }

  /**
   * 获取所有客户端状态
   */
  getStatus(): Array<{
    name: string
    provider: string
    modelId: string
    isHealthy: boolean
    currentLoad: number
    weight: number
    consecutiveFailures: number
  }> {
    return Array.from(this.pool.entries()).map(([name, wrapper]) => ({
      name,
      provider: wrapper.options.provider,
      modelId: wrapper.options.modelId,
      isHealthy: wrapper.isHealthy,
      currentLoad: wrapper.currentLoad,
      weight: wrapper.weight,
      consecutiveFailures: wrapper.consecutiveFailures,
    }))
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      for (const [name, wrapper] of this.pool.entries()) {
        // 如果连续成功，恢复健康状态
        if (!wrapper.isHealthy && wrapper.consecutiveFailures >= this.config.recoveryThreshold) {
          wrapper.isHealthy = true
          console.log(`[LoadBalancer] 客户端 ${name} 已恢复健康`)
        }

        wrapper.lastHealthCheck = Date.now()
      }
    }, this.config.healthCheckInterval)
  }

  /**
   * 停止健康检查
   */
  stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = undefined
    }
  }

  /**
   * 添加客户端
   */
  addClient(
    name: string,
    options: ClientFactoryOptions,
    weight = 1
  ): void {
    this.pool.set(name, {
      client: createAIClient(options),
      weight,
      currentLoad: 0,
      consecutiveFailures: 0,
      isHealthy: true,
      lastHealthCheck: Date.now(),
      options,
    })
  }

  /**
   * 移除客户端
   */
  removeClient(name: string): void {
    this.pool.delete(name)
  }

  /**
   * 获取客户端数量
   */
  getClientCount(): number {
    return this.pool.size
  }

  /**
   * 获取健康客户端数量
   */
  getHealthyClientCount(): number {
    return Array.from(this.pool.values()).filter((w) => w.isHealthy).length
  }
}

/**
 * 创建负载均衡器
 *
 * @param clients - 客户端配置列表
 * @param strategy - 负载均衡策略
 * @returns 负载均衡器实例
 *
 * @example
 * ```typescript
 * const loadBalancer = createLoadBalancer([
 *   {
 *     provider: 'openai',
 *     modelId: 'gpt-4o',
 *     apiKey: process.env.OPENAI_API_KEY,
 *     weight: 2,
 *   },
 *   {
 *     provider: 'anthropic',
 *     modelId: 'claude-3-7-sonnet-20250219',
 *     apiKey: process.env.ANTHROPIC_API_KEY,
 *     weight: 1,
 *   },
 * ], 'weighted')
 *
 * // 获取客户端
 * const client = loadBalancer.getClient()
 * ```
 */
export function createLoadBalancer(
  clients: Array<ClientFactoryOptions & { name?: string; weight?: number }>,
  strategy: LoadBalanceStrategy = 'round-robin'
): LoadBalancer {
  return new LoadBalancer(clients, { strategy })
}
