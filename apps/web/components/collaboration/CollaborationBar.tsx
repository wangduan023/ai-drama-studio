/**
 * 协作状态栏组件
 */

'use client'

import { useState } from 'react'
import {
  Check,
  Loader2,
  AlertCircle,
  MessageSquare,
  Share2,
  Users,
  Cloud,
  CloudOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSaveStatus, useOnlineUsers, useComments } from './hooks'
import { OnlineUsersList, OnlineUsersDropdown } from './OnlineIndicator'
import { CommentPanel } from './CommentPanel'
import { ShareDialog } from './ShareDialog'
import { cn } from '@/lib/utils'
import type { SaveStatus } from './types'

interface CollaborationBarProps {
  projectId: string
  episodeId?: string
  className?: string
}

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  const config = {
    saved: {
      icon: Check,
      text: '已保存',
      className: 'text-green-600 dark:text-green-400',
    },
    saving: {
      icon: Loader2,
      text: '保存中...',
      className: 'text-blue-600 dark:text-blue-400 animate-spin',
    },
    unsaved: {
      icon: CloudOff,
      text: '未保存',
      className: 'text-yellow-600 dark:text-yellow-400',
    },
    error: {
      icon: AlertCircle,
      text: '保存失败',
      className: 'text-destructive',
    },
  }

  const { icon: Icon, text, className } = config[status]

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 text-xs">
            <Icon className={cn('h-3.5 w-3.5', className)} />
            <span className={cn('hidden sm:inline', className)}>{text}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{text}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function CollaborationBar({
  projectId,
  episodeId,
  className,
}: CollaborationBarProps) {
  const [showComments, setShowComments] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const { saveStatus } = useSaveStatus()
  const { onlineUsers, isConnected } = useOnlineUsers(projectId)
  const { comments } = useComments(projectId, episodeId)

  const onlineCount = onlineUsers.filter((u) => u.status === 'online').length
  const commentCount = comments?.length || 0

  return (
    <>
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-40',
          'bg-background/80 backdrop-blur-sm border-t',
          'px-4 py-2',
          'flex items-center justify-between',
          className
        )}
      >
        {/* 左侧：保存状态 */}
        <div className="flex items-center gap-4">
          <SaveStatusIndicator status={saveStatus} />
          {!isConnected && (
            <Badge variant="outline" className="text-xs gap-1 text-orange-500">
              <CloudOff className="h-3 w-3" />
              <span className="hidden sm:inline">离线</span>
            </Badge>
          )}
        </div>

        {/* 中间：在线用户 */}
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <OnlineUsersList
                    projectId={projectId}
                    maxDisplay={3}
                    showTooltip={false}
                  />
                  {onlineCount > 0 && (
                    <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                      {onlineCount}
                    </Badge>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-medium">在线用户</p>
                  {onlineUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground">暂无其他用户在线</p>
                  ) : (
                    onlineUsers.map((user) => (
                      <p key={user.userId} className="text-xs">
                        {user.user.name || user.user.email}
                      </p>
                    ))
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* 右侧：评论和分享 */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowComments(true)}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">评论</span>
            {commentCount > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">
                {commentCount}
              </Badge>
            )}
          </Button>

          <Separator orientation="vertical" className="h-4 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowShare(true)}
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">分享</span>
          </Button>
        </div>
      </div>

      {/* 添加底部占位符，防止内容被状态栏遮挡 */}
      <div className="h-12" />

      <CommentPanel
        projectId={projectId}
        episodeId={episodeId}
        open={showComments}
        onOpenChange={setShowComments}
      />

      <ShareDialog
        projectId={projectId}
        open={showShare}
        onOpenChange={setShowShare}
      />
    </>
  )
}

// 简化的协作状态指示器
interface SimpleCollaborationStatusProps {
  projectId: string
  className?: string
}

export function SimpleCollaborationStatus({
  projectId,
  className,
}: SimpleCollaborationStatusProps) {
  const { onlineUsers, isConnected } = useOnlineUsers(projectId)
  const onlineCount = onlineUsers.filter((u) => u.status === 'online').length

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {isConnected ? (
          <>
            <Cloud className="h-3.5 w-3.5 text-green-500" />
            <span>已连接</span>
          </>
        ) : (
          <>
            <CloudOff className="h-3.5 w-3.5 text-orange-500" />
            <span>离线</span>
          </>
        )}
      </div>

      {onlineCount > 0 && (
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{onlineCount} 人在线</span>
        </div>
      )}
    </div>
  )
}
