/**
 * AI Usage Repository Tests
 * 测试 AI 使用记录仓储层
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaClient, AiUsageStatus } from '@prisma/client'
import {
  AiUsageRepository,
  CreateAiUsageInput,
  FindAiUsageOptions,
} from '../../src/repositories/ai-usage.repository'

describe('AiUsageRepository', () => {
  let mockPrisma: PrismaClient
  let mockUsageModel: any
  let mockTransaction: any
  let repository: AiUsageRepository

  beforeEach(() => {
    // 创建 mock Prisma 客户端
    mockUsageModel = {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      groupBy: vi.fn(),
      deleteMany: vi.fn(),
    }

    mockTransaction = {
      aiUsageLog: {
        create: vi.fn(),
      },
    }

    mockPrisma = {
      aiUsageLog: mockUsageModel,
      $transaction: vi.fn((fn) => fn(mockTransaction)),
    } as unknown as PrismaClient

    repository = new AiUsageRepository(mockPrisma)
  })

  describe('constructor', () => {
    it('应该使用传入的 Prisma 实例', () => {
      const customPrisma = {} as PrismaClient
      const repo = new AiUsageRepository(customPrisma)
      expect(repo['prisma']).toBe(customPrisma)
    })

    it('应该在不传入时使用全局实例', () => {
      const repo = new AiUsageRepository()
      expect(repo['prisma']).toBeDefined()
    })
  })

  describe('findById', () => {
    it('应该通过 ID 查找使用记录', async () => {
      const mockData = { id: 'usage-id', providerId: 'provider-id', cost: 0.01 }
      mockUsageModel.findUnique.mockResolvedValue(mockData)

      const result = await repository.findById('usage-id')

      expect(mockUsageModel.findUnique).toHaveBeenCalledWith({
        where: { id: 'usage-id' },
      })
      expect(result).toEqual(mockData)
    })
  })

  describe('findByTaskId', () => {
    it('应该按任务 ID 查找使用记录', async () => {
      const mockData = [
        { id: '1', taskId: 'task-id', cost: 0.01 },
        { id: '2', taskId: 'task-id', cost: 0.02 },
      ]
      mockUsageModel.findMany.mockResolvedValue(mockData)

      const result = await repository.findByTaskId('task-id')

      expect(mockUsageModel.findMany).toHaveBeenCalledWith({
        where: { taskId: 'task-id' },
        orderBy: { createdAt: 'desc' },
      })
      expect(result).toEqual(mockData)
    })

    it('应该处理空结果', async () => {
      mockUsageModel.findMany.mockResolvedValue([])

      const result = await repository.findByTaskId('non-existent-id')

      expect(result).toEqual([])
    })
  })

  describe('findByProjectId', () => {
    it('应该按项目 ID 查找使用记录', async () => {
      const mockData = [
        { id: '1', projectId: 'project-id', cost: 0.01 },
        { id: '2', projectId: 'project-id', cost: 0.02 },
      ]
      mockUsageModel.findMany.mockResolvedValue(mockData)

      const result = await repository.findByProjectId('project-id')

      expect(mockUsageModel.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-id' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
      expect(result).toEqual(mockData)
    })

    it('应该使用自定义限制数量', async () => {
      mockUsageModel.findMany.mockResolvedValue([])

      await repository.findByProjectId('project-id', 50)

      expect(mockUsageModel.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-id' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    })
  })

  describe('findByDateRange', () => {
    const startDate = new Date('2024-01-01')
    const endDate = new Date('2024-12-31')

    it('应该按日期范围查找使用记录', async () => {
      const mockData = [{ id: '1', cost: 0.01, createdAt: new Date('2024-06-01') }]
      mockUsageModel.findMany.mockResolvedValue(mockData)

      const result = await repository.findByDateRange(startDate, endDate)

      expect(mockUsageModel.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: 'desc' },
      })
      expect(result).toEqual(mockData)
    })

    it('应该按 providerId 过滤', async () => {
      mockUsageModel.findMany.mockResolvedValue([])

      await repository.findByDateRange(startDate, endDate, { providerId: 'provider-id' })

      expect(mockUsageModel.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          providerId: 'provider-id',
        },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('应该按 projectId 过滤', async () => {
      mockUsageModel.findMany.mockResolvedValue([])

      await repository.findByDateRange(startDate, endDate, { projectId: 'project-id' })

      expect(mockUsageModel.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          projectId: 'project-id',
        },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('应该按 status 过滤', async () => {
      mockUsageModel.findMany.mockResolvedValue([])

      await repository.findByDateRange(startDate, endDate, { status: 'SUCCESS' as AiUsageStatus })

      expect(mockUsageModel.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          status: 'SUCCESS',
        },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('应该按 action 过滤', async () => {
      mockUsageModel.findMany.mockResolvedValue([])

      await repository.findByDateRange(startDate, endDate, { action: 'text.generate' })

      expect(mockUsageModel.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          action: 'text.generate',
        },
        orderBy: { createdAt: 'desc' },
      })
    })
  })

  describe('create', () => {
    it('应该创建使用记录', async () => {
      const input: CreateAiUsageInput = {
        providerId: 'provider-id',
        action: 'text.generate',
        cost: 0.01,
      }

      const mockData = { id: 'usage-id', ...input }
      mockUsageModel.create.mockResolvedValue(mockData)

      const result = await repository.create(input)

      expect(mockUsageModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          providerId: 'provider-id',
          action: 'text.generate',
          cost: 0.01,
          currency: 'USD',
          status: 'SUCCESS',
        }),
      })
      expect(result).toEqual(mockData)
    })

    it('应该创建包含可选字段的使用记录', async () => {
      const input: CreateAiUsageInput = {
        providerId: 'provider-id',
        modelId: 'gpt-4',
        action: 'text.generate',
        requestId: 'req-123',
        inputTokens: 100,
        outputTokens: 50,
        cost: 0.015,
        currency: 'CNY',
        status: 'SUCCESS' as AiUsageStatus,
        projectId: 'project-id',
        taskId: 'task-id',
        userId: 'user-id',
        latency: 1500,
      }

      const mockData = { id: 'usage-id', ...input }
      mockUsageModel.create.mockResolvedValue(mockData)

      await repository.create(input)

      expect(mockUsageModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          providerId: 'provider-id',
          modelId: 'gpt-4',
          action: 'text.generate',
          requestId: 'req-123',
          inputTokens: 100,
          outputTokens: 50,
          cost: 0.015,
          currency: 'CNY',
          status: 'SUCCESS',
          projectId: 'project-id',
          taskId: 'task-id',
          userId: 'user-id',
          latency: 1500,
        }),
      })
    })

    it('应该创建失败状态的使用记录', async () => {
      const input: CreateAiUsageInput = {
        providerId: 'provider-id',
        action: 'text.generate',
        cost: 0,
        status: 'ERROR' as AiUsageStatus,
        errorCode: 'RATE_LIMIT',
        errorMessage: 'Rate limit exceeded',
      }

      const mockData = { id: 'usage-id', ...input }
      mockUsageModel.create.mockResolvedValue(mockData)

      await repository.create(input)

      expect(mockUsageModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          providerId: 'provider-id',
          action: 'text.generate',
          cost: 0,
          status: 'ERROR',
          errorCode: 'RATE_LIMIT',
          errorMessage: 'Rate limit exceeded',
        }),
      })
    })
  })

  describe('createMany', () => {
    it('应该批量创建使用记录', async () => {
      const inputs: CreateAiUsageInput[] = [
        { providerId: 'p1', action: 'text.generate', cost: 0.01 },
        { providerId: 'p1', action: 'image.generate', cost: 0.02 },
      ]

      const mockRecords = inputs.map((input, i) => ({ id: `usage-${i}`, ...input }))

      mockTransaction.aiUsageLog.create
        .mockResolvedValueOnce(mockRecords[0])
        .mockResolvedValueOnce(mockRecords[1])

      const result = await repository.createMany(inputs)

      expect(mockTransaction.aiUsageLog.create).toHaveBeenCalledTimes(2)
      expect(result).toEqual(mockRecords)
    })

    it('应该处理空数组', async () => {
      const result = await repository.createMany([])

      expect(mockTransaction.aiUsageLog.create).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })

    it('应该为每条记录设置默认值', async () => {
      const inputs: CreateAiUsageInput[] = [
        { providerId: 'p1', action: 'text.generate', cost: 0.01 },
      ]

      await repository.createMany(inputs)

      expect(mockTransaction.aiUsageLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          providerId: 'p1',
          action: 'text.generate',
          cost: 0.01,
          currency: 'USD',
          status: 'SUCCESS',
        }),
      })
    })
  })

  describe('getStats', () => {
    const startDate = new Date('2024-01-01')
    const endDate = new Date('2024-12-31')

    it('应该获取统计数据', async () => {
      const mockData = [
        { cost: 0.01, inputTokens: 100, outputTokens: 50, imageCount: 0, videoCount: 0, status: 'SUCCESS' },
        { cost: 0.02, inputTokens: 200, outputTokens: 100, imageCount: 0, videoCount: 0, status: 'SUCCESS' },
        { cost: 0, inputTokens: 50, outputTokens: 0, imageCount: 0, videoCount: 0, status: 'ERROR' },
      ]
      mockUsageModel.findMany.mockResolvedValue(mockData)

      const result = await repository.getStats(startDate, endDate)

      expect(result).toEqual({
        totalRequests: 3,
        totalCost: 0.03,
        totalInputTokens: 350,
        totalOutputTokens: 150,
        totalImages: 0,
        totalVideos: 0,
        successRate: (2 / 3) * 100,
      })
    })

    it('应该按 providerId 过滤', async () => {
      mockUsageModel.findMany.mockResolvedValue([])

      await repository.getStats(startDate, endDate, { providerId: 'provider-id' })

      expect(mockUsageModel.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          providerId: 'provider-id',
        },
        select: expect.any(Object),
      })
    })

    it('应该按 projectId 过滤', async () => {
      mockUsageModel.findMany.mockResolvedValue([])

      await repository.getStats(startDate, endDate, { projectId: 'project-id' })

      expect(mockUsageModel.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          projectId: 'project-id',
        },
        select: expect.any(Object),
      })
    })

    it('应该按 userId 过滤', async () => {
      mockUsageModel.findMany.mockResolvedValue([])

      await repository.getStats(startDate, endDate, { userId: 'user-id' })

      expect(mockUsageModel.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          userId: 'user-id',
        },
        select: expect.any(Object),
      })
    })

    it('应该处理空数据', async () => {
      mockUsageModel.findMany.mockResolvedValue([])

      const result = await repository.getStats(startDate, endDate)

      expect(result).toEqual({
        totalRequests: 0,
        totalCost: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalImages: 0,
        totalVideos: 0,
        successRate: 0,
      })
    })

    it('应该处理 null 值', async () => {
      const mockData = [
        { cost: null, inputTokens: null, outputTokens: null, imageCount: null, videoCount: null, status: 'SUCCESS' },
      ]
      mockUsageModel.findMany.mockResolvedValue(mockData)

      const result = await repository.getStats(startDate, endDate)

      expect(result).toEqual({
        totalRequests: 1,
        totalCost: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalImages: 0,
        totalVideos: 0,
        successRate: 100,
      })
    })
  })

  describe('getStatsByProvider', () => {
    const startDate = new Date('2024-01-01')
    const endDate = new Date('2024-12-31')

    it('应该获取按 Provider 分组的统计数据', async () => {
      const mockData = [
        { providerId: 'p1', _sum: { cost: 0.1 }, _count: { id: 10 } },
        { providerId: 'p2', _sum: { cost: 0.2 }, _count: { id: 20 } },
      ]
      mockUsageModel.groupBy.mockResolvedValue(mockData)

      const result = await repository.getStatsByProvider(startDate, endDate)

      expect(mockUsageModel.groupBy).toHaveBeenCalledWith({
        by: ['providerId'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: {
          cost: true,
        },
        _count: {
          id: true,
        },
      })

      expect(result).toEqual([
        { providerId: 'p1', totalCost: 0.1, totalRequests: 10 },
        { providerId: 'p2', totalCost: 0.2, totalRequests: 20 },
      ])
    })

    it('应该按 projectId 过滤', async () => {
      mockUsageModel.groupBy.mockResolvedValue([])

      await repository.getStatsByProvider(startDate, endDate, { projectId: 'project-id' })

      expect(mockUsageModel.groupBy).toHaveBeenCalledWith({
        by: ['providerId'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          projectId: 'project-id',
        },
        _sum: {
          cost: true,
        },
        _count: {
          id: true,
        },
      })
    })

    it('应该按 userId 过滤', async () => {
      mockUsageModel.groupBy.mockResolvedValue([])

      await repository.getStatsByProvider(startDate, endDate, { userId: 'user-id' })

      expect(mockUsageModel.groupBy).toHaveBeenCalledWith({
        by: ['providerId'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          userId: 'user-id',
        },
        _sum: {
          cost: true,
        },
        _count: {
          id: true,
        },
      })
    })

    it('应该处理 null 成本', async () => {
      const mockData = [
        { providerId: 'p1', _sum: { cost: null }, _count: { id: 5 } },
      ]
      mockUsageModel.groupBy.mockResolvedValue(mockData)

      const result = await repository.getStatsByProvider(startDate, endDate)

      expect(result).toEqual([
        { providerId: 'p1', totalCost: 0, totalRequests: 5 },
      ])
    })
  })

  describe('getStatsByAction', () => {
    const startDate = new Date('2024-01-01')
    const endDate = new Date('2024-12-31')

    it('应该获取按类型分组的统计数据', async () => {
      const mockData = [
        { action: 'text.generate', _sum: { cost: 0.1 }, _count: { id: 10 } },
        { action: 'image.generate', _sum: { cost: 0.2 }, _count: { id: 5 } },
      ]
      mockUsageModel.groupBy.mockResolvedValue(mockData)

      const result = await repository.getStatsByAction(startDate, endDate)

      expect(mockUsageModel.groupBy).toHaveBeenCalledWith({
        by: ['action'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: {
          cost: true,
        },
        _count: {
          id: true,
        },
      })

      expect(result).toEqual([
        { action: 'text.generate', totalCost: 0.1, totalRequests: 10 },
        { action: 'image.generate', totalCost: 0.2, totalRequests: 5 },
      ])
    })

    it('应该按 providerId 过滤', async () => {
      mockUsageModel.groupBy.mockResolvedValue([])

      await repository.getStatsByAction(startDate, endDate, { providerId: 'provider-id' })

      expect(mockUsageModel.groupBy).toHaveBeenCalledWith({
        by: ['action'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          providerId: 'provider-id',
        },
        _sum: {
          cost: true,
        },
        _count: {
          id: true,
        },
      })
    })

    it('应该按 projectId 过滤', async () => {
      mockUsageModel.groupBy.mockResolvedValue([])

      await repository.getStatsByAction(startDate, endDate, { projectId: 'project-id' })

      expect(mockUsageModel.groupBy).toHaveBeenCalledWith({
        by: ['action'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          projectId: 'project-id',
        },
        _sum: {
          cost: true,
        },
        _count: {
          id: true,
        },
      })
    })
  })

  describe('deleteOlderThan', () => {
    it('应该删除过期记录', async () => {
      const cutoffDate = new Date('2024-01-01')
      mockUsageModel.deleteMany.mockResolvedValue({ count: 100 })

      const result = await repository.deleteOlderThan(cutoffDate)

      expect(mockUsageModel.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      })
      expect(result).toBe(100)
    })

    it('应该处理没有过期记录的情况', async () => {
      const cutoffDate = new Date('2024-01-01')
      mockUsageModel.deleteMany.mockResolvedValue({ count: 0 })

      const result = await repository.deleteOlderThan(cutoffDate)

      expect(result).toBe(0)
    })
  })
})
