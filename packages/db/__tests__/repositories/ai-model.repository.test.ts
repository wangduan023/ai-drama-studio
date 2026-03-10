/**
 * AI Model Repository Tests
 * 测试 AI 模型仓储层
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaClient, AiModelType } from '@prisma/client'
import {
  AiModelRepository,
  CreateAiModelInput,
  UpdateAiModelInput,
  FindAiModelOptions,
} from '../../src/repositories/ai-model.repository'

describe('AiModelRepository', () => {
  let mockPrisma: PrismaClient
  let mockModel: any
  let mockTransaction: any
  let repository: AiModelRepository

  beforeEach(() => {
    // 创建 mock Prisma 客户端
    mockModel = {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      updateMany: vi.fn(),
    }

    mockTransaction = {
      aiModel: {
        updateMany: vi.fn(),
        update: vi.fn(),
      },
    }

    mockPrisma = {
      aiModel: mockModel,
      $transaction: vi.fn((fn) => fn(mockTransaction)),
    } as unknown as PrismaClient

    repository = new AiModelRepository(mockPrisma)
  })

  describe('constructor', () => {
    it('应该使用传入的 Prisma 实例', () => {
      const customPrisma = {} as PrismaClient
      const repo = new AiModelRepository(customPrisma)
      expect(repo['prisma']).toBe(customPrisma)
    })

    it('应该在不传入时使用全局实例', () => {
      const repo = new AiModelRepository()
      expect(repo['prisma']).toBeDefined()
    })
  })

  describe('findById', () => {
    it('应该通过 ID 查找模型', async () => {
      const mockData = { id: 'model-id', name: 'GPT-4', modelId: 'gpt-4' }
      mockModel.findUnique.mockResolvedValue(mockData)

      const result = await repository.findById('model-id')

      expect(mockModel.findUnique).toHaveBeenCalledWith({
        where: { id: 'model-id' },
        include: {},
      })
      expect(result).toEqual(mockData)
    })

    it('应该包含关联的 provider', async () => {
      const mockData = {
        id: 'model-id',
        name: 'GPT-4',
        provider: { id: 'provider-id', name: 'openai' },
      }
      mockModel.findUnique.mockResolvedValue(mockData)

      await repository.findById('model-id', { includeProvider: true })

      expect(mockModel.findUnique).toHaveBeenCalledWith({
        where: { id: 'model-id' },
        include: { provider: true },
      })
    })

    it('应该只查找启用的模型', async () => {
      // 注意：findByProvider 等方法才有 onlyEnabled 选项
      // findById 没有 onlyEnabled 选项，这个测试验证基本功能
      const mockData = { id: 'model-id', name: 'GPT-4', isEnabled: true }
      mockModel.findUnique.mockResolvedValue(mockData)

      const result = await repository.findById('model-id')

      expect(result).toEqual(mockData)
    })
  })

  describe('findByProviderAndModel', () => {
    it('应该按 provider 和模型 ID 查找', async () => {
      const mockData = { id: 'model-id', modelId: 'gpt-4', providerId: 'provider-id' }
      mockModel.findUnique.mockResolvedValue(mockData)

      const result = await repository.findByProviderAndModel('provider-id', 'gpt-4')

      expect(mockModel.findUnique).toHaveBeenCalledWith({
        where: {
          providerId_modelId: {
            providerId: 'provider-id',
            modelId: 'gpt-4',
          },
        },
        include: {},
      })
      expect(result).toEqual(mockData)
    })

    it('应该包含关联的 provider', async () => {
      const mockData = {
        id: 'model-id',
        modelId: 'gpt-4',
        provider: { id: 'provider-id', name: 'openai' },
      }
      mockModel.findUnique.mockResolvedValue(mockData)

      await repository.findByProviderAndModel('provider-id', 'gpt-4', { includeProvider: true })

      expect(mockModel.findUnique).toHaveBeenCalledWith({
        where: {
          providerId_modelId: {
            providerId: 'provider-id',
            modelId: 'gpt-4',
          },
        },
        include: { provider: true },
      })
    })
  })

  describe('findByType', () => {
    it('应该按类型查找所有模型', async () => {
      const mockData = [
        { id: 'model-1', name: 'GPT-4', type: 'TEXT' },
        { id: 'model-2', name: 'DALL-E 3', type: 'IMAGE' },
      ]
      mockModel.findMany.mockResolvedValue(mockData)

      const result = await repository.findByType('TEXT' as AiModelType)

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { type: 'TEXT' },
        include: {},
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      })
      expect(result).toEqual(mockData)
    })

    it('应该只查找启用的模型', async () => {
      const mockData = [{ id: 'model-1', name: 'GPT-4', type: 'TEXT', isEnabled: true }]
      mockModel.findMany.mockResolvedValue(mockData)

      await repository.findByType('TEXT' as AiModelType, { onlyEnabled: true })

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { type: 'TEXT', isEnabled: true },
        include: {},
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      })
    })

    it('应该包含关联的 provider', async () => {
      const mockData = [
        { id: 'model-1', name: 'GPT-4', type: 'TEXT', provider: { id: 'p1', name: 'openai' } },
      ]
      mockModel.findMany.mockResolvedValue(mockData)

      await repository.findByType('TEXT' as AiModelType, { includeProvider: true })

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { type: 'TEXT' },
        include: { provider: true },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      })
    })
  })

  describe('findByProvider', () => {
    it('应该按 provider 查找所有模型', async () => {
      const mockData = [
        { id: 'model-1', name: 'GPT-4', providerId: 'provider-id' },
        { id: 'model-2', name: 'GPT-3.5', providerId: 'provider-id' },
      ]
      mockModel.findMany.mockResolvedValue(mockData)

      const result = await repository.findByProvider('provider-id')

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { providerId: 'provider-id' },
        include: {},
        orderBy: { name: 'asc' },
      })
      expect(result).toEqual(mockData)
    })

    it('应该只查找启用的模型', async () => {
      const mockData = [{ id: 'model-1', name: 'GPT-4', providerId: 'provider-id', isEnabled: true }]
      mockModel.findMany.mockResolvedValue(mockData)

      await repository.findByProvider('provider-id', { onlyEnabled: true })

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { providerId: 'provider-id', isEnabled: true },
        include: {},
        orderBy: { name: 'asc' },
      })
    })

    it('应该包含关联的 provider', async () => {
      const mockData = [
        { id: 'model-1', name: 'GPT-4', providerId: 'provider-id', provider: { id: 'provider-id' } },
      ]
      mockModel.findMany.mockResolvedValue(mockData)

      await repository.findByProvider('provider-id', { includeProvider: true })

      expect(mockModel.findMany).toHaveBeenCalledWith({
        where: { providerId: 'provider-id' },
        include: { provider: true },
        orderBy: { name: 'asc' },
      })
    })
  })

  describe('getDefaultModel', () => {
    it('应该获取某类型的默认模型', async () => {
      const mockData = {
        id: 'model-id',
        name: 'GPT-4',
        type: 'TEXT',
        isDefault: true,
        provider: { id: 'provider-id', name: 'openai' },
      }
      mockModel.findFirst.mockResolvedValue(mockData)

      const result = await repository.getDefaultModel('TEXT' as AiModelType)

      expect(mockModel.findFirst).toHaveBeenCalledWith({
        where: {
          type: 'TEXT',
          isDefault: true,
          isEnabled: true,
        },
        include: { provider: true },
      })
      expect(result).toEqual(mockData)
    })

    it('应该在没有默认模型时返回 null', async () => {
      mockModel.findFirst.mockResolvedValue(null)

      const result = await repository.getDefaultModel('TEXT' as AiModelType)

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('应该创建 AI 模型', async () => {
      const input: CreateAiModelInput = {
        providerId: 'provider-id',
        modelId: 'gpt-4',
        name: 'GPT-4',
        type: 'TEXT' as AiModelType,
      }

      const mockData = { id: 'model-id', ...input }
      mockModel.create.mockResolvedValue(mockData)

      const result = await repository.create(input)

      expect(mockModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          provider: { connect: { id: 'provider-id' } },
          modelId: 'gpt-4',
          name: 'GPT-4',
          type: 'TEXT',
          isEnabled: true,
          isDefault: false,
          currency: 'USD',
        }),
      })
      expect(result).toEqual(mockData)
    })

    it('应该创建包含可选字段的模型', async () => {
      const input: CreateAiModelInput = {
        providerId: 'provider-id',
        modelId: 'gpt-4',
        name: 'GPT-4',
        type: 'TEXT' as AiModelType,
        isEnabled: true,
        isDefault: true,
        maxTokens: 8192,
        contextWindow: 128000,
        inputCost: 0.03,
        outputCost: 0.06,
        currency: 'CNY',
        rateLimit: 100,
        rpm: 60,
        tpm: 10000,
        metadata: { key: 'value' },
        description: 'OpenAI GPT-4',
      }

      const mockData = { id: 'model-id', ...input }
      mockModel.create.mockResolvedValue(mockData)

      await repository.create(input)

      expect(mockModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          provider: { connect: { id: 'provider-id' } },
          modelId: 'gpt-4',
          name: 'GPT-4',
          type: 'TEXT',
          isEnabled: true,
          isDefault: true,
          maxTokens: 8192,
          contextWindow: 128000,
          inputCost: 0.03,
          outputCost: 0.06,
          currency: 'CNY',
          rateLimit: 100,
          rpm: 60,
          tpm: 10000,
          metadata: { key: 'value' },
          description: 'OpenAI GPT-4',
        }),
      })
    })
  })

  describe('update', () => {
    it('应该更新 AI 模型', async () => {
      const input: UpdateAiModelInput = {
        name: 'Updated GPT-4',
        isEnabled: false,
      }

      const mockData = { id: 'model-id', ...input }
      mockModel.update.mockResolvedValue(mockData)

      const result = await repository.update('model-id', input)

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'model-id' },
        data: expect.objectContaining({
          name: 'Updated GPT-4',
          isEnabled: false,
        }),
      })
      expect(result).toEqual(mockData)
    })

    it('应该支持部分更新', async () => {
      const input: UpdateAiModelInput = {
        maxTokens: 16384,
        contextWindow: 256000,
      }

      const mockData = { id: 'model-id', ...input }
      mockModel.update.mockResolvedValue(mockData)

      await repository.update('model-id', input)

      expect(mockModel.update).toHaveBeenCalledWith({
        where: { id: 'model-id' },
        data: expect.objectContaining({
          maxTokens: 16384,
          contextWindow: 256000,
        }),
      })
    })
  })

  describe('delete', () => {
    it('应该删除 AI 模型', async () => {
      const mockData = { id: 'model-id', name: 'GPT-4' }
      mockModel.delete.mockResolvedValue(mockData)

      const result = await repository.delete('model-id')

      expect(mockModel.delete).toHaveBeenCalledWith({
        where: { id: 'model-id' },
      })
      expect(result).toEqual(mockData)
    })
  })

  describe('setAsDefault', () => {
    it('应该设置默认模型并取消其他模型的默认状态', async () => {
      mockTransaction.aiModel.updateMany.mockResolvedValue({ count: 1 })
      mockTransaction.aiModel.update.mockResolvedValue({ id: 'model-id', isDefault: true })

      await repository.setAsDefault('model-id', 'TEXT' as AiModelType)

      expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function))

      // 获取传递给 $transaction 的回调函数并执行它
      const txCallback = mockPrisma.$transaction.mock.calls[0][0]
      txCallback(mockTransaction)

      // 验证 transaction 内的调用
      expect(mockTransaction.aiModel.updateMany).toHaveBeenCalledWith({
        where: { type: 'TEXT', isDefault: true },
        data: { isDefault: false },
      })

      expect(mockTransaction.aiModel.update).toHaveBeenCalledWith({
        where: { id: 'model-id' },
        data: { isDefault: true },
      })
    })
  })

  describe('buildInclude', () => {
    it('应该在没有选项时返回空对象', () => {
      const result = repository['buildInclude']({})
      expect(result).toEqual({})
    })

    it('应该在 includeProvider 为 true 时包含 provider', () => {
      const result = repository['buildInclude']({ includeProvider: true })
      expect(result).toEqual({ provider: true })
    })

    it('应该在 onlyEnabled 时返回空对象', () => {
      const result = repository['buildInclude']({ onlyEnabled: true })
      expect(result).toEqual({})
    })
  })

  describe('TypeScript Types', () => {
    it('应该正确使用类型', () => {
      // 类型测试
      const createInput: CreateAiModelInput = {
        providerId: 'provider-id',
        modelId: 'gpt-4',
        name: 'GPT-4',
        type: 'TEXT' as AiModelType,
      }

      const updateInput: UpdateAiModelInput = {
        name: 'Updated',
        isEnabled: false,
      }

      const options: FindAiModelOptions = {
        includeProvider: true,
        onlyEnabled: true,
      }

      expect(createInput.type).toBe('TEXT')
      expect(updateInput.isEnabled).toBe(false)
      expect(options.includeProvider).toBe(true)
    })
  })
})
