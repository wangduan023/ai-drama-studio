/**
 * Permission Repository
 * RBAC 权限仓储层
 */
import type { Prisma, Permission, PrismaClient } from '@prisma/client'
import { BaseRepository } from './base.repository'
import { prisma } from '../client'

export interface CreatePermissionInput {
  resource: string
  action: string
  description?: string | null
}

export interface UpdatePermissionInput {
  description?: string | null
}

export class PermissionRepository extends BaseRepository<'permission', Permission> {
  protected readonly modelName = 'permission' as const

  constructor(prismaInstance?: PrismaClient) {
    super(prismaInstance)
  }

  /**
   * 根据 ID 查找权限
   */
  async findById(id: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } }
    })
  }

  /**
   * 根据资源+操作查找权限
   */
  async findByResourceAction(
    resource: string, 
    action: string
  ): Promise<Permission | null> {
    return this.prisma.permission.findUnique({
      where: { resource_action: { resource, action } },
      include: { roles: { include: { role: true } } }
    })
  }

  /**
   * 查找所有权限
   */
  async findAll(options: { resource?: string } = {}): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      where: options.resource ? { resource: options.resource } : {},
      orderBy: [{ resource: 'asc' }, { action: 'asc' }]
    })
  }

  /**
   * 按资源分组查找权限
   */
  async findGroupedByResource(): Promise<Record<string, Permission[]>> {
    const permissions = await this.findAll()
    
    return permissions.reduce((acc, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = []
      }
      acc[permission.resource].push(permission)
      return acc
    }, {} as Record<string, Permission[]>)
  }

  /**
   * 创建权限
   */
  async create(input: CreatePermissionInput): Promise<Permission> {
    const data: Prisma.PermissionCreateInput = {
      resource: input.resource,
      action: input.action,
      name: `${input.resource}:${input.action}`,
      description: input.description
    }

    return this.prisma.permission.create({ data })
  }

  /**
   * 批量创建权限
   */
  async createMany(inputs: CreatePermissionInput[]): Promise<Permission[]> {
    const permissions: Permission[] = []

    for (const input of inputs) {
      try {
        const permission = await this.create(input)
        permissions.push(permission)
      } catch (error) {
        // 忽略重复权限错误
        if ((error as any).code !== 'P2002') {
          throw error
        }
      }
    }

    return permissions
  }

  /**
   * 更新权限
   */
  async update(id: string, input: UpdatePermissionInput): Promise<Permission> {
    const data: Prisma.PermissionUpdateInput = {}
    if (input.description !== undefined) data.description = input.description

    return this.prisma.permission.update({
      where: { id },
      data
    })
  }

  /**
   * 删除权限
   */
  async delete(id: string): Promise<Permission> {
    return this.prisma.permission.delete({ where: { id } })
  }

  /**
   * 初始化系统默认权限
   */
  async initDefaultPermissions(): Promise<void> {
    const defaultPermissions: CreatePermissionInput[] = [
      // AI 管理权限
      { resource: 'ai_key', action: 'create', description: '创建密钥' },
      { resource: 'ai_key', action: 'read', description: '查看密钥' },
      { resource: 'ai_key', action: 'update', description: '更新密钥' },
      { resource: 'ai_key', action: 'delete', description: '删除密钥' },
      { resource: 'ai_key', action: 'test', description: '测试密钥' },
      
      { resource: 'ai_proxy', action: 'create', description: '创建代理' },
      { resource: 'ai_proxy', action: 'read', description: '查看代理' },
      { resource: 'ai_proxy', action: 'update', description: '更新代理' },
      { resource: 'ai_proxy', action: 'delete', description: '删除代理' },
      { resource: 'ai_proxy', action: 'test', description: '测试代理' },
      
      { resource: 'ai_provider', action: 'create', description: '创建渠道' },
      { resource: 'ai_provider', action: 'read', description: '查看渠道' },
      { resource: 'ai_provider', action: 'update', description: '更新渠道' },
      { resource: 'ai_provider', action: 'delete', description: '删除渠道' },
      
      // 项目管理权限
      { resource: 'project', action: 'create', description: '创建项目' },
      { resource: 'project', action: 'read', description: '查看项目' },
      { resource: 'project', action: 'update', description: '更新项目' },
      { resource: 'project', action: 'delete', description: '删除项目' },
      { resource: 'project', action: 'manage', description: '管理项目成员' },
      
      { resource: 'episode', action: 'create', description: '创建剧集' },
      { resource: 'episode', action: 'read', description: '查看剧集' },
      { resource: 'episode', action: 'update', description: '更新剧集' },
      { resource: 'episode', action: 'delete', description: '删除剧集' },
      
      { resource: 'character', action: 'create', description: '创建角色' },
      { resource: 'character', action: 'read', description: '查看角色' },
      { resource: 'character', action: 'update', description: '更新角色' },
      { resource: 'character', action: 'delete', description: '删除角色' },
      
      // 系统管理权限
      { resource: 'role', action: 'create', description: '创建角色' },
      { resource: 'role', action: 'read', description: '查看角色' },
      { resource: 'role', action: 'update', description: '更新角色' },
      { resource: 'role', action: 'delete', description: '删除角色' },
      
      { resource: 'permission', action: 'create', description: '创建权限' },
      { resource: 'permission', action: 'read', description: '查看权限' },
      { resource: 'permission', action: 'update', description: '更新权限' },
      { resource: 'permission', action: 'delete', description: '删除权限' },
    ]

    await this.createMany(defaultPermissions)
  }

  /**
   * 获取角色的权限列表
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true }
    })

    return rolePermissions.map(rp => rp.permission)
  }

  /**
   * 检查权限是否被使用
   */
  async isInUse(id: string): Promise<boolean> {
    const count = await this.prisma.rolePermission.count({
      where: { permissionId: id }
    })
    return count > 0
  }
}
