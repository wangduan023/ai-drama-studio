/**
 * 项目活动日志组件
 */

'use client'

import { useState } from 'react'
import {
  Clock,
  UserPlus,
  UserMinus,
  FileText,
  Image,
  Video,
  Edit3,
  Trash2,
  MessageSquare,
  Shield,
  MoreHorizontal,
  RefreshCw,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useActivityLog } from './hooks'
import { cn } from '@/lib/utils'
import type { Activity, ActivityAction } from './types'

interface ActivityLogProps {
  projectId: string
  limit?: number
  className?: string
}

const ACTIVITY_CONFIG: Record<
  ActivityAction,
  { icon: React.ElementType; label: string; color: string }
> = {
  project_created: { icon: FileText, label: '创建了项目', color: 'text-blue-500' },
  project_updated: { icon: Edit3, label: '更新了项目', color: 'text-yellow-500' },
  project_deleted: { icon: Trash2, label: '删除了项目', color: 'text-red-500' },
  member_joined: { icon: UserPlus, label: '加入了项目', color: 'text-green-500' },
  member_left: { icon: UserMinus, label: '离开了项目', color: 'text-orange-500' },
  member_role_changed: { icon: Shield, label: '更改了成员角色', color: 'text-purple-500' },
  episode_created: { icon: FileText, label: '创建了新剧集', color: 'text-blue-500' },
  episode_updated: { icon: Edit3, label: '更新了剧集', color: 'text-yellow-500' },
  episode_deleted: { icon: Trash2, label: '删除了剧集', color: 'text-red-500' },
  script_generated: { icon: FileText, label: '生成了剧本', color: 'text-indigo-500' },
  image_generated: { icon: Image, label: '生成了图片', color: 'text-pink-500' },
  video_generated: { icon: Video, label: '生成了视频', color: 'text-cyan-500' },
  comment_added: { icon: MessageSquare, label: '添加了评论', color: 'text-teal-500' },
  comment_deleted: { icon: Trash2, label: '删除了评论', color: 'text-red-500' },
}

function ActivityItem({ activity }: { activity: Activity }) {
  const config = ACTIVITY_CONFIG[activity.action]
  const Icon = config.icon

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.slice(0, 2).toUpperCase()
    }
    return email?.slice(0, 2).toUpperCase() || '??'
  }

  const formatTime = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60)

    if (diffHours < 24) {
      return formatDistanceToNow(d, { addSuffix: true, locale: zhCN })
    }
    return format(d, 'MM月dd日 HH:mm', { locale: zhCN })
  }

  return (
    <div className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className={cn('mt-0.5', config.color)}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {activity.user ? (
              <Avatar className="h-5 w-5">
                <AvatarImage src={activity.user.avatar || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                  {getInitials(activity.user.name, activity.user.email)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            <span className="text-sm font-medium">
              {activity.user?.name || activity.user?.email.split('@')[0] || '系统'}
            </span>
            <span className="text-sm text-muted-foreground">{config.label}</span>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatTime(activity.createdAt)}
          </span>
        </div>

        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
          <div className="text-sm text-muted-foreground pl-7">
            {activity.metadata.title && (
              <span className="font-medium">{String(activity.metadata.title)}</span>
            )}
            {activity.metadata.description && (
              <p className="text-xs mt-0.5">{String(activity.metadata.description)}</p>
            )}
          </div>
        )}

        {activity.targetType && activity.targetId && (
          <div className="pl-7">
            <Badge variant="outline" className="text-xs">
              {activity.targetType}: {activity.targetId.slice(0, 8)}...
            </Badge>
          </div>
        )}
      </div>
    </div>
  )
}

export function ActivityLog({ projectId, limit = 50, className }: ActivityLogProps) {
  const [showAll, setShowAll] = useState(false)
  const { activities, isLoading, fetchNextPage, hasNextPage } = useActivityLog(
    projectId,
    limit
  )

  const displayActivities = showAll ? activities : activities?.slice(0, 10)

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <div className="h-6 w-24 bg-muted rounded animate-pulse" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-3 p-3 animate-pulse">
            <div className="h-4 w-4 rounded bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-muted rounded" />
              <div className="h-3 w-32 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!activities || activities.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
        <Clock className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
        <p className="text-sm text-muted-foreground">暂无活动记录</p>
        <p className="text-xs text-muted-foreground mt-1">项目活动将显示在这里</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">活动日志</h3>
          <Badge variant="secondary">{activities.length}</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchNextPage()}
          disabled={!hasNextPage}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Separator />

      <ScrollArea className="h-[400px]">
        <div className="space-y-1">
          {displayActivities?.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>

        {activities.length > 10 && !showAll && (
          <div className="pt-4 text-center">
            <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
              查看全部 {activities.length} 条记录
            </Button>
          </div>
        )}

        {hasNextPage && showAll && (
          <div className="pt-4 text-center">
            <Button variant="ghost" size="sm" onClick={() => fetchNextPage()}>
              加载更多
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

// 紧凑版活动日志（用于侧边栏）
interface CompactActivityLogProps {
  projectId: string
  limit?: number
  className?: string
}

export function CompactActivityLog({
  projectId,
  limit = 10,
  className,
}: CompactActivityLogProps) {
  const { activities, isLoading } = useActivityLog(projectId, limit)

  if (isLoading) {
    return (
      <div className={cn('space-y-2', className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-muted rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (!activities || activities.length === 0) {
    return (
      <div className={cn('text-center py-6 text-muted-foreground text-sm', className)}>
        暂无活动
      </div>
    )
  }

  return (
    <div className={cn('space-y-1', className)}>
      {activities.slice(0, limit).map((activity) => {
        const config = ACTIVITY_CONFIG[activity.action]
        const Icon = config.icon

        return (
          <div
            key={activity.id}
            className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors text-sm"
          >
            <Icon className={cn('h-3.5 w-3.5 shrink-0', config.color)} />
            <span className="truncate flex-1">
              {activity.user?.name || activity.user?.email.split('@')[0] || '系统'}{' '}
              {config.label}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(activity.createdAt), {
                addSuffix: true,
                locale: zhCN,
              })}
            </span>
          </div>
        )
      })}
    </div>
  )
}
