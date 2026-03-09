/**
 * AI Usage Repository
 * AI 使用记录仓储层，封装 AI API 调用记录相关的数据库操作
 */
import { Prisma, PrismaClient, AiUsageStatus, AiUsageLog } from '@prisma/client'
import { prisma } from '../client'

export interface CreateAiUsageInput {
  providerId: string
  modelId?: string
  action: string
  requestId?: string
  externalId?: string
  inputTokens?: number
  outputTokens?: number
  imageCount?: number
  videoCount?: number
  duration?: number
  cost: number
  currency?: string
  status?: AiUsageStatus
  errorCode?: string
  errorMessage?: string
  projectId?: string
  episodeId?: string
  taskId?: string
  userId?: string
  latency?: number
}

export interface FindAiUsageOptions {
  includeProject?: boolean
  includeProvider?: boolean
}

export interface AiUsageStats {
  totalRequests: number
  totalCost: number
  totalInputTokens: number
  totalOutputTokens: number
  totalImages: number
  totalVideos: number
  successRate: number
}

export class AiUsageRepository {
  private prisma: PrismaClient

  constructor(prismaInstance?: PrismaClient) {
    this.prisma = prismaInstance || prisma
  }

  /**
   * 根据 ID 查找使用记录
   */
  async findById(
    id: string,
    options: FindAiUsageOptions = {}
  ): Promise<AiUsageLog | null> {
    return this.prisma.aiUsageLog.findUnique({
      where: { id },
    })
  }

  /**
   * 根据任务 ID 查找使用记录
   */
  async findByTaskId(taskId: string): Promise<AiUsageLog[]> {
    return this.prisma.aiUsageLog.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * 根据项目 ID 查找使用记录
   */
  async findByProjectId(
    projectId: string,
    limit = 100
  ): Promise<AiUsageLog[]> {
    return this.prisma.aiUsageLog.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  /**
   * 根据时间段查找使用记录
   */
  async findByDateRange(
    startDate: Date,
    endDate: Date,
    filters?: {
      providerId?: string
      projectId?: string
      status?: AiUsageStatus
      action?: string
    }
  ): Promise<AiUsageLog[]> {
    const where: Prisma.AiUsageLogWhereInput = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (filters?.providerId) {
      where.providerId = filters.providerId
    }
    if (filters?.projectId) {
      where.projectId = filters.projectId
    }
    if (filters?.status) {
      where.status = filters.status
    }
    if (filters?.action) {
      where.action = filters.action
    }

    return this.prisma.aiUsageLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * 创建使用记录
   */
  async create(input: CreateAiUsageInput): Promise<AiUsageLog> {
    const data: Prisma.AiUsageLogCreateInput = {
      providerId: input.providerId,
      modelId: input.modelId,
      action: input.action,
      requestId: input.requestId,
      externalId: input.externalId,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
      imageCount: input.imageCount,
      videoCount: input.videoCount,
      duration: input.duration,
      cost: input.cost,
      currency: input.currency ?? 'USD',
      status: input.status ?? 'SUCCESS',
      errorCode: input.errorCode,
      errorMessage: input.errorMessage,
      latency: input.latency,
      projectId: input.projectId,
      episodeId: input.episodeId,
      taskId: input.taskId,
      userId: input.userId,
    }

    return this.prisma.aiUsageLog.create({ data })
  }

  /**
   * 批量创建使用记录
   */
  async createMany(inputs: CreateAiUsageInput[]): Promise<AiUsageLog[]> {
    return this.prisma.$transaction(async (tx) => {
      const created: AiUsageLog[] = []
      for (const input of inputs) {
        const record = await tx.aiUsageLog.create({
          data: {
            providerId: input.providerId,
            modelId: input.modelId,
            action: input.action,
            requestId: input.requestId,
            externalId: input.externalId,
            inputTokens: input.inputTokens,
            outputTokens: input.outputTokens,
            imageCount: input.imageCount,
            videoCount: input.videoCount,
            duration: input.duration,
            cost: input.cost,
            currency: input.currency ?? 'USD',
            status: input.status ?? 'SUCCESS',
            errorCode: input.errorCode,
            errorMessage: input.errorMessage,
            latency: input.latency,
            projectId: input.projectId,
            episodeId: input.episodeId,
            taskId: input.taskId,
            userId: input.userId,
          },
        })
        created.push(record)
      }
      return created
    })
  }

  /**
   * 获取统计数据
   */
  async getStats(
    startDate: Date,
    endDate: Date,
    filters?: {
      providerId?: string
      projectId?: string
      userId?: string
    }
  ): Promise<AiUsageStats> {
    const where: Prisma.AiUsageLogWhereInput = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (filters?.providerId) {
      where.providerId = filters.providerId
    }
    if (filters?.projectId) {
      where.projectId = filters.projectId
    }
    if (filters?.userId) {
      where.userId = filters.userId
    }

    const records = await this.prisma.aiUsageLog.findMany({
      where,
      select: {
        cost: true,
        inputTokens: true,
        outputTokens: true,
        imageCount: true,
        videoCount: true,
        status: true,
      },
    })

    const stats: AiUsageStats = {
      totalRequests: records.length,
      totalCost: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalImages: 0,
      totalVideos: 0,
      successRate: 0,
    }

    let successCount = 0
    for (const record of records) {
      stats.totalCost += record.cost || 0
      stats.totalInputTokens += record.inputTokens || 0
      stats.totalOutputTokens += record.outputTokens || 0
      stats.totalImages += record.imageCount || 0
      stats.totalVideos += record.videoCount || 0

      if (record.status === 'SUCCESS') {
        successCount++
      }
    }

    stats.successRate = records.length > 0 ? (successCount / records.length) * 100 : 0

    return stats
  }

  /**
   * 获取按 Provider 分组的统计
   */
  async getStatsByProvider(
    startDate: Date,
    endDate: Date,
    filters?: {
      projectId?: string
      userId?: string
    }
  ): Promise<{ providerId: string; totalCost: number; totalRequests: number }[]> {
    const where: Prisma.AiUsageLogWhereInput = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (filters?.projectId) {
      where.projectId = filters.projectId
    }
    if (filters?.userId) {
      where.userId = filters.userId
    }

    // 使用 groupBy 进行分组统计
    const grouped = await this.prisma.aiUsageLog.groupBy({
      by: ['providerId'],
      where,
      _sum: {
        cost: true,
      },
      _count: {
        id: true,
      },
    })

    return grouped.map((g) => ({
      providerId: g.providerId,
      totalCost: g._sum.cost || 0,
      totalRequests: g._count.id,
    }))
  }

  /**
   * 获取按类型分组的统计
   */
  async getStatsByAction(
    startDate: Date,
    endDate: Date,
    filters?: {
      providerId?: string
      projectId?: string
    }
  ): Promise<{ action: string; totalCost: number; totalRequests: number }[]> {
    const where: Prisma.AiUsageLogWhereInput = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (filters?.providerId) {
      where.providerId = filters.providerId
    }
    if (filters?.projectId) {
      where.projectId = filters.projectId
    }

    const grouped = await this.prisma.aiUsageLog.groupBy({
      by: ['action'],
      where,
      _sum: {
        cost: true,
      },
      _count: {
        id: true,
      },
    })

    return grouped.map((g) => ({
      action: g.action,
      totalCost: g._sum.cost || 0,
      totalRequests: g._count.id,
    }))
  }

  /**
   * 删除过期记录
   */
  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.prisma.aiUsageLog.deleteMany({
      where: {
        createdAt: {
          lt: date,
        },
      },
    })

    return result.count
  }
}
