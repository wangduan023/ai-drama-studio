/**
 * AI Provider Repository
 * AI 渠道商仓储层，封装 AI 渠道配置相关的数据库操作
 */
import type { Prisma, PrismaClient, AiModelType, AiProvider, AiModel } from '@prisma/client'
import { BaseRepository } from './base.repository'
import { prisma } from '../client'
import { encrypt, decrypt, decryptFields } from '../utils/crypto'

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

export class AiProviderRepository extends BaseRepository<'aiProvider', AiProvider> {
  protected readonly modelName = 'aiProvider' as const

  constructor(prismaInstance?: PrismaClient) {
    super(prismaInstance)
  }

  /**
   * 根据 ID 查找渠道商
   * API Key 会自动解密
   */
  async findById(
    id: string,
    options: FindAiProviderOptions = {}
  ): Promise<AiProvider | null> {
    const include = this.buildInclude(options)

    // 如果需要过滤活跃状态，使用 findFirst
    if (options.onlyActive) {
      const provider = await this.prisma.aiProvider.findFirst({
        where: { id, isActive: true },
        include,
      })
      return provider ? this.decryptProvider(provider) : null
    }

    const provider = await this.prisma.aiProvider.findUnique({
      where: { id },
      include,
    })
    return provider ? this.decryptProvider(provider) : null
  }

  /**
   * 根据名称查找渠道商
   * API Key 会自动解密
   */
  async findByName(
    name: string,
    options: FindAiProviderOptions = {}
  ): Promise<AiProvider | null> {
    const include = this.buildInclude(options)

    // 如果需要过滤活跃状态，使用 findFirst
    if (options.onlyActive) {
      const provider = await this.prisma.aiProvider.findFirst({
        where: { name, isActive: true },
        include,
      })
      return provider ? this.decryptProvider(provider) : null
    }

    const provider = await this.prisma.aiProvider.findUnique({
      where: { name },
      include,
    })
    return provider ? this.decryptProvider(provider) : null
  }

  /**
   * 查找所有渠道商
   * API Key 会自动解密
   */
  async findAll(
    options: FindAiProviderOptions = {}
  ): Promise<AiProvider[]> {
    const include = this.buildInclude(options)

    const providers = await this.prisma.aiProvider.findMany({
      where: options.onlyActive ? { isActive: true } : {},
      include,
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    })

    return providers.map(provider => this.decryptProvider(provider))
  }

  /**
   * 查找所有活跃的渠道商（用于 AI 调用）
   * 返回的 API Key 已解密，可直接使用
   */
  async findActive(): Promise<AiProvider[]> {
    const providers = await this.prisma.aiProvider.findMany({
      where: { isActive: true },
      include: { models: true },
      orderBy: [{ priority: 'asc' }, { weight: 'desc' }],
    })

    return providers.map(provider => this.decryptProvider(provider))
  }

  /**
   * 创建渠道商
   * API Key 会自动加密存储
   */
  async create(input: CreateAiProviderInput): Promise<AiProvider> {
    const data: Prisma.AiProviderCreateInput = {
      name: input.name,
      baseUrl: input.baseUrl,
      apiKey: encrypt(input.apiKey),
      isActive: input.isActive ?? true,
      priority: input.priority ?? 0,
      weight: input.weight ?? 1,
      rateLimit: input.rateLimit,
      quotaDaily: input.quotaDaily,
      metadata: input.metadata,
      description: input.description,
    }

    const provider = await this.prisma.aiProvider.create({ data })
    return this.decryptProvider(provider)
  }

  /**
   * 更新渠道商
   * API Key 会自动加密存储
   */
  async update(id: string, input: UpdateAiProviderInput): Promise<AiProvider> {
    const data: Prisma.AiProviderUpdateInput = {}

    if (input.baseUrl !== undefined) data.baseUrl = input.baseUrl
    if (input.apiKey !== undefined) data.apiKey = encrypt(input.apiKey)
    if (input.isActive !== undefined) data.isActive = input.isActive
    if (input.priority !== undefined) data.priority = input.priority
    if (input.weight !== undefined) data.weight = input.weight
    if (input.rateLimit !== undefined) data.rateLimit = input.rateLimit
    if (input.quotaDaily !== undefined) data.quotaDaily = input.quotaDaily
    if (input.metadata !== undefined) data.metadata = input.metadata
    if (input.description !== undefined) data.description = input.description

    const provider = await this.prisma.aiProvider.update({
      where: { id },
      data,
    })
    return this.decryptProvider(provider)
  }

  /**
   * 删除渠道商（硬删除）
   */
  async delete(id: string): Promise<AiProvider> {
    const provider = await this.prisma.aiProvider.delete({
      where: { id },
    })
    return this.decryptProvider(provider)
  }

  /**
   * 硬删除渠道商（别名）
   */
  async hardDelete(id: string): Promise<AiProvider> {
    return this.delete(id)
  }

  /**
   * 启用/禁用渠道商
   */
  async toggleStatus(id: string, isActive: boolean): Promise<AiProvider> {
    const provider = await this.prisma.aiProvider.update({
      where: { id },
      data: { isActive },
    })
    return this.decryptProvider(provider)
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
   * 验证 API Key 是否有效（仅检查是否存在，不返回实际值）
   */
  async hasApiKey(id: string): Promise<boolean> {
    const provider = await this.prisma.aiProvider.findUnique({
      where: { id },
      select: { apiKey: true },
    })
    return !!provider?.apiKey
  }

  /**
   * 解密渠道商的 API Key
   */
  private decryptProvider<T extends { apiKey: string | null }>(provider: T): T {
    return decryptFields(provider, ['apiKey']) as T
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
