/**
 * Repository 基础抽象类
 * 提供通用的 CRUD 操作和软删除支持
 */
import { prisma } from '../client'
import { PrismaClient, Prisma } from '@prisma/client'

/**
 * 软删除过滤条件
 * 默认只查询未删除的记录
 */
export const NOT_DELETED = { deletedAt: null }

/**
 * 基础 Repository 接口
 */
export interface IRepository<T, K = string> {
  findById(id: K): Promise<T | null>
  findMany(params?: FindManyParams): Promise<T[]>
  create(data: Partial<T>): Promise<T>
  update(id: K, data: Partial<T>): Promise<T>
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
 * 基础 Repository 实现
 */
export abstract class BaseRepository<Client extends PrismaClient = PrismaClient> {
  protected prisma: Client

  constructor(prismaInstance?: Client) {
    this.prisma = prismaInstance || (prisma as unknown as Client)
  }

  /**
   * 获取模型名称（用于日志和错误信息）
   */
  protected abstract getModelName(): string

  /**
   * 获取模型委托（用于动态查询）
   */
  protected getModel<Model = unknown>(prisma: PrismaClient = this.prisma): Model {
    return (prisma as unknown as Record<string, unknown>)[this.getModelName()] as Model
  }

  /**
   * 根据 ID 查找（排除已删除）
   */
  async findById<Model, K = string>(id: K, include?: Record<string, boolean>): Promise<Model | null> {
    const model = this.getModel<Model>(this.prisma) as unknown as {
      findUnique: (params: { where: { id: K }; include?: Record<string, boolean> }) => Promise<Model>
    }

    return model.findUnique({
      where: { id },
      include,
    })
  }

  /**
   * 查询多条记录（默认排除已删除）
   */
  async findMany<Model>(params: FindManyParams = {}): Promise<Model[]> {
    const {
      where = {},
      include = {},
      orderBy,
      skip = 0,
      take = 100,
      withDeleted = false,
    } = params

    const model = this.getModel<Model>(this.prisma) as unknown as {
      findMany: (params: {
        where: Record<string, unknown>
        include?: Record<string, boolean>
        orderBy?: Prisma.Enumerable<Prisma.SortOrder>
        skip?: number
        take?: number
      }) => Promise<Model[]>
    }

    // 如果模型支持软删除且未指定 withDeleted，添加 deletedAt 过滤
    const filterWhere = withDeleted ? where : { ...where, deletedAt: null }

    return model.findMany({
      where: filterWhere,
      include,
      orderBy,
      skip,
      take,
    })
  }

  /**
   * 软删除
   */
  async softDelete<Model, K = string>(
    id: K,
    deletedBy?: string,
    prismaInstance?: PrismaClient
  ): Promise<Model> {
    const prisma = prismaInstance || this.prisma
    const model = this.getModel<Model>(prisma) as unknown as {
      update: (params: {
        where: { id: K }
        data: { deletedAt: Date; deletedBy?: string }
      }) => Promise<Model>
    }

    return model.update({
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
  async restore<Model, K = string>(id: K, prismaInstance?: PrismaClient): Promise<Model> {
    const prisma = prismaInstance || this.prisma
    const model = this.getModel<Model>(prisma) as unknown as {
      update: (params: {
        where: { id: K }
        data: { deletedAt: null; deletedBy: null }
      }) => Promise<Model>
    }

    return model.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedBy: null,
      },
    })
  }

  /**
   * 硬删除（永久删除）
   */
  async hardDelete<Model, K = string>(id: K, prismaInstance?: PrismaClient): Promise<Model> {
    const prisma = prismaInstance || this.prisma
    const model = this.getModel<Model>(prisma) as unknown as {
      delete: (params: { where: { id: K } }) => Promise<Model>
    }

    return model.delete({
      where: { id },
    })
  }

  /**
   * 检查记录是否存在
   */
  async exists<K = string>(id: K, withDeleted = false): Promise<boolean> {
    const model = this.getModel(this.prisma) as unknown as {
      findUnique: (params: { where: { id: K } }) => Promise<unknown>
    }

    const record = await model.findUnique({
      where: { id },
    })

    if (!record) return false
    if (!withDeleted) {
      return (record as Record<string, unknown>).deletedAt === null
    }

    return true
  }
}
