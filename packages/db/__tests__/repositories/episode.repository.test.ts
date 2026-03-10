/**
 * Episode Repository Tests
 * 测试剧集仓储层
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { EpisodeRepository, CreateEpisodeInput, UpdateEpisodeInput, FindEpisodeOptions } from '../../src/repositories/episode.repository'

describe('EpisodeRepository', () => {
  let mockPrisma: PrismaClient
  let mockModel: any
  let mockTransaction: any
  let repository: EpisodeRepository

  beforeEach(() => {
    // 创建 mock Prisma 客户端
    mockModel = {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    }

    mockTransaction = {
      episode: {
        create: vi.fn(),
      },
    }

    mockPrisma = {
      episode: mockModel,
      storyboard: {
        count: vi.fn(),
      },
      clip: {
        count: vi.fn(),
      },
      task: {
        count: vi.fn(),
      },
      $transaction: vi.fn((fn) => fn(mockTransaction)),
    } as unknown as PrismaClient

    repository = new EpisodeRepository(mockPrisma)
  })

  describe('constructor', () => {
    it('应该使用传入的 Prisma 实例', () => {
      const customPrisma = {} as PrismaClient
      const repo = new EpisodeRepository(customPrisma)
      expect(repo['prisma']).toBe(customPrisma)
    })

    it('应该在不传入时使用全局实例', () => {
      const repo = new EpisodeRepository()
      expect(repo['prisma']).toBeDefined()
    })
  })

  describe('findById', () => {
    it('应该通过 ID 查找剧集（未删除）', async () => {
      const mockData = { id: 'episode-id', name: 'Episode 1', number: 1 }
      mockModel.findFirst.mockResolvedValue(mockData)

      const result = await repository.findById('episode-id')

      expect(mockModel.findFirst).toHaveBeenCalledWith({
        where: { id: 'episode-id', deletedAt: null },
        include: {},
      })
      expect(result).toEqual(mockData)
    })

    it('应该包含关联的剧本', async () => {
      const mockData = { id: 'episode-id', name: 'Episode 1', script: {} }
      mockModel.findFirst.mockResolvedValue(mockData)

      await repository.findById('episode-id', { includeScript: true })

      expect(mockModel.findFirst).toHaveBeenCalledWith({
        where: { id: 'episode-id', deletedAt: null },
        include: { script: true },
      })
    })

    it('应该包含多个关联', async () => {
      const mockData = {
        id: 'episode-id',
        script: {},
        storyboards: [],
        clips: [],
        tasks: [],
      }
      mockModel.findFirst.mockResolvedValue(mockData)

      await repository.findById('episode-id', {
        includeScript: true,
        includeStoryboards: true,
        includeClips: true,
        includeTasks: true,
      })

      expect(mockModel.findFirst).toHaveBeenCalledWith({
        where: { id: 'episode-id', deletedAt: null },
        include: {
          script: true,
          storyboards: true,
          clips: true,
          tasks: true,
        },
      })
    })

    it('应该包含已删除的剧集', async () => {
      const mockData = { id: 'episode-id', name: 'Episode 1', deletedAt: new Date() }
      mockModel.findUnique.mockResolvedValue(mockData)

      await repository.findById('episode-id', { withDeleted: true })

      expect(mockModel.findUnique).toHaveBeenCalledWith({
        where: { id: 'episode-id' },
        include: {},
      })
    })
  })

  describe('findByProjectId', () => {
    it('应该按项目 ID 查找所有剧集', async () => {
      const mockData = [
        { id: '1', name: 'Episode 1', number: 1 },
        { id: '2', name: 'Episode 2', number: 2 },
      ]
      mockModel.findMany.mockResolvedValue(mockData)

      const result = await repository.findByProjectId('project-id')

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-id', deletedAt: null },
        include: {},
        orderBy: { number: 'asc' },
      })
      expect(result).toEqual(mockData)
    })

    it('应该包含关联数据', async () => {
      const mockData = [{ id: '1', name: 'Episode 1', script: {} }]
      mockModel.findMany.mockResolvedValue(mockData)

      await repository.findByProjectId('project-id', { includeScript: true })

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-id', deletedAt: null },
        include: { script: true },
        orderBy: { number: 'asc' },
      })
    })

    it('应该包含已删除的剧集', async () => {
      const mockData = [{ id: '1', name: 'Episode 1', deletedAt: new Date() }]
      mockModel.findMany.mockResolvedValue(mockData)

      await repository.findByProjectId('project-id', { withDeleted: true })

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-id' },
        include: {},
        orderBy: { number: 'asc' },
      })
    })
  })

  describe('findByProjectAndNumber', () => {
    it('应该按项目和集号查找剧集', async () => {
      const mockData = { id: 'episode-id', name: 'Episode 1', number: 1 }
      mockModel.findUnique.mockResolvedValue(mockData)

      const result = await repository.findByProjectAndNumber('project-id', 1)

      expect(mockModel.findUnique).toHaveBeenCalledWith({
        where: {
          projectId_number: {
            projectId: 'project-id',
            number: 1,
          },
        },
        include: {},
      })
      expect(result).toEqual(mockData)
    })

    it('应该包含关联数据', async () => {
      const mockData = { id: 'episode-id', name: 'Episode 1', storyboards: [] }
      mockModel.findUnique.mockResolvedValue(mockData)

      await repository.findByProjectAndNumber('project-id', 1, { includeStoryboards: true })

      expect(mockModel.findUnique).toHaveBeenCalledWith({
        where: {
          projectId_number: {
            projectId: 'project-id',
            number: 1,
          },
        },
        include: { storyboards: true },
      })
    })

    it('应该在不存在时返回 null', async () => {
      mockModel.findUnique.mockResolvedValue(null)

      const result = await repository.findByProjectAndNumber('project-id', 999)

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('应该创建剧集', async () => {
      const input: CreateEpisodeInput = {
        projectId: 'project-id',
        number: 1,
        name: 'Episode 1',
      }

      const mockData = { id: 'episode-id', ...input }
      mockModel.create.mockResolvedValue(mockData)

      const result = await repository.create(input)

      expect(mockModel.create).toHaveBeenCalledWith({
        data: {
          projectId: 'project-id',
          number: 1,
          name: 'Episode 1',
          novelText: undefined,
        },
      })
      expect(result).toEqual(mockData)
    })

    it('应该创建包含小说文本的剧集', async () => {
      const input: CreateEpisodeInput = {
        projectId: 'project-id',
        number: 1,
        name: 'Episode 1',
        novelText: '从前有座山...',
      }

      const mockData = { id: 'episode-id', ...input }
      mockModel.create.mockResolvedValue(mockData)

      await repository.create(input)

      expect(mockModel.create).toHaveBeenCalledWith({
        data: {
          projectId: 'project-id',
          number: 1,
          name: 'Episode 1',
          novelText: '从前有座山...',
        },
      })
    })
  })

  describe('update', () => {
    it('应该更新剧集', async () => {
      const input: UpdateEpisodeInput = {
        name: 'Updated Episode',
        number: 2,
      }

      const mockData = { id: 'episode-id', ...input }
      mockModel.update.mockResolvedValue(mockData)

      const result = await repository.update('episode-id', input)

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'episode-id' },
        data: input,
      })
      expect(result).toEqual(mockData)
    })

    it('应该支持部分更新', async () => {
      const input: UpdateEpisodeInput = {
        novelText: '新的小说内容',
      }

      const mockData = { id: 'episode-id', novelText: '新的小说内容' }
      mockModel.update.mockResolvedValue(mockData)

      await repository.update('episode-id', input)

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'episode-id' },
        data: { novelText: '新的小说内容' },
      })
    })

    it('应该支持更新外观映射', async () => {
      const input: UpdateEpisodeInput = {
        characterAppearanceMap: {
          'char-1': 'appearance-1',
          'char-2': 'appearance-2',
        },
      }

      const mockData = { id: 'episode-id', characterAppearanceMap: input.characterAppearanceMap }
      mockModel.update.mockResolvedValue(mockData)

      await repository.update('episode-id', input)

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'episode-id' },
        data: {
          characterAppearanceMap: {
            'char-1': 'appearance-1',
            'char-2': 'appearance-2',
          },
        },
      })
    })
  })

  describe('softDelete', () => {
    it('应该软删除剧集', async () => {
      const mockData = { id: 'episode-id', deletedAt: expect.any(Date), deletedBy: null }
      mockModel.update.mockResolvedValue(mockData)

      const result = await repository.softDelete('episode-id')

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'episode-id' },
        data: {
          deletedAt: expect.any(Date),
          deletedBy: undefined,
        },
      })
    })

    it('应该支持传入 deletedBy', async () => {
      const mockData = { id: 'episode-id', deletedAt: expect.any(Date), deletedBy: 'user-123' }
      mockModel.update.mockResolvedValue(mockData)

      await repository.softDelete('episode-id', 'user-123')

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'episode-id' },
        data: {
          deletedAt: expect.any(Date),
          deletedBy: 'user-123',
        },
      })
    })
  })

  describe('restore', () => {
    it('应该恢复已删除的剧集', async () => {
      const mockData = { id: 'episode-id', deletedAt: null, deletedBy: null }
      mockModel.update.mockResolvedValue(mockData)

      const result = await repository.restore('episode-id')

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'episode-id' },
        data: {
          deletedAt: null,
          deletedBy: null,
        },
      })
      expect(result.deletedAt).toBeNull()
    })
  })

  describe('createMany', () => {
    it('应该批量创建剧集', async () => {
      const episodes: CreateEpisodeInput[] = [
        { projectId: 'project-id', number: 1, name: 'Episode 1' },
        { projectId: 'project-id', number: 2, name: 'Episode 2' },
      ]

      const mockEpisodes = episodes.map((ep, i) => ({ id: `ep-${i}`, ...ep }))
      mockTransaction.episode.create
        .mockResolvedValueOnce(mockEpisodes[0])
        .mockResolvedValueOnce(mockEpisodes[1])

      const result = await repository.createMany(episodes)

      expect(mockTransaction.episode.create).toHaveBeenCalledTimes(2)
      expect(result).toEqual(mockEpisodes)
    })

    it('应该处理空数组', async () => {
      const result = await repository.createMany([])

      expect(mockTransaction.episode.create).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })
  })

  describe('getStats', () => {
    it('应该获取剧集统计信息', async () => {
      mockPrisma.storyboard.count.mockResolvedValue(10)
      mockPrisma.clip.count.mockResolvedValue(5)
      mockPrisma.task.count.mockResolvedValue(3)

      const result = await repository.getStats('episode-id')

      expect(result).toEqual({
        storyboardCount: 10,
        clipCount: 5,
        taskCount: 3,
      })
    })

    it('应该处理空统计', async () => {
      mockPrisma.storyboard.count.mockResolvedValue(0)
      mockPrisma.clip.count.mockResolvedValue(0)
      mockPrisma.task.count.mockResolvedValue(0)

      const result = await repository.getStats('episode-id')

      expect(result).toEqual({
        storyboardCount: 0,
        clipCount: 0,
        taskCount: 0,
      })
    })
  })

  describe('TypeScript Types', () => {
    it('应该正确使用类型', () => {
      // 类型测试
      const createInput: CreateEpisodeInput = {
        projectId: 'project-id',
        number: 1,
        name: 'Episode 1',
      }

      const updateInput: UpdateEpisodeInput = {
        name: 'Updated',
        number: 2,
      }

      const options: FindEpisodeOptions = {
        includeScript: true,
        withDeleted: false,
      }

      expect(createInput.projectId).toBe('project-id')
      expect(updateInput.name).toBe('Updated')
      expect(options.includeScript).toBe(true)
    })
  })
})
