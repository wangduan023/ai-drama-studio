/**
 * AI Client - 增强型负载均衡器
 *
 * 支持优先级、权重的智能提供商选择
 * 自动故障转移和健康检查
 */

import type { AIProvider, ProviderHealthStatus, HealthStatus, ModelConfig } from './types/enhanced'
import { getLogger } from './logger'

// ============================================================
// 负载均衡器配置
// ============================================================

/**
 * 负载均衡器配置选项
 */
export interface AILoadBalancerConfig {
  /** 策略：优先级优先或权重优先（默认：'priority'） */
  strategy?: 'priority' | 'weighted' | 'round-robin'
  /** 故障转移阈值（连续失败次数，默认：3） */
  failureThreshold?: number
  /** 恢复阈值（连续成功次数恢复健康，默认：2） */
  recoveryThreshold?: number
  /** 健康检查间隔（毫秒，默认：30000） */
  healthCheckInterval?: number
  /** 请求超时时间（毫秒，默认：120000） */
  timeout?: number
}

// ============================================================
// 提供商包装器
// ============================================================

/**
 * 提供商包装器（带状态和元数据）
 */
interface ProviderWrapper {
  /** 提供商实例 */
  provider: AIProvider
  /** 提供商名称 */
  name: string
  /** 优先级（数字越小优先级越高） */
  priority: number
  /** 权重（用于加权选择） */
  weight: number
  /** 支持的模型类型 */
  supportedTypes: ('text' | 'image' | 'video')[]
  /** 当前负载 */
  currentLoad: number
  /** 连续失败次数 */
  consecutiveFailures: number
  /** 连续成功次数 */
  consecutiveSuccesses: number
  /** 是否健康 */
  isHealthy: boolean
  /** 最后使用时间 */
  lastUsed: number
  /** 平均响应时间（毫秒） */
  avgLatency: number
  /** 请求计数 */
  requestCount: number
}

// ============================================================
// 增强型负载均衡器
// ============================================================

/**
 * AI 负载均衡器
 *
 * 提供智能的提供商选择和故障转移功能
 *
 * @example
 * ```typescript
 * const balancer = new AILoadBalancer([
 *   { provider: openai, name: 'openai', priority: 1, weight: 2 },
 *   { provider: anthropic, name: 'anthropic', priority: 2, weight: 1 },
 * ])
 *
 * // 选择提供商
 * const provider = balancer.selectProvider('text')
 *
 * // 使用并处理故障
 * try {
 *   const result = await provider.generateText({ ... })
 * } catch (error) {
 *   balancer.handleFailure(provider)
 * }
 * ```
 */
export class AILoadBalancer {
  private providers: Map<string, ProviderWrapper> = new Map()
  private config: Required<AILoadBalancerConfig>
  private healthCheckTimer?: NodeJS.Timeout
  private roundRobinIndex = 0

  constructor(
    providers: Array<{
      provider: AIProvider
      name: string
      priority?: number
      weight?: number
      supportedTypes?: ('text' | 'image' | 'video')[]
    }>,
    config: AILoadBalancerConfig = {}
  ) {
    this.config = {
      strategy: config.strategy ?? 'priority',
      failureThreshold: config.failureThreshold ?? 3,
      recoveryThreshold: config.recoveryThreshold ?? 2,
      healthCheckInterval: config.healthCheckInterval ?? 30000,
      timeout: config.timeout ?? 120000,
    }

    // 初始化提供商
    for (const p of providers) {
      this.providers.set(p.name, {
        provider: p.provider,
        name: p.name,
        priority: p.priority ?? 0,
        weight: p.weight ?? 1,
        supportedTypes: p.supportedTypes ?? ['text', 'image', 'video'],
        currentLoad: 0,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        isHealthy: true,
        lastUsed: 0,
        avgLatency: 0,
        requestCount: 0,
      })
    }

    // 启动健康检查
    this.startHealthCheck()
  }

  // ============================================================
  // 提供商选择
  // ============================================================

  /**
   * 根据类型选择提供商
   *
   * @param type - 任务类型：'text' | 'image' | 'video'
   * @returns 选中的提供商
   * @throws 如果没有可用的提供商
   */
  selectProvider(type: 'text' | 'image' | 'video'): AIProvider {
    const candidates = this.getCandidates(type)

    if (candidates.length === 0) {
      // 如果没有健康候选者，尝试使用所有候选者（即使不健康）
      const allCandidates = this.getAllCandidates(type)
      if (allCandidates.length === 0) {
        throw new Error(`No provider available for type: ${type}`)
      }
      getLogger().warn(`[AILoadBalancer] No healthy providers for ${type}, using fallback`)
      return this.selectByStrategy(allCandidates)
    }

    return this.selectByStrategy(candidates)
  }

