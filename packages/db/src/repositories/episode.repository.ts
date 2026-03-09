/**
 * Episode Repository
 * 剧集仓储层，封装剧集相关的数据库操作
 */
import { Prisma, PrismaClient } from '@prisma/client'
import { BaseRepository } from './base.repository'

export interface CreateEpisodeInput {
  projectId: string
  number: number
  name: string
  novelText?: string
}

export interface UpdateEpisodeInput {
  number?: number
  name?: string
  novelText?: string
  characterAppearanceMap?: Record<string, string>
  deletedAt?: Date | null
  deletedBy?: string
}

export interface FindEpisodeOptions {
  includeScript?: boolean
  includeStoryboards?: boolean
  includeClips?: boolean
  includeTasks?: boolean
  withDeleted?: boolean
}

type EpisodeIncludeMap = Record<string, boolean>

export class EpisodeRepository extends BaseRepository<PrismaClient> {
  constructor(prismaInstance?: PrismaClient) {
    super(prismaInstance)
  }

  protected getModelName(): string {
    return 'episode'
  }

  /**
   * 根据 ID 查找剧集
   */
  async findById(
    id: string,
    options: FindEpisodeOptions = {}
  ): Promise<Prisma.EpisodeGetPayload<{ include: EpisodeIncludeMap }> | null> {
    const include = this.buildInclude(options)

    return this.prisma.episode.findUnique({
      where: { id },
      include,
    }) as Promise<Prisma.EpisodeGetPayload<{ include: EpisodeIncludeMap }> | null>
  }

  /**
   * 根据项目 ID 查找所有剧集
   */
  async findByProjectId(
    projectId: string,
    options: FindEpisodeOptions = {}
  ): Promise<Prisma.EpisodeGetPayload<{ include: EpisodeIncludeMap }>[]> {
    const include = this.buildInclude(options)
    const where: Prisma.EpisodeWhereInput = {
      projectId,
      ...(options.withDeleted ? {} : { deletedAt: null }),
    }

    return this.prisma.episode.findMany({
      where,
      include,
      orderBy: { number: 'asc' },
    }) as Promise<Prisma.EpisodeGetPayload<{ include: EpisodeIncludeMap }>[]>
  }

  /**
   * 根据项目和集号查找
   */
  async findByProjectAndNumber(
    projectId: string,
    number: number,
    options: FindEpisodeOptions = {}
  ): Promise<Prisma.EpisodeGetPayload<{ include: EpisodeIncludeMap }> | null> {
    const include = this.buildInclude(options)

    return this.prisma.episode.findUnique({
      where: {
        projectId_number: {
          projectId,
          number,
        },
      },
      include,
    }) as Promise<Prisma.EpisodeGetPayload<{ include: EpisodeIncludeMap }> | null>
  }

  /**
   * 创建剧集
   */
  async create(input: CreateEpisodeInput): Promise<Prisma.Episode> {
    return this.prisma.episode.create({
      data: {
        projectId: input.projectId,
        number: input.number,
        name: input.name,
        novelText: input.novelText,
      },
    })
  }

  /**
   * 更新剧集
   */
  async update(id: string, input: UpdateEpisodeInput): Promise<Prisma.Episode> {
    return this.prisma.episode.update({
      where: { id },
      data: input,
    })
  }

  /**
   * 软删除剧集
   */
  async softDelete(id: string, deletedBy?: string): Promise<Prisma.Episode> {
    return this.prisma.episode.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
      },
    })
  }

  /**
   * 恢复已删除的剧集
   */
  async restore(id: string): Promise<Prisma.Episode> {
    return this.prisma.episode.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedBy: null,
      },
    })
  }

  /**
   * 批量创建剧集
   */
  async createMany(episodes: CreateEpisodeInput[]): Promise<Prisma.Episode[]> {
    return this.prisma.$transaction(async (tx) => {
      const created: Prisma.Episode[] = []
      for (const episode of episodes) {
        const createdEpisode = await tx.episode.create({
          data: episode,
        })
        created.push(createdEpisode)
      }
      return created
    })
  }

  /**
   * 获取剧集统计信息
   */
  async getStats(episodeId: string): Promise<{
    storyboardCount: number
    clipCount: number
    taskCount: number
  }> {
    const [storyboardCount, clipCount, taskCount] = await Promise.all([
      this.prisma.storyboard.count({ where: { episodeId } }),
      this.prisma.clip.count({ where: { episodeId } }),
      this.prisma.task.count({ where: { episodeId } }),
    ])

    return { storyboardCount, clipCount, taskCount }
  }

  /**
   * 构建 include 对象
   */
  private buildInclude(options: FindEpisodeOptions): EpisodeIncludeMap {
    const include: EpisodeIncludeMap = {}

    if (options.includeScript) include.script = true
    if (options.includeStoryboards) include.storyboards = true
    if (options.includeClips) include.clips = true
    if (options.includeTasks) include.tasks = true

    return include
  }
}
