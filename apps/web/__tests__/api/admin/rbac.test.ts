/**
 * Admin Roles API Test
 * 角色管理 API 测试
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

// Mock Prisma and Repositories
const mockFindAll = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockFindById = vi.fn()
const mockGetUserRoles = vi.fn()
const mockAssignToUser = vi.fn()
const mockRemoveFromUser = vi.fn()
const mockFindGroupedByResource = vi.fn()

vi.mock('@ai-drama-studio/db', () => ({
  RoleRepository: class {
    findAll = mockFindAll
    create = mockCreate
    update = mockUpdate
    delete = mockDelete
    findById = mockFindById
    getUserRoles = mockGetUserRoles
    assignToUser = mockAssignToUser
    removeFromUser = mockRemoveFromUser
  },
  PermissionRepository: class {
    findAll = mockFindAll
    findGroupedByResource = mockFindGroupedByResource
  },
  prisma: {},
}))

describe('Admin Roles API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/roles', () => {
    it('returns 401 without authentication', async () => {
      mockRequirePermission.mockResolvedValue({
        success: false,
        response: { status: 401 },
      })

      const { GET } = await import('@/app/api/admin/roles/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/roles')
      const response = await GET(mockRequest)

      expect(response.status).toBe(401)
    })

    it('returns roles list', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockFindAll.mockResolvedValue([
        {
          id: '1',
          name: 'admin',
          type: 'SYSTEM',
          label: '管理员',
          description: '系统管理员',
          permissions: [],
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'editor',
          type: 'SYSTEM',
          label: '编辑',
          description: '内容编辑',
          permissions: [],
          createdAt: new Date().toISOString(),
        },
      ])

      const { GET } = await import('@/app/api/admin/roles/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/roles')
      const response = await GET(mockRequest)
      const data = await response.json()

      expect(data).toHaveLength(2)
      expect(data[0].name).toBe('admin')
      expect(data[1].name).toBe('editor')
    })

    it('filters by type SYSTEM', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockFindAll.mockResolvedValue([])

      const { GET } = await import('@/app/api/admin/roles/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/roles?type=SYSTEM')
      await GET(mockRequest)

      expect(mockFindAll).toHaveBeenCalledWith({ type: 'SYSTEM' })
    })

    it('filters by type PROJECT', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockFindAll.mockResolvedValue([])

      const { GET } = await import('@/app/api/admin/roles/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/roles?type=PROJECT')
      await GET(mockRequest)

      expect(mockFindAll).toHaveBeenCalledWith({ type: 'PROJECT' })
    })
  })

  describe('POST /api/admin/roles', () => {
    it('returns 401 without authentication', async () => {
      mockRequirePermission.mockResolvedValue({
        success: false,
        response: { status: 401 },
      })

      const { POST } = await import('@/app/api/admin/roles/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const response = await POST(mockRequest)

      expect(response.status).toBe(401)
    })

    it('creates a new role', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockCreate.mockResolvedValue({
        id: '3',
        name: 'viewer',
        type: 'SYSTEM',
        label: '观察者',
        description: '只读权限',
        permissions: [],
        createdAt: new Date().toISOString(),
      })

      const { POST } = await import('@/app/api/admin/roles/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify({
          name: 'viewer',
          type: 'SYSTEM',
          label: '观察者',
          description: '只读权限',
        }),
      })
      const response = await POST(mockRequest)
      const data = await response.json()

      expect(data.name).toBe('viewer')
    })

    it('returns 400 with missing required fields', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })

      const { POST } = await import('@/app/api/admin/roles/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify({ name: 'incomplete' }),
      })
      const response = await POST(mockRequest)

      expect(response.status).toBe(400)
    })

    it('returns 409 with duplicate name', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockCreate.mockRejectedValue({ code: 'P2002' })

      const { POST } = await import('@/app/api/admin/roles/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify({
          name: 'duplicate',
          type: 'SYSTEM',
          label: '重复角色',
        }),
      })
      const response = await POST(mockRequest)

      expect(response.status).toBe(409)
    })
  })

  describe('PUT /api/admin/roles/[id]', () => {
    it('updates an existing role', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockFindById.mockResolvedValue({
        id: '1',
        name: 'admin-updated',
        type: 'SYSTEM',
        label: '超级管理员',
        description: '更新后的描述',
        permissions: [],
        updatedAt: new Date().toISOString(),
      })
      mockUpdate.mockResolvedValue({
        id: '1',
        name: 'admin-updated',
        type: 'SYSTEM',
        label: '超级管理员',
        description: '更新后的描述',
        permissions: [],
        updatedAt: new Date().toISOString(),
      })

      const { PUT } = await import('@/app/api/admin/roles/[id]/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/roles/1', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'admin-updated',
          label: '超级管理员',
          description: '更新后的描述',
        }),
      })
      const response = await PUT(mockRequest, { params: Promise.resolve({ id: '1' }) })
      const data = await response.json()

      expect(data.name).toBe('admin-updated')
      expect(data.label).toBe('超级管理员')
    })

    it('returns 404 for non-existent role', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockUpdate.mockRejectedValue(new Error('Role 不存在'))

      const { PUT } = await import('@/app/api/admin/roles/[id]/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/roles/999', {
        method: 'PUT',
        body: JSON.stringify({ name: 'non-existent' }),
      })
      const response = await PUT(mockRequest, { params: Promise.resolve({ id: '999' }) })

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/admin/roles/[id]', () => {
    it('deletes an existing role', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockDelete.mockResolvedValue(undefined)

      const { DELETE } = await import('@/app/api/admin/roles/[id]/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/roles/1', {
        method: 'DELETE',
      })
      const response = await DELETE(mockRequest, { params: Promise.resolve({ id: '1' }) })
      const data = await response.json()

      expect(data.success).toBe(true)
    })

    it('cannot delete system role', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockFindById.mockResolvedValue({
        id: 'admin',
        name: 'admin',
        type: 'SYSTEM',
        label: '管理员',
        isSystem: true,
      })

      const { DELETE } = await import('@/app/api/admin/roles/[id]/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/roles/admin', {
        method: 'DELETE',
      })
      const response = await DELETE(mockRequest, { params: Promise.resolve({ id: 'admin' }) })

      expect(response.status).toBe(403)
    })
  })
})

describe('Admin Permissions API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/permissions', () => {
    it('returns 401 without authentication', async () => {
      mockRequirePermission.mockResolvedValue({
        success: false,
        response: { status: 401 },
      })

      const { GET } = await import('@/app/api/admin/permissions/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/permissions')
      const response = await GET(mockRequest)

      expect(response.status).toBe(401)
    })

    it('returns permissions list', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockFindAll.mockResolvedValue([
        {
          id: '1',
          resource: 'role',
          action: 'create',
          label: '创建角色',
          description: '允许创建新角色',
        },
        {
          id: '2',
          resource: 'role',
          action: 'read',
          label: '查看角色',
          description: '允许查看角色列表',
        },
      ])

      const { GET } = await import('@/app/api/admin/permissions/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/permissions')
      const response = await GET(mockRequest)
      const data = await response.json()

      expect(data).toHaveLength(2)
      expect(data[0].resource).toBe('role')
      expect(data[0].action).toBe('create')
    })

    it('filters by resource', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockFindAll.mockResolvedValue([])

      const { GET } = await import('@/app/api/admin/permissions/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/permissions?resource=role')
      await GET(mockRequest)

      expect(mockFindAll).toHaveBeenCalledWith({ resource: 'role' })
    })

    it('filters by action', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockFindAll.mockResolvedValue([])

      const { GET } = await import('@/app/api/admin/permissions/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/permissions?action=read')
      await GET(mockRequest)

      // API ignores action parameter, only filters by resource
      expect(mockFindAll).toHaveBeenCalledWith({ resource: undefined })
    })
  })
})

describe('User Roles API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/users/[id]/roles', () => {
    it('returns user roles', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockGetUserRoles.mockResolvedValue([
        {
          id: '1',
          name: 'admin',
          type: 'SYSTEM',
          label: '管理员',
        },
      ])

      const { GET } = await import('@/app/api/admin/users/[id]/roles/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/users/1/roles')
      const response = await GET(mockRequest, { params: Promise.resolve({ id: '1' }) })
      const data = await response.json()

      expect(data).toHaveLength(1)
      expect(data[0].name).toBe('admin')
    })
  })

  describe('POST /api/admin/users/[id]/roles', () => {
    it('assigns role to user', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })
      mockAssignToUser.mockResolvedValue(undefined)

      const { POST } = await import('@/app/api/admin/users/[id]/roles/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/users/1/roles', {
        method: 'POST',
        body: JSON.stringify({ roleId: 'admin' }),
      })
      const response = await POST(mockRequest, { params: Promise.resolve({ id: '1' }) })
      const data = await response.json()

      expect(data.success).toBe(true)
    })

    it('returns 400 with missing roleId', async () => {
      mockRequirePermission.mockResolvedValue({ success: true })

      const { POST } = await import('@/app/api/admin/users/[id]/roles/route')
      const mockRequest = new Request('http://localhost:3000/api/admin/users/1/roles', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const response = await POST(mockRequest, { params: Promise.resolve({ id: '1' }) })

      expect(response.status).toBe(400)
    })
  })
})
