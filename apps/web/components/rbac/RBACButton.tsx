/**
 * RBAC Button Component
 * 带权限控制的按钮组件
 * 
 * 根据权限自动禁用或隐藏按钮
 */

'use client'

import { Button, ButtonProps } from '@/components/ui/button'
import { useRBAC } from '@/hooks/useRBAC'
import { cn } from '@/lib/utils'

interface RBACButtonProps extends ButtonProps {
  /** 资源名称 */
  resource: string
  /** 操作名称 */
  action: string
  /** 项目 ID（检查项目级权限时使用） */
  projectId?: string
  /** 无权限时是否隐藏按钮（默认 false，显示但禁用） */
  hideWhenNoPermission?: boolean
  /** 无权限时的提示文本 */
  noPermissionTooltip?: string
}

/**
 * 权限控制按钮
 * 
 * @example
 * ```tsx
 * // 基础用法 - 无权限时禁用
 * <RBACButton resource="ai_key" action="create">
 *   创建密钥
 * </RBACButton>
 * 
 * // 无权限时隐藏
 * <RBACButton 
 *   resource="ai_key" 
 *   action="delete" 
 *   hideWhenNoPermission
 * >
 *   删除
 * </RBACButton>
 * 
 * // 项目级权限
 * <RBACButton 
 *   resource="episode" 
 *   action="create" 
 *   projectId={projectId}
 * >
 *   创建剧集
 * </RBACButton>
 * ```
 */
export function RBACButton({
  resource,
  action,
  projectId,
  hideWhenNoPermission = false,
  noPermissionTooltip = '没有权限执行此操作',
  children,
  disabled,
  className,
  title,
  ...props
}: RBACButtonProps) {
  const { can, isLoading } = useRBAC(projectId)
  const hasPermission = can(resource, action)

  // 无权限且需要隐藏时，不渲染
  if (!hasPermission && hideWhenNoPermission) {
    return null
  }

  // 无权限时禁用按钮
  const isDisabled = !hasPermission || disabled

  return (
    <Button
      {...props}
      disabled={isDisabled}
      className={cn(
        !hasPermission && 'opacity-50 cursor-not-allowed',
        className
      )}
      title={!hasPermission ? noPermissionTooltip : title}
    >
      {children}
    </Button>
  )
}

interface RBACButtonGroupProps {
  children: React.ReactNode
  className?: string
}

/**
 * 权限按钮组
 * 
 * 自动过滤无权限的按钮
 */
export function RBACButtonGroup({ children, className }: RBACButtonGroupProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {children}
    </div>
  )
}
