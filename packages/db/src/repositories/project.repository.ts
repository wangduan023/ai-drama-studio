/**
 * Project Repository
 * 项目聚合根的仓储层，封装项目相关的数据库操作
 */
import { Prisma, PrismaClient } from '@prisma/client'
import { BaseRepository, NOT_DELETED } from './base.repository'
import { prisma } from '../client'

export interface CreateProjectInput {
  name: string
  description?: string
  userId: string
  status?: Prisma.ProjectStatus
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  status?: Prisma.ProjectStatus
  deletedAt?: Date | null
  deletedBy?: string
}

export interface FindProjectOptions {
  includeEpisodes?: boolean
  includeCharacters?: boolean
  includeLocations?: boolean
  includeAssets?: boolean
  includeTasks?: boolean
  withDeleted?: boolean
}

export type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: {
    episodes: true
    characterProfiles: true
    locationProfiles: true
    assets: true
    tasks: true
  }
}>

type ProjectIncludeMap = Record<string, boolean>

export class ProjectRepository extends BaseRepository<PrismaClient> {
  constructor(prismaInstance?: PrismaClient) {
    super(prismaInstance)
  }

  protected getModelName(): string {
    return 'project'
  }

  /**
   * 根据 ID 查找项目（包含可选的关联数据）
   */
  async findById(
    id: string,
    options: FindProjectOptions = {}
  ): Promise<Prisma.ProjectGetPayload<{ include: ProjectIncludeMap }> | null> {
    const include = this.buildInclude(options)

    return this.prisma.project.findUnique({
      where: { id },
      include,
    }) as Promise<Prisma.ProjectGetPayload<{ include: ProjectIncludeMap }> | null>
  }

  /**
   * 查找用户的所有项目
   */
  async findByUserId(
    userId: string,
    options: FindProjectOptions = {}
  ): Promise<Prisma.ProjectGetPayload<{ include: ProjectIncludeMap }>[]> {
    const include = this.buildInclude(options)
    const where: Prisma.ProjectWhereInput = {
      userId,
      ...(options.withDeleted ? {} : { deletedAt: null }),
    }

    return this.prisma.project.findMany({
      where,
      include,
      orderBy: { updatedAt: 'desc' },
    }) as Promise<Prisma.ProjectGetPayload<{ include: ProjectIncludeMap }>[]>
  }

  /**
   * 查找状态过滤的项目
   */
  async findByStatus(
    status: Prisma.ProjectStatus,
    options: FindProjectOptions = {}
  ): Promise<Prisma.ProjectGetPayload<{ include: ProjectIncludeMap }>[]> {
    const include = this.buildInclude(options)

    return this.prisma.project.findMany({
      where: {
        status,
        deletedAt: null,
      },
      include,
      orderBy: { updatedAt: 'desc' },
    }) as Promise<Prisma.ProjectGetPayload<{ include: ProjectIncludeMap }>[]>
  }

  /**
   * 创建新项目
   */
  async create(
    input: CreateProjectInput,
    includeEpisodes = false
  ): Promise<Prisma.Project> {
    return this.prisma.project.create({
      data: {
        name: input.name,
        description: input.description,
        userId: input.userId,
        status: input.status ?? 'DRAFT',
      },
      include: {
        episodes: includeEpisodes,
      },
    })
  }

  /**
   * 更新项目
   */
  async update(
    id: string,
    input: UpdateProjectInput
  ): Promise<Prisma.Project> {
    return this.prisma.project.update({
      where: { id },
      data: input,
    })
  }

  /**
   * 软删除项目
   */
  async softDelete(id: string, deletedBy?: string): Promise<Prisma.Project> {
    return this.prisma.project.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
      },
    })
  }

  /**
   * 恢复已删除的项目
   */
  async restore(id: string): Promise<Prisma.Project> {
    return this.prisma.project.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedBy: null,
      },
    })
  }

  /**
   * 硬删除项目（谨慎使用）
   */
  async hardDelete(id: string): Promise<Prisma.Project> {
    return this.prisma.project.delete({
      where: { id },
    })
  }

  /**
   * 创建项目并附带初始剧集
   */
  async createWithEpisodes(
    input: CreateProjectInput & { episodes?: { number: number; name: string }[] }
  ): Promise<Prisma.Project & { episodes: Prisma.Episode[] }> {
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: input.name,
          description: input.description,
          userId: input.userId,
          status: input.status ?? 'DRAFT',
        },
      })

      if (input.episodes && input.episodes.length > 0) {
        await tx.episode.createMany({
          data: input.episodes.map((ep) => ({
            projectId: project.id,
            number: ep.number,
            name: ep.name,
          })),
        })
      }

      return tx.project.findUnique({
        where: { id: project.id },
        include: { episodes: true },
      }) as Promise<Prisma.Project & { episodes: Prisma.Episode[] }>
    })
  }

  /**
   * 获取项目统计信息
   */
  async getStats(projectId: string): Promise<{
    episodeCount: number
    characterCount: number
    locationCount: number
    assetCount: number
    taskCount: number
  }> {
    const [episodeCount, characterCount, locationCount, assetCount, taskCount] = await Promise.all([
      this.prisma.episode.count({ where: { projectId, deletedAt: null } }),
      this.prisma.characterProfile.count({ where: { projectId, deletedAt: null } }),
      this.prisma.locationProfile.count({ where: { projectId, deletedAt: null } }),
      this.prisma.asset.count({ where: { projectId, deletedAt: null } }),
      this.prisma.task.count({ where: { projectId } }),
    ])

    return {
      episodeCount,
      characterCount,
      locationCount,
      assetCount,
      taskCount,
    }
  }

  /**
   * 构建 include 对象
   */
  private buildInclude(options: FindProjectOptions): ProjectIncludeMap {
    const include: ProjectIncludeMap = {}

    if (options.includeEpisodes) include.episodes = true
    if (options.includeCharacters) include.characterProfiles = true
    if (options.includeLocations) include.locationProfiles = true
    if (options.includeAssets) include.assets = true
    if (options.includeTasks) include.tasks = true

    return include
  }
}
