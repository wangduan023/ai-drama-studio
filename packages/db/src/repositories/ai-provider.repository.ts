/**
 * AI Provider Repository
 * AI 渠道商仓储层，封装 AI 渠道配置相关的数据库操作
 */
import { Prisma, PrismaClient, AiModelType, AiProvider, AiModel } from '@prisma/client'
import { prisma } from '../client'

export interface CreateAiProviderInput {
  name: string
  baseUrl: string
  apiKey?: string
  isActive?: boolean
  priority?: number
  weight?: number
  rateLimit?: number
  quotaDaily?: number
  metadata?: Prisma.InputJsonValue
  description?: string
}

export interface UpdateAiProviderInput {
  baseUrl?: string
  apiKey?: string
  isActive?: boolean
  priority?: number
  weight?: number
  rateLimit?: number
  quotaDaily?: number
  metadata?: Prisma.InputJsonValue
  description?: string
}

export interface FindAiProviderOptions {
  includeModels?: boolean
  onlyActive?: boolean
}

type AiProviderIncludeMap = Record<string, boolean>

export class AiProviderRepository {
  private prisma: PrismaClient

  constructor(prismaInstance?: PrismaClient) {
    this.prisma = prismaInstance || prisma
  }

  /**
   * 根据 ID 查找渠道商
   */
  async findById(
    id: string,
    options: FindAiProviderOptions = {}
  ): Promise<AiProvider | null> {
    const include = this.buildInclude(options)

    return this.prisma.aiProvider.findUnique({
      where: { id, ...(options.onlyActive ? { isActive: true } : {}) },
      include,
    })
  }

  /**
   * 根据名称查找渠道商
   */
  async findByName(
    name: string,
    options: FindAiProviderOptions = {}
  ): Promise<AiProvider | null> {
    const include = this.buildInclude(options)

    return this.prisma.aiProvider.findUnique({
      where: { name, ...(options.onlyActive ? { isActive: true } : {}) },
      include,
    })
  }

  /**
   * 查找所有渠道商
   */
  async findAll(
    options: FindAiProviderOptions = {}
  ): Promise<AiProvider[]> {
    const include = this.buildInclude(options)

    return this.prisma.aiProvider.findMany({
      where: options.onlyActive ? { isActive: true } : {},
      include,
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    })
  }

  /**
   * 创建渠道商
   */
  async create(input: CreateAiProviderInput): Promise<AiProvider> {
    const data: Prisma.AiProviderCreateInput = {
      name: input.name,
      baseUrl: input.baseUrl,
      apiKey: input.apiKey,
      isActive: input.isActive ?? true,
      priority: input.priority ?? 0,
      weight: input.weight ?? 1,
      rateLimit: input.rateLimit,
      quotaDaily: input.quotaDaily,
      metadata: input.metadata,
      description: input.description,
    }

    return this.prisma.aiProvider.create({ data })
  }

  /**
   * 更新渠道商
   */
  async update(id: string, input: UpdateAiProviderInput): Promise<AiProvider> {
    const data: Prisma.AiProviderUpdateInput = {}

    if (input.baseUrl !== undefined) data.baseUrl = input.baseUrl
    if (input.apiKey !== undefined) data.apiKey = input.apiKey
    if (input.isActive !== undefined) data.isActive = input.isActive
    if (input.priority !== undefined) data.priority = input.priority
    if (input.weight !== undefined) data.weight = input.weight
    if (input.rateLimit !== undefined) data.rateLimit = input.rateLimit
    if (input.quotaDaily !== undefined) data.quotaDaily = input.quotaDaily
    if (input.metadata !== undefined) data.metadata = input.metadata
    if (input.description !== undefined) data.description = input.description

    return this.prisma.aiProvider.update({
      where: { id },
      data,
    })
  }

  /**
   * 删除渠道商
   */
  async delete(id: string): Promise<AiProvider> {
    return this.prisma.aiProvider.delete({
      where: { id },
    })
  }

  /**
   * 启用/禁用渠道商
   */
  async toggleStatus(id: string, isActive: boolean): Promise<AiProvider> {
    return this.prisma.aiProvider.update({
      where: { id },
      data: { isActive },
    })
  }

  /**
   * 获取渠道商的模型列表
   */
  async getModels(providerId: string, type?: AiModelType): Promise<AiModel[]> {
    return this.prisma.aiModel.findMany({
      where: {
        providerId,
        ...(type ? { type } : {}),
      },
      orderBy: { name: 'asc' },
    })
  }

  /**
   * 构建 include 对象
   */
  private buildInclude(options: FindAiProviderOptions): AiProviderIncludeMap {
    const include: AiProviderIncludeMap = {}

    if (options.includeModels) include.models = true

    return include
  }
}
