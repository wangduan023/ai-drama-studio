'use client'

/**
 * 权限守卫组件
 * 
 * 基于项目权限的条件渲染组件
 * 
 * 使用示例:
 * ```tsx
 * // 基本用法 - 需要编辑权限
 * <PermissionGuard projectId={projectId} permission="edit">
 *   <EditButton />
 * </PermissionGuard>
 * 
 * // 自定义无权限时的回退内容
 * <PermissionGuard 
 *   projectId={projectId} 
 *   permission="manage"
 *   fallback={<p>只有项目所有者可以管理成员</p>}
 * >
 *   <MemberManager />
 * </PermissionGuard>
 * 
 * // 需要特定资源权限
 * <PermissionGuard 
 *   projectId={projectId}
 *   resource="EPISODE"
 *   action="CREATE"
 * >
 *   <CreateEpisodeButton />
 * </PermissionGuard>
 * 
 * // 角色级别权限检查
 * <PermissionGuard 
 *   projectId={projectId}
 *   minRole={ProjectRole.EDITOR}
 * >
 *   <EditorContent />
 * </PermissionGuard>
 * ```
 */

import React from 'react'
import { ProjectRole, ResourceType } from '@/lib/permissions'
import { useProjectPermissions } from '@/hooks/usePermissions'
import { Loader2, Shield } from 'lucide-react'

/**
 * 权限类型
 */
export type PermissionType = 'view' | 'edit' | 'manage' | 'delete'

/**
 * PermissionGuard 组件 Props
 */
export interface PermissionGuardProps {
  /** 项目 ID */
  projectId: string
  /** 快捷权限类型 */
  permission?: PermissionType
  /** 资源类型（用于细粒度权限控制） */
  resource?: ResourceType
  /** 操作类型（配合 resource 使用） */
  action?: string
  /** 最低角色要求 */
  minRole?: ProjectRole
  /** 是否允许所有者（默认 true） */
  allowOwner?: boolean
  /** 子组件 */
  children: React.ReactNode
  /** 无权限时显示的内容 */
  fallback?: React.ReactNode
  /** 加载时显示的内容 */
  loadingComponent?: React.ReactNode
  /** 是否隐藏而不是不渲染（使用 visibility: hidden） */
  hide?: boolean
}

/**
 * 默认加载组件
 */
function DefaultLoadingComponent(): React.ReactElement {
  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    </div>
  )
}

/**
 * 默认无权限提示组件
 */
function DefaultForbiddenPrompt(): React.ReactElement {
  return (
    <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
      <Shield className="h-4 w-4" />
      <span>没有访问权限</span>
    </div>
  )
}

/**
 * 权限守卫组件
 * 
 * 根据用户的项目权限决定是否渲染子组件
 */
export function PermissionGuard({
  projectId,
  permission,
  resource,
  action,
  minRole,
  allowOwner = true,
  children,
  fallback,
  loadingComponent,
  hide = false,
}: PermissionGuardProps): React.ReactElement | null {
  const permissions = useProjectPermissions(projectId)
  const { isLoading, role } = permissions
  
  // 加载中状态
  if (isLoading) {
    return loadingComponent ? <>{loadingComponent}</> : <DefaultLoadingComponent />
  }
  
  // 没有角色信息，表示不是项目成员
  if (!role) {
    return fallback ? <>{fallback}</> : null
  }
  
  // 计算是否有权限
  let hasPermission = false
  
  // 所有者检查
  if (allowOwner && permissions.isOwner) {
    hasPermission = true
  } else {
    // 快捷权限检查
    if (permission) {
      const permissionMap: Record<PermissionType, boolean> = {
        view: permissions.canView,
        edit: permissions.canEdit,
        manage: permissions.canManageMembers,
        delete: permissions.canDelete,
      }
      hasPermission = permissionMap[permission]
    }
    
    // 细粒度权限检查
    if (resource && action) {
      hasPermission = permissions.checkPermission(resource, action)
    }
    
    // 最低角色检查
    if (minRole) {
      hasPermission = permissions.hasMinimumRole(minRole)
    }
  }
  
  // 无权限处理
  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>
    }
    if (hide) {
      return <div style={{ visibility: 'hidden' }}>{children}</div>
    }
    return null
  }
  
  return <>{children}</>
}

/**
 * 编辑权限守卫组件
 * 
 * 简化版，仅检查编辑权限
 */
export interface EditorGuardProps {
  projectId: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function EditorGuard({ projectId, children, fallback }: EditorGuardProps): React.ReactElement {
  return (
    <PermissionGuard projectId={projectId} permission="edit" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

/**
 * 所有者权限守卫组件
 * 
 * 简化版，仅检查所有者权限
 */
export interface OwnerGuardProps {
  projectId: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function OwnerGuard({ projectId, children, fallback }: OwnerGuardProps): React.ReactElement {
  return (
    <PermissionGuard projectId={projectId} permission="manage" fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

/**
 * 角色守卫组件
 * 
 * 基于角色的权限检查
 */
export interface RoleGuardProps {
  projectId: string
  minRole: ProjectRole
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({ projectId, minRole, children, fallback }: RoleGuardProps): React.ReactElement {
  return (
    <PermissionGuard projectId={projectId} minRole={minRole} fallback={fallback}>
      {children}
    </PermissionGuard>
  )
}

/**
 * 条件渲染组件
 * 
 * 根据条件渲染不同内容
 */
export interface ConditionalRenderProps {
  condition: boolean
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ConditionalRender({
  condition,
  children,
  fallback,
}: ConditionalRenderProps): React.ReactElement | null {
  if (condition) {
    return <>{children}</>
  }
  return fallback ? <>{fallback}</> : null
}

/**
 * 权限按钮包装器
 * 
 * 为按钮添加权限控制
 */
export interface PermissionButtonWrapperProps {
  projectId: string
  permission: PermissionType
  children: React.ReactElement
  disabledTooltip?: string
}

export function PermissionButtonWrapper({
  projectId,
  permission,
  children,
  disabledTooltip = '没有权限执行此操作',
}: PermissionButtonWrapperProps): React.ReactElement {
  const permissions = useProjectPermissions(projectId)
  const { isLoading } = permissions
  
  if (isLoading) {
    return React.cloneElement(children, {
      ...children.props,
      disabled: true,
      'aria-busy': true,
    })
  }
  
  const permissionMap: Record<PermissionType, boolean> = {
    view: permissions.canView,
    edit: permissions.canEdit,
    manage: permissions.canManageMembers,
    delete: permissions.canDelete,
  }
  
  const hasPermission = permissionMap[permission]
  
  return React.cloneElement(children, {
    ...children.props,
    disabled: !hasPermission || children.props.disabled,
    title: !hasPermission ? disabledTooltip : children.props.title,
  })
}

export default PermissionGuard
