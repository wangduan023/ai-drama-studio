/**
 * Project Repository Tests
 * 测试项目仓储层
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaClient, ProjectStatus } from '@prisma/client'
import { ProjectRepository, CreateProjectInput, UpdateProjectInput, FindProjectOptions } from '../../src/repositories/project.repository'

describe('ProjectRepository', () => {
  let mockPrisma: PrismaClient
  let mockModel: any
  let mockTransaction: any
  let repository: ProjectRepository

  beforeEach(() => {
    // 创建 mock Prisma 客户端
    mockModel = {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }

    mockTransaction = {
      project: {
        create: vi.fn(),
        findUnique: vi.fn(),
      },
      episode: {
        createMany: vi.fn(),
      },
    }

    mockPrisma = {
      project: mockModel,
      episode: {
        count: vi.fn(),
      },
      characterProfile: {
        count: vi.fn(),
      },
      locationProfile: {
        count: vi.fn(),
      },
      asset: {
        count: vi.fn(),
      },
      task: {
        count: vi.fn(),
      },
      $transaction: vi.fn((fn) => fn(mockTransaction)),
    } as unknown as PrismaClient

    repository = new ProjectRepository(mockPrisma)
  })

  describe('constructor', () => {
    it('应该使用传入的 Prisma 实例', () => {
      const customPrisma = {} as PrismaClient
      const repo = new ProjectRepository(customPrisma)
      expect(repo['prisma']).toBe(customPrisma)
      expect(repo['modelName']).toBe('project')
    })

    it('应该在不传入时使用全局实例', () => {
      const repo = new ProjectRepository()
      expect(repo['prisma']).toBeDefined()
      expect(repo['modelName']).toBe('project')
    })
  })

  describe('findById', () => {
    it('应该通过 ID 查找项目（未删除）', async () => {
      const mockData = { id: 'test-id', name: 'Test Project' }
      mockModel.findFirst.mockResolvedValue(mockData)

      const result = await repository.findById('test-id')

      expect(mockModel.findFirst).toHaveBeenCalledWith({
        where: { id: 'test-id', deletedAt: null },
        include: {},
      })
      expect(result).toEqual(mockData)
    })

    it('应该包含关联的剧集', async () => {
      const mockData = { id: 'test-id', name: 'Test Project', episodes: [] }
      mockModel.findFirst.mockResolvedValue(mockData)

      await repository.findById('test-id', { includeEpisodes: true })

      expect(mockModel.findFirst).toHaveBeenCalledWith({
        where: { id: 'test-id', deletedAt: null },
        include: { episodes: true },
      })
    })

    it('应该包含多个关联', async () => {
      const mockData = {
        id: 'test-id',
        episodes: [],
        characterProfiles: [],
        locationProfiles: [],
      }
      mockModel.findFirst.mockResolvedValue(mockData)

      await repository.findById('test-id', {
        includeEpisodes: true,
        includeCharacters: true,
        includeLocations: true,
      })

      expect(mockModel.findFirst).toHaveBeenCalledWith({
        where: { id: 'test-id', deletedAt: null },
        include: {
          episodes: true,
          characterProfiles: true,
          locationProfiles: true,
        },
      })
    })

    it('应该包含已删除的项目', async () => {
      const mockData = { id: 'test-id', name: 'Test Project', deletedAt: new Date() }
      mockModel.findUnique.mockResolvedValue(mockData)

      await repository.findById('test-id', { withDeleted: true })

      expect(mockModel.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        include: {},
      })
    })
  })

  describe('findByUserId', () => {
    it('应该查找用户的所有项目，默认排除已删除', async () => {
      const mockData = [{ id: '1', name: 'Project 1' }]
      mockModel.findMany.mockResolvedValue(mockData)

      const result = await repository.findByUserId('user-123')

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          deletedAt: null,
        },
        include: {},
        orderBy: { updatedAt: 'desc' },
      })
      expect(result).toEqual(mockData)
    })

    it('应该包含已删除的项目', async () => {
      const mockData = [{ id: '1', name: 'Project 1', deletedAt: new Date() }]
      mockModel.findMany.mockResolvedValue(mockData)

      await repository.findByUserId('user-123', { withDeleted: true })

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: {},
        orderBy: { updatedAt: 'desc' },
      })
    })

    it('应该包含关联数据', async () => {
      const mockData = [{ id: '1', name: 'Project 1', episodes: [] }]
      mockModel.findMany.mockResolvedValue(mockData)

      await repository.findByUserId('user-123', { includeEpisodes: true })

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', deletedAt: null },
        include: { episodes: true },
        orderBy: { updatedAt: 'desc' },
      })
    })
  })

  describe('findByStatus', () => {
    it('应该按状态查找项目', async () => {
      const mockData = [{ id: '1', name: 'Active Project', status: 'ACTIVE' }]
      mockModel.findMany.mockResolvedValue(mockData)

      const result = await repository.findByStatus('ACTIVE')

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: {
          status: 'ACTIVE',
          deletedAt: null,
        },
        include: {},
        orderBy: { updatedAt: 'desc' },
      })
      expect(result).toEqual(mockData)
    })

    it('应该包含关联数据', async () => {
      const mockData = [{ id: '1', name: 'Project', status: 'DRAFT', tasks: [] }]
      mockModel.findMany.mockResolvedValue(mockData)

      await repository.findByStatus('DRAFT', { includeTasks: true })

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: {
          status: 'DRAFT',
          deletedAt: null,
        },
        include: { tasks: true },
        orderBy: { updatedAt: 'desc' },
      })
    })
  })

  describe('create', () => {
    it('应该创建项目', async () => {
      const input: CreateProjectInput = {
        name: 'Test Project',
        userId: 'user-123',
      }

      const mockData = { id: 'test-id', ...input }
      mockModel.create.mockResolvedValue(mockData)

      const result = await repository.create(input)

      expect(mockModel.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Project',
          userId: 'user-123',
          status: 'DRAFT',
        },
        include: { episodes: false },
      })
      expect(result).toEqual(mockData)
    })

    it('应该使用自定义状态创建', async () => {
      const input: CreateProjectInput = {
        name: 'Test Project',
        userId: 'user-123',
        status: 'ACTIVE',
      }

      const mockData = { id: 'test-id', ...input }
      mockModel.create.mockResolvedValue(mockData)

      await repository.create(input)

      expect(mockModel.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Project',
          userId: 'user-123',
          status: 'ACTIVE',
        },
        include: { episodes: false },
      })
    })

    it('应该包含剧集', async () => {
      const input: CreateProjectInput = {
        name: 'Test Project',
        userId: 'user-123',
      }

      const mockData = { id: 'test-id', ...input, episodes: [] }
      mockModel.create.mockResolvedValue(mockData)

      await repository.create(input, true)

      expect(mockModel.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Project',
          userId: 'user-123',
          status: 'DRAFT',
        },
        include: { episodes: true },
      })
    })
  })

  describe('update', () => {
    it('应该更新项目', async () => {
      const input: UpdateProjectInput = {
        name: 'Updated Project',
        status: 'ACTIVE',
      }

      const mockData = { id: 'test-id', ...input }
      mockModel.update.mockResolvedValue(mockData)

      const result = await repository.update('test-id', input)

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: input,
      })
      expect(result).toEqual(mockData)
    })

    it('应该支持部分更新', async () => {
      const input: UpdateProjectInput = {
        status: 'COMPLETED',
      }

      const mockData = { id: 'test-id', status: 'COMPLETED' }
      mockModel.update.mockResolvedValue(mockData)

      await repository.update('test-id', input)

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: { status: 'COMPLETED' },
      })
    })
  })

  describe('softDelete', () => {
    it('应该软删除项目', async () => {
      const mockData = { id: 'test-id', deletedAt: expect.any(Date), deletedBy: null }
      mockModel.update.mockResolvedValue(mockData)

      const result = await repository.softDelete('test-id')

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: {
          deletedAt: expect.any(Date),
          deletedBy: undefined,
        },
      })
    })

    it('应该支持传入 deletedBy', async () => {
      const mockData = { id: 'test-id', deletedAt: expect.any(Date), deletedBy: 'user-123' }
      mockModel.update.mockResolvedValue(mockData)

      await repository.softDelete('test-id', 'user-123')

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: {
          deletedAt: expect.any(Date),
          deletedBy: 'user-123',
        },
      })
    })
  })

  describe('restore', () => {
    it('应该恢复已删除的项目', async () => {
      const mockData = { id: 'test-id', deletedAt: null, deletedBy: null }
      mockModel.update.mockResolvedValue(mockData)

      const result = await repository.restore('test-id')

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: {
          deletedAt: null,
          deletedBy: null,
        },
      })
      expect(result.deletedAt).toBeNull()
    })
  })

  describe('hardDelete', () => {
    it('应该硬删除项目', async () => {
      const mockData = { id: 'test-id' }
      mockModel.delete.mockResolvedValue(mockData)

      const result = await repository.hardDelete('test-id')

      expect(mockModel.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      })
      expect(result).toEqual(mockData)
    })
  })

  describe('createWithEpisodes', () => {
    it('应该创建项目并附带剧集', async () => {
      const input = {
        name: 'Test Project',
        userId: 'user-123',
        episodes: [
          { number: 1, name: 'Episode 1' },
          { number: 2, name: 'Episode 2' },
        ],
      }

      const mockProject = { id: 'project-id', name: 'Test Project' }
      mockTransaction.project.create.mockResolvedValue(mockProject)
      mockTransaction.episode.createMany.mockResolvedValue({ count: 2 })
      mockTransaction.project.findUnique.mockResolvedValue({
        ...mockProject,
        episodes: input.episodes,
      })

      const result = await repository.createWithEpisodes(input)

      expect(mockTransaction.project.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Project',
          userId: 'user-123',
          status: 'DRAFT',
        },
      })

      expect(mockTransaction.episode.createMany).toHaveBeenCalledWith({
        data: [
          { projectId: 'project-id', number: 1, name: 'Episode 1' },
          { projectId: 'project-id', number: 2, name: 'Episode 2' },
        ],
      })

      expect(result.episodes).toHaveLength(2)
    })

    it('应该创建没有剧集的项目', async () => {
      const input = {
        name: 'Test Project',
        userId: 'user-123',
      }

      const mockProject = { id: 'project-id', name: 'Test Project' }
      mockTransaction.project.create.mockResolvedValue(mockProject)
      mockTransaction.project.findUnique.mockResolvedValue({
        ...mockProject,
        episodes: [],
      })

      const result = await repository.createWithEpisodes(input)

      expect(mockTransaction.episode.createMany).not.toHaveBeenCalled()
      expect(result.episodes).toEqual([])
    })
  })

  describe('getStats', () => {
    it('应该获取项目统计信息', async () => {
      mockPrisma.episode.count.mockResolvedValue(5)
      mockPrisma.characterProfile.count.mockResolvedValue(3)
      mockPrisma.locationProfile.count.mockResolvedValue(2)
      mockPrisma.asset.count.mockResolvedValue(10)
      mockPrisma.task.count.mockResolvedValue(8)

      const result = await repository.getStats('project-id')

      expect(result).toEqual({
        episodeCount: 5,
        characterCount: 3,
        locationCount: 2,
        assetCount: 10,
        taskCount: 8,
      })
    })

    it('应该处理空统计', async () => {
      mockPrisma.episode.count.mockResolvedValue(0)
      mockPrisma.characterProfile.count.mockResolvedValue(0)
      mockPrisma.locationProfile.count.mockResolvedValue(0)
      mockPrisma.asset.count.mockResolvedValue(0)
      mockPrisma.task.count.mockResolvedValue(0)

      const result = await repository.getStats('project-id')

      expect(result).toEqual({
        episodeCount: 0,
        characterCount: 0,
        locationCount: 0,
        assetCount: 0,
        taskCount: 0,
      })
    })
  })

  describe('buildInclude', () => {
    it('应该在没有选项时返回空对象', () => {
      const result = repository['buildInclude']({})
      expect(result).toEqual({})
    })

    it('应该构建包含所有关联的 include 对象', () => {
      const result = repository['buildInclude']({
        includeEpisodes: true,
        includeCharacters: true,
        includeLocations: true,
        includeAssets: true,
        includeTasks: true,
      })

      expect(result).toEqual({
        episodes: true,
        characterProfiles: true,
        locationProfiles: true,
        assets: true,
        tasks: true,
      })
    })

    it('应该构建部分关联的 include 对象', () => {
      const result = repository['buildInclude']({
        includeEpisodes: true,
        includeTasks: true,
      })

      expect(result).toEqual({
        episodes: true,
        tasks: true,
      })
    })
  })

  describe('TypeScript Types', () => {
    it('应该正确使用类型', () => {
      // 类型测试
      const createInput: CreateProjectInput = {
        name: 'Test',
        userId: 'user-123',
        status: 'DRAFT',
      }

      const updateInput: UpdateProjectInput = {
        name: 'Updated',
        status: 'ACTIVE',
      }

      const options: FindProjectOptions = {
        includeEpisodes: true,
        withDeleted: false,
      }

      expect(createInput.name).toBe('Test')
      expect(updateInput.status).toBe('ACTIVE')
      expect(options.includeEpisodes).toBe(true)
    })
  })
})
