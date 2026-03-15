/**
 * Role Repository
 * RBAC 角色仓储层
 */
import type { Prisma, Role, Permission, PrismaClient } from '@prisma/client'
import { BaseRepository } from './base.repository'
import { prisma } from '../client'

export interface CreateRoleInput {
  name: string
  type: 'SYSTEM' | 'PROJECT'
  label: string
  description?: string | null
  isSystem?: boolean
  permissionIds?: string[]
}

export interface UpdateRoleInput {
  label?: string
  description?: string | null
  permissionIds?: string[]
}

export class RoleRepository extends BaseRepository<'role', Role> {
  protected readonly modelName = 'role' as const

  constructor(prismaInstance?: PrismaClient) {
    super(prismaInstance)
  }

  /**
   * 根据 ID 查找角色
   */
  async findById(id: string): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { include: { permission: true } } }
    })
  }

  /**
   * 根据名称查找角色
   */
  async findByName(name: string): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: { name },
      include: { permissions: { include: { permission: true } } }
    })
  }

  /**
   * 查找所有角色
   */
  async findAll(options: { type?: 'SYSTEM' | 'PROJECT' } = {}): Promise<Role[]> {
    return this.prisma.role.findMany({
      where: options.type ? { type: options.type } : {},
      include: { permissions: { include: { permission: true } } },
      orderBy: { createdAt: 'asc' }
    })
  }

  /**
   * 创建角色
   */
  async create(input: CreateRoleInput): Promise<Role> {
    const data: Prisma.RoleCreateInput = {
      name: input.name,
      type: input.type,
      label: input.label,
      description: input.description,
      isSystem: input.isSystem ?? false,
      ...(input.permissionIds?.length ? {
        permissions: {
          create: input.permissionIds.map(permissionId => ({
            permission: { connect: { id: permissionId } }
          }))
        }
      } : {})
    }

    return this.prisma.role.create({
      data,
      include: { permissions: { include: { permission: true } } }
    })
  }

  /**
   * 更新角色
   */
  async update(id: string, input: UpdateRoleInput): Promise<Role> {
    // 如果提供了权限列表，先删除旧权限再添加新权限
    if (input.permissionIds !== undefined) {
      await this.prisma.rolePermission.deleteMany({
        where: { roleId: id }
      })

      if (input.permissionIds.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: input.permissionIds.map(permissionId => ({
            roleId: id,
            permissionId
          }))
        })
      }
    }

    const data: Prisma.RoleUpdateInput = {}
    if (input.label !== undefined) data.label = input.label
    if (input.description !== undefined) data.description = input.description

    return this.prisma.role.update({
      where: { id },
      data,
      include: { permissions: { include: { permission: true } } }
    })
  }

  /**
   * 删除角色
   */
  async delete(id: string): Promise<Role> {
    return this.prisma.role.delete({
      where: { id },
      include: { permissions: { include: { permission: true } } }
    })
  }

  /**
   * 为用户分配系统角色
   */
  async assignToUser(userId: string, roleId: string): Promise<void> {
    await this.prisma.userSystemRole.upsert({
      where: {
        userId_roleId: { userId, roleId }
      },
      update: {},
      create: { userId, roleId }
    })
  }

  /**
   * 移除用户的系统角色
   */
  async removeFromUser(userId: string, roleId: string): Promise<void> {
    await this.prisma.userSystemRole.delete({
      where: {
        userId_roleId: { userId, roleId }
      }
    })
  }

  /**
   * 为项目成员分配角色
   */
  async assignToProjectMember(
    projectId: string, 
    userId: string, 
    roleId: string
  ): Promise<void> {
    await this.prisma.projectMemberRole.upsert({
      where: {
        projectId_userId: { projectId, userId }
      },
      update: { roleId },
      create: { projectId, userId, roleId }
    })
  }

  /**
   * 获取用户的系统角色
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    const userRoles = await this.prisma.userSystemRole.findMany({
      where: { userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } }
    })

    return userRoles.map(ur => ur.role)
  }

  /**
   * 获取用户的项目角色
   */
  async getUserProjectRoles(
    userId: string, 
    projectId: string
  ): Promise<Role[]> {
    const memberRoles = await this.prisma.projectMemberRole.findMany({
      where: { userId, projectId },
      include: { role: { include: { permissions: { include: { permission: true } } } } }
    })

    return memberRoles.map(mr => mr.role)
  }

  /**
   * 获取用户的所有权限（系统级 + 项目级）
   */
  async getUserPermissions(
    userId: string,
    projectId?: string
  ): Promise<Permission[]> {
    const permissions: Permission[] = []

    // 1. 系统级权限
    const systemRoles = await this.prisma.userSystemRole.findMany({
      where: { userId },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } }
          }
        }
      }
    })

    for (const ur of systemRoles) {
      for (const rp of ur.role.permissions) {
        if (!permissions.find(p => p.id === rp.permission.id)) {
          permissions.push(rp.permission)
        }
      }
    }

    // 2. 项目级权限
    if (projectId) {
      const projectRoles = await this.prisma.projectMemberRole.findMany({
        where: { userId, projectId },
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } }
            }
          }
        }
      })

      for (const mr of projectRoles) {
        for (const rp of mr.role.permissions) {
          if (!permissions.find(p => p.id === rp.permission.id)) {
            permissions.push(rp.permission)
          }
        }
      }
    }

    return permissions
  }

  /**
   * 检查用户是否有权限
   * 完全依赖数据库配置的权限，无硬编码
   */
  async checkUserPermission(
    userId: string,
    resource: string,
    action: string,
    projectId?: string
  ): Promise<boolean> {
    // 1. 检查系统级权限（包括通配符权限 *:*）
    const systemPermissions = await this.prisma.rolePermission.findMany({
      where: {
        role: { userSystemRoles: { some: { userId } } },
        permission: {
          OR: [
            { resource: '*', action: '*' },
            { resource, action },
            { resource: '*', action },
            { resource, action: '*' }
          ]
        }
      }
    })

    if (systemPermissions.length > 0) return true

    // 2. 检查项目级权限
    if (projectId) {
      const projectPermissions = await this.prisma.rolePermission.findMany({
        where: {
          role: { projectMemberRoles: { some: { userId, projectId } } },
          permission: {
            OR: [
              { resource: '*', action: '*' },
              { resource, action },
              { resource: '*', action },
              { resource, action: '*' }
            ]
          }
        }
      })

      if (projectPermissions.length > 0) return true
    }

    return false
  }
}
