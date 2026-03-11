/**
 * 权限中间件
 * 
 * 用于 API 路由的项目级别权限检查
 * 
 * 使用示例:
 * ```typescript
 * // app/api/projects/[id]/route.ts
 * import { requireProjectRole } from '@/lib/permissions/middleware'
 * import { ProjectRole } from '@prisma/client'
 * 
 * export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
 *   const result = await requireProjectRole(request, params.id, ProjectRole.EDITOR)
 *   if (result instanceof NextResponse) {
 *     return result // 返回错误响应
 *   }
 *   // result 是用户对象，继续处理
 *   const user = result
 *   // ...
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server'
import { ProjectRole } from '@prisma/client'
import { verifyAuth, AuthUser } from '@/lib/auth/middleware'
import { prisma } from '@/lib/db'
import { hasMinimumRole, ROLE_HIERARCHY } from './core'

/**
 * 项目成员信息（精简）
 */
interface ProjectMemberInfo {
  userId: string
  role: ProjectRole
}

/**
 * 项目基本信息
 */
interface ProjectInfo {
  id: string
  userId: string // 所有者 ID
  members: ProjectMemberInfo[]
}

/**
 * 权限验证结果
 */
export type PermissionValidationResult = 
  | { success: true; user: AuthUser; role: ProjectRole }
  | { success: false; response: NextResponse }

/**
 * 获取项目信息
 * @param projectId - 项目 ID
 * @returns 项目信息或 null
 */
async function getProjectInfo(projectId: string): Promise<ProjectInfo | null> {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        userId: true,
        members: {
          select: {
            userId: true,
            role: true,
          },
        },
      },
    })
    
    return project
  } catch (error) {
    console.error('Failed to get project info:', error)
    return null
  }
}

/**
 * 获取用户在项目中的角色
 * @param userId - 用户 ID
 * @param project - 项目信息
 * @returns 用户角色或 null
 */
function getUserRoleInProject(
  userId: string,
  project: ProjectInfo
): ProjectRole | null {
  // 检查是否为所有者
  if (project.userId === userId) {
    return ProjectRole.OWNER
  }
  
  // 检查是否为成员
  const member = project.members.find(m => m.userId === userId)
  return member?.role ?? null
}

/**
 * 要求用户在项目中拥有指定角色或更高级别
 * 
 * @param request - NextRequest 对象
 * @param projectId - 项目 ID
 * @param minRole - 最低角色要求
 * @returns 验证结果：成功时返回用户信息和角色，失败时返回错误响应
 */
export async function requireProjectRole(
  request: NextRequest,
  projectId: string,
  minRole: ProjectRole
): Promise<PermissionValidationResult> {
  // 1. 验证用户认证
  const authResult = await verifyAuth(request)
  
  if (!authResult.user) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Unauthorized', message: '请先登录' },
        { status: 401 }
      ),
    }
  }
  
  const user = authResult.user
  
  // 2. 获取项目信息
  const project = await getProjectInfo(projectId)
  
  if (!project) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Not Found', message: '项目不存在' },
        { status: 404 }
      ),
    }
  }
  
  // 3. 获取用户角色
  const userRole = getUserRoleInProject(user.id, project)
  
  if (!userRole) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Forbidden', message: '您不是该项目的成员' },
        { status: 403 }
      ),
    }
  }
  
  // 4. 检查角色权限
  if (!hasMinimumRole(userRole, minRole)) {
    return {
      success: false,
      response: NextResponse.json(
        { 
          error: 'Forbidden', 
          message: `需要 ${minRole} 或更高级别的权限`,
          required: minRole,
          current: userRole,
        },
        { status: 403 }
      ),
    }
  }
  
  return {
    success: true,
    user,
    role: userRole,
  }
}

/**
 * 要求用户是项目所有者
 * 
 * @param request - NextRequest 对象
 * @param projectId - 项目 ID
 * @returns 验证结果
 */
export async function requireProjectOwner(
  request: NextRequest,
  projectId: string
): Promise<PermissionValidationResult> {
  return requireProjectRole(request, projectId, ProjectRole.OWNER)
}

/**
 * 要求用户至少拥有编辑者权限
 * 
 * @param request - NextRequest 对象
 * @param projectId - 项目 ID
 * @returns 验证结果
 */
