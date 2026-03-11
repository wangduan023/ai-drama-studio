/**
 * 权限控制组件
 */

'use client'

import { useEffect, useState } from 'react'
import { Lock, Eye, Edit, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ROLE_PERMISSIONS, type ProjectRole, type Permission } from './types'
import { cn } from '@/lib/utils'

interface PermissionGateProps {
  projectId: string
  permission: Permission
  children: React.ReactNode
  fallback?: React.ReactNode
}

// 模拟获取当前用户角色
function useCurrentUserRole(projectId: string): ProjectRole | null {
  const [role, setRole] = useState<ProjectRole | null>(null)

  useEffect(() => {
    // 这里应该调用 API 获取当前用户在项目中的角色
    // 暂时模拟
    const fetchRole = async () => {
      try {
        // const response = await api.get<{ role: ProjectRole }>(`/api/projects/${projectId}/my-role`)
        // setRole(response.role)
        setRole('EDITOR') // 模拟
      } catch {
        setRole(null)
      }
    }
    fetchRole()
  }, [projectId])

  return role
}

export function PermissionGate({
  projectId,
  permission,
  children,
  fallback = null,
}: PermissionGateProps) {
  const userRole = useCurrentUserRole(projectId)

  if (!userRole) {
    return fallback
  }

  const permissions = ROLE_PERMISSIONS[userRole]
  const hasPermission = permissions.includes(permission)

  if (!hasPermission) {
    return fallback
  }

  return <>{children}</>
}

interface PermissionCheckProps {
  projectId: string
  permission: Permission
  children: (hasPermission: boolean) => React.ReactNode
}

export function PermissionCheck({ projectId, permission, children }: PermissionCheckProps) {
  const userRole = useCurrentUserRole(projectId)

  if (!userRole) {
    return <>{children(false)}</>
  }

  const permissions = ROLE_PERMISSIONS[userRole]
  const hasPermission = permissions.includes(permission)

  return <>{children(hasPermission)}</>
}

interface ReadOnlyBadgeProps {
  projectId: string
  className?: string
}

export function ReadOnlyBadge({ projectId, className }: ReadOnlyBadgeProps) {
  const userRole = useCurrentUserRole(projectId)

  if (userRole !== 'VIEWER') {
    return null
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className={cn('gap-1.5 cursor-help', className)}
          >
            <Eye className="h-3 w-3" />
            只读
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>您只有查看权限，无法编辑此项目</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface PermissionBadgeProps {
  role: ProjectRole
  className?: string
}

const ROLE_CONFIG: Record<
  ProjectRole,
  { icon: React.ElementType; label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
  OWNER: { icon: Shield, label: '所有者', variant: 'default' },
  EDITOR: { icon: Edit, label: '编辑者', variant: 'secondary' },
  VIEWER: { icon: Eye, label: '查看者', variant: 'outline' },
}

export function PermissionBadge({ role, className }: PermissionBadgeProps) {
  const config = ROLE_CONFIG[role]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={cn('gap-1.5', className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  )
}

interface PermissionGuardProps {
  projectId: string
  requiredPermission: Permission
  className?: string
}

export function PermissionGuard({
  projectId,
  requiredPermission,
  className,
}: PermissionGuardProps) {
  const userRole = useCurrentUserRole(projectId)

  if (!userRole) {
    return (
      <div className={cn('p-4 border rounded-lg bg-muted/50', className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span className="text-sm">无法验证权限</span>
        </div>
      </div>
    )
  }

  const permissions = ROLE_PERMISSIONS[userRole]
  const hasPermission = permissions.includes(requiredPermission)

  if (hasPermission) {
    return null
  }

  const permissionLabels: Record<Permission, string> = {
    view: '查看',
    edit: '编辑',
    manage: '管理',
  }

  return (
    <div
      className={cn(
        'p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950/20',
        'border-yellow-200 dark:border-yellow-900',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Lock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
        <div>
          <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
            需要{permissionLabels[requiredPermission]}权限
          </h4>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
            您当前的角色（{ROLE_CONFIG[userRole].label}）没有{permissionLabels[requiredPermission]}权限。
            请联系项目所有者获取更高权限。
          </p>
        </div>
      </div>
    </div>
  )
}

// 禁用编辑的装饰器组件
interface DisableIfReadOnlyProps {
  projectId: string
  children: React.ReactElement
}

export function DisableIfReadOnly({ projectId, children }: DisableIfReadOnlyProps) {
  const userRole = useCurrentUserRole(projectId)
  const isReadOnly = userRole === 'VIEWER'

  if (!isReadOnly) {
    return children
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-block cursor-not-allowed opacity-50">
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>您只有查看权限，无法编辑</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// 条件渲染包装器
interface ConditionalRenderProps {
  condition: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ConditionalRender({
  condition,
  children,
  fallback = null,
}: ConditionalRenderProps) {
  return condition ? <>{children}</> : <>{fallback}</>
}
