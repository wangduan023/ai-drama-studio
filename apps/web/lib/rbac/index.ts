/**
 * Unified RBAC (Role-Based Access Control)
 * 统一权限控制系统 - 支持系统级和项目级权限
 * 
 * @module lib/rbac
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/middleware'
import { 
  RoleRepository, 
  PermissionRepository,
  prisma 
} from '@ai-drama-studio/db'

// ============================================
// 类型定义
// ============================================

export interface PermissionCheck {
  resource: string
  action: string
}

export interface RBACContext {
  userId: string
  email: string
  systemRoles: string[]
  projectRoles?: Record<string, string[]> // projectId -> roles
}

export type RBACResult = 
  | { success: true; context: RBACContext }
  | { success: false; response: NextResponse }

// ============================================
// 权限检查函数
// ============================================

/**
 * 检查用户是否有指定权限
 */
export async function checkPermission(
  userId: string,
  resource: string,
  action: string,
  projectId?: string
): Promise<boolean> {
  try {
    const roleRepo = new RoleRepository(prisma)
    return await roleRepo.checkUserPermission(userId, resource, action, projectId)
  } catch (error: any) {
    console.error('[checkPermission] Error:', error)
    throw error
  }
}

/**
 * 批量检查权限
 */
export async function checkPermissions(
  userId: string,
  permissions: PermissionCheck[],
  projectId?: string
): Promise<boolean> {
  for (const perm of permissions) {
    const hasPerm = await checkPermission(userId, perm.resource, perm.action, projectId)
    if (!hasPerm) return false
  }
  return true
}

/**
 * 检查是否有任意一个权限
 */
export async function checkAnyPermission(
  userId: string,
  permissions: PermissionCheck[],
  projectId?: string
): Promise<boolean> {
  for (const perm of permissions) {
    const hasPerm = await checkPermission(userId, perm.resource, perm.action, projectId)
    if (hasPerm) return true
  }
  return false
}

// ============================================
// 角色查询函数
// ============================================

/**
 * 获取用户的系统角色
 */
export async function getUserSystemRoles(userId: string): Promise<string[]> {
  const roleRepo = new RoleRepository(prisma)
  const roles = await roleRepo.getUserRoles(userId)
  return roles.map(r => r.name)
}

/**
 * 获取用户在项目中的角色
 */
export async function getUserProjectRoles(
  userId: string, 
  projectId: string
): Promise<string[]> {
  const roleRepo = new RoleRepository(prisma)
  const roles = await roleRepo.getUserProjectRoles(userId, projectId)
  return roles.map(r => r.name)
}

// ============================================
// API 中间件
// ============================================

/**
 * 要求用户具有指定权限
 * 
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const result = await requirePermission(request, 'ai_key', 'create')
 *   if (!result.success) return result.response
 *   // 继续处理...
 * }
 * ```
 */
export async function requirePermission(
  request: NextRequest,
  resource: string,
  action: string,
  projectId?: string
): Promise<RBACResult> {
  try {
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

    const userId = authResult.user.id

    // 2. 检查权限
    const hasPerm = await checkPermission(userId, resource, action, projectId)
    
    if (!hasPerm) {
      return {
        success: false,
        response: NextResponse.json(
          { 
            error: 'Forbidden', 
            message: `需要 ${resource}:${action} 权限`,
            required: { resource, action },
          },
          { status: 403 }
        ),
      }
    }

    // 3. 获取用户角色信息（可选，失败不影响主流程）
    let systemRoles: string[] = []
    let projectRoles: Record<string, string[]> | undefined
    
    try {
      systemRoles = await getUserSystemRoles(userId)
      if (projectId) {
        const roles = await getUserProjectRoles(userId, projectId)
        projectRoles = { [projectId]: roles }
      }
    } catch (roleError) {
      console.error('[requirePermission] Failed to get user roles:', roleError)
      // 不影响主流程，继续返回成功
    }

    return {
      success: true,
      context: {
        userId,
        email: authResult.user.email,
        systemRoles,
        projectRoles,
      },
    }
  } catch (error: any) {
    console.error('[requirePermission] Error:', error)
    return {
      success: false,
      response: NextResponse.json(
        { 
          error: 'Internal Server Error', 
          message: '权限检查失败',
          details: error.message,
        },
        { status: 500 }
      ),
    }
  }
}

/**
 * 要求用户具有任意一个指定权限
 */
export async function requireAnyPermission(
  request: NextRequest,
  permissions: PermissionCheck[],
  projectId?: string
): Promise<RBACResult> {
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

  const userId = authResult.user.id
  const hasAnyPerm = await checkAnyPermission(userId, permissions, projectId)
  
  if (!hasAnyPerm) {
    return {
      success: false,
      response: NextResponse.json(
        { 
          error: 'Forbidden', 
          message: '需要以下任意权限之一',
          required: permissions,
        },
        { status: 403 }
      ),
    }
  }

  const systemRoles = await getUserSystemRoles(userId)
  let projectRoles: Record<string, string[]> | undefined
  
  if (projectId) {
    const roles = await getUserProjectRoles(userId, projectId)
    projectRoles = { [projectId]: roles }
  }

  return {
    success: true,
    context: {
      userId,
      email: authResult.user.email,
      systemRoles,
      projectRoles,
    },
  }
}

/**
 * 要求用户是系统管理员
 */
export async function requireAdmin(request: NextRequest): Promise<RBACResult> {
  return requirePermission(request, 'role', 'read')
}

// ============================================
// HOF 包装器
// ============================================

/**
 * 创建带权限检查的 API 处理器
 * 
 * @example
 * ```typescript
 * export const POST = withPermission('ai_key', 'create', async (request, context) => {
 *   // 处理请求
 * })
 * ```
 */
export function withPermission(
  resource: string,
  action: string,
  handler: (request: NextRequest, context: RBACContext) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const result = await requirePermission(request, resource, action)
    
    if (!result.success) {
      return result.response
    }
    
    return handler(request, result.context)
  }
}

/**
 * 创建带项目权限检查的 API 处理器
 */
export function withProjectPermission(
  resource: string,
  action: string,
  handler: (
    request: NextRequest, 
    params: { id: string },
    context: RBACContext
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> | { id: string } }
  ): Promise<NextResponse> => {
    const { id: projectId } = await params
    const result = await requirePermission(request, resource, action, projectId)
    
    if (!result.success) {
      return result.response
    }
    
    return handler(request, { id: projectId }, result.context)
  }
}

// ============================================
// 便捷导出
// ============================================

export { verifyAuth } from '@/lib/auth/middleware'
