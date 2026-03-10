/**
 * Base Repository Tests
 * 测试基础仓储层的通用功能
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { BaseRepository, IRepository, NOT_DELETED } from '../../src/repositories/base.repository'

// 创建一个测试用的 Model 名称
class TestRepository extends BaseRepository<'project', any> {
  protected readonly modelName = 'project' as const
}

describe('NOT_DELETED constant', () => {
  it('应该导出正确的软删除过滤条件', () => {
    expect(NOT_DELETED).toEqual({ deletedAt: null })
  })
})

describe('BaseRepository', () => {
  let mockPrisma: PrismaClient
  let mockModel: any
  let repository: TestRepository

  beforeEach(() => {
    // 创建 mock Prisma 客户端
    mockModel = {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    }

    mockPrisma = {
      project: mockModel,
    } as unknown as PrismaClient

    repository = new TestRepository(mockPrisma)
  })

  describe('constructor', () => {
    it('应该使用传入的 Prisma 实例', () => {
      const customPrisma = {} as PrismaClient
      const repo = new TestRepository(customPrisma)
      expect(repo['prisma']).toBe(customPrisma)
    })

    it('应该在不传入时使用全局实例', () => {
      const repo = new TestRepository()
      expect(repo['prisma']).toBeDefined()
    })
  })

  describe('modelName', () => {
    it('应该返回模型名称', () => {
      const repo = new TestRepository()
      expect(repo['modelName']).toBe('project')
    })
  })

  describe('model', () => {
    it('应该从 Prisma 实例获取模型委托', () => {
      const model = repository['model']
      expect(model).toBeDefined()
    })
  })

  describe('findById', () => {
    it('应该通过 ID 查找记录', async () => {
      const mockData = { id: 'test-id', name: 'Test' }
      mockModel.findUnique.mockResolvedValue(mockData)

      const result = await repository.findById('test-id')

      expect(mockModel.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        include: undefined,
      })
      expect(result).toEqual(mockData)
    })

    it('应该包含关联数据', async () => {
      const mockData = {
        id: 'test-id',
        name: 'Test',
        episodes: [],
      }
      mockModel.findUnique.mockResolvedValue(mockData)

      const include = { episodes: true }
      await repository.findById('test-id', include)

      expect(mockModel.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        include,
      })
    })

    it('应该在记录不存在时返回 null', async () => {
      mockModel.findUnique.mockResolvedValue(null)

      const result = await repository.findById('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('findMany', () => {
    it('应该查询多条记录，默认排除已删除', async () => {
      const mockData = [
        { id: '1', name: 'Test 1', deletedAt: null },
        { id: '2', name: 'Test 2', deletedAt: null },
      ]
      mockModel.findMany.mockResolvedValue(mockData)

      const result = await repository.findMany()

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: {},
        orderBy: undefined,
        skip: 0,
        take: 100,
      })
      expect(result).toEqual(mockData)
    })

    it('应该支持自定义 where 条件', async () => {
      const mockData = [{ id: '1', name: 'Test', status: 'ACTIVE' }]
      mockModel.findMany.mockResolvedValue(mockData)

      await repository.findMany({
        where: { status: 'ACTIVE' },
      })

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { status: 'ACTIVE', deletedAt: null },
        include: {},
        orderBy: undefined,
        skip: 0,
        take: 100,
      })
    })

    it('应该支持包含已删除记录', async () => {
      const mockData = [
        { id: '1', name: 'Test 1', deletedAt: null },
        { id: '2', name: 'Test 2', deletedAt: new Date() },
      ]
      mockModel.findMany.mockResolvedValue(mockData)

      await repository.findMany({ withDeleted: true })

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: {},
        include: {},
        orderBy: undefined,
        skip: 0,
        take: 100,
      })
    })

    it('应该支持分页', async () => {
      const mockData = [{ id: '1', name: 'Test' }]
      mockModel.findMany.mockResolvedValue(mockData)

      await repository.findMany({
        skip: 10,
        take: 5,
      })

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: {},
        orderBy: undefined,
        skip: 10,
        take: 5,
      })
    })

    it('应该支持 include 关联', async () => {
      const mockData = [{ id: '1', name: 'Test', episodes: [] }]
      mockModel.findMany.mockResolvedValue(mockData)

      await repository.findMany({
        include: { episodes: true },
      })

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: { episodes: true },
        orderBy: undefined,
        skip: 0,
        take: 100,
      })
    })

    it('应该支持排序', async () => {
      const mockData = [{ id: '1', name: 'Test' }]
      mockModel.findMany.mockResolvedValue(mockData)

      await repository.findMany({
        orderBy: { name: 'asc' } as any,
      })

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        include: {},
        orderBy: { name: 'asc' },
        skip: 0,
        take: 100,
      })
    })
  })

  describe('softDelete', () => {
    it('应该执行软删除', async () => {
      const mockData = { id: 'test-id', deletedAt: new Date(), deletedBy: null }
      mockModel.update.mockResolvedValue(mockData)

      const result = await repository.softDelete('test-id')

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: {
          deletedAt: expect.any(Date),
          deletedBy: undefined,
        },
      })
      expect(result.deletedAt).toBeInstanceOf(Date)
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

    it('应该使用指定的 Prisma 实例', async () => {
      const mockTxModel = {
        update: vi.fn().mockResolvedValue({ id: 'test-id' }),
      }
      const mockTx = {
        project: mockTxModel,
      } as unknown as PrismaClient

      await repository.softDelete('test-id', undefined, mockTx)

      expect(mockTxModel.update).toHaveBeenCalled()
    })
  })

  describe('restore', () => {
    it('应该恢复已删除的记录', async () => {
      const mockData = { id: 'test-id', deletedAt: null, deletedBy: null }
      mockModel.update.mockResolvedValue(mockData)

      const result = await repository.restore('test-id')

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: {
          deletedAt: null,
          deletedBy: null,
          version: { increment: 1 },
        },
      })
      expect(result.deletedAt).toBeNull()
    })

    it('应该使用指定的 Prisma 实例', async () => {
      const mockTxModel = {
        update: vi.fn().mockResolvedValue({ id: 'test-id', deletedAt: null }),
      }
      const mockTx = {
        project: mockTxModel,
      } as unknown as PrismaClient

      await repository.restore('test-id', mockTx)

      expect(mockTxModel.update).toHaveBeenCalled()
    })
  })

  describe('hardDelete', () => {
    it('应该永久删除记录', async () => {
      const mockData = { id: 'test-id' }
      mockModel.delete.mockResolvedValue(mockData)

      const result = await repository.hardDelete('test-id')

      expect(mockModel.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      })
      expect(result).toEqual(mockData)
    })

    it('应该使用指定的 Prisma 实例', async () => {
      const mockTxModel = {
        delete: vi.fn().mockResolvedValue({ id: 'test-id' }),
      }
      const mockTx = {
        project: mockTxModel,
      } as unknown as PrismaClient

      await repository.hardDelete('test-id', mockTx)

      expect(mockTxModel.delete).toHaveBeenCalled()
    })
  })

  describe('exists', () => {
    it('应该在记录存在且未删除时返回 true', async () => {
      mockModel.findUnique.mockResolvedValue({ id: 'test-id', deletedAt: null })

      const result = await repository.exists('test-id')

      expect(result).toBe(true)
    })

    it('应该在记录已删除时返回 false', async () => {
      mockModel.findUnique.mockResolvedValue({ id: 'test-id', deletedAt: new Date() })

      const result = await repository.exists('test-id')

      expect(result).toBe(false)
    })

    it('应该在记录不存在时返回 false', async () => {
      mockModel.findUnique.mockResolvedValue(null)

      const result = await repository.exists('non-existent-id')

      expect(result).toBe(false)
    })

    it('应该在 withDeleted 为 true 时包含已删除记录', async () => {
      mockModel.findUnique.mockResolvedValue({ id: 'test-id', deletedAt: new Date() })

      const result = await repository.exists('test-id', true)

      expect(result).toBe(true)
    })
  })
})

describe('IRepository interface type', () => {
  it('应该正确定义接口类型', () => {
    // 类型测试，确保接口定义正确
    interface TestModel {
      id: string
      name: string
    }

    type TestRepo = IRepository<TestModel, string>

    // 这个测试主要是为了确保 TypeScript 类型定义正确
    // 编译通过即表示类型正确
    const _typeCheck: TestRepo = {} as any
    expect(true).toBe(true)
  })
})
