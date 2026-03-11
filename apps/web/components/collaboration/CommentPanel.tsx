/**
 * 评论面板组件
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageSquare, Send, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { CommentItem } from './CommentItem'
import { useComments, useOnlineUsers } from './hooks'
import { cn } from '@/lib/utils'

interface CommentPanelProps {
  projectId: string
  episodeId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUserId?: string
}

export function CommentPanel({
  projectId,
  episodeId,
  open,
  onOpenChange,
  currentUserId,
}: CommentPanelProps) {
  const [newComment, setNewComment] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const { comments, isLoading, addComment, updateComment, deleteComment, isAdding } =
    useComments(projectId, episodeId)
  const { onlineUsers } = useOnlineUsers(projectId)

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current && open) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [comments, open])

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      addComment({ content: newComment })
      setNewComment('')
    }
  }

  const handleReply = (commentId: string, content: string) => {
    addComment({ content, parentId: commentId })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmitComment()
    }
  }

  // 将评论组织成嵌套结构
  const organizedComments = comments?.reduce(
    (acc, comment) => {
      if (comment.parentId) {
        const parent = acc.find((c) => c.id === comment.parentId)
        if (parent) {
          parent.replies = parent.replies || []
          parent.replies.push(comment)
        }
      } else {
        acc.push(comment)
      }
      return acc
    },
    [] as typeof comments
  )

  const totalComments = comments?.length || 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[450px] p-0">
        <SheetHeader className="px-4 py-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              评论
              {totalComments > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {totalComments}
                </Badge>
              )}
            </SheetTitle>
            <Button variant="ghost" size="icon-xs" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex flex-col h-[calc(100vh-8rem)]">
          <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="h-8 w-8 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-24 bg-muted rounded" />
                      <div className="h-12 w-full bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : organizedComments && organizedComments.length > 0 ? (
              <div className="space-y-6">
                {organizedComments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    currentUserId={currentUserId}
                    onReply={handleReply}
                    onEdit={updateComment}
                    onDelete={deleteComment}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-sm">暂无评论</p>
                <p className="text-xs mt-1">成为第一个评论的人吧</p>
              </div>
            )}
          </ScrollArea>

          <div className="border-t p-4 space-y-3">
            {onlineUsers.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="flex -space-x-1">
                  {onlineUsers.slice(0, 3).map((user) => (
                    <div
                      key={user.userId}
                      className="h-5 w-5 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-[8px] font-medium"
                    >
                      {(user.user.name || user.user.email).slice(0, 1).toUpperCase()}
                    </div>
                  ))}
                </div>
                <span>
                  {onlineUsers.length === 1
                    ? '1 人在线'
                    : `${onlineUsers.length} 人在线`}
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="写下你的评论... (Cmd/Ctrl + Enter 发送)"
                className="min-h-[80px] resize-none"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isAdding}
                  size="sm"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      发送中...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      发送
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// 简化的评论按钮组件
interface CommentButtonProps {
  projectId: string
  episodeId?: string
  commentCount?: number
  className?: string
}

export function CommentButton({
  projectId,
  episodeId,
  commentCount = 0,
  className,
}: CommentButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className={cn('gap-1.5', className)}
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="h-4 w-4" />
        {commentCount > 0 && <span>{commentCount}</span>}
      </Button>
      <CommentPanel
        projectId={projectId}
        episodeId={episodeId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
