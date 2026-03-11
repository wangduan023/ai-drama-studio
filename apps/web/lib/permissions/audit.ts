/**
 * 访问审计日志系统
 * 
 * 记录项目中的关键访问和操作行为
 * 
 * 功能：
 * - 访问日志记录
 * - 批量日志记录
 * - 日志查询
 * - 敏感操作记录
 */

import { prisma } from '@/lib/db'
import { ProjectRole } from '@prisma/client'

/**
 * 访问日志数据类型
 */
export interface AccessLogData {
  /** 用户 ID */
  userId: string
  /** 项目 ID */
  projectId: string
  /** 操作行为 */
  action: string
  /** 资源类型 */
  resource: string
  /** 资源 ID（可选） */
  resourceId?: string
  /** 用户 IP 地址 */
  ipAddress?: string
  /** 用户代理 */
  userAgent?: string
  /** 请求方法 */
  method?: string
  /** 请求路径 */
  path?: string
  /** 操作结果 */
  result?: 'success' | 'failure' | 'denied'
  /** 失败原因 */
  failureReason?: string
  /** 用户角色 */
  userRole?: ProjectRole
  /** 额外元数据 */
  metadata?: Record<string, unknown>
}

/**
 * 访问日志记录选项
 */
export interface LogAccessOptions {
  /** 是否异步记录（默认 true，不阻塞主流程） */
  async?: boolean
  /** 错误时是否抛出（默认 false） */
  throwOnError?: boolean
}

/**
 * 记录访问日志
 * 
 * @param data - 日志数据
 * @param options - 记录选项
 * @returns 日志记录结果
 * 
 * 使用示例:
 * ```typescript
 * await logAccess({
 *   userId: 'user-123',
 *   projectId: 'project-456',
 *   action: 'EPISODE_CREATE',
 *   resource: 'EPISODE',
 *   resourceId: 'episode-789',
 *   result: 'success',
 * })
 * ```
 */
export async function logAccess(
  data: AccessLogData,
  options: LogAccessOptions = {}
): Promise<{ success: boolean; error?: Error }> {
  const { async = true, throwOnError = false } = options
  
  const logOperation = async (): Promise<void> => {
    try {
      await prisma.projectActivity.create({
        data: {
          projectId: data.projectId,
          userId: data.userId,
          action: data.action,
          targetType: data.resource,
          targetId: data.resourceId,
          metadata: {
            ...data.metadata,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            method: data.method,
            path: data.path,
            result: data.result,
            failureReason: data.failureReason,
            userRole: data.userRole,
          },
        },
      })
    } catch (error) {
      console.error('Failed to log access:', error)
      if (throwOnError) {
        throw error
      }
    }
  }
  
  if (async) {
    // 异步记录，不等待结果
    logOperation().catch(console.error)
    return { success: true }
  } else {
    // 同步记录
    try {
      await logOperation()
      return { success: true }
    } catch (error) {
      return { success: false, error: error as Error }
    }
  }
}

/**
 * 批量记录访问日志
 * 
 * @param logs - 日志数据数组
 * @returns 记录结果
 */
export async function logAccessBatch(
  logs: AccessLogData[]
): Promise<{ success: boolean; count: number; error?: Error }> {
  try {
    const result = await prisma.$transaction(
      logs.map(log => 
        prisma.projectActivity.create({
          data: {
            projectId: log.projectId,
            userId: log.userId,
            action: log.action,
            targetType: log.resource,
            targetId: log.resourceId,
            metadata: {
              ...log.metadata,
              ipAddress: log.ipAddress,
              userAgent: log.userAgent,
              method: log.method,
              path: log.path,
              result: log.result,
              failureReason: log.failureReason,
              userRole: log.userRole,
            },
          },
        })
      )
    )
    
    return { success: true, count: result.length }
  } catch (error) {
    console.error('Failed to batch log access:', error)
    return { success: false, count: 0, error: error as Error }
  }
}

/**
 * 记录敏感操作
 * 
 * 用于记录重要的安全相关操作
 * 
 * @param data - 日志数据
 * @param options - 记录选项
 */
export async function logSensitiveAction(
  data: AccessLogData,
  options: LogAccessOptions = {}
): Promise<{ success: boolean; error?: Error }> {
  return logAccess(
    {
      ...data,
      metadata: {
        ...data.metadata,
        sensitive: true,
        timestamp: new Date().toISOString(),
      },
    },
    { ...options, async: false } // 敏感操作同步记录
  )
}

