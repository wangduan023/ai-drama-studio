/**
 * RBAC Repository Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RoleRepository, PermissionRepository } from '../../src/repositories'
import { PrismaClient } from '@prisma/client'

describe('RBAC Repositories', () => {
  let mockPrisma: any

  beforeEach(() => {
    mockPrisma = {
      role: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      permission: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      rolePermission: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
        findFirst: vi.fn(),
      },
      userSystemRole: {
        upsert: vi.fn(),
        delete: vi.fn(),
        findMany: vi.fn(),
      },
      projectMemberRole: {
        upsert: vi.fn(),
        findMany: vi.fn(),
      },
    }
  })

  describe('PermissionRepository', () => {
    let repository: PermissionRepository
    let permMockPrisma: any

    beforeEach(() => {
      permMockPrisma = {
        permission: {
          findUnique: vi.fn(),
          findMany: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
        },
        rolePermission: {
          findMany: vi.fn(),
        },
      }
      repository = new PermissionRepository(permMockPrisma as unknown as PrismaClient)
    })

    describe('create', () => {
      it('should create a permission', async () => {
        const mockPerm = {
          id: 'perm-1',
          resource: 'test_resource',
          action: 'read',
          name: 'test_resource:read',
          description: 'Test permission',
        }
        permMockPrisma.permission.create.mockResolvedValue(mockPerm)

        const result = await repository.create({
          resource: 'test_resource',
          action: 'read',
          description: 'Test permission',
        })

        expect(result.resource).toBe('test_resource')
        expect(result.action).toBe('read')
        expect(result.name).toBe('test_resource:read')
      })

      it('should find existing permission by resource:action', async () => {
        const mockPerm = { id: 'perm-1', resource: 'test', action: 'read' }
        permMockPrisma.permission.findUnique.mockResolvedValue(mockPerm)

        const result = await repository.findByResourceAction('test', 'read')

        expect(result?.id).toBe('perm-1')
      })
    })

    describe('findAll', () => {
      it('should find all permissions', async () => {
        const mockPerms = [
          { id: 'perm-1', resource: 'ai_key', action: 'read' },
          { id: 'perm-2', resource: 'ai_key', action: 'create' },
        ]
        permMockPrisma.permission.findMany.mockResolvedValue(mockPerms)

        const result = await repository.findAll({ resource: 'ai_key' })

        expect(result).toHaveLength(2)
        expect(permMockPrisma.permission.findMany).toHaveBeenCalledWith({
          where: { resource: 'ai_key' },
          orderBy: [{ resource: 'asc' }, { action: 'asc' }]
        })
      })
    })

    describe('findGroupedByResource', () => {
      it('should group permissions by resource', async () => {
        const mockPerms = [
          { id: 'p1', resource: 'ai_key', action: 'read' },
          { id: 'p2', resource: 'ai_key', action: 'create' },
          { id: 'p3', resource: 'project', action: 'read' },
        ]
        permMockPrisma.permission.findMany.mockResolvedValue(mockPerms)

        const result = await repository.findGroupedByResource()

        expect(result['ai_key']).toHaveLength(2)
        expect(result['project']).toHaveLength(1)
      })
    })

    describe('getRolePermissions', () => {
      it('should get permissions for a role', async () => {
        permMockPrisma.rolePermission.findMany.mockResolvedValue([
          { permission: { id: 'p1', resource: 'ai_key', action: 'read' } },
          { permission: { id: 'p2', resource: 'ai_key', action: 'create' } },
        ])

        const result = await repository.getRolePermissions('role-1')

        expect(result).toHaveLength(2)
        expect(result[0].resource).toBe('ai_key')
      })
    })
  })

  describe('RoleRepository', () => {
    let repository: RoleRepository

    beforeEach(() => {
      repository = new RoleRepository(mockPrisma as unknown as PrismaClient)
    })

    describe('create', () => {
      it('should create a system role', async () => {
        const mockRole = {
          id: 'role-1',
          name: 'ADMIN',
          type: 'SYSTEM',
          label: 'Admin',
          description: 'System admin',
          isSystem: false,
          permissions: [],
        }
        mockPrisma.role.create.mockResolvedValue(mockRole)

        const result = await repository.create({
          name: 'ADMIN',
          type: 'SYSTEM',
          label: 'Admin',
          description: 'System admin',
        })

        expect(result.name).toBe('ADMIN')
        expect(result.type).toBe('SYSTEM')
      })

      it('should create a project role with permissions', async () => {
        const mockRole = {
          id: 'role-2',
          name: 'PROJECT_MEMBER',
          type: 'PROJECT',
          label: 'Project Member',
          permissions: [
            { permission: { id: 'p1', resource: 'project', action: 'read' } }
          ],
        }
        mockPrisma.role.create.mockResolvedValue(mockRole)

        const result = await repository.create({
          name: 'PROJECT_MEMBER',
          type: 'PROJECT',
          label: 'Project Member',
          permissionIds: ['p1'],
        })

        expect(result.type).toBe('PROJECT')
        expect(mockPrisma.role.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: 'PROJECT_MEMBER',
            type: 'PROJECT',
            permissions: {
              create: [{ permission: { connect: { id: 'p1' } } }]
            }
          }),
          include: { permissions: { include: { permission: true } } }
        })
      })
    })

    describe('findByName', () => {
      it('should find role by name', async () => {
        const mockRole = {
          id: 'role-1',
          name: 'ADMIN',
          label: 'Admin',
          permissions: [],
        }
        mockPrisma.role.findUnique.mockResolvedValue(mockRole)

        const result = await repository.findByName('ADMIN')

        expect(result?.name).toBe('ADMIN')
        expect(mockPrisma.role.findUnique).toHaveBeenCalledWith({
          where: { name: 'ADMIN' },
          include: { permissions: { include: { permission: true } } }
        })
      })
    })

    describe('update', () => {
      it('should update role permissions', async () => {
        mockPrisma.rolePermission.deleteMany.mockResolvedValue({ count: 1 })
        mockPrisma.rolePermission.createMany.mockResolvedValue({ count: 2 })
        
        const mockRole = {
          id: 'role-1',
          name: 'ADMIN',
          label: 'Updated Label',
          permissions: [
            { permission: { id: 'p1' } },
            { permission: { id: 'p2' } },
          ],
        }
        mockPrisma.role.update.mockResolvedValue(mockRole)

        const result = await repository.update('role-1', {
          label: 'Updated Label',
          permissionIds: ['p1', 'p2'],
        })

        expect(result.label).toBe('Updated Label')
        expect(mockPrisma.rolePermission.deleteMany).toHaveBeenCalledWith({
          where: { roleId: 'role-1' }
        })
        expect(mockPrisma.rolePermission.createMany).toHaveBeenCalledWith({
          data: [
            { roleId: 'role-1', permissionId: 'p1' },
            { roleId: 'role-1', permissionId: 'p2' },
          ]
        })
      })
    })

    describe('assignToUser', () => {
      it('should assign role to user', async () => {
        mockPrisma.userSystemRole.upsert.mockResolvedValue({
          userId: 'user-1',
          roleId: 'role-1'
        })

        await repository.assignToUser('user-1', 'role-1')

        expect(mockPrisma.userSystemRole.upsert).toHaveBeenCalledWith({
          where: { userId_roleId: { userId: 'user-1', roleId: 'role-1' } },
          update: {},
          create: { userId: 'user-1', roleId: 'role-1' }
        })
      })
    })

    describe('removeFromUser', () => {
      it('should remove role from user', async () => {
        mockPrisma.userSystemRole.delete.mockResolvedValue({})

        await repository.removeFromUser('user-1', 'role-1')

        expect(mockPrisma.userSystemRole.delete).toHaveBeenCalledWith({
          where: { userId_roleId: { userId: 'user-1', roleId: 'role-1' } }
        })
      })
    })

    describe('assignToProjectMember', () => {
      it('should assign role to project member', async () => {
        mockPrisma.projectMemberRole.upsert.mockResolvedValue({
          projectId: 'proj-1',
          userId: 'user-1',
          roleId: 'role-1'
        })

        await repository.assignToProjectMember('proj-1', 'user-1', 'role-1')

        expect(mockPrisma.projectMemberRole.upsert).toHaveBeenCalledWith({
          where: { projectId_userId: { projectId: 'proj-1', userId: 'user-1' } },
          update: { roleId: 'role-1' },
          create: { projectId: 'proj-1', userId: 'user-1', roleId: 'role-1' }
        })
      })
    })

    describe('getUserRoles', () => {
      it('should get system roles for user', async () => {
        mockPrisma.userSystemRole.findMany.mockResolvedValue([
          { role: { id: 'r1', name: 'ADMIN', permissions: [] } },
          { role: { id: 'r2', name: 'USER', permissions: [] } },
        ])

        const result = await repository.getUserRoles('user-1')

        expect(result).toHaveLength(2)
        expect(result[0].name).toBe('ADMIN')
        expect(mockPrisma.userSystemRole.findMany).toHaveBeenCalledWith({
          where: { userId: 'user-1' },
          include: { role: { include: { permissions: { include: { permission: true } } } } }
        })
      })
    })

    describe('checkUserPermission', () => {
      it('should return true if user has permission', async () => {
        mockPrisma.rolePermission.findFirst.mockResolvedValue({ id: 'rp-1' })

        const result = await repository.checkUserPermission(
          'user-1',
          'ai_key',
          'read'
        )

        expect(result).toBe(true)
      })

      it('should check project-level permission if projectId provided', async () => {
        mockPrisma.rolePermission.findFirst.mockResolvedValueOnce(null) // system check fails
        mockPrisma.rolePermission.findFirst.mockResolvedValueOnce({ id: 'rp-2' }) // project check succeeds

        const result = await repository.checkUserPermission(
          'user-1',
          'project',
          'update',
          'proj-1'
        )

        expect(result).toBe(true)
        expect(mockPrisma.rolePermission.findFirst).toHaveBeenCalledTimes(2)
      })

      it('should return false if no permission found', async () => {
        mockPrisma.rolePermission.findFirst.mockResolvedValue(null)

        const result = await repository.checkUserPermission(
          'user-1',
          'admin',
          'delete'
        )

        expect(result).toBe(false)
      })
    })
  })
})