export async function requireProjectEditor(
  request: NextRequest,
  projectId: string
): Promise<PermissionValidationResult> {
  return requireProjectRole(request, projectId, ProjectRole.EDITOR)
}

/**
 * 要求用户至少拥有查看者权限
 * 
 * @param request - NextRequest 对象
 * @param projectId - 项目 ID
 * @returns 验证结果
 */
export async function requireProjectViewer(
  request: NextRequest,
  projectId: string
): Promise<PermissionValidationResult> {
  return requireProjectRole(request, projectId, ProjectRole.VIEWER)
}

/**
 * 检查用户是否为项目成员（包括所有者）
 * 
 * @param request - NextRequest 对象
 * @param projectId - 项目 ID
 * @returns 验证结果
 */
export async function requireProjectMember(
  request: NextRequest,
  projectId: string
): Promise<PermissionValidationResult> {
  // 1. 验证用户认证
  const authResult = await verifyAuth(request)
  
  if (!authResult.user) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Unauthorized', message: '请先登录' },
        { status: 401 }
      ),
    }
  }
  
  const user = authResult.user
  
  // 2. 获取项目信息
  const project = await getProjectInfo(projectId)
  
  if (!project) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Not Found', message: '项目不存在' },
        { status: 404 }
      ),
    }
  }
  
  // 3. 检查是否为成员
  const userRole = getUserRoleInProject(user.id, project)
  
  if (!userRole) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Forbidden', message: '您不是该项目的成员' },
        { status: 403 }
      ),
    }
  }
  
  return {
    success: true,
    user,
    role: userRole,
  }
}

/**
 * 创建带权限检查的 API 处理器
 * 
 * 使用示例:
 * ```typescript
 * export const PUT = withProjectPermission(
 *   ProjectRole.EDITOR,
 *   async (request, { params }, { user, role }) => {
 *     // 处理请求，已验证权限
 *   }
 * )
 * ```
 */
export function withProjectPermission<
  T extends { params: Promise<{ id: string }> | { id: string } }
>(
  minRole: ProjectRole,
  handler: (
    request: NextRequest,
    context: T,
    auth: { user: AuthUser; role: ProjectRole }
  ) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest, context: T): Promise<NextResponse> => {
    const params = await context.params
    const projectId = params.id
    
    const result = await requireProjectRole(request, projectId, minRole)
    
    if (!result.success) {
      return result.response
    }
    
    return handler(request, context, { user: result.user, role: result.role })
  }
}

/**
 * 创建仅所有者可用的 API 处理器
 */
export function withProjectOwner<T extends { params: Promise<{ id: string }> | { id: string } }>(
  handler: (
    request: NextRequest,
    context: T,
    auth: { user: AuthUser; role: ProjectRole }
  ) => Promise<NextResponse> | NextResponse
) {
  return withProjectPermission(ProjectRole.OWNER, handler)
}

/**
 * 创建编辑者可用的 API 处理器
 */
export function withProjectEditor<T extends { params: Promise<{ id: string }> | { id: string } }>(
  handler: (
    request: NextRequest,
    context: T,
    auth: { user: AuthUser; role: ProjectRole }
  ) => Promise<NextResponse> | NextResponse
) {
  return withProjectPermission(ProjectRole.EDITOR, handler)
}

/**
 * 创建查看者可用的 API 处理器
 */
export function withProjectViewer<T extends { params: Promise<{ id: string }> | { id: string } }>(
  handler: (
    request: NextRequest,
    context: T,
    auth: { user: AuthUser; role: ProjectRole }
  ) => Promise<NextResponse> | NextResponse
) {
  return withProjectPermission(ProjectRole.VIEWER, handler)
}

/**
 * 检查特定权限的辅助函数
 * 
 * @param userId - 用户 ID
 * @param projectId - 项目 ID
 * @param check - 自定义检查函数
 * @returns 是否通过检查
 */
export async function checkProjectAccess(
  userId: string,
  projectId: string,
  check?: (role: ProjectRole, project: ProjectInfo) => boolean
): Promise<boolean> {
  const project = await getProjectInfo(projectId)
  
  if (!project) return false
  
  const role = getUserRoleInProject(userId, project)
  
  if (!role) return false
  
  if (check) {
    return check(role, project)
  }
  
  return true
}

// 重新导出权限检查函数
export { hasMinimumRole, ROLE_HIERARCHY }
export type { AuthUser, ProjectInfo, ProjectMemberInfo }
