/**
 * AI Service Health Monitor
 * AI 服务健康状态监控器
 */

import {
  AiApiKeyRepository,
  AiProxyRepository,
  prisma,
} from '@ai-drama-studio/db'
import { createAIClient, AIClientType } from '@ai-drama-studio/ai-client'

export interface HealthCheckResult {
  id: string
  type: 'key' | 'proxy'
  name: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  latency?: number
  error?: string
  lastChecked: Date
}

export interface HealthCheckOptions {
  timeout?: number
  retries?: number
  autoDisable?: boolean
  consecutiveFailuresThreshold?: number
}

export class HealthMonitor {
  private keyRepo: AiApiKeyRepository
  private proxyRepo: AiProxyRepository
  private options: Required<HealthCheckOptions>

  constructor(options: HealthCheckOptions = {}) {
    this.keyRepo = new AiApiKeyRepository(prisma)
    this.proxyRepo = new AiProxyRepository(prisma)
    this.options = {
      timeout: options.timeout ?? 30000,
      retries: options.retries ?? 2,
      autoDisable: options.autoDisable ?? true,
      consecutiveFailuresThreshold: options.consecutiveFailuresThreshold ?? 3,
    }
  }

  async checkApiKey(keyId: string): Promise<HealthCheckResult> {
    const key = await this.keyRepo.findById(keyId)
    if (!key) {
      return {
        id: keyId,
        type: 'key',
        name: 'Unknown',
        status: 'unhealthy',
        error: 'Key not found',
        lastChecked: new Date(),
      }
    }

    const startTime = Date.now()
    let error: string | undefined
    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy'

    try {
      const client = createAIClient({
        provider: this.mapProviderName(key.providerId),
        modelId: key.modelId || undefined,
        apiKey: key.apiKey,
        timeout: this.options.timeout,
      })
      await this.performHealthCheck(client)
    } catch (err: any) {
      error = err.message || 'Health check failed'
      status = 'unhealthy'
    }

    const latency = Date.now() - startTime
    await this.updateKeyHealthStatus(keyId, status, latency, error)

    return {
      id: keyId,
      type: 'key',
      name: key.name,
      status,
      latency,
      error,
      lastChecked: new Date(),
    }
  }

  async checkAllApiKeys(): Promise<HealthCheckResult[]> {
    const keys = await this.keyRepo.findAll({ isActive: true })
    const results: HealthCheckResult[] = []
    for (const key of keys) {
      const result = await this.checkApiKey(key.id)
      results.push(result)
    }
    return results
  }

  async checkProxy(proxyId: string): Promise<HealthCheckResult> {
    const proxy = await this.proxyRepo.findById(proxyId)
    if (!proxy) {
      return {
        id: proxyId,
        type: 'proxy',
        name: 'Unknown',
        status: 'unhealthy',
        error: 'Proxy not found',
        lastChecked: new Date(),
      }
    }

    const startTime = Date.now()
    let error: string | undefined
    let isHealthy = true

    try {
      await this.checkProxyConnection(proxy)
    } catch (err: any) {
      error = err.message || 'Proxy connection failed'
      isHealthy = false
    }

    const latency = Date.now() - startTime
    await this.proxyRepo.updateHealthStatus(proxyId, { isHealthy, latency, error })

    if (!isHealthy && this.options.autoDisable) {
      const updatedProxy = await this.proxyRepo.findById(proxyId)
      if (updatedProxy && updatedProxy.consecutiveFailures >= this.options.consecutiveFailuresThreshold) {
        await this.proxyRepo.toggleStatus(proxyId, false)
      }
    }

    return {
      id: proxyId,
      type: 'proxy',
      name: proxy.name,
      status: isHealthy ? 'healthy' : 'unhealthy',
      latency,
      error,
      lastChecked: new Date(),
    }
  }

  async checkAllProxies(): Promise<HealthCheckResult[]> {
    const proxies = await this.proxyRepo.findAll({ onlyActive: true })
    const results: HealthCheckResult[] = []
    for (const proxy of proxies) {
      const result = await this.checkProxy(proxy.id)
      results.push(result)
    }
    return results
  }

  async performFullCheck(): Promise<{
    keys: HealthCheckResult[]
    proxies: HealthCheckResult[]
    summary: {
      total: number
      healthy: number
      unhealthy: number
      degraded: number
    }
  }> {
    const [keys, proxies] = await Promise.all([
      this.checkAllApiKeys(),
      this.checkAllProxies(),
    ])

    const all = [...keys, ...proxies]
    return {
      keys,
      proxies,
      summary: {
        total: all.length,
        healthy: all.filter(r => r.status === 'healthy').length,
        unhealthy: all.filter(r => r.status === 'unhealthy').length,
        degraded: all.filter(r => r.status === 'degraded').length,
      },
    }
  }

  private async performHealthCheck(client: AIClientType): Promise<void> {
    try {
      await client.generateText({
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 1,
      })
    } catch (error: any) {
      if (error.code === 'AUTHENTICATION_ERROR' || 
          error.message?.includes('401') ||
          error.message?.includes('Unauthorized')) {
        throw new Error('Authentication failed - invalid API key')
      }
      if (error.code === 'RATE_LIMIT') {
        throw new Error('Rate limited')
      }
    }
  }

  private async checkProxyConnection(proxy: { host: string; port: number }): Promise<void> {
    const { host, port } = proxy
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Proxy connection timeout'))
      }, this.options.timeout)

      import('net').then(({ createConnection }) => {
        const socket = createConnection(port, host, () => {
          clearTimeout(timeout)
          socket.destroy()
          resolve()
        })
        socket.on('error', (err) => {
          clearTimeout(timeout)
          reject(err)
        })
      }).catch(reject)
    })
  }

  private async updateKeyHealthStatus(
    keyId: string,
    status: 'healthy' | 'unhealthy' | 'degraded',
    latency: number,
    error?: string
  ): Promise<void> {
    if (status === 'healthy') {
      await this.keyRepo.recordSuccess(keyId)
    } else {
      await this.keyRepo.recordFail(keyId, error || 'Health check failed')
    }

    if (this.options.autoDisable && status === 'unhealthy') {
      const key = await this.keyRepo.findById(keyId)
      if (key && key.failCount >= this.options.consecutiveFailuresThreshold) {
        await this.keyRepo.toggleStatus(keyId, false)
      }
    }
  }

  private mapProviderName(providerId: string): string {
    const mapping: Record<string, string> = {
      'openai': 'openai',
      'anthropic': 'anthropic',
      'google': 'google',
      'deepseek': 'deepseek',
      'qwen': 'qwen',
    }
    return mapping[providerId.toLowerCase()] || providerId
  }
}

export function createHealthMonitor(options?: HealthCheckOptions): HealthMonitor {
  return new HealthMonitor(options)
}
