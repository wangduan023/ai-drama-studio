/**
 * Repository 基础抽象类
 * 提供通用的 CRUD 操作、软删除支持和乐观锁
 */
import { prisma } from '../client'
import type { PrismaClient, Prisma } from '@prisma/client'

/**
 * 软删除过滤条件
 * 默认只查询未删除的记录
 */
export const NOT_DELETED = { deletedAt: null }

/**
 * 乐观锁冲突错误
 */
export class OptimisticLockError extends Error {
  constructor(entityName: string, id: string) {
    super(`乐观锁冲突：${entityName}(id=${id}) 已被其他操作修改，请刷新后重试`)
    this.name = 'OptimisticLockError'
  }
}

/**
 * 唯一性约束冲突错误
 * Prisma 错误码 P2002
 */
export class UniqueConstraintError extends Error {
  public readonly fields: string[]
  
  constructor(entityName: string, fields: string[]) {
    super(`${entityName} 已存在，重复字段: ${fields.join(', ')}`)
    this.name = 'UniqueConstraintError'
    this.fields = fields
  }
}

/**
 * 外键约束冲突错误
 * Prisma 错误码 P2003
 */
export class ForeignKeyConstraintError extends Error {
  constructor(entityName: string, fieldName: string) {
    super(`${entityName} 关联的 ${fieldName} 不存在`)
    this.name = 'ForeignKeyConstraintError'
  }
}

/**
 * 记录未找到错误
 * Prisma 错误码 P2025
 */
export class RecordNotFoundError extends Error {
  constructor(entityName: string, id: string) {
    super(`${entityName}(id=${id}) 不存在`)
    this.name = 'RecordNotFoundError'
  }
}

/**
 * Prisma 错误码枚举
 */
export enum PrismaErrorCode {
  UNIQUE_CONSTRAINT = 'P2002',
  FOREIGN_KEY_CONSTRAINT = 'P2003',
  RECORD_NOT_FOUND = 'P2025',
}

/**
 * 基础 Repository 接口
 */
export interface IRepository<T, K = string> {
  findById(id: K): Promise<T | null>
  findMany(params?: FindManyParams): Promise<T[]>
  create(data: Partial<T>): Promise<T>
  update(id: K, data: Partial<T>, version?: number): Promise<T>
  softDelete(id: K, deletedBy?: string): Promise<T>
  restore(id: K): Promise<T>
  hardDelete(id: K): Promise<T>
}

export interface FindManyParams {
  where?: Record<string, unknown>
  include?: Record<string, boolean>
  orderBy?: Prisma.Enumerable<Prisma.SortOrder>
  skip?: number
  take?: number
  withDeleted?: boolean  // 是否包含已删除的记录
}

/**
 * 支持乐观锁的实体接口
 */
export interface VersionedEntity {
  version: number
}

/**
 * Prisma 模型映射类型
 * 包含所有数据库模型，确保类型完整性
 */
export type PrismaModelMap = {
  // 核心模型
  user: Prisma.UserDelegate
  refreshToken: Prisma.RefreshTokenDelegate
  config: Prisma.ConfigDelegate
  
  // AI 渠道相关
  aiProvider: Prisma.AiProviderDelegate
  aiModel: Prisma.AiModelDelegate
  aiUsageLog: Prisma.AiUsageLogDelegate
  aiApiKey: Prisma.AiApiKeyDelegate
  aiProxy: Prisma.AiProxyDelegate
  
  // RBAC
  role: Prisma.RoleDelegate
  permission: Prisma.PermissionDelegate
  rolePermission: Prisma.RolePermissionDelegate
  userSystemRole: Prisma.UserSystemRoleDelegate
  projectMemberRole: Prisma.ProjectMemberRoleDelegate
  
  // 项目相关
  project: Prisma.ProjectDelegate
  episode: Prisma.EpisodeDelegate
  script: Prisma.ScriptDelegate
  storyboard: Prisma.StoryboardDelegate
  clip: Prisma.ClipDelegate
  
  // 角色和场景
  characterProfile: Prisma.CharacterProfileDelegate
  characterAppearance: Prisma.CharacterAppearanceDelegate
  locationProfile: Prisma.LocationProfileDelegate
  
  // 资产和任务
  asset: Prisma.AssetDelegate
  task: Prisma.TaskDelegate
  taskEvent: Prisma.TaskEventDelegate
  usageCost: Prisma.UsageCostDelegate
}

