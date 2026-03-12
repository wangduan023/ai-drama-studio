/**
 * AI API Key Repository Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AiApiKeyRepository } from '../../src/repositories/ai-api-key.repository'
import { PrismaClient } from '@prisma/client'
import * as crypto from '../../src/utils/crypto'

// Mock crypto utils
vi.mock('../../src/utils/crypto', () => ({
  encrypt: vi.fn((val: string) => `encrypted_${val}`),
  decrypt: vi.fn((val: string) => val?.replace('encrypted_', '') || ''),
}))

describe('AiApiKeyRepository', () => {
  let repository: AiApiKeyRepository
  let mockPrisma: any

  beforeEach(() => {
    mockPrisma = {
      aiApiKey: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        updateMany: vi.fn(),
      },
    }
    repository = new AiApiKeyRepository(mockPrisma as unknown as PrismaClient)
  })

  describe('create', () => {
    it('should create an API key with encrypted value', async () => {
      const mockKey = {
        id: 'key-1',
        providerId: 'provider-1',
        name: 'Test Key',
        apiKey: 'encrypted_sk-test123456',
        apiSecret: null,
        capabilities: ['TEXT', 'CHAT'],
        priority: 1,
        weight: 10,
        isActive: true,
        quotaDaily: null,
        quotaUsed: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockPrisma.aiApiKey.create.mockResolvedValue(mockKey)

      const result = await repository.create({
        providerId: 'provider-1',
        name: 'Test Key',
        apiKey: 'sk-test123456',
        capabilities: ['TEXT', 'CHAT'],
        priority: 1,
        weight: 10,
      })

      expect(result.apiKey).toBe('sk-test123456') // 解密后的
      expect(mockPrisma.aiApiKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          providerId: 'provider-1',
          name: 'Test Key',
          apiKey: 'encrypted_sk-test123456',
          capabilities: ['TEXT', 'CHAT'],
          priority: 1,
          weight: 10,
        })
      })
    })

    it('should create a model-specific key', async () => {
      const mockKey = {
        id: 'key-2',
        providerId: 'provider-1',
        modelId: 'model-123',
        name: 'Model Key',
        apiKey: 'encrypted_sk-model',
        apiSecret: null,
        priority: 0,
        weight: 1,
        isActive: true,
        quotaDaily: null,
        quotaUsed: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockPrisma.aiApiKey.create.mockResolvedValue(mockKey)

      const result = await repository.create({
        providerId: 'provider-1',
        modelId: 'model-123',
        name: 'Model Key',
        apiKey: 'sk-model',
      })

      expect(result.modelId).toBe('model-123')
    })
  })

  describe('findById', () => {
    it('should find and decrypt key by id', async () => {
      const mockKey = {
        id: 'key-1',
        providerId: 'provider-1',
        name: 'Test Key',
        apiKey: 'encrypted_sk-test',
        apiSecret: null,
        model: null,
        provider: null,
        proxy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockPrisma.aiApiKey.findUnique.mockResolvedValue(mockKey)

      const result = await repository.findById('key-1')

      expect(result?.apiKey).toBe('sk-test') // 解密后的
      expect(mockPrisma.aiApiKey.findUnique).toHaveBeenCalledWith({
        where: { id: 'key-1' },
        include: { provider: true, model: true, proxy: true }
      })
    })

    it('should return null for non-existent key', async () => {
      mockPrisma.aiApiKey.findUnique.mockResolvedValue(null)

      const result = await repository.findById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('findAll', () => {
    it('should filter by provider', async () => {
      const mockKeys = [
        { id: 'key-1', providerId: 'provider-1', apiKey: 'encrypted_sk-1', apiSecret: null },
      ]
      mockPrisma.aiApiKey.findMany.mockResolvedValue(mockKeys)

      await repository.findAll({ providerId: 'provider-1' })

      expect(mockPrisma.aiApiKey.findMany).toHaveBeenCalledWith({
        where: { providerId: 'provider-1' },
        include: { provider: true, model: true },
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }]
      })
    })

    it('should filter by active status', async () => {
      const mockKeys = [
        { id: 'key-1', isActive: true, apiKey: 'encrypted_sk-1', apiSecret: null },
      ]
      mockPrisma.aiApiKey.findMany.mockResolvedValue(mockKeys)

      await repository.findAll({ isActive: true })

      expect(mockPrisma.aiApiKey.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: { provider: true, model: true },
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }]
      })
    })
  })

  describe('update', () => {
    it('should update key and encrypt new apiKey', async () => {
      const mockKey = {
        id: 'key-1',
        name: 'Updated Name',
        apiKey: 'encrypted_sk-new',
        apiSecret: null,
        updatedAt: new Date(),
      }
      mockPrisma.aiApiKey.update.mockResolvedValue(mockKey)

      const result = await repository.update('key-1', {
        name: 'Updated Name',
        apiKey: 'sk-new',
      })

      expect(result.name).toBe('Updated Name')
      expect(result.apiKey).toBe('sk-new')
    })
  })

  describe('quota management', () => {
    it('should increment quota usage', async () => {
      mockPrisma.aiApiKey.update.mockResolvedValue({ id: 'key-1', quotaUsed: 1 })

      await repository.incrementQuota('key-1')

      expect(mockPrisma.aiApiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-1' },
        data: {
          quotaUsed: { increment: 1 },
          lastUsedAt: expect.any(Date)
        }
      })
    })

    it('should reset quota', async () => {
      const mockKey = { id: 'key-1', quotaUsed: 0, quotaResetAt: new Date() }
      mockPrisma.aiApiKey.update.mockResolvedValue(mockKey)

      const result = await repository.resetQuota('key-1')

      expect(result.quotaUsed).toBe(0)
      expect(mockPrisma.aiApiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-1' },
        data: {
          quotaUsed: 0,
          quotaResetAt: expect.any(Date)
        }
      })
    })
  })

  describe('usage statistics', () => {
    it('should record success', async () => {
      mockPrisma.aiApiKey.update.mockResolvedValue({ id: 'key-1', successCount: 1 })

      await repository.recordSuccess('key-1')

      expect(mockPrisma.aiApiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-1' },
        data: {
          successCount: { increment: 1 },
          lastUsedAt: expect.any(Date)
        }
      })
    })

    it('should record failure', async () => {
      mockPrisma.aiApiKey.update.mockResolvedValue({ 
        id: 'key-1', 
        failCount: 1,
        lastErrorMsg: 'Connection timeout'
      })

      await repository.recordFail('key-1', 'Connection timeout')

      expect(mockPrisma.aiApiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-1' },
        data: {
          failCount: { increment: 1 },
          lastErrorAt: expect.any(Date),
          lastErrorMsg: 'Connection timeout'
        }
      })
    })
  })

  describe('findAvailableByProvider', () => {
    it('should return only active keys with available quota', async () => {
      const mockKeys = [
        { id: 'key-1', providerId: 'provider-1', apiKey: 'encrypted_sk-1', apiSecret: null },
      ]
      mockPrisma.aiApiKey.findMany.mockResolvedValue(mockKeys)
      mockPrisma.aiApiKey.fields = { quotaDaily: 'quotaDaily' }

      const result = await repository.findAvailableByProvider('provider-1')

      expect(result).toHaveLength(1)
      expect(mockPrisma.aiApiKey.findMany).toHaveBeenCalledWith({
        where: {
          providerId: 'provider-1',
          isActive: true,
          OR: [
            { quotaDaily: null },
            { quotaUsed: { lt: 'quotaDaily' } }
          ]
        },
        orderBy: [{ priority: 'asc' }, { weight: 'desc' }]
      })
    })
  })
})
