/**
 * AI Proxy Repository
 * 代理服务器仓储层
 */
import type { Prisma, AiProxy, PrismaClient } from '@prisma/client'
import { BaseRepository } from './base.repository'
import { prisma } from '../client'
import { encrypt, decrypt } from '../utils/crypto'

export interface CreateAiProxyInput {
  name: string
  host: string
  port: number
  protocol?: 'HTTP' | 'HTTPS' | 'SOCKS5'
  username?: string | null
  password?: string | null
  location?: string | null
  provider?: string | null
  maxConcurrent?: number
  description?: string | null
}

export interface UpdateAiProxyInput {
  name?: string
  host?: string
  port?: number
  protocol?: 'HTTP' | 'HTTPS' | 'SOCKS5'
  username?: string | null
  password?: string | null
  location?: string | null
  provider?: string | null
  isActive?: boolean
  maxConcurrent?: number
  description?: string | null
}

export interface UpdateHealthStatusInput {
  isHealthy: boolean
  latency?: number
  error?: string | null
}

export class AiProxyRepository extends BaseRepository<'aiProxy', AiProxy> {
  protected readonly modelName = 'aiProxy' as const

  constructor(prismaInstance?: PrismaClient) {
    super(prismaInstance)
  }

  /**
   * 根据 ID 查找代理
   */
  async findById(id: string): Promise<AiProxy | null> {
    const proxy = await this.prisma.aiProxy.findUnique({
      where: { id },
      include: { apiKeys: { select: { id: true, name: true } } }
    })
    return proxy ? this.decryptProxy(proxy) : null
  }

  /**
   * 根据名称查找代理
   */
  async findByName(name: string): Promise<AiProxy | null> {
    const proxy = await this.prisma.aiProxy.findUnique({
      where: { name }
    })
    return proxy ? this.decryptProxy(proxy) : null
  }

  /**
   * 查找所有代理
   */
  async findAll(options: { 
    onlyActive?: boolean
    onlyHealthy?: boolean
    location?: string
  } = {}): Promise<AiProxy[]> {
    const where: Prisma.AiProxyWhereInput = {}

    if (options.onlyActive) {
      where.isActive = true
    }
    if (options.onlyHealthy) {
      where.isHealthy = true
    }
    if (options.location) {
      where.location = options.location
    }

    const proxies = await this.prisma.aiProxy.findMany({
      where,
      orderBy: [{ isHealthy: 'desc' }, { checkLatency: 'asc' }]
    })

    return proxies.map(p => this.decryptProxy(p))
  }

  /**
   * 查找健康的代理（用于自动选择）
   */
  async findHealthy(): Promise<AiProxy[]> {
    const proxies = await this.prisma.aiProxy.findMany({
      where: {
        isActive: true,
        isHealthy: true,
        currentConcurrent: { lt: this.prisma.aiProxy.fields.maxConcurrent }
      },
      orderBy: [
        { checkLatency: 'asc' },
        { currentConcurrent: 'asc' }
      ]
    })

    return proxies.map(p => this.decryptProxy(p))
  }

  /**
   * 创建代理
   */
  async create(input: CreateAiProxyInput): Promise<AiProxy> {
    const data: Prisma.AiProxyCreateInput = {
      name: input.name,
      host: input.host,
      port: input.port,
      protocol: input.protocol ?? 'HTTP',
      ...(input.username ? { username: input.username } : {}),
      ...(input.password ? { password: encrypt(input.password) } : {}),
      ...(input.location ? { location: input.location } : {}),
      ...(input.provider ? { provider: input.provider } : {}),
      maxConcurrent: input.maxConcurrent ?? 10,
      description: input.description
    }

    const proxy = await this.prisma.aiProxy.create({ data })
    return this.decryptProxy(proxy)
  }

