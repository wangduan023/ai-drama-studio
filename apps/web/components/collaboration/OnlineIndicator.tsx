/**
 * 在线状态指示器组件
 */

'use client'

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarGroup,
  AvatarGroupCount,
} from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useOnlineUsers } from './hooks'
import { cn } from '@/lib/utils'
import type { OnlineStatus } from './types'

interface OnlineIndicatorProps {
  userId: string
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

const STATUS_COLORS: Record<OnlineStatus, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  offline: 'bg-gray-400',
}

const STATUS_LABELS: Record<OnlineStatus, string> = {
  online: '在线',
  away: '离开',
  offline: '离线',
}

export function OnlineIndicator({
  userId,
  size = 'default',
  className,
}: OnlineIndicatorProps) {
  const { onlineUsers } = useOnlineUsers('project') // 这是一个占位符，实际需要传递项目ID
  const user = onlineUsers.find((u) => u.userId === userId)
  const status = user?.status || 'offline'

  const sizeClasses = {
    sm: 'w-2 h-2',
    default: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-block rounded-full border-2 border-background',
              STATUS_COLORS[status],
              sizeClasses[size],
              className
            )}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>{STATUS_LABELS[status]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface OnlineStatusBadgeProps {
  status: OnlineStatus
  showLabel?: boolean
  className?: string
}

export function OnlineStatusBadge({
  status,
  showLabel = false,
  className,
}: OnlineStatusBadgeProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'inline-block w-2 h-2 rounded-full',
          STATUS_COLORS[status]
        )}
      />
      {showLabel && (
        <span className="text-xs text-muted-foreground">{STATUS_LABELS[status]}</span>
      )}
    </div>
  )
}

interface OnlineUsersListProps {
  projectId: string
  maxDisplay?: number
  showTooltip?: boolean
  className?: string
}

export function OnlineUsersList({
  projectId,
  maxDisplay = 3,
  showTooltip = true,
  className,
}: OnlineUsersListProps) {
  const { onlineUsers, isConnected } = useOnlineUsers(projectId)

  const onlineOnly = onlineUsers.filter((u) => u.status === 'online')
  const displayUsers = onlineOnly.slice(0, maxDisplay)
  const remainingCount = onlineOnly.length - maxDisplay

  if (!isConnected || onlineOnly.length === 0) {
    return null
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.slice(0, 2).toUpperCase()
    }
    return email.slice(0, 2).toUpperCase()
  }

  const content = (
    <AvatarGroup className={className}>
      {displayUsers.map((user) => (
        <Avatar key={user.userId} size="sm">
          <AvatarImage src={user.user.avatar || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {getInitials(user.user.name, user.user.email)}
          </AvatarFallback>
        </Avatar>
      ))}
      {remainingCount > 0 && (
        <AvatarGroupCount>+{remainingCount}</AvatarGroupCount>
      )}
    </AvatarGroup>
  )

  if (showTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="bottom">
            <div className="space-y-1">
              {onlineOnly.map((user) => (
                <div key={user.userId} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-sm">
                    {user.user.name || user.user.email}
                  </span>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return content
}

interface OnlineUsersDropdownProps {
  projectId: string
  className?: string
}

export function OnlineUsersDropdown({
  projectId,
  className,
}: OnlineUsersDropdownProps) {
  const { onlineUsers, isConnected } = useOnlineUsers(projectId)

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.slice(0, 2).toUpperCase()
    }
    return email.slice(0, 2).toUpperCase()
  }

  if (!isConnected) {
    return (
      <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
        <span className="w-2 h-2 rounded-full bg-gray-400" />
        <span className="text-xs">离线</span>
      </div>
    )
  }

  const onlineCount = onlineUsers.filter((u) => u.status === 'online').length

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      <span className="text-xs text-muted-foreground">
        {onlineCount} 人在线
      </span>
    </div>
  )
}