/**
 * 基础 Repository 实现
 * 
 * @template ModelName - Prisma 模型名称
 * @template T - 实体类型
 * @template K - ID 类型
 */
export abstract class BaseRepository<
  ModelName extends keyof PrismaModelMap,
  T,
  K = string
> {
  protected prisma: PrismaClient
  protected abstract readonly modelName: ModelName

  constructor(prismaInstance?: PrismaClient) {
    this.prisma = prismaInstance || prisma
  }

  /**
   * 获取模型委托
   */
  protected get model(): PrismaModelMap[ModelName] {
    return this.prisma[this.modelName] as PrismaModelMap[ModelName]
  }

  /**
   * 获取实体名称（用于错误信息）
   */
  protected get entityName(): string {
    return this.modelName
  }

  /**
   * 根据 ID 查找（排除已删除）
   */
  async findById(id: K, include?: Record<string, boolean>): Promise<T | null> {
    const delegate = this.model as unknown as {
      findUnique: (params: { 
        where: { id: K }
        include?: Record<string, boolean>
      }) => Promise<T | null>
    }

    return delegate.findUnique({
      where: { id },
      include,
    })
  }

  /**
   * 最大查询数量限制（防止查询过多数据）
   */
  protected readonly maxTakeLimit = 1000

  /**
   * 查询多条记录（默认排除已删除）
   */
  async findMany(params: FindManyParams = {}): Promise<T[]> {
    const {
      where = {},
      include = {},
      orderBy,
      skip = 0,
      take = 100,
      withDeleted = false,
    } = params

    const delegate = this.model as unknown as {
      findMany: (params: {
        where: Record<string, unknown>
        include?: Record<string, boolean>
        orderBy?: Prisma.Enumerable<Prisma.SortOrder>
        skip?: number
        take?: number
      }) => Promise<T[]>
    }

    // 限制最大查询数量，防止查询过多数据
    const safeTake = Math.min(take, this.maxTakeLimit)

    // 如果模型支持软删除且未指定 withDeleted，添加 deletedAt 过滤
    const filterWhere = withDeleted ? where : { ...where, deletedAt: null }

    return delegate.findMany({
      where: filterWhere,
      include,
      orderBy,
      skip,
      take: safeTake,
    })
  }

  /**
   * 软删除
   */
  async softDelete(id: K, deletedBy?: string, prismaInstance?: PrismaClient): Promise<T> {
    const prisma = prismaInstance || this.prisma
    const delegate = (prisma[this.modelName] as unknown as {
      update: (params: {
        where: { id: K }
        data: { deletedAt: Date; deletedBy?: string }
      }) => Promise<T>
    })

    return delegate.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
      },
    })
  }

  /**
   * 恢复已删除的记录
   */
  async restore(id: K, prismaInstance?: PrismaClient): Promise<T> {
    const prisma = prismaInstance || this.prisma
    const delegate = (prisma[this.modelName] as unknown as {
      update: (params: {
        where: { id: K }
        data: { deletedAt: null; deletedBy: null; version?: { increment: number } }
      }) => Promise<T>
    })

    return delegate.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedBy: null,
        version: { increment: 1 }, // 恢复操作也增加版本号
      },
    })
  }

  /**
   * 硬删除（永久删除）
   */
  async hardDelete(id: K, prismaInstance?: PrismaClient): Promise<T> {
    const prisma = prismaInstance || this.prisma
    const delegate = (prisma[this.modelName] as unknown as {
      delete: (params: { where: { id: K } }) => Promise<T>
    })

    return delegate.delete({
      where: { id },
    })
  }

  /**
   * 检查记录是否存在
   */
  async exists(id: K, withDeleted = false): Promise<boolean> {
    const delegate = this.model as unknown as {
      findUnique: (params: { where: { id: K } }) => Promise<unknown>
    }

    const record = await delegate.findUnique({
      where: { id },
    })

    if (!record) return false
    if (!withDeleted) {
      return (record as Record<string, unknown>).deletedAt === null
    }

    return true
  }

  /**
   * 批量软删除
   */
  async softDeleteMany(ids: K[], deletedBy?: string): Promise<number> {
    const delegate = this.model as unknown as {
      updateMany: (params: {
        where: { id: { in: K[] } }
        data: { deletedAt: Date; deletedBy?: string }
      }) => Promise<{ count: number }>
    }

    const result = await delegate.updateMany({
      where: { id: { in: ids } },
      data: {
        deletedAt: new Date(),
        deletedBy,
      },
    })

    return result.count
  }

  /**
   * 批量恢复
   */
  async restoreMany(ids: K[]): Promise<number> {
    const delegate = this.model as unknown as {
      updateMany: (params: {
        where: { id: { in: K[] } }
        data: { deletedAt: null; deletedBy: null; version?: { increment: number } }
      }) => Promise<{ count: number }>
    }

    const result = await delegate.updateMany({
      where: { id: { in: ids } },
      data: {
        deletedAt: null,
        deletedBy: null,
        version: { increment: 1 },
      },
    })

    return result.count
  }

  /**
   * 乐观锁更新
   * 
   * @param id - 实体 ID
   * @param data - 更新数据
   * @param expectedVersion - 期望的版本号
   * @returns 更新后的实体
   * @throws OptimisticLockError - 版本号不匹配时抛出
   */
  protected async updateWithVersion<T extends VersionedEntity>(
    id: K,
    data: Omit<Partial<T>, 'version'>,
    expectedVersion: number
  ): Promise<T> {
    const delegate = this.model as unknown as {
      update: (params: {
        where: { id: K; version: number }
        data: Omit<Partial<T>, 'version'> & { version: { increment: number } }
      }) => Promise<T>
      findUnique: (params: { where: { id: K } }) => Promise<T | null>
    }

    try {
      return await delegate.update({
        where: {
          id,
          version: expectedVersion,
        },
        data: {
          ...data,
          version: { increment: 1 },
        },
      })
    } catch (error) {
      // Prisma 在 where 条件不匹配时会抛出 RecordNotFound 错误
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        throw new OptimisticLockError(this.entityName, String(id))
      }
      throw error
    }
  }

  /**
   * 获取当前版本号
   */
  protected async getVersion(id: K): Promise<number | null> {
    const delegate = this.model as unknown as {
      findUnique: (params: { 
        where: { id: K }
        select: { version: true }
      }) => Promise<{ version: number } | null>
    }

    const record = await delegate.findUnique({
      where: { id },
      select: { version: true },
    })

    return record?.version ?? null
  }

  /**
   * 处理 Prisma 错误，转换为特定异常类型
   */
  protected handlePrismaError(error: unknown, id?: K): never {
    // Prisma 错误对象
    const prismaError = error as { code?: string; meta?: { target?: string[] }; message?: string }
    
    switch (prismaError.code) {
      case PrismaErrorCode.UNIQUE_CONSTRAINT:
        throw new UniqueConstraintError(
          this.entityName,
          prismaError.meta?.target || ['unknown']
        )
      
      case PrismaErrorCode.FOREIGN_KEY_CONSTRAINT:
        throw new ForeignKeyConstraintError(
          this.entityName,
          '关联字段'
        )
      
      case PrismaErrorCode.RECORD_NOT_FOUND:
        if (id !== undefined) {
          throw new RecordNotFoundError(this.entityName, String(id))
        }
        break
    }
    
    // 未知错误，原样抛出
    throw error
  }
}
