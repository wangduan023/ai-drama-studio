/**
 * RBAC Guard Component
 * 统一权限守卫组件
 * 
 * 根据用户权限决定是否渲染子组件
 */

'use client'

import { ReactNode } from 'react'
import { useRBAC } from '@/hooks/useRBAC'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface RBACGuardProps {
  /** 资源名称 */
  resource: string
  /** 操作名称 */
  action: string
  /** 项目 ID（检查项目级权限时使用） */
  projectId?: string
  /** 要渲染的内容 */
  children: ReactNode
  /** 无权限时的回退内容 */
  fallback?: ReactNode
  /** 加载时的显示内容 */
  loadingComponent?: ReactNode
}

/**
 * 权限守卫组件
 * 
 * @example
 * ```tsx
 * // 系统级权限检查
 * <RBACGuard resource="ai_key" action="create">
 *   <Button>创建密钥</Button>
 * </RBACGuard>
 * 
 * // 项目级权限检查
 * <RBACGuard resource="episode" action="create" projectId={projectId}>
 *   <Button>创建剧集</Button>
 * </RBACGuard>
 * 
 * // 自定义回退内容
 * <RBACGuard 
 *   resource="ai_key" 
 *   action="delete"
 *   fallback={<span className="text-gray-400">无权限删除</span>}
 * >
 *   <Button>删除</Button>
 * </RBACGuard>
 * ```
 */
export function RBACGuard({
  resource,
  action,
  projectId,
  children,
  fallback = null,
  loadingComponent = <LoadingSpinner className="w-4 h-4" />,
}: RBACGuardProps) {
  const { checkPermission, isLoading } = useRBAC(projectId)

  if (isLoading) {
    return <>{loadingComponent}</>
  }

  if (!checkPermission(resource, action)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

interface RBACGuardAnyProps {
  /** 权限列表（满足任意一个即可） */
  permissions: Array<{ resource: string; action: string }>
  projectId?: string
  children: ReactNode
  fallback?: ReactNode
  loadingComponent?: ReactNode
}

/**
 * 满足任意权限即显示的守卫
 */
export function RBACGuardAny({
  permissions,
  projectId,
  children,
  fallback = null,
  loadingComponent = <LoadingSpinner className="w-4 h-4" />,
}: RBACGuardAnyProps) {
  const { canAny, isLoading } = useRBAC(projectId)

  if (isLoading) {
    return <>{loadingComponent}</>
  }

  if (!canAny(permissions)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

interface RBACGuardAllProps {
  /** 权限列表（必须满足所有） */
  permissions: Array<{ resource: string; action: string }>
  projectId?: string
  children: ReactNode
  fallback?: ReactNode
  loadingComponent?: ReactNode
}

/**
 * 必须满足所有权限才显示的守卫
 */
export function RBACGuardAll({
  permissions,
  projectId,
  children,
  fallback = null,
  loadingComponent = <LoadingSpinner className="w-4 h-4" />,
}: RBACGuardAllProps) {
  const { canAll, isLoading } = useRBAC(projectId)

  if (isLoading) {
    return <>{loadingComponent}</>
  }

  if (!canAll(permissions)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
