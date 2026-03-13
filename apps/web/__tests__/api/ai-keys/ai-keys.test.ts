/**
 * AI Keys API Test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: any) => ({
      json: async () => data,
      ...init,
    }),
  },
}))

// Mock RBAC
const mockRequirePermission = vi.fn()
vi.mock('@/lib/rbac', () => ({
  requirePermission: mockRequirePermission,
  withPermission: vi.fn(),
}))

// Mock Prisma and Repository
const mockFindAll = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockFindById = vi.fn()

vi.mock('@ai-drama-studio/db', () => ({
  AiApiKeyRepository: class {
    findAll = mockFindAll
    create = mockCreate
    update = mockUpdate
    delete = mockDelete
    findById = mockFindById
  },
  prisma: {},
}))

describe('AI Keys API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/ai-keys', () => {
    it('returns 401 without authentication', async () => {
      mockRequirePermission.mockResolvedValue({
        success: false,
        response: { status: 401 },
      })

      const { GET } = await import('@/app/api/admin/ai-keys/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/ai-keys')
      const response = await GET(mockRequest)

      expect(response.status).toBe(401)
    })

    it('returns keys list with valid authentication', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockFindAll.mockResolvedValue([
        {
          id: '1',
          providerId: 'openai',
          modelId: 'gpt-4',
          name: 'Test Key',
          apiKey: 'sk-xxxxxxx',
          capabilities: ['TEXT'],
          proxyMode: 'AUTO',
          proxyId: null,
          priority: 0,
          weight: 1,
          isActive: true,
          quotaDaily: 1000,
          quotaUsed: 500,
          successCount: 100,
          failCount: 5,
          lastUsedAt: new Date().toISOString(),
          lastErrorAt: null,
          createdAt: new Date().toISOString(),
        },
      ])

      const { GET } = await import('@/app/api/admin/ai-keys/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/ai-keys')
      const response = await GET(mockRequest)
      const data = await response.json()

      expect(data).toHaveLength(1)
      expect(data[0].name).toBe('Test Key')
      expect(data[0].apiKey).toContain('****')
    })

    it('supports filtering by providerId', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockFindAll.mockResolvedValue([])

      const { GET } = await import('@/app/api/admin/ai-keys/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/ai-keys?providerId=openai')
      await GET(mockRequest)

      expect(mockFindAll).toHaveBeenCalledWith({ providerId: 'openai' })
    })

    it('supports filtering by isActive status', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockFindAll.mockResolvedValue([])

      const { GET } = await import('@/app/api/admin/ai-keys/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/ai-keys?isActive=true')
      await GET(mockRequest)

      expect(mockFindAll).toHaveBeenCalledWith({ isActive: true })
    })
  })

  describe('POST /api/admin/ai-keys', () => {
    it('returns 401 without authentication', async () => {
      mockRequirePermission.mockResolvedValue({
        success: false,
        response: { status: 401 },
      })

      const { POST } = await import('@/app/api/admin/ai-keys/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/ai-keys', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const response = await POST(mockRequest)

      expect(response.status).toBe(401)
    })

    it('creates a new key with valid data', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockCreate.mockResolvedValue({
        id: '1',
        providerId: 'openai',
        modelId: 'gpt-4',
        name: 'New Key',
        apiKey: 'sk-new-key',
        capabilities: ['TEXT', 'IMAGE'],
        proxyMode: 'AUTO',
        priority: 0,
        weight: 1,
        isActive: true,
        quotaDaily: null,
        createdAt: new Date().toISOString(),
      })

      const { POST } = await import('@/app/api/admin/ai-keys/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/ai-keys', {
        method: 'POST',
        body: JSON.stringify({
          providerId: 'openai',
          name: 'New Key',
          apiKey: 'sk-new-key',
        }),
      })
      const response = await POST(mockRequest)
      const data = await response.json()

      expect(data.name).toBe('New Key')
      expect(data.apiKey).toContain('****')
    })

    it('returns 400 with missing required fields', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })

      const { POST } = await import('@/app/api/admin/ai-keys/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/ai-keys', {
        method: 'POST',
        body: JSON.stringify({ name: 'Only Name' }),
      })
      const response = await POST(mockRequest)

      expect(response.status).toBe(400)
    })

    it('returns 409 with duplicate name', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockCreate.mockRejectedValue({ code: 'P2002' })

      const { POST } = await import('@/app/api/admin/ai-keys/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/ai-keys', {
        method: 'POST',
        body: JSON.stringify({
          providerId: 'openai',
          name: 'Duplicate Key',
          apiKey: 'sk-duplicate',
        }),
      })
      const response = await POST(mockRequest)

      expect(response.status).toBe(409)
    })
  })

  describe('PUT /api/admin/ai-keys/[id]', () => {
    it('updates an existing key', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockFindById.mockResolvedValue({
        id: '1',
        providerId: 'openai',
        name: 'Updated Key',
        apiKey: 'sk-updated',
        capabilities: ['TEXT'],
        proxyMode: 'AUTO',
        priority: 1,
        weight: 2,
        isActive: true,
        quotaDaily: 2000,
        updatedAt: new Date().toISOString(),
      })
      mockUpdate.mockResolvedValue({
        id: '1',
        providerId: 'openai',
        name: 'Updated Key',
        apiKey: 'sk-updated-key-new',
        capabilities: ['TEXT'],
        proxyMode: 'AUTO',
        priority: 1,
        weight: 2,
        isActive: true,
        quotaDaily: 2000,
        updatedAt: new Date().toISOString(),
      })

      const { PUT } = await import('@/app/api/admin/ai-keys/[id]/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/ai-keys/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Key' }),
      })
      const response = await PUT(mockRequest, { params: Promise.resolve({ id: '1' }) })
      const data = await response.json()

      expect(data.name).toBe('Updated Key')
    })

    it('returns 404 for non-existent key', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockUpdate.mockRejectedValue(new Error('Key 不存在'))

      const { PUT } = await import('@/app/api/admin/ai-keys/[id]/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/ai-keys/999', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Non-existent' }),
      })
      const response = await PUT(mockRequest, { params: Promise.resolve({ id: '999' }) })

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/admin/ai-keys/[id]', () => {
    it('deletes an existing key', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockDelete.mockResolvedValue(undefined)

      const { DELETE } = await import('@/app/api/admin/ai-keys/[id]/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/ai-keys/1', {
        method: 'DELETE',
      })
      const response = await DELETE(mockRequest, { params: Promise.resolve({ id: '1' }) })
      const data = await response.json()

      expect(data.success).toBe(true)
    })

    it('returns 404 for non-existent key', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockDelete.mockRejectedValue(new Error('Key 不存在'))

      const { DELETE } = await import('@/app/api/admin/ai-keys/[id]/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/ai-keys/999', {
        method: 'DELETE',
      })
      const response = await DELETE(mockRequest, { params: Promise.resolve({ id: '999' }) })

      expect(response.status).toBe(404)
    })
  })
})
