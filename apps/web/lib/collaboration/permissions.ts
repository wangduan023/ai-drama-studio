/**
 * 项目协作权限检查工具
 */

import { prisma } from '@/lib/db'
import { ProjectRole } from '@prisma/client'

export { ProjectRole }

// 角色等级定义（用于权限比较）
const ROLE_LEVELS: Record<ProjectRole, number> = {
  [ProjectRole.OWNER]: 3,
  [ProjectRole.EDITOR]: 2,
  [ProjectRole.VIEWER]: 1,
}

/**
 * 获取用户在项目中的角色
 * @param userId 用户ID
 * @param projectId 项目ID
 * @returns 用户角色，如果没有权限返回 null
 */
export async function getProjectRole(
  userId: string,
  projectId: string
): Promise<ProjectRole | null> {
  // 首先检查是否为项目所有者
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
      deletedAt: null,
    },
  })

  if (project) {
    return ProjectRole.OWNER
  }

  // 检查项目成员关系
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  })

  return member?.role || null
}

/**
 * 检查用户是否可以查看项目
 * @param userId 用户ID
 * @param projectId 项目ID
 * @returns 是否有查看权限
 */
export async function canViewProject(
  userId: string,
  projectId: string
): Promise<boolean> {
  const role = await getProjectRole(userId, projectId)
  return role !== null
}

/**
 * 检查用户是否可以编辑项目
 * @param userId 用户ID
 * @param projectId 项目ID
 * @returns 是否有编辑权限
 */
export async function canEditProject(
  userId: string,
  projectId: string
): Promise<boolean> {
  const role = await getProjectRole(userId, projectId)
  if (!role) return false
  return ROLE_LEVELS[role] >= ROLE_LEVELS[ProjectRole.EDITOR]
}

/**
 * 检查用户是否可以管理成员
 * @param userId 用户ID
 * @param projectId 项目ID
 * @returns 是否有成员管理权限（仅 OWNER）
 */
export async function canManageMembers(
  userId: string,
  projectId: string
): Promise<boolean> {
  const role = await getProjectRole(userId, projectId)
  return role === ProjectRole.OWNER
}

/**
 * 检查用户角色等级是否满足最低要求
 * @param userRole 用户角色
 * @param minRole 最低要求角色
 * @returns 是否满足要求
 */
export function hasMinimumProjectRole(
  userRole: ProjectRole | null,
  minRole: ProjectRole
): boolean {
  if (!userRole) return false
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[minRole]
}

/**
 * 获取项目的所有成员（包括所有者）
 * @param projectId 项目ID
 * @returns 成员列表
 */
export async function getProjectMembers(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true },
  })

  if (!project) return []

  const members = await prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  })

  // 将项目所有者作为第一个成员
  const owner = await prisma.user.findUnique({
    where: { id: project.userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
    },
  })

  const result = [
    {
      id: 'owner',
      projectId,
      userId: project.userId,
      role: ProjectRole.OWNER,
      invitedBy: null,
      joinedAt: new Date(0), // 假设所有者是最早的
      updatedAt: new Date(0),
      user: owner,
    },
    ...members,
  ]

  return result
}

/**
 * 记录项目活动
 * @param projectId 项目ID
 * @param userId 操作用户ID
 * @param action 活动类型
 * @param targetType 目标类型
 * @param targetId 目标ID
 * @param metadata 额外信息
 */
export async function logProjectActivity(
  projectId: string,
  userId: string | null,
  action: string,
  targetType?: string,
  targetId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.projectActivity.create({
      data: {
        projectId,
        userId,
        action,
        targetType,
        targetId,
        metadata: metadata || {},
      },
    })
  } catch (error) {
    console.error('Failed to log project activity:', error)
    // 活动日志记录失败不应影响主流程
  }
}
