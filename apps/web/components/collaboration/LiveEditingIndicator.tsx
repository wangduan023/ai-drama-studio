/**
 * 实时编辑指示器组件
 */

'use client'

import { useEffect, useState } from 'react'
import { Pencil, Lock, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useEditingState } from './hooks'
import { cn } from '@/lib/utils'

interface LiveEditingIndicatorProps {
  resource: string
  resourceId: string
  projectId: string
  className?: string
}

export function LiveEditingIndicator({
  resource,
  resourceId,
  projectId,
  className,
}: LiveEditingIndicatorProps) {
  const { editingStates } = useEditingState(projectId)
  const [currentEditors, setCurrentEditors] = useState<typeof editingStates>([])

  useEffect(() => {
    const editors = editingStates.filter(
      (state) => state.resource === resource && state.resourceId === resourceId
    )
    setCurrentEditors(editors)
  }, [editingStates, resource, resourceId])

  if (currentEditors.length === 0) {
    return null
  }

  const editorNames = currentEditors
    .map((e) => e.user.name || e.user.email.split('@')[0])
    .join('、')

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className={cn('gap-1.5 animate-pulse', className)}
          >
            <Pencil className="h-3 w-3" />
            <span className="max-w-[150px] truncate">
              {currentEditors.length === 1
                ? `${editorNames} 正在编辑...`
                : `${currentEditors.length} 人正在编辑...`}
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{editorNames} 正在编辑此内容</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface EditingLockProps {
  resource: string
  resourceId: string
  projectId: string
  className?: string
}

export function EditingLock({
  resource,
  resourceId,
  projectId,
  className,
}: EditingLockProps) {
  const { editingStates } = useEditingState(projectId)
  const [isLocked, setIsLocked] = useState(false)
  const [lockedBy, setLockedBy] = useState<string>('')

  useEffect(() => {
    const otherEditors = editingStates.filter(
      (state) =>
        state.resource === resource &&
        state.resourceId === resourceId &&
        state.userId !== 'current-user'
    )

    if (otherEditors.length > 0) {
      setIsLocked(true)
      const editor = otherEditors[0]
      setLockedBy(editor.user.name || editor.user.email.split('@')[0])
    } else {
      setIsLocked(false)
      setLockedBy('')
    }
  }, [editingStates, resource, resourceId])

  if (!isLocked) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-950/20',
        'border border-yellow-200 dark:border-yellow-900 rounded-md',
        className
      )}
    >
      <Lock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      <span className="text-sm text-yellow-800 dark:text-yellow-200">
        {lockedBy} 正在编辑，请稍后再试
      </span>
    </div>
  )
}

interface UserCursorsProps {
  projectId: string
  containerRef: React.RefObject<HTMLElement>
  className?: string
}

export function UserCursors({ projectId, containerRef, className }: UserCursorsProps) {
  const { onlineUsers } = useEditingState(projectId) as unknown as {
    onlineUsers: Array<{
      userId: string
      user: { name: string | null; email: string; avatar: string | null }
      cursorPosition?: { x: number; y: number }
    }>
  }
  const [cursors, setCursors] = useState<typeof onlineUsers>([])

  useEffect(() => {
    const usersWithCursors = onlineUsers.filter((u) => u.cursorPosition)
    setCursors(usersWithCursors)
  }, [onlineUsers])

  if (cursors.length === 0) {
    return null
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.slice(0, 2).toUpperCase()
    }
    return email.slice(0, 2).toUpperCase()
  }

  // 生成用户特定的颜色
  const getUserColor = (userId: string) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
    ]
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <div className={cn('pointer-events-none', className)}>
      {cursors.map((user) => (
        <div
          key={user.userId}
          className="absolute z-50 transition-all duration-150"
          style={{
            left: user.cursorPosition?.x,
            top: user.cursorPosition?.y,
          }}
        >
          <div className="relative">
            {/* 光标 */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className={cn('transform -translate-x-1 -translate-y-1', getUserColor(user.userId))}
            >
              <path
                d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z"
                fill="currentColor"
              />
            </svg>
            {/* 用户名称标签 */}
            <div
              className={cn(
                'absolute left-4 top-4 px-2 py-0.5 rounded text-xs text-white whitespace-nowrap',
                getUserColor(user.userId)
              )}
            >
              {user.user.name || user.user.email.split('@')[0]}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

interface SavingIndicatorProps {
  status: 'saving' | 'saved' | 'error'
  className?: string
}

export function SavingIndicator({ status, className }: SavingIndicatorProps) {
  const config = {
    saving: {
      icon: Loader2,
      text: '保存中...',
      className: 'text-muted-foreground',
      animate: true,
    },
    saved: {
      icon: Pencil,
      text: '已保存',
      className: 'text-green-600 dark:text-green-400',
      animate: false,
    },
    error: {
      icon: Lock,
      text: '保存失败',
      className: 'text-destructive',
      animate: false,
    },
  }

  const { icon: Icon, text, className: statusClassName, animate } = config[status]

  return (
    <div className={cn('flex items-center gap-1.5 text-xs', statusClassName, className)}>
      <Icon className={cn('h-3 w-3', animate && 'animate-spin')} />
      <span>{text}</span>
    </div>
  )
}
