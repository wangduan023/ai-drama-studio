/**
 * AI Proxy Repository Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AiProxyRepository } from '../../src/repositories/proxy.repository'
import { PrismaClient } from '@prisma/client'

vi.mock('../../src/utils/crypto', () => ({
  encrypt: vi.fn((val: string) => `encrypted_${val}`),
  decrypt: vi.fn((val: string) => val?.replace('encrypted_', '') || null),
}))

describe('AiProxyRepository', () => {
  let repository: AiProxyRepository
  let mockPrisma: any

  beforeEach(() => {
    mockPrisma = {
      aiProxy: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        fields: { maxConcurrent: 'maxConcurrent' },
      },
    }
    repository = new AiProxyRepository(mockPrisma as unknown as PrismaClient)
  })

  describe('create', () => {
    it('should create a proxy', async () => {
      const mockProxy = {
        id: 'proxy-1',
        name: 'Test Proxy',
        host: 'proxy.test.com',
        port: 8080,
        protocol: 'HTTP',
        username: null,
        password: null,
        location: 'US',
        provider: null,
        isActive: true,
        isHealthy: true,
        maxConcurrent: 10,
        currentConcurrent: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockPrisma.aiProxy.create.mockResolvedValue(mockProxy)

      const result = await repository.create({
        name: 'Test Proxy',
        host: 'proxy.test.com',
        port: 8080,
        protocol: 'HTTP',
        location: 'US',
        maxConcurrent: 10,
      })

      expect(result.name).toBe('Test Proxy')
      expect(result.host).toBe('proxy.test.com')
      expect(result.port).toBe(8080)
    })

    it('should create proxy with authentication', async () => {
      const mockProxy = {
        id: 'proxy-2',
        name: 'Auth Proxy',
        host: 'auth.test.com',
        port: 3128,
        protocol: 'HTTPS',
        username: 'user123',
        password: 'encrypted_pass456',
        isActive: true,
        isHealthy: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockPrisma.aiProxy.create.mockResolvedValue(mockProxy)

      const result = await repository.create({
        name: 'Auth Proxy',
        host: 'auth.test.com',
        port: 3128,
        protocol: 'HTTPS',
        username: 'user123',
        password: 'pass456',
      })

      expect(result.username).toBe('user123')
      expect(result.password).toBe('pass456') // 解密后的
    })
  })

  describe('findById', () => {
    it('should find proxy by id', async () => {
      const mockProxy = {
        id: 'proxy-1',
        name: 'Test Proxy',
        host: 'test.com',
        port: 8080,
        password: 'encrypted_pass',
        apiKeys: [],
      }
      mockPrisma.aiProxy.findUnique.mockResolvedValue(mockProxy)

      const result = await repository.findById('proxy-1')

      expect(result?.name).toBe('Test Proxy')
      expect(mockPrisma.aiProxy.findUnique).toHaveBeenCalledWith({
        where: { id: 'proxy-1' },
        include: { apiKeys: { select: { id: true, name: true } } }
      })
    })
  })

  describe('findAll', () => {
    it('should filter by active status', async () => {
      const mockProxies = [{ id: 'proxy-1', isActive: true }]
      mockPrisma.aiProxy.findMany.mockResolvedValue(mockProxies)

      await repository.findAll({ onlyActive: true })

      expect(mockPrisma.aiProxy.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ isHealthy: 'desc' }, { checkLatency: 'asc' }]
      })
    })

    it('should filter by location', async () => {
      const mockProxies = [{ id: 'proxy-1', location: 'US' }]
      mockPrisma.aiProxy.findMany.mockResolvedValue(mockProxies)

      await repository.findAll({ location: 'US' })

      expect(mockPrisma.aiProxy.findMany).toHaveBeenCalledWith({
        where: { location: 'US' },
        orderBy: [{ isHealthy: 'desc' }, { checkLatency: 'asc' }]
      })
    })
  })

  describe('updateHealthStatus', () => {
    it('should update health status to healthy', async () => {
      const mockProxy = {
        id: 'proxy-1',
        isHealthy: true,
        checkLatency: 150,
        consecutiveFailures: 0,
        lastCheckAt: new Date(),
      }
      mockPrisma.aiProxy.update.mockResolvedValue(mockProxy)

      const result = await repository.updateHealthStatus('proxy-1', {
        isHealthy: true,
        latency: 150,
      })

      expect(result.isHealthy).toBe(true)
      expect(result.checkLatency).toBe(150)
      expect(result.consecutiveFailures).toBe(0)
    })

    it('should increment failures for unhealthy status', async () => {
      mockPrisma.aiProxy.findUnique.mockResolvedValue({
        consecutiveFailures: 2
      })
      
      const mockProxy = {
        id: 'proxy-1',
        isHealthy: false,
        consecutiveFailures: 3,
        checkError: 'Connection refused',
        lastCheckAt: new Date(),
      }
      mockPrisma.aiProxy.update.mockResolvedValue(mockProxy)

      const result = await repository.updateHealthStatus('proxy-1', {
        isHealthy: false,
        error: 'Connection refused',
      })

      expect(result.isHealthy).toBe(false)
      expect(result.consecutiveFailures).toBe(3)
      expect(result.checkError).toBe('Connection refused')
    })
  })

  describe('concurrent management', () => {
    it('should increment concurrent count', async () => {
      mockPrisma.aiProxy.findUnique.mockResolvedValue({
        currentConcurrent: 0,
        maxConcurrent: 5
      })
      mockPrisma.aiProxy.update.mockResolvedValue({ currentConcurrent: 1 })

      const success = await repository.incrementConcurrent('proxy-1')

      expect(success).toBe(true)
      expect(mockPrisma.aiProxy.update).toHaveBeenCalledWith({
        where: { id: 'proxy-1' },
        data: { currentConcurrent: { increment: 1 } }
      })
    })

    it('should reject when max concurrent reached', async () => {
      mockPrisma.aiProxy.findUnique.mockResolvedValue({
        currentConcurrent: 5,
        maxConcurrent: 5
      })

      const success = await repository.incrementConcurrent('proxy-1')

      expect(success).toBe(false)
    })

    it('should decrement concurrent count', async () => {
      mockPrisma.aiProxy.findUnique.mockResolvedValue({ currentConcurrent: 3 })
      mockPrisma.aiProxy.update.mockResolvedValue({ currentConcurrent: 2 })

      await repository.decrementConcurrent('proxy-1')

      expect(mockPrisma.aiProxy.update).toHaveBeenCalledWith({
        where: { id: 'proxy-1' },
        data: { currentConcurrent: { decrement: 1 } }
      })
    })

    it('should not go below zero when decrementing', async () => {
      mockPrisma.aiProxy.findUnique.mockResolvedValue({ currentConcurrent: 0 })

      await repository.decrementConcurrent('proxy-1')

      expect(mockPrisma.aiProxy.update).not.toHaveBeenCalled()
    })
  })

  describe('updateStats', () => {
    it('should update success stats', async () => {
      mockPrisma.aiProxy.findUnique.mockResolvedValue({
        totalRequests: 10,
        avgLatency: 100
      })
      mockPrisma.aiProxy.update.mockResolvedValue({})

      await repository.updateStats('proxy-1', 'success', 150)

      expect(mockPrisma.aiProxy.update).toHaveBeenCalledWith({
        where: { id: 'proxy-1' },
        data: expect.objectContaining({
          totalRequests: { increment: 1 },
          successRequests: { increment: 1 },
          lastUsedAt: expect.any(Date)
        })
      })
    })
  })

  describe('findHealthy', () => {
    it('should return only healthy and active proxies with capacity', async () => {
      const mockProxies = [{ id: 'proxy-1', name: 'Healthy Proxy' }]
      mockPrisma.aiProxy.findMany.mockResolvedValue(mockProxies)

      const result = await repository.findHealthy()

      expect(result).toHaveLength(1)
      expect(mockPrisma.aiProxy.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          isHealthy: true,
          currentConcurrent: { lt: mockPrisma.aiProxy.fields.maxConcurrent }
        },
        orderBy: [
          { checkLatency: 'asc' },
          { currentConcurrent: 'asc' }
        ]
      })
    })
  })
})
