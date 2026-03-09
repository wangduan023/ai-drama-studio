/**
 * AI Model Repository
 * AI 模型仓储层，封装 AI 模型配置相关的数据库操作
 */
import { Prisma, PrismaClient, AiModelType } from '@prisma/client'
import { BaseRepository } from './base.repository'

export interface CreateAiModelInput {
  providerId: string
  modelId: string
  name: string
  type: AiModelType
  isEnabled?: boolean
  isDefault?: boolean
  maxTokens?: number
  contextWindow?: number
  inputCost?: number
  outputCost?: number
  imageCost?: number
  videoCost?: number
  currency?: string
  rateLimit?: number
  rpm?: number
  tpm?: number
  metadata?: Record<string, unknown>
  description?: string
}

export interface UpdateAiModelInput {
  name?: string
  type?: AiModelType
  isEnabled?: boolean
  isDefault?: boolean
  maxTokens?: number
  contextWindow?: number
  inputCost?: number
  outputCost?: number
  imageCost?: number
  videoCost?: number
  currency?: string
  rateLimit?: number
  rpm?: number
  tpm?: number
  metadata?: Record<string, unknown>
  description?: string
}

export interface FindAiModelOptions {
  includeProvider?: boolean
  onlyEnabled?: boolean
}

type AiModelIncludeMap = Record<string, boolean>

export class AiModelRepository extends BaseRepository<PrismaClient> {
  constructor(prismaInstance?: PrismaClient) {
    super(prismaInstance)
  }

  protected getModelName(): string {
    return 'aiModel'
  }

  /**
   * 根据 ID 查找模型
   */
  async findById(
    id: string,
    options: FindAiModelOptions = {}
  ): Promise<Prisma.AiModelGetPayload<{ include: AiModelIncludeMap }> | null> {
    const include = this.buildInclude(options)
    const where: Prisma.AiModelWhereInput = { id }

    if (options.onlyEnabled) {
      where.isEnabled = true
    }

    return this.prisma.aiModel.findUnique({
      where,
      include,
    }) as Promise<Prisma.AiModelGetPayload<{ include: AiModelIncludeMap }> | null>
  }

  /**
   * 根据 provider 和 modelId 查找
   */
  async findByProviderAndModel(
    providerId: string,
    modelId: string,
    options: FindAiModelOptions = {}
  ): Promise<Prisma.AiModelGetPayload<{ include: AiModelIncludeMap }> | null> {
    const include = this.buildInclude(options)

    return this.prisma.aiModel.findUnique({
      where: {
        providerId_modelId: {
          providerId,
          modelId,
        },
      },
      include,
    }) as Promise<Prisma.AiModelGetPayload<{ include: AiModelIncludeMap }> | null>
  }

  /**
   * 根据类型查找所有模型
   */
  async findByType(
    type: AiModelType,
    options: FindAiModelOptions = {}
  ): Promise<Prisma.AiModelGetPayload<{ include: AiModelIncludeMap }>[]> {
    const include = this.buildInclude(options)
    const where: Prisma.AiModelWhereInput = { type }

    if (options.onlyEnabled) {
      where.isEnabled = true
    }

    return this.prisma.aiModel.findMany({
      where,
      include,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    }) as Promise<Prisma.AiModelGetPayload<{ include: AiModelIncludeMap }>[]>
  }

  /**
   * 获取某 provider 的所有模型
   */
  async findByProvider(
    providerId: string,
    options: FindAiModelOptions = {}
  ): Promise<Prisma.AiModelGetPayload<{ include: AiModelIncludeMap }>[]> {
    const include = this.buildInclude(options)
    const where: Prisma.AiModelWhereInput = { providerId }

    if (options.onlyEnabled) {
      where.isEnabled = true
    }

    return this.prisma.aiModel.findMany({
      where,
      include,
      orderBy: { name: 'asc' },
    }) as Promise<Prisma.AiModelGetPayload<{ include: AiModelIncludeMap }>[]>
  }

  /**
   * 获取某类型的默认模型
   */
  async getDefaultModel(
    type: AiModelType
  ): Promise<Prisma.AiModelGetPayload<{ include: { provider: true } }> | null> {
    return this.prisma.aiModel.findFirst({
      where: {
        type,
        isDefault: true,
        isEnabled: true,
      },
      include: { provider: true },
    })
  }

  /**
   * 创建模型
   */
  async create(input: CreateAiModelInput): Promise<Prisma.AiModel> {
    const data: Prisma.AiModelCreateInput = {
      provider: { connect: { id: input.providerId } },
      modelId: input.modelId,
      name: input.name,
      type: input.type,
      isEnabled: input.isEnabled ?? true,
      isDefault: input.isDefault ?? false,
      maxTokens: input.maxTokens,
      contextWindow: input.contextWindow,
      inputCost: input.inputCost,
      outputCost: input.outputCost,
      imageCost: input.imageCost,
      videoCost: input.videoCost,
      currency: input.currency ?? 'USD',
      rateLimit: input.rateLimit,
      rpm: input.rpm,
      tpm: input.tpm,
      metadata: input.metadata !== undefined ? (input.metadata ? JSON.stringify(input.metadata) : null) : undefined,
      description: input.description,
    }

    return this.prisma.aiModel.create({ data })
  }

  /**
   * 更新模型
   */
  async update(id: string, input: UpdateAiModelInput): Promise<Prisma.AiModel> {
    const data: Prisma.AiModelUpdateInput = {}

    if (input.name !== undefined) data.name = input.name
    if (input.type !== undefined) data.type = input.type
    if (input.isEnabled !== undefined) data.isEnabled = input.isEnabled
    if (input.isDefault !== undefined) data.isDefault = input.isDefault
    if (input.maxTokens !== undefined) data.maxTokens = input.maxTokens
    if (input.contextWindow !== undefined) data.contextWindow = input.contextWindow
    if (input.inputCost !== undefined) data.inputCost = input.inputCost
    if (input.outputCost !== undefined) data.outputCost = input.outputCost
    if (input.imageCost !== undefined) data.imageCost = input.imageCost
    if (input.videoCost !== undefined) data.videoCost = input.videoCost
    if (input.currency !== undefined) data.currency = input.currency
    if (input.rateLimit !== undefined) data.rateLimit = input.rateLimit
    if (input.rpm !== undefined) data.rpm = input.rpm
    if (input.tpm !== undefined) data.tpm = input.tpm
    if (input.metadata !== undefined) data.metadata = input.metadata ? JSON.stringify(input.metadata) : null
    if (input.description !== undefined) data.description = input.description

    return this.prisma.aiModel.update({
      where: { id },
      data,
    })
  }

  /**
   * 删除模型
   */
  async delete(id: string): Promise<Prisma.AiModel> {
    return this.prisma.aiModel.delete({
      where: { id },
    })
  }

  /**
   * 设置默认模型（自动取消其他模型的默认状态）
   */
  async setAsDefault(modelId: string, type: AiModelType): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 取消同类型所有模型的默认状态
      await tx.aiModel.updateMany({
        where: { type, isDefault: true },
        data: { isDefault: false },
      })

      // 设置指定模型为默认
      await tx.aiModel.update({
        where: { id: modelId },
        data: { isDefault: true },
      })
    })
  }

  /**
   * 构建 include 对象
   */
  private buildInclude(options: FindAiModelOptions): AiModelIncludeMap {
    const include: AiModelIncludeMap = {}

    if (options.includeProvider) include.provider = true

    return include
  }
}
