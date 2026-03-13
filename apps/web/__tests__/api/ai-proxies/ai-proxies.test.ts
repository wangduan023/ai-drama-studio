/**
 * AI Proxy API Test
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
  AiProxyRepository: class {
    findAll = mockFindAll
    create = mockCreate
    update = mockUpdate
    delete = mockDelete
    findById = mockFindById
  },
  prisma: {},
}))

describe('AI Proxy API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/proxy', () => {
    it('returns 401 without authentication', async () => {
      mockRequirePermission.mockResolvedValue({
        success: false,
        response: { status: 401 },
      })

      const { GET } = await import('@/app/api/admin/proxy/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/proxy')
      const response = await GET(mockRequest)

      expect(response.status).toBe(401)
    })

    it('returns proxy list with valid authentication', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockFindAll.mockResolvedValue([
        {
          id: '1',
          name: 'Test Proxy',
          host: '192.168.1.1',
          port: 8080,
          protocol: 'HTTP',
          location: 'US',
          provider: 'Provider A',
          isActive: true,
          isHealthy: true,
          checkLatency: 50,
          consecutiveFailures: 0,
          maxConcurrent: 10,
          currentConcurrent: 2,
          totalRequests: 1000,
          successRequests: 980,
          failedRequests: 20,
          avgLatency: 45,
          lastCheckAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString(),
          description: 'Test proxy description',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])

      const { GET } = await import('@/app/api/admin/proxy/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/proxy')
      const response = await GET(mockRequest)
      const data = await response.json()

      expect(data).toHaveLength(1)
      expect(data[0].name).toBe('Test Proxy')
      expect(data[0].host).toBe('192.168.1.1')
    })

    it('supports filtering by active status', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockFindAll.mockResolvedValue([])

      const { GET } = await import('@/app/api/admin/proxy/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/proxy?active=true')
      await GET(mockRequest)

      expect(mockFindAll).toHaveBeenCalledWith({ onlyActive: true })
    })

    it('supports filtering by health status', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockFindAll.mockResolvedValue([])

      const { GET } = await import('@/app/api/admin/proxy/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/proxy?healthy=true')
      await GET(mockRequest)

      expect(mockFindAll).toHaveBeenCalledWith({ onlyHealthy: true })
    })

    it('supports filtering by location', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockFindAll.mockResolvedValue([])

      const { GET } = await import('@/app/api/admin/proxy/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/proxy?location=US')
      await GET(mockRequest)

      expect(mockFindAll).toHaveBeenCalledWith({ location: 'US' })
    })
  })

  describe('POST /api/admin/proxy', () => {
    it('returns 401 without authentication', async () => {
      mockRequirePermission.mockResolvedValue({
        success: false,
        response: { status: 401 },
      })

      const { POST } = await import('@/app/api/admin/proxy/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/proxy', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const response = await POST(mockRequest)

      expect(response.status).toBe(401)
    })

    it('creates a new proxy with valid data', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockCreate.mockResolvedValue({
        id: '1',
        name: 'New Proxy',
        host: '192.168.1.100',
        port: 8080,
        protocol: 'HTTP',
        location: null,
        provider: null,
        isActive: true,
        isHealthy: null,
        maxConcurrent: 10,
        createdAt: new Date().toISOString(),
      })

      const { POST } = await import('@/app/api/admin/proxy/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/proxy', {
        method: 'POST',
        body: JSON.stringify({
          name: 'New Proxy',
          host: '192.168.1.100',
          port: 8080,
        }),
      })
      const response = await POST(mockRequest)
      const data = await response.json()

      expect(data.name).toBe('New Proxy')
    })

    it('returns 400 with missing required fields', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })

      const { POST } = await import('@/app/api/admin/proxy/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/proxy', {
        method: 'POST',
        body: JSON.stringify({ name: 'Only Name' }),
      })
      const response = await POST(mockRequest)

      expect(response.status).toBe(400)
    })

    it('returns 409 with duplicate name', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockCreate.mockRejectedValue({ code: 'P2002' })

      const { POST } = await import('@/app/api/admin/proxy/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/proxy', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Duplicate Proxy',
          host: '192.168.1.100',
          port: 8080,
        }),
      })
      const response = await POST(mockRequest)

      expect(response.status).toBe(409)
    })
  })

  describe('PUT /api/admin/proxy/[id]', () => {
    it('updates an existing proxy', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockFindById.mockResolvedValue({
        id: '1',
        name: 'Updated Proxy',
        host: '192.168.1.200',
        port: 8080,
        protocol: 'HTTPS',
        isActive: true,
        maxConcurrent: 20,
        updatedAt: new Date().toISOString(),
      })
      mockUpdate.mockResolvedValue({
        id: '1',
        name: 'Updated Proxy',
        host: '192.168.1.200',
        port: 8080,
        protocol: 'HTTPS',
        isActive: true,
        maxConcurrent: 20,
        updatedAt: new Date().toISOString(),
      })

      const { PUT } = await import('@/app/api/admin/proxy/[id]/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/proxy/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Proxy', port: 8080 }),
      })
      const response = await PUT(mockRequest, { params: Promise.resolve({ id: '1' }) })
      const data = await response.json()

      expect(data.name).toBe('Updated Proxy')
    })

    it('returns 404 for non-existent proxy', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockUpdate.mockRejectedValue(new Error('Proxy 不存在'))

      const { PUT } = await import('@/app/api/admin/proxy/[id]/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/proxy/999', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Non-existent' }),
      })
      const response = await PUT(mockRequest, { params: Promise.resolve({ id: '999' }) })

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/admin/proxy/[id]', () => {
    it('deletes an existing proxy', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockDelete.mockResolvedValue(undefined)

      const { DELETE } = await import('@/app/api/admin/proxy/[id]/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/proxy/1', {
        method: 'DELETE',
      })
      const response = await DELETE(mockRequest, { params: Promise.resolve({ id: '1' }) })
      const data = await response.json()

      expect(data.success).toBe(true)
    })

    it('returns 404 for non-existent proxy', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockDelete.mockRejectedValue(new Error('Proxy 不存在'))

      const { DELETE } = await import('@/app/api/admin/proxy/[id]/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/proxy/999', {
        method: 'DELETE',
      })
      const response = await DELETE(mockRequest, { params: Promise.resolve({ id: '999' }) })

      expect(response.status).toBe(404)
    })
  })
})
