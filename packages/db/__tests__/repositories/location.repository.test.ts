/**
 * Location Repository Tests
 * 测试场景仓储层
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaClient, LocationType } from '@prisma/client'
import {
  LocationRepository,
  CreateLocationInput,
  UpdateLocationInput,
  FindLocationOptions,
} from '../../src/repositories/location.repository'

describe('LocationRepository', () => {
  let mockPrisma: PrismaClient
  let mockModel: any
  let repository: LocationRepository

  beforeEach(() => {
    // 创建 mock Prisma 客户端
    mockModel = {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    }

    mockPrisma = {
      locationProfile: mockModel,
    } as unknown as PrismaClient

    repository = new LocationRepository(mockPrisma)
  })

  describe('constructor', () => {
    it('应该使用传入的 Prisma 实例', () => {
      const customPrisma = {} as PrismaClient
      const repo = new LocationRepository(customPrisma)
      expect(repo['prisma']).toBe(customPrisma)
    })

    it('应该在不传入时使用全局实例', () => {
      const repo = new LocationRepository()
      expect(repo['prisma']).toBeDefined()
    })
  })

  describe('findById', () => {
    it('应该通过 ID 查找场景（未删除）', async () => {
      const mockData = { id: 'location-id', name: '客厅', projectId: 'project-id' }
      mockModel.findFirst.mockResolvedValue(mockData)

      const result = await repository.findById('location-id')

      expect(mockModel.findFirst).toHaveBeenCalledWith({
        where: { id: 'location-id', deletedAt: null },
      })
      expect(result).toEqual(mockData)
    })

    it('应该包含已删除的场景', async () => {
      const mockData = { id: 'location-id', name: '客厅', deletedAt: new Date() }
      mockModel.findUnique.mockResolvedValue(mockData)

      await repository.findById('location-id', { withDeleted: true })

      expect(mockModel.findUnique).toHaveBeenCalledWith({
        where: { id: 'location-id' },
      })
    })

    it('应该在不存在时返回 null', async () => {
      mockModel.findFirst.mockResolvedValue(null)

      const result = await repository.findById('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('findByProjectId', () => {
    it('应该按项目 ID 查找所有场景', async () => {
      const mockData = [
        { id: 'loc-1', name: '客厅', locationType: 'INTERIOR' },
        { id: 'loc-2', name: '公园', locationType: 'EXTERIOR' },
      ]
      mockModel.findMany.mockResolvedValue(mockData)

      const result = await repository.findByProjectId('project-id')

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-id', deletedAt: null },
        orderBy: { createdAt: 'desc' },
      })
      expect(result).toEqual(mockData)
    })

    it('应该包含已删除的场景', async () => {
      const mockData = [{ id: 'loc-1', name: '客厅', deletedAt: new Date() }]
      mockModel.findMany.mockResolvedValue(mockData)

      await repository.findByProjectId('project-id', { withDeleted: true })

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-id' },
        orderBy: { createdAt: 'desc' },
      })
    })
  })

  describe('findByProjectAndName', () => {
    it('应该按项目和名称查找场景', async () => {
      const mockData = { id: 'location-id', name: '客厅', projectId: 'project-id' }
      mockModel.findUnique.mockResolvedValue(mockData)

      const result = await repository.findByProjectAndName('project-id', '客厅')

      expect(mockModel.findUnique).toHaveBeenCalledWith({
        where: {
          projectId_name: {
            projectId: 'project-id',
            name: '客厅',
          },
        },
      })
      expect(result).toEqual(mockData)
    })

    it('应该在不存在时返回 null', async () => {
      mockModel.findUnique.mockResolvedValue(null)

      const result = await repository.findByProjectAndName('project-id', '不存在')

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('应该创建场景', async () => {
      const input: CreateLocationInput = {
        projectId: 'project-id',
        name: '客厅',
      }

      const mockData = { id: 'location-id', ...input }
      mockModel.create.mockResolvedValue(mockData)

      const result = await repository.create(input)

      expect(mockModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          project: { connect: { id: 'project-id' } },
          name: '客厅',
          description: undefined,
          keyElements: null,
        }),
      })
      expect(result).toEqual(mockData)
    })

    it('应该创建包含可选字段的场景', async () => {
      const input: CreateLocationInput = {
        projectId: 'project-id',
        name: '客厅',
        description: '宽敞明亮的客厅',
        eraPeriod: '现代',
        locationType: 'INTERIOR' as LocationType,
        moodColor: '#FFF8DC',
        keyElements: ['沙发', '茶几', '落地窗'],
      }

      const mockData = { id: 'location-id', ...input }
      mockModel.create.mockResolvedValue(mockData)

      await repository.create(input)

      expect(mockModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          project: { connect: { id: 'project-id' } },
          name: '客厅',
          description: '宽敞明亮的客厅',
          eraPeriod: '现代',
          locationType: 'INTERIOR',
          moodColor: '#FFF8DC',
          keyElements: JSON.stringify(['沙发', '茶几', '落地窗']),
        }),
      })
    })
  })

  describe('update', () => {
    it('应该更新场景', async () => {
      const input: UpdateLocationInput = {
        description: '更新后的描述',
        locationType: 'EXTERIOR' as LocationType,
      }

      const mockData = { id: 'location-id', ...input }
      mockModel.update.mockResolvedValue(mockData)

      const result = await repository.update('location-id', input)

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'location-id' },
        data: expect.objectContaining({
          description: '更新后的描述',
          locationType: 'EXTERIOR',
        }),
      })
      expect(result).toEqual(mockData)
    })

    it('应该支持更新 JSON 字段', async () => {
      const input: UpdateLocationInput = {
        keyElements: ['新元素 1', '新元素 2'],
      }

      const mockData = { id: 'location-id', keyElements: JSON.stringify(input.keyElements) }
      mockModel.update.mockResolvedValue(mockData)

      await repository.update('location-id', input)

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'location-id' },
        data: expect.objectContaining({
          keyElements: JSON.stringify(['新元素 1', '新元素 2']),
        }),
      })
    })

    it('应该支持确认场景', async () => {
      const input: UpdateLocationInput = {
        locationConfirmed: true,
      }

      const mockData = { id: 'location-id', locationConfirmed: true }
      mockModel.update.mockResolvedValue(mockData)

      await repository.update('location-id', input)

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'location-id' },
        data: expect.objectContaining({
          locationConfirmed: true,
        }),
      })
    })
  })

  describe('softDelete', () => {
    it('应该软删除场景', async () => {
      const mockData = { id: 'location-id', deletedAt: expect.any(Date), deletedBy: null }
      mockModel.update.mockResolvedValue(mockData)

      const result = await repository.softDelete('location-id')

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'location-id' },
        data: {
          deletedAt: expect.any(Date),
          deletedBy: undefined,
        },
      })
    })

    it('应该支持传入 deletedBy', async () => {
      const mockData = { id: 'location-id', deletedAt: expect.any(Date), deletedBy: 'user-123' }
      mockModel.update.mockResolvedValue(mockData)

      await repository.softDelete('location-id', 'user-123')

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'location-id' },
        data: {
          deletedAt: expect.any(Date),
          deletedBy: 'user-123',
        },
      })
    })
  })

  describe('restore', () => {
    it('应该恢复已删除的场景', async () => {
      const mockData = { id: 'location-id', deletedAt: null, deletedBy: null }
      mockModel.update.mockResolvedValue(mockData)

      const result = await repository.restore('location-id')

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'location-id' },
        data: {
          deletedAt: null,
          deletedBy: null,
        },
      })
      expect(result.deletedAt).toBeNull()
    })
  })

  describe('confirmLocation', () => {
    it('应该确认场景档案', async () => {
      const mockData = { id: 'location-id', locationConfirmed: true }
      mockModel.update.mockResolvedValue(mockData)

      const result = await repository.confirmLocation('location-id')

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'location-id' },
        data: { locationConfirmed: true },
      })
      expect(result.locationConfirmed).toBe(true)
    })
  })

  describe('TypeScript Types', () => {
    it('应该正确使用类型', () => {
      // 类型测试
      const createInput: CreateLocationInput = {
        projectId: 'project-id',
        name: '客厅',
        locationType: 'INTERIOR' as LocationType,
      }

      const updateInput: UpdateLocationInput = {
        description: '更新描述',
        locationConfirmed: true,
      }

      const options: FindLocationOptions = {
        withDeleted: false,
      }

      expect(createInput.projectId).toBe('project-id')
      expect(updateInput.locationConfirmed).toBe(true)
      expect(options.withDeleted).toBe(false)
    })
  })
})
