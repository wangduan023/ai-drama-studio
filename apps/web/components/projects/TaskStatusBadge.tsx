'use client'

import { cn } from '@/lib/utils'
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
  Hourglass,
} from 'lucide-react'

export type TaskStatus = 'pending' | 'queued' | 'generating' | 'completed' | 'failed'

interface TaskStatusBadgeProps {
  status: TaskStatus
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const statusConfig: Record<TaskStatus, { label: string; icon: any; color: string; bg: string }> = {
  pending: {
    label: '待处理',
    icon: Clock,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
  },
  queued: {
    label: '排队中',
    icon: Hourglass,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  generating: {
    label: '生成中',
    icon: Loader2,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  completed: {
    label: '已完成',
    icon: CheckCircle2,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  failed: {
    label: '失败',
    icon: AlertCircle,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
  },
}

export function TaskStatusBadge({
  status,
  showLabel = true,
  size = 'sm',
}: TaskStatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  const sizeClasses = {
    sm: 'h-5 px-2 text-xs',
    md: 'h-6 px-2.5 text-sm',
    lg: 'h-7 px-3 text-base',
  }

  const iconSizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.bg,
        sizeClasses[size]
      )}
    >
      <Icon className={cn(iconSizeClasses[size], config.color, status === 'generating' && 'animate-spin')} />
      {showLabel && <span className={config.color}>{config.label}</span>}
    </div>
  )
}

// 导出状态类型和配置供其他组件使用
export { statusConfig }
export type { TaskStatus }
