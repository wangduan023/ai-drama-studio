/**
 * AI Provider Repository Tests
 * 测试 AI 渠道商仓储层
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  AiProviderRepository,
  CreateAiProviderInput,
  UpdateAiProviderInput,
  FindAiProviderOptions,
} from '../../src/repositories/ai-provider.repository'

describe('AiProviderRepository', () => {
  let mockPrisma: PrismaClient
  let mockModel: any
  let repository: AiProviderRepository

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

    mockPrisma = {
      aiProvider: mockModel,
      aiModel: {
        findMany: vi.fn(),
      },
    } as unknown as PrismaClient

    repository = new AiProviderRepository(mockPrisma)
  })

  describe('constructor', () => {
    it('应该使用传入的 Prisma 实例', () => {
      const customPrisma = {} as PrismaClient
      const repo = new AiProviderRepository(customPrisma)
      expect(repo['prisma']).toBe(customPrisma)
    })

    it('应该在不传入时使用全局实例', () => {
      const repo = new AiProviderRepository()
      expect(repo['prisma']).toBeDefined()
    })
  })

  describe('findById', () => {
    it('应该通过 ID 查找渠道商', async () => {
      const mockData = { id: 'test-id', name: 'openai', baseUrl: 'https://api.openai.com' }
      mockModel.findUnique.mockResolvedValue(mockData)

      const result = await repository.findById('test-id')

      expect(mockModel.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        include: {},
      })
      expect(result).toEqual(mockData)
    })

    it('应该包含关联的模型', async () => {
      const mockData = {
        id: 'test-id',
        name: 'openai',
        models: [{ id: 'model-1', name: 'GPT-4' }],
      }
      mockModel.findUnique.mockResolvedValue(mockData)

      await repository.findById('test-id', { includeModels: true })

      expect(mockModel.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        include: { models: true },
      })
    })

    it('应该只查找活跃的渠道商', async () => {
      const mockData = { id: 'test-id', name: 'openai', isActive: true }
      mockModel.findFirst.mockResolvedValue(mockData)

      await repository.findById('test-id', { onlyActive: true })

      expect(mockModel.findFirst).toHaveBeenCalledWith({
        where: { id: 'test-id', isActive: true },
        include: {},
      })
    })

    it('应该在记录不存在时返回 null', async () => {
      mockModel.findUnique.mockResolvedValue(null)

      const result = await repository.findById('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('findByName', () => {
    it('应该通过名称查找渠道商', async () => {
      const mockData = { id: 'test-id', name: 'openai', baseUrl: 'https://api.openai.com' }
      mockModel.findUnique.mockResolvedValue(mockData)

      const result = await repository.findByName('openai')

      expect(mockModel.findUnique).toHaveBeenCalledWith({
        where: { name: 'openai' },
        include: {},
      })
      expect(result).toEqual(mockData)
    })

    it('应该包含关联的模型', async () => {
      const mockData = {
        id: 'test-id',
        name: 'openai',
        models: [{ id: 'model-1', name: 'GPT-4' }],
      }
      mockModel.findUnique.mockResolvedValue(mockData)

      await repository.findByName('openai', { includeModels: true })

      expect(mockModel.findUnique).toHaveBeenCalledWith({
        where: { name: 'openai' },
        include: { models: true },
      })
    })

    it('应该只查找活跃的渠道商', async () => {
      const mockData = { id: 'test-id', name: 'openai', isActive: true }
      mockModel.findFirst.mockResolvedValue(mockData)

      await repository.findByName('openai', { onlyActive: true })

      expect(mockModel.findFirst).toHaveBeenCalledWith({
        where: { name: 'openai', isActive: true },
        include: {},
      })
    })
  })

  describe('findAll', () => {
    it('应该查找所有渠道商', async () => {
      const mockData = [
        { id: '1', name: 'openai', priority: 0 },
        { id: '2', name: 'anthropic', priority: 1 },
      ]
      mockModel.findMany.mockResolvedValue(mockData)

      const result = await repository.findAll()

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: {},
        include: {},
        orderBy: [{ priority: 'asc' }, { name: 'asc' }],
      })
      expect(result).toEqual(mockData)
    })

    it('应该只查找活跃的渠道商', async () => {
      const mockData = [
        { id: '1', name: 'openai', isActive: true },
      ]
      mockModel.findMany.mockResolvedValue(mockData)

      await repository.findAll({ onlyActive: true })

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: {},
        orderBy: [{ priority: 'asc' }, { name: 'asc' }],
      })
    })

    it('应该包含关联的模型', async () => {
      const mockData = [
        { id: '1', name: 'openai', models: [] },
      ]
      mockModel.findMany.mockResolvedValue(mockData)

      await repository.findAll({ includeModels: true })

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: {},
        include: { models: true },
        orderBy: [{ priority: 'asc' }, { name: 'asc' }],
      })
    })
  })

  describe('create', () => {
    it('应该创建渠道商', async () => {
      const input: CreateAiProviderInput = {
        name: 'openai',
        baseUrl: 'https://api.openai.com',
        apiKey: 'sk-xxx',
      }

      const mockData = { id: 'test-id', ...input }
      mockModel.create.mockResolvedValue(mockData)

      const result = await repository.create(input)

      expect(mockModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'openai',
          baseUrl: 'https://api.openai.com',
          apiKey: 'sk-xxx',
          isActive: true,
          priority: 0,
          weight: 1,
        }),
      })
      expect(result).toEqual(mockData)
    })

    it('应该使用自定义参数创建', async () => {
      const input: CreateAiProviderInput = {
        name: 'openai',
        baseUrl: 'https://api.openai.com',
        apiKey: 'sk-xxx',
        isActive: false,
        priority: 5,
        weight: 2,
        rateLimit: 100,
        quotaDaily: 1000,
        metadata: { custom: 'value' },
        description: 'OpenAI API',
      }

      const mockData = { id: 'test-id', ...input }
      mockModel.create.mockResolvedValue(mockData)

      await repository.create(input)

      expect(mockModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isActive: false,
          priority: 5,
          weight: 2,
          rateLimit: 100,
          quotaDaily: 1000,
          metadata: { custom: 'value' },
          description: 'OpenAI API',
        }),
      })
    })
  })

  describe('update', () => {
    it('应该更新渠道商', async () => {
      const input: UpdateAiProviderInput = {
        baseUrl: 'https://new-api.openai.com',
        isActive: false,
      }

      const mockData = { id: 'test-id', ...input }
      mockModel.update.mockResolvedValue(mockData)

      const result = await repository.update('test-id', input)

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: expect.objectContaining({
          baseUrl: 'https://new-api.openai.com',
          isActive: false,
        }),
      })
      expect(result).toEqual(mockData)
    })

    it('应该支持部分更新', async () => {
      const input: UpdateAiProviderInput = {
        priority: 10,
      }

      const mockData = { id: 'test-id', priority: 10 }
      mockModel.update.mockResolvedValue(mockData)

      await repository.update('test-id', input)

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: { priority: 10 },
      })
    })
  })

  describe('delete', () => {
    it('应该删除渠道商', async () => {
      const mockData = { id: 'test-id', name: 'openai' }
      mockModel.delete.mockResolvedValue(mockData)

      const result = await repository.delete('test-id')

      expect(mockModel.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      })
      expect(result).toEqual(mockData)
    })
  })

  describe('toggleStatus', () => {
    it('应该启用渠道商', async () => {
      const mockData = { id: 'test-id', isActive: true }
      mockModel.update.mockResolvedValue(mockData)

      const result = await repository.toggleStatus('test-id', true)

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: { isActive: true },
      })
      expect(result.isActive).toBe(true)
    })

    it('应该禁用渠道商', async () => {
      const mockData = { id: 'test-id', isActive: false }
      mockModel.update.mockResolvedValue(mockData)

      const result = await repository.toggleStatus('test-id', false)

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: { isActive: false },
      })
      expect(result.isActive).toBe(false)
    })
  })

  describe('getModels', () => {
    it('应该获取渠道商的所有模型', async () => {
      const mockData = [
        { id: 'model-1', name: 'GPT-4', type: 'TEXT' },
        { id: 'model-2', name: 'DALL-E 3', type: 'IMAGE' },
      ]
      ;(mockPrisma.aiModel.findMany as any).mockResolvedValue(mockData)

      const result = await repository.getModels('provider-id')

      expect(mockPrisma.aiModel.findMany).toHaveBeenCalledWith({
        where: { providerId: 'provider-id' },
        orderBy: { name: 'asc' },
      })
      expect(result).toEqual(mockData)
    })

    it('应该按类型过滤模型', async () => {
      const mockData = [
        { id: 'model-1', name: 'GPT-4', type: 'TEXT' },
      ]
      ;(mockPrisma.aiModel.findMany as any).mockResolvedValue(mockData)

      await repository.getModels('provider-id', 'TEXT')

      expect(mockPrisma.aiModel.findMany).toHaveBeenCalledWith({
        where: { providerId: 'provider-id', type: 'TEXT' },
        orderBy: { name: 'asc' },
      })
    })
  })

  describe('buildInclude', () => {
    it('应该在没有选项时返回空对象', () => {
      const result = repository['buildInclude']({})
      expect(result).toEqual({})
    })

    it('应该在 includeModels 为 true 时包含 models', () => {
      const result = repository['buildInclude']({ includeModels: true })
      expect(result).toEqual({ models: true })
    })

    it('应该在 onlyActive 时返回空对象', () => {
      const result = repository['buildInclude']({ onlyActive: true })
      expect(result).toEqual({})
    })
  })
})

describe('AiProviderRepository Integration Types', () => {
  it('应该正确使用 TypeScript 类型', () => {
    // 类型测试，确保类型定义正确
    const createInput: CreateAiProviderInput = {
      name: 'openai',
      baseUrl: 'https://api.openai.com',
      apiKey: 'sk-xxx',
      isActive: true,
      priority: 0,
      weight: 1,
    }

    const updateInput: UpdateAiProviderInput = {
      baseUrl: 'https://new-api.openai.com',
      isActive: false,
    }

    const options: FindAiProviderOptions = {
      includeModels: true,
      onlyActive: true,
    }

    // 这些类型应该可以正确使用
    expect(createInput.name).toBe('openai')
    expect(updateInput.isActive).toBe(false)
    expect(options.includeModels).toBe(true)
  })
})
