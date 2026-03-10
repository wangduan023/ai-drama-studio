/**
 * AI Proxy Repository - 代理配置数据访问层
 */

import { prisma } from '../client'
import { BaseRepository } from './base.repository'
import type { AiProxy, Prisma, PrismaClient } from '@prisma/client'

export interface CreateProxyInput {
  name: string
  host: string
  port: number
  protocol?: string
  username?: string
  password?: string
  location?: string
  provider?: string
  maxConcurrent?: number
  description?: string
}

export interface UpdateProxyInput extends Partial<CreateProxyInput> {
  isActive?: boolean
  isHealthy?: boolean
}

export interface ProxyQuery {
  isActive?: boolean
  isHealthy?: boolean
  search?: string
}

export class AiProxyRepository extends BaseRepository<'aiProxy', AiProxy> {
  protected readonly modelName = 'aiProxy' as const

  constructor(prismaInstance?: PrismaClient) {
    super(prismaInstance)
  }

  /**
   * 创建代理
   */
  async create(input: CreateProxyInput): Promise<AiProxy> {
    return this.prisma.aiProxy.create({
      data: {
        ...input,
        protocol: input.protocol || 'http',
        maxConcurrent: input.maxConcurrent || 10,
      },
    })
  }

  /**
   * 根据 ID 查找代理（包含关联的渠道商）
   */
  async findById(id: string, includeUsedBy = true): Promise<AiProxy | null> {
    if (!includeUsedBy) {
      return this.prisma.aiProxy.findUnique({
        where: { id },
      })
    }

    return this.prisma.aiProxy.findUnique({
      where: { id },
      include: {
        usedByProviders: {
          select: {
            id: true,
            name: true,
            proxyMode: true,
          },
        },
      },
    })
  }

  /**
   * 查询代理列表
   */
  async findAll(query: ProxyQuery = {}): Promise<AiProxy[]> {
    const where: Prisma.AiProxyWhereInput = {}

    if (query.isActive !== undefined) {
      where.isActive = query.isActive
    }

    if (query.isHealthy !== undefined) {
      where.isHealthy = query.isHealthy
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { host: { contains: query.search } },
        { location: { contains: query.search } },
        { description: { contains: query.search } },
      ]
    }

    return this.prisma.aiProxy.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * 获取健康的代理列表
   */
  async getHealthyProxies(): Promise<AiProxy[]> {
    return this.prisma.aiProxy.findMany({
      where: {
        isActive: true,
        isHealthy: true,
      },
      orderBy: { checkLatency: 'asc' },
    })
  }

  /**
   * 获取可用的代理（未指定健康状态，但活跃）
   */
  async getAvailableProxies(): Promise<AiProxy[]> {
    return this.prisma.aiProxy.findMany({
      where: {
        isActive: true,
      },
      orderBy: { checkLatency: 'asc' },
    })
  }

  /**
   * 更新代理
   */
  async update(id: string, input: UpdateProxyInput): Promise<AiProxy> {
    return this.prisma.aiProxy.update({
      where: { id },
      data: input,
    })
  }

  /**
   * 更新健康状态
   */
  async updateHealth(
    id: string,
    isHealthy: boolean,
    latency?: number,
    error?: string
  ): Promise<AiProxy> {
    const data: Prisma.AiProxyUpdateInput = {
      isHealthy,
      lastCheckAt: new Date(),
      checkLatency: latency,
      checkError: error,
    }

    if (isHealthy) {
      data.consecutiveFailures = 0
    } else {
      data.consecutiveFailures = { increment: 1 }
    }

    return this.prisma.aiProxy.update({
      where: { id },
      data,
    })
  }

  /**
   * 记录请求
   */
  async recordRequest(id: string, failed: boolean): Promise<AiProxy> {
    return this.prisma.aiProxy.update({
      where: { id },
      data: {
        totalRequests: { increment: 1 },
        failedRequests: failed ? { increment: 1 } : undefined,
        lastUsedAt: new Date(),
      },
    })
  }

  /**
   * 更新并发数
   */
  async updateConcurrent(id: string, delta: number): Promise<AiProxy> {
    return this.prisma.aiProxy.update({
      where: { id },
      data: {
        currentConcurrent: { increment: delta },
      },
    })
  }

  /**
   * 删除代理
   */
  async delete(id: string): Promise<AiProxy> {
    // 检查是否有渠道正在使用
    const proxy = await this.findById(id)
    if (proxy && proxy.usedByProviders.length > 0) {
      throw new Error(
        `无法删除代理 "${proxy.name}"：有 ${proxy.usedByProviders.length} 个渠道正在使用`
      )
    }

    return this.prisma.aiProxy.delete({
      where: { id },
    })
  }

  /**
   * 批量删除
   */
  async deleteMany(ids: string[]): Promise<number> {
    // 检查是否有渠道正在使用
    const conflictingProxies = await this.prisma.aiProvider.findMany({
      where: {
        proxyId: { in: ids },
      },
      select: {
        id: true,
        name: true,
        proxyId: true,
      },
    })

    if (conflictingProxies.length > 0) {
      const providerNames = conflictingProxies.map((p) => p.name).join(', ')
      throw new Error(
        `无法删除被以下渠道使用的代理：${providerNames}`
      )
    }

    const result = await this.prisma.aiProxy.deleteMany({
      where: {
        id: { in: ids },
      },
    })

    return result.count
  }

  /**
   * 获取统计数据
   */
  async getStats(): Promise<{
    total: number
    active: number
    healthy: number
    unhealthy: number
    avgLatency: number | null
  }> {
    const allProxies = await this.prisma.aiProxy.findMany({
      select: {
        isActive: true,
        isHealthy: true,
        checkLatency: true,
      },
    })

    const total = allProxies.length
    const active = allProxies.filter((p) => p.isActive).length
    const healthy = allProxies.filter((p) => p.isHealthy === true).length
    const unhealthy = allProxies.filter((p) => p.isHealthy === false).length

    const latencies = allProxies
      .filter((p) => p.checkLatency != null)
      .map((p) => p.checkLatency!)

    const avgLatency = latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : null

    return { total, active, healthy, unhealthy, avgLatency }
  }
}