  /**
   * 更新代理
   */
  async update(id: string, input: UpdateAiProxyInput): Promise<AiProxy> {
    const data: Prisma.AiProxyUpdateInput = {}

    if (input.name !== undefined) data.name = input.name
    if (input.host !== undefined) data.host = input.host
    if (input.port !== undefined) data.port = input.port
    if (input.protocol !== undefined) data.protocol = input.protocol
    if (input.username !== undefined) data.username = input.username
    if (input.password !== undefined) data.password = input.password ? encrypt(input.password) : null
    if (input.location !== undefined) data.location = input.location
    if (input.provider !== undefined) data.provider = input.provider
    if (input.isActive !== undefined) data.isActive = input.isActive
    if (input.maxConcurrent !== undefined) data.maxConcurrent = input.maxConcurrent
    if (input.description !== undefined) data.description = input.description

    const proxy = await this.prisma.aiProxy.update({
      where: { id },
      data
    })
    return this.decryptProxy(proxy)
  }

  /**
   * 删除代理
   */
  async delete(id: string): Promise<AiProxy> {
    const proxy = await this.prisma.aiProxy.delete({ where: { id } })
    return this.decryptProxy(proxy)
  }

  /**
   * 更新健康状态
   */
  async updateHealthStatus(
    id: string, 
    input: UpdateHealthStatusInput
  ): Promise<AiProxy> {
    const data: Prisma.AiProxyUpdateInput = {
      isHealthy: input.isHealthy,
      lastCheckAt: new Date(),
      ...(input.latency !== undefined ? { checkLatency: input.latency } : {}),
      ...(input.error !== undefined ? { checkError: input.error } : {}),
      ...(input.isHealthy 
        ? { consecutiveFailures: 0 } 
        : { consecutiveFailures: { increment: 1 } }
      )
    }

    const proxy = await this.prisma.aiProxy.update({
      where: { id },
      data
    })
    return this.decryptProxy(proxy)
  }

  /**
   * 更新使用统计
   */
  async updateStats(
    id: string, 
    status: 'success' | 'failed',
    latency: number
  ): Promise<void> {
    const proxy = await this.prisma.aiProxy.findUnique({
      where: { id },
      select: { totalRequests: true, avgLatency: true }
    })

    if (!proxy) return

    const newTotal = proxy.totalRequests + 1
    const newAvgLatency = proxy.avgLatency 
      ? Math.round((proxy.avgLatency * proxy.totalRequests + latency) / newTotal)
      : latency

    await this.prisma.aiProxy.update({
      where: { id },
      data: {
        totalRequests: { increment: 1 },
        ...(status === 'success' 
          ? { successRequests: { increment: 1 } }
          : { failedRequests: { increment: 1 } }
        ),
        avgLatency: newAvgLatency,
        lastUsedAt: new Date(),
        currentConcurrent: { decrement: 1 }
      }
    })
  }

  /**
   * 增加并发计数
   */
  async incrementConcurrent(id: string): Promise<boolean> {
    const proxy = await this.prisma.aiProxy.findUnique({
      where: { id },
      select: { currentConcurrent: true, maxConcurrent: true }
    })

    if (!proxy || proxy.currentConcurrent >= proxy.maxConcurrent) {
      return false
    }

    await this.prisma.aiProxy.update({
      where: { id },
      data: { currentConcurrent: { increment: 1 } }
    })

    return true
  }

  /**
   * 减少并发计数
   */
  async decrementConcurrent(id: string): Promise<void> {
    const proxy = await this.prisma.aiProxy.findUnique({
      where: { id },
      select: { currentConcurrent: true }
    })

    if (proxy && proxy.currentConcurrent > 0) {
      await this.prisma.aiProxy.update({
        where: { id },
        data: { currentConcurrent: { decrement: 1 } }
      })
    }
  }

  /**
   * 启用/禁用代理
   */
  async toggleStatus(id: string, isActive: boolean): Promise<AiProxy> {
    const proxy = await this.prisma.aiProxy.update({
      where: { id },
      data: { isActive }
    })
    return this.decryptProxy(proxy)
  }

  /**
   * 解密代理密码
   */
  private decryptProxy<T extends { password: string | null }>(proxy: T): T {
    return {
      ...proxy,
      ...(proxy.password ? { password: decrypt(proxy.password) } : {})
    }
  }
}
