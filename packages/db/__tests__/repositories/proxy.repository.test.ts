/**
 * Proxy Repository Tests
 * 测试代理仓储层
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  AiProxyRepository,
  CreateProxyInput,
  UpdateProxyInput,
  ProxyQuery,
} from '../../src/repositories/proxy.repository'

describe('AiProxyRepository', () => {
  let mockPrisma: PrismaClient
  let mockProxyModel: any
  let mockProviderModel: any
  let repository: AiProxyRepository

  beforeEach(() => {
    // 创建 mock Prisma 客户端
    mockProxyModel = {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    }

    mockProviderModel = {
      findMany: vi.fn(),
    }

    mockPrisma = {
      aiProxy: mockProxyModel,
      aiProvider: mockProviderModel,
    } as unknown as PrismaClient

    repository = new AiProxyRepository(mockPrisma)
  })

  describe('constructor', () => {
    it('应该继承自 BaseRepository', () => {
      expect(repository['modelName']).toBe('aiProxy')
    })
  })

  describe('create', () => {
    it('应该创建代理', async () => {
      const input: CreateProxyInput = {
        name: 'Test Proxy',
        host: '127.0.0.1',
        port: 8080,
      }

      const mockData = { id: 'proxy-id', ...input, protocol: 'http', maxConcurrent: 10 }
      mockProxyModel.create.mockResolvedValue(mockData)

      const result = await repository.create(input)

      expect(mockProxyModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Proxy',
          host: '127.0.0.1',
          port: 8080,
          protocol: 'http',
          maxConcurrent: 10,
        }),
      })
      expect(result).toEqual(mockData)
    })

    it('应该创建包含可选字段的代理', async () => {
      const input: CreateProxyInput = {
        name: 'Test Proxy',
        host: '127.0.0.1',
        port: 8080,
        protocol: 'https',
        username: 'user',
        password: 'pass',
        location: 'US',
        provider: 'Provider',
        maxConcurrent: 20,
        description: 'Test description',
      }

      const mockData = { id: 'proxy-id', ...input }
      mockProxyModel.create.mockResolvedValue(mockData)

      await repository.create(input)

      expect(mockProxyModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Proxy',
          host: '127.0.0.1',
          port: 8080,
          protocol: 'https',
          username: 'user',
          password: 'pass',
          location: 'US',
          provider: 'Provider',
          maxConcurrent: 20,
          description: 'Test description',
        }),
      })
    })
  })

  describe('findById', () => {
    it('应该通过 ID 查找代理', async () => {
      const mockData = { id: 'proxy-id', name: 'Test Proxy', host: '127.0.0.1' }
      mockProxyModel.findUnique.mockResolvedValue(mockData)

      const result = await repository.findById('proxy-id', false)

      expect(mockProxyModel.findUnique).toHaveBeenCalledWith({
        where: { id: 'proxy-id' },
      })
      expect(result).toEqual(mockData)
    })

    it('应该包含关联的渠道商', async () => {
      const mockData = {
        id: 'proxy-id',
        name: 'Test Proxy',
        usedByProviders: [{ id: 'p1', name: 'openai', proxyMode: 'auto' }],
      }
      mockProxyModel.findUnique.mockResolvedValue(mockData)

      await repository.findById('proxy-id')

      expect(mockProxyModel.findUnique).toHaveBeenCalledWith({
        where: { id: 'proxy-id' },
        include: {
          usedByProviders: {
            select: {
              id: true,
              name: true,
              proxyMode: true,
            },
          },
        },
      })
    })
  })

  describe('findAll', () => {
    it('应该查找所有代理', async () => {
      const mockData = [
        { id: '1', name: 'Proxy 1', host: '127.0.0.1' },
        { id: '2', name: 'Proxy 2', host: '127.0.0.2' },
      ]
      mockProxyModel.findMany.mockResolvedValue(mockData)

      const result = await repository.findAll()

      expect(mockProxyModel.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      })
      expect(result).toEqual(mockData)
    })

    it('应该按 isActive 过滤', async () => {
      const mockData = [{ id: '1', name: 'Active Proxy', isActive: true }]
      mockProxyModel.findMany.mockResolvedValue(mockData)

      await repository.findAll({ isActive: true })

      expect(mockProxyModel.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('应该按 isHealthy 过滤', async () => {
      const mockData = [{ id: '1', name: 'Healthy Proxy', isHealthy: true }]
      mockProxyModel.findMany.mockResolvedValue(mockData)

      await repository.findAll({ isHealthy: true })

      expect(mockProxyModel.findMany).toHaveBeenCalledWith({
        where: { isHealthy: true },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('应该按搜索关键词查找', async () => {
      const mockData = [{ id: '1', name: 'Test Proxy' }]
      mockProxyModel.findMany.mockResolvedValue(mockData)

      await repository.findAll({ search: 'test' })

      expect(mockProxyModel.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'test' } },
            { host: { contains: 'test' } },
            { location: { contains: 'test' } },
            { description: { contains: 'test' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      })
    })
  })

  describe('getHealthyProxies', () => {
    it('应该获取健康的代理列表', async () => {
      const mockData = [
        { id: '1', name: 'Healthy Proxy', isActive: true, isHealthy: true, checkLatency: 50 },
      ]
      mockProxyModel.findMany.mockResolvedValue(mockData)

      const result = await repository.getHealthyProxies()

      expect(mockProxyModel.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          isHealthy: true,
        },
        orderBy: { checkLatency: 'asc' },
      })
      expect(result).toEqual(mockData)
    })
  })

  describe('getAvailableProxies', () => {
    it('应该获取可用的代理列表', async () => {
      const mockData = [
        { id: '1', name: 'Available Proxy', isActive: true, checkLatency: 100 },
      ]
      mockProxyModel.findMany.mockResolvedValue(mockData)

      const result = await repository.getAvailableProxies()

      expect(mockProxyModel.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
        },
        orderBy: { checkLatency: 'asc' },
      })
      expect(result).toEqual(mockData)
    })
  })

  describe('update', () => {
    it('应该更新代理', async () => {
      const input: UpdateProxyInput = {
        name: 'Updated Proxy',
        isActive: false,
      }

      const mockData = { id: 'proxy-id', ...input }
      mockProxyModel.update.mockResolvedValue(mockData)

      const result = await repository.update('proxy-id', input)

      expect(mockProxyModel.update).toHaveBeenCalledWith({
        where: { id: 'proxy-id' },
        data: input,
      })
      expect(result).toEqual(mockData)
    })
  })

  describe('updateHealth', () => {
    it('应该更新健康状态（成功）', async () => {
      const mockData = {
        id: 'proxy-id',
        isHealthy: true,
        lastCheckAt: new Date(),
        checkLatency: 50,
        consecutiveFailures: 0,
      }
      mockProxyModel.update.mockResolvedValue(mockData)

      await repository.updateHealth('proxy-id', true, 50)

      expect(mockProxyModel.update).toHaveBeenCalledWith({
        where: { id: 'proxy-id' },
        data: expect.objectContaining({
          isHealthy: true,
          checkLatency: 50,
          consecutiveFailures: 0,
        }),
      })
    })

    it('应该更新健康状态（失败）', async () => {
      const mockData = {
        id: 'proxy-id',
        isHealthy: false,
        lastCheckAt: new Date(),
        checkLatency: null,
        checkError: 'Connection timeout',
        consecutiveFailures: 3,
      }
      mockProxyModel.update.mockResolvedValue(mockData)

      await repository.updateHealth('proxy-id', false, undefined, 'Connection timeout')

      expect(mockProxyModel.update).toHaveBeenCalledWith({
        where: { id: 'proxy-id' },
        data: expect.objectContaining({
          isHealthy: false,
          checkError: 'Connection timeout',
          consecutiveFailures: { increment: 1 },
        }),
      })
    })
  })

  describe('recordRequest', () => {
    it('应该记录成功的请求', async () => {
      const mockData = { id: 'proxy-id', totalRequests: 10, failedRequests: 1 }
      mockProxyModel.update.mockResolvedValue(mockData)

      await repository.recordRequest('proxy-id', false)

      expect(mockProxyModel.update).toHaveBeenCalledWith({
        where: { id: 'proxy-id' },
        data: expect.objectContaining({
          totalRequests: { increment: 1 },
          lastUsedAt: expect.any(Date),
        }),
      })
    })

    it('应该记录失败的请求', async () => {
      const mockData = { id: 'proxy-id', totalRequests: 10, failedRequests: 2 }
      mockProxyModel.update.mockResolvedValue(mockData)

      await repository.recordRequest('proxy-id', true)

      expect(mockProxyModel.update).toHaveBeenCalledWith({
        where: { id: 'proxy-id' },
        data: expect.objectContaining({
          totalRequests: { increment: 1 },
          failedRequests: { increment: 1 },
          lastUsedAt: expect.any(Date),
        }),
      })
    })
  })

  describe('updateConcurrent', () => {
    it('应该更新并发数（增加）', async () => {
      const mockData = { id: 'proxy-id', currentConcurrent: 5 }
      mockProxyModel.update.mockResolvedValue(mockData)

      await repository.updateConcurrent('proxy-id', 1)

      expect(mockProxyModel.update).toHaveBeenCalledWith({
        where: { id: 'proxy-id' },
        data: {
          currentConcurrent: { increment: 1 },
        },
      })
    })

    it('应该更新并发数（减少）', async () => {
      const mockData = { id: 'proxy-id', currentConcurrent: 3 }
      mockProxyModel.update.mockResolvedValue(mockData)

      await repository.updateConcurrent('proxy-id', -1)

      expect(mockProxyModel.update).toHaveBeenCalledWith({
        where: { id: 'proxy-id' },
        data: {
          currentConcurrent: { increment: -1 },
        },
      })
    })
  })

  describe('delete', () => {
    it('应该删除未被使用的代理', async () => {
      const mockProxy = { id: 'proxy-id', name: 'Test Proxy', usedByProviders: [] }
      mockProxyModel.findUnique.mockResolvedValue(mockProxy)
      mockProxyModel.delete.mockResolvedValue(mockProxy)

      await repository.delete('proxy-id')

      expect(mockProxyModel.delete).toHaveBeenCalledWith({
        where: { id: 'proxy-id' },
      })
    })

    it('应该拒绝删除正在使用的代理', async () => {
      const mockProxy = {
        id: 'proxy-id',
        name: 'Test Proxy',
        usedByProviders: [{ id: 'p1', name: 'openai' }],
      }
      mockProxyModel.findUnique.mockResolvedValue(mockProxy)

      await expect(repository.delete('proxy-id')).rejects.toThrow(
        '无法删除代理 "Test Proxy"：有 1 个渠道正在使用'
      )
    })
  })

  describe('deleteMany', () => {
    it('应该批量删除未被使用的代理', async () => {
      mockProviderModel.findMany.mockResolvedValue([])
      mockProxyModel.deleteMany.mockResolvedValue({ count: 2 })

      const result = await repository.deleteMany(['id1', 'id2'])

      expect(mockProviderModel.findMany).toHaveBeenCalledWith({
        where: {
          proxyId: { in: ['id1', 'id2'] },
        },
        select: {
          id: true,
          name: true,
          proxyId: true,
        },
      })

      expect(mockProxyModel.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['id1', 'id2'] },
        },
      })

      expect(result).toBe(2)
    })

    it('应该拒绝批量删除正在使用的代理', async () => {
      mockProviderModel.findMany.mockResolvedValue([
        { id: 'p1', name: 'openai', proxyId: 'id1' },
      ])

      await expect(repository.deleteMany(['id1', 'id2'])).rejects.toThrow(
        '无法删除被以下渠道使用的代理：openai'
      )
    })
  })

  describe('getStats', () => {
    it('应该获取统计数据', async () => {
      const mockData = [
        { isActive: true, isHealthy: true, checkLatency: 50 },
        { isActive: true, isHealthy: true, checkLatency: 100 },
        { isActive: true, isHealthy: false, checkLatency: 200 },
        { isActive: false, isHealthy: null, checkLatency: null },
      ]
      mockProxyModel.findMany.mockResolvedValue(mockData)

      const result = await repository.getStats()

      expect(result).toEqual({
        total: 4,
        active: 3,
        healthy: 2,
        unhealthy: 1,
        avgLatency: 117, // (50 + 100 + 200) / 3 = 116.67 -> 117
      })
    })

    it('应该处理空数据', async () => {
      mockProxyModel.findMany.mockResolvedValue([])

      const result = await repository.getStats()

      expect(result).toEqual({
        total: 0,
        active: 0,
        healthy: 0,
        unhealthy: 0,
        avgLatency: null,
      })
    })

    it('应该处理没有延迟数据的情况', async () => {
      const mockData = [
        { isActive: true, isHealthy: true, checkLatency: null },
        { isActive: true, isHealthy: true, checkLatency: null },
      ]
      mockProxyModel.findMany.mockResolvedValue(mockData)

      const result = await repository.getStats()

      expect(result).toEqual({
        total: 2,
        active: 2,
        healthy: 2,
        unhealthy: 0,
        avgLatency: null,
      })
    })
  })
})
