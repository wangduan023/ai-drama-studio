/**
 * Episode Repository
 * 剧集仓储层，封装剧集相关的数据库操作
 */
import type { Prisma, PrismaClient, Episode } from '@prisma/client'
import { BaseRepository } from './base.repository'
import { prisma } from '../client'

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

export class EpisodeRepository extends BaseRepository<'episode', Episode> {
  protected readonly modelName = 'episode' as const

  constructor(prismaInstance?: PrismaClient) {
    super(prismaInstance)
  }

  /**
   * 根据 ID 查找剧集
   */
  async findById(
    id: string,
    options: FindEpisodeOptions = {}
  ): Promise<Episode | null> {
    const include: Prisma.EpisodeInclude = {}

    if (options.includeScript) include.script = true
    if (options.includeStoryboards) include.storyboards = true
    if (options.includeClips) include.clips = true
    if (options.includeTasks) include.tasks = true

    // 使用 findFirst 来支持软删除过滤
    if (!options.withDeleted) {
      return this.prisma.episode.findFirst({
        where: { id, deletedAt: null },
        include,
      })
    }

    return this.prisma.episode.findUnique({
      where: { id },
      include,
    })
  }

  /**
   * 根据项目 ID 查找所有剧集
   */
  async findByProjectId(
    projectId: string,
    options: FindEpisodeOptions = {}
  ): Promise<Episode[]> {
    const include: Prisma.EpisodeInclude = {}

    if (options.includeScript) include.script = true
    if (options.includeStoryboards) include.storyboards = true
    if (options.includeClips) include.clips = true
    if (options.includeTasks) include.tasks = true

    const where: Prisma.EpisodeWhereInput = {
      projectId,
      ...(options.withDeleted ? {} : { deletedAt: null }),
    }

    return this.prisma.episode.findMany({
      where,
      include,
      orderBy: { number: 'asc' },
    })
  }

  /**
   * 根据项目和集号查找
   */
  async findByProjectAndNumber(
    projectId: string,
    number: number,
    options: FindEpisodeOptions = {}
  ): Promise<Episode | null> {
    const include: Prisma.EpisodeInclude = {}

    if (options.includeScript) include.script = true
    if (options.includeStoryboards) include.storyboards = true
    if (options.includeClips) include.clips = true
    if (options.includeTasks) include.tasks = true

    return this.prisma.episode.findUnique({
      where: {
        projectId_number: {
          projectId,
          number,
        },
      },
      include,
    })
  }

  /**
   * 创建剧集
   */
  async create(input: CreateEpisodeInput): Promise<Episode> {
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
  async update(id: string, input: UpdateEpisodeInput): Promise<Episode> {
    return this.prisma.episode.update({
      where: { id },
      data: input,
    })
  }

  // 注意：软删除、恢复、硬删除功能继承自 BaseRepository

  /**
   * 批量创建剧集
   */
  async createMany(episodes: CreateEpisodeInput[]): Promise<Episode[]> {
    return this.prisma.$transaction(async (tx) => {
      const created: Episode[] = []
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
}
