/**
 * AI API Key Repository
 * AI 密钥仓储层，封装密钥相关的数据库操作
 */
import type { Prisma, AiApiKey, PrismaClient } from '@prisma/client'
import { BaseRepository } from './base.repository'
import { prisma } from '../client'
import { encrypt, decrypt } from '../utils/crypto'

export interface CreateAiApiKeyInput {
  providerId: string
  modelId?: string | null
  name: string
  apiKey: string
  apiSecret?: string | null
  capabilities?: string[] | null
  isActive?: boolean
  priority?: number
  weight?: number
  quotaDaily?: number | null
  description?: string | null
  proxyMode?: 'AUTO' | 'SPECIFIC' | 'NONE'
  proxyId?: string | null
}

export interface UpdateAiApiKeyInput {
  name?: string
  apiKey?: string
  apiSecret?: string | null
  capabilities?: string[] | null
  isActive?: boolean
  priority?: number
  weight?: number
  quotaDaily?: number | null
  description?: string | null
  proxyMode?: 'AUTO' | 'SPECIFIC' | 'NONE'
  proxyId?: string | null
}

export interface FindAiApiKeyOptions {
  providerId?: string
  modelId?: string | null
  isActive?: boolean
  hasQuota?: boolean
}

export class AiApiKeyRepository extends BaseRepository<'aiApiKey', AiApiKey> {
  protected readonly modelName = 'aiApiKey' as const

  constructor(prismaInstance?: PrismaClient) {
    super(prismaInstance)
  }

  /**
   * 根据 ID 查找密钥（自动解密 apiKey）
   */
  async findById(id: string): Promise<AiApiKey | null> {
    const key = await this.prisma.aiApiKey.findUnique({
      where: { id },
      include: { provider: true, model: true, proxy: true }
    })
    return key ? this.decryptKey(key) : null
  }

  /**
   * 查找所有密钥
   */
  async findAll(options: FindAiApiKeyOptions = {}): Promise<AiApiKey[]> {
    const where: Prisma.AiApiKeyWhereInput = {}
    
    if (options.providerId !== undefined) {
      where.providerId = options.providerId
    }
    if (options.modelId !== undefined) {
      where.modelId = options.modelId
    }
    if (options.isActive !== undefined) {
      where.isActive = options.isActive
    }
    if (options.hasQuota) {
      where.OR = [
        { quotaDaily: null },
        { quotaUsed: { lt: this.prisma.aiApiKey.fields.quotaDaily } }
      ]
    }

    const keys = await this.prisma.aiApiKey.findMany({
      where,
      include: { provider: true, model: true },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }]
    })

    return keys.map(k => this.decryptKey(k))
  }

  /**
   * 查找指定渠道的可用密钥
   */
  async findAvailableByProvider(
    providerId: string,
    modelId?: string
  ): Promise<AiApiKey[]> {
    const keys = await this.prisma.aiApiKey.findMany({
      where: {
        providerId,
        isActive: true,
        OR: [
          { quotaDaily: null },
          { quotaUsed: { lt: this.prisma.aiApiKey.fields.quotaDaily } }
        ],
        ...(modelId !== undefined ? {
          OR: [
            { modelId: null },
            { modelId }
          ]
        } : {})
      },
      orderBy: [{ priority: 'asc' }, { weight: 'desc' }]
    })

    return keys.map(k => this.decryptKey(k))
  }

  /**
   * 创建密钥
   */
  async create(input: CreateAiApiKeyInput): Promise<AiApiKey> {
    const key = await this.prisma.aiApiKey.create({
      data: {
        providerId: input.providerId,
        modelId: input.modelId ?? null,
        name: input.name,
        apiKey: encrypt(input.apiKey) as string,
        apiSecret: input.apiSecret ? encrypt(input.apiSecret) : null,
        capabilities: input.capabilities ? input.capabilities : null,
        isActive: input.isActive ?? true,
        priority: input.priority ?? 0,
        weight: input.weight ?? 1,
        quotaDaily: input.quotaDaily ?? null,
        description: input.description ?? null,
        proxyMode: input.proxyMode ?? 'AUTO',
        proxyId: input.proxyId ?? null
      } as Prisma.AiApiKeyUncheckedCreateInput
    })
    return this.decryptKey(key)
  }

  /**
   * 更新密钥
   */
  async update(id: string, input: UpdateAiApiKeyInput): Promise<AiApiKey> {
    const data: any = {}

    if (input.name !== undefined) data.name = input.name
    if (input.apiKey !== undefined) data.apiKey = encrypt(input.apiKey)
    if (input.apiSecret !== undefined) data.apiSecret = input.apiSecret ? encrypt(input.apiSecret) : null
    if (input.capabilities !== undefined) data.capabilities = input.capabilities ? input.capabilities : null
    if (input.isActive !== undefined) data.isActive = input.isActive
    if (input.priority !== undefined) data.priority = input.priority
    if (input.weight !== undefined) data.weight = input.weight
    if (input.quotaDaily !== undefined) data.quotaDaily = input.quotaDaily ?? null
    if (input.description !== undefined) data.description = input.description
    if (input.proxyMode !== undefined) data.proxyMode = input.proxyMode
    if (input.proxyId !== undefined) data.proxyId = input.proxyId ?? null

    const key = await this.prisma.aiApiKey.update({
      where: { id },
      data: data as Prisma.AiApiKeyUncheckedUpdateInput
    })
    return this.decryptKey(key)
  }

  /**
   * 删除密钥
   */
  async delete(id: string): Promise<AiApiKey> {
    const key = await this.prisma.aiApiKey.delete({ where: { id } })
    return this.decryptKey(key)
  }

  /**
   * 启用/禁用密钥
   */
  async toggleStatus(id: string, isActive: boolean): Promise<AiApiKey> {
    const key = await this.prisma.aiApiKey.update({
      where: { id },
      data: { isActive }
    })
    return this.decryptKey(key)
  }

  /**
   * 增加配额使用量
   */
  async incrementQuota(id: string): Promise<void> {
    await this.prisma.aiApiKey.update({
      where: { id },
      data: { 
        quotaUsed: { increment: 1 },
        lastUsedAt: new Date()
      }
    })
  }

  /**
   * 重置配额
   */
  async resetQuota(id: string): Promise<AiApiKey> {
    const key = await this.prisma.aiApiKey.update({
      where: { id },
      data: { 
        quotaUsed: 0,
        quotaResetAt: new Date()
      }
    })
    return this.decryptKey(key)
  }

  /**
   * 记录成功调用
   */
  async recordSuccess(id: string): Promise<void> {
    await this.prisma.aiApiKey.update({
      where: { id },
      data: { 
        successCount: { increment: 1 },
        lastUsedAt: new Date()
      }
    })
  }

  /**
   * 记录失败调用
   */
  async recordFail(id: string, errorMsg: string): Promise<void> {
    await this.prisma.aiApiKey.update({
      where: { id },
      data: { 
        failCount: { increment: 1 },
        lastErrorAt: new Date(),
        lastErrorMsg: errorMsg
      }
    })
  }

  /**
   * 解密密钥
   */
  private decryptKey<T extends { apiKey: string; apiSecret: string | null }>(key: T): T {
    return {
      ...key,
      apiKey: decrypt(key.apiKey),
      ...(key.apiSecret ? { apiSecret: decrypt(key.apiSecret) } : {})
    }
  }
}