/**
 * 记录权限拒绝
 * 
 * @param data - 日志数据
 */
export async function logPermissionDenied(
  data: Omit<AccessLogData, 'result'>
): Promise<void> {
  await logAccess(
    {
      ...data,
      result: 'denied',
    },
    { async: true }
  )
}

/**
 * 查询访问日志
 * 
 * @param projectId - 项目 ID
 * @param options - 查询选项
 * @returns 日志列表
 */
export async function queryAccessLogs(
  projectId: string,
  options: {
    limit?: number
    offset?: number
    userId?: string
    action?: string
    startDate?: Date
    endDate?: Date
  } = {}
) {
  const { limit = 50, offset = 0, userId, action, startDate, endDate } = options
  
  const where: Record<string, unknown> = { projectId }
  
  if (userId) {
    where.userId = userId
  }
  
  if (action) {
    where.action = action
  }
  
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) {
      ;(where.createdAt as Record<string, Date>).gte = startDate
    }
    if (endDate) {
      ;(where.createdAt as Record<string, Date>).lte = endDate
    }
  }
  
  const [logs, total] = await Promise.all([
    prisma.projectActivity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.projectActivity.count({ where }),
  ])
  
  return {
    logs,
    total,
    hasMore: offset + logs.length < total,
  }
}

/**
 * 创建审计日志中间件
 * 
 * 用于自动记录 API 路由的访问
 * 
 * 使用示例:
 * ```typescript
 * const audit = createAuditMiddleware({
 *   actions: {
 *     'POST /api/projects/[id]/episodes': 'EPISODE_CREATE',
 *   }
 * })
 * 
 * export const POST = audit(async (request, context) => {
 *   // 处理请求
 * })
 * ```
 */
export function createAuditMiddleware(config: {
  actions: Record<string, string>
  getProjectId?: (request: Request, context: unknown) => string | null
  getUserId?: (request: Request) => string | null
}) {
  return function auditMiddleware<T extends (...args: unknown[]) => Promise<unknown>>(
    handler: T
  ): T {
    return (async (...args: unknown[]) => {
      const [request, context] = args as [Request, unknown]
      
      // 获取 action
      const url = new URL(request.url)
      const key = `${request.method} ${url.pathname}`
      const action = config.actions[key]
      
      if (action) {
        const projectId = config.getProjectId?.(request, context)
        const userId = config.getUserId?.(request)
        
        if (projectId && userId) {
          // 记录访问日志（异步）
          logAccess({
            userId,
            projectId,
            action,
            resource: 'API',
            method: request.method,
            path: url.pathname,
          }).catch(console.error)
        }
      }
      
      return handler(...args)
    }) as T
  }
}

/**
 * 预定义的敏感操作类型
 */
export const SensitiveActions = {
  // 成员管理
  MEMBER_INVITE: 'MEMBER_INVITE',
  MEMBER_REMOVE: 'MEMBER_REMOVE',
  MEMBER_ROLE_CHANGE: 'MEMBER_ROLE_CHANGE',
  
  // 项目设置
  PROJECT_DELETE: 'PROJECT_DELETE',
  PROJECT_SETTINGS_CHANGE: 'PROJECT_SETTINGS_CHANGE',
  
  // 导出操作
  PROJECT_EXPORT: 'PROJECT_EXPORT',
  EPISODE_EXPORT: 'EPISODE_EXPORT',
  
  // 批量操作
  BULK_DELETE: 'BULK_DELETE',
  BULK_EXPORT: 'BULK_EXPORT',
  
  // 安全相关
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  SUSPICIOUS_ACCESS: 'SUSPICIOUS_ACCESS',
} as const

/**
 * 预定义的资源类型
 */
export const ResourceTypes = {
  PROJECT: 'PROJECT',
  EPISODE: 'EPISODE',
  CHARACTER: 'CHARACTER',
  LOCATION: 'LOCATION',
  ASSET: 'ASSET',
  TASK: 'TASK',
  COMMENT: 'COMMENT',
  MEMBER: 'MEMBER',
  API: 'API',
} as const

// 类型导出
export type SensitiveActionType = typeof SensitiveActions[keyof typeof SensitiveActions]
export type ResourceTypeValue = typeof ResourceTypes[keyof typeof ResourceTypes]