  /**
   * 获取指定类型的候选提供商（健康状态）
   */
  private getCandidates(type: 'text' | 'image' | 'video'): ProviderWrapper[] {
    return Array.from(this.providers.values()).filter(
      (p) => p.supportedTypes.includes(type) && p.isHealthy
    )
  }

  /**
   * 获取指定类型的所有候选提供商
   */
  private getAllCandidates(type: 'text' | 'image' | 'video'): ProviderWrapper[] {
    return Array.from(this.providers.values()).filter((p) =>
      p.supportedTypes.includes(type)
    )
  }

  /**
   * 根据策略选择提供商
   */
  private selectByStrategy(candidates: ProviderWrapper[]): AIProvider {
    switch (this.config.strategy) {
      case 'priority':
        return this.selectByPriority(candidates)
      case 'weighted':
        return this.selectByWeight(candidates)
      case 'round-robin':
        return this.selectByRoundRobin(candidates)
      default:
        return this.selectByPriority(candidates)
    }
  }

  /**
   * 按优先级选择（选择优先级最高的）
   */
  private selectByPriority(candidates: ProviderWrapper[]): AIProvider {
    // 按优先级排序（数字小的优先），相同优先级按权重
    const sorted = candidates.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      return b.weight - a.weight
    })

    const selected = sorted[0]
    this.recordUsage(selected)
    return selected.provider
  }

  /**
   * 按权重选择（加权随机）
   */
  private selectByWeight(candidates: ProviderWrapper[]): AIProvider {
    const totalWeight = candidates.reduce((sum, p) => sum + p.weight, 0)
    let random = Math.random() * totalWeight

    for (const candidate of candidates) {
      random -= candidate.weight
      if (random <= 0) {
        this.recordUsage(candidate)
        return candidate.provider
      }
    }

    // Fallback to first
    this.recordUsage(candidates[0])
    return candidates[0].provider
  }

  /**
   * 轮询选择
   */
  private selectByRoundRobin(candidates: ProviderWrapper[]): AIProvider {
    const sorted = candidates.sort((a, b) => a.priority - b.priority)
    const selected = sorted[this.roundRobinIndex % sorted.length]
    this.roundRobinIndex = (this.roundRobinIndex + 1) % sorted.length
    this.recordUsage(selected)
    return selected.provider
  }

  /**
   * 记录使用情况
   */
  private recordUsage(wrapper: ProviderWrapper): void {
    wrapper.currentLoad++
    wrapper.lastUsed = Date.now()
  }

  // ============================================================
  // 故障处理
  // ============================================================

  /**
   * 处理提供商失败
   *
   * @param provider - 失败的提供商
   * @param error - 错误信息（可选）
   */
  handleFailure(provider: AIProvider, error?: Error): void {
    const wrapper = this.findWrapper(provider)
    if (!wrapper) {
      return
    }

    wrapper.consecutiveFailures++
    wrapper.consecutiveSuccesses = 0
    wrapper.currentLoad = Math.max(0, wrapper.currentLoad - 1)

    if (wrapper.consecutiveFailures >= this.config.failureThreshold) {
      wrapper.isHealthy = false
      getLogger().warn(
        `[AILoadBalancer] Provider ${wrapper.name} marked as unhealthy after ${wrapper.consecutiveFailures} consecutive failures`
      )
    }
  }

  /**
   * 处理提供商成功
   *
   * @param provider - 成功的提供商
   * @param latency - 响应时间（毫秒，可选）
   */
  handleSuccess(provider: AIProvider, latency?: number): void {
    const wrapper = this.findWrapper(provider)
    if (!wrapper) {
      return
    }

    wrapper.consecutiveSuccesses++
    wrapper.consecutiveFailures = 0
    wrapper.currentLoad = Math.max(0, wrapper.currentLoad - 1)
    wrapper.requestCount++

    // 更新平均响应时间
    if (latency !== undefined) {
      if (wrapper.avgLatency === 0) {
        wrapper.avgLatency = latency
      } else {
        wrapper.avgLatency = wrapper.avgLatency * 0.9 + latency * 0.1
      }
    }

    // 恢复健康状态
    if (!wrapper.isHealthy && wrapper.consecutiveSuccesses >= this.config.recoveryThreshold) {
      wrapper.isHealthy = true
      getLogger().info(`[AILoadBalancer] Provider ${wrapper.name} recovered`)
    }
  }

  /**
   * 查找提供商包装器
   */
  private findWrapper(provider: AIProvider): ProviderWrapper | undefined {
    for (const wrapper of this.providers.values()) {
      if (wrapper.provider === provider) {
        return wrapper
      }
    }
    return undefined
  }

  // ============================================================
  // 健康检查
  // ============================================================

  /**
   * 执行健康检查
   *
   * @returns 所有提供商的健康状态
   */
  async healthCheck(): Promise<HealthStatus> {
    const providers: ProviderHealthStatus[] = []
    const now = new Date()

    for (const wrapper of this.providers.values()) {
      // 尝试从提供商获取健康状态（如果支持）
      let providerHealth = wrapper.provider.getHealth?.()

      if (!providerHealth) {
        // 构建健康状态
        providerHealth = {
          name: wrapper.name,
          isHealthy: wrapper.isHealthy,
          currentLoad: wrapper.currentLoad,
          consecutiveFailures: wrapper.consecutiveFailures,
          lastChecked: now,
          avgLatency: wrapper.avgLatency,
          errorRate: this.calculateErrorRate(wrapper),
        }
      }

      providers.push(providerHealth)
    }

    const healthyCount = providers.filter((p) => p.isHealthy).length

    return {
      providers,
      healthyCount,
      totalCount: providers.length,
      checkedAt: now,
    }
  }

  /**
   * 计算错误率
   */
  private calculateErrorRate(wrapper: ProviderWrapper): number {
    if (wrapper.requestCount === 0) {
      return 0
    }
    // 简化计算：使用连续失败次数作为指标
    return Math.min(wrapper.consecutiveFailures / this.config.failureThreshold, 1)
  }

  /**
   * 启动健康检查定时器
   */
  private startHealthCheck(): void {
    if (this.healthCheckTimer) {
      return
    }

    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.healthCheck()
      } catch (error) {
        getLogger().error('[AILoadBalancer] Health check failed:', error)
      }
    }, this.config.healthCheckInterval)
  }

  /**
   * 停止健康检查
   */
  stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = undefined
    }
  }

  // ============================================================
  // 状态查询
  // ============================================================

  /**
   * 获取所有提供商的状态
   */
  getStatus(): Array<{
    name: string
    isHealthy: boolean
    currentLoad: number
    priority: number
    weight: number
    consecutiveFailures: number
    avgLatency: number
  }> {
    return Array.from(this.providers.values()).map((w) => ({
      name: w.name,
      isHealthy: w.isHealthy,
      currentLoad: w.currentLoad,
      priority: w.priority,
      weight: w.weight,
      consecutiveFailures: w.consecutiveFailures,
      avgLatency: w.avgLatency,
    }))
  }

  /**
   * 获取健康提供商数量
   */
  getHealthyCount(): number {
    return Array.from(this.providers.values()).filter((p) => p.isHealthy).length
  }

  /**
   * 获取总提供商数量
   */
  getTotalCount(): number {
    return this.providers.size
  }

  /**
   * 检查是否有健康的提供商
   */
  hasHealthyProvider(): boolean {
    return Array.from(this.providers.values()).some((p) => p.isHealthy)
  }

  // ============================================================
  // 提供商管理
  // ============================================================

  /**
   * 添加提供商
   */
  addProvider(
    provider: AIProvider,
    name: string,
    options: {
      priority?: number
      weight?: number
      supportedTypes?: ('text' | 'image' | 'video')[]
    } = {}
  ): void {
    this.providers.set(name, {
      provider,
      name,
      priority: options.priority ?? 0,
      weight: options.weight ?? 1,
      supportedTypes: options.supportedTypes ?? ['text', 'image', 'video'],
      currentLoad: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      isHealthy: true,
      lastUsed: 0,
      avgLatency: 0,
      requestCount: 0,
    })
  }

  /**
   * 移除提供商
   */
  removeProvider(name: string): boolean {
    return this.providers.delete(name)
  }

  // ============================================================
  // 资源清理
  // ============================================================

  /**
   * 销毁负载均衡器
   */
  destroy(): void {
    this.stopHealthCheck()
    this.providers.clear()
  }
}

// ============================================================
// 便捷函数
// ============================================================

/**
 * 创建 AI 负载均衡器
 *
 * @param providers - 提供商列表
 * @param config - 配置选项
 * @returns 负载均衡器实例
 *
 * @example
 * ```typescript
 * const balancer = createAILoadBalancer([
 *   { provider: openai, name: 'openai', priority: 1, weight: 2 },
 *   { provider: anthropic, name: 'anthropic', priority: 2, weight: 1 },
 * ], {
 *   strategy: 'priority',
 *   failureThreshold: 3,
 * })
 * ```
 */
export function createAILoadBalancer(
  providers: Array<{
    provider: AIProvider
    name: string
    priority?: number
    weight?: number
    supportedTypes?: ('text' | 'image' | 'video')[]
  }>,
  config?: AILoadBalancerConfig
): AILoadBalancer {
  return new AILoadBalancer(providers, config)
}
