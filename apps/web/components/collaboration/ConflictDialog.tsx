/**
 * 冲突解决对话框组件
 */

'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  FileText,
  User,
  Clock,
  Check,
  GitMerge,
  Loader2,
  Copy,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { useConflictDetection, useClipboard } from './hooks'
import { cn } from '@/lib/utils'
import type { ConflictData } from './types'

interface ConflictDialogProps {
  conflict: ConflictData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onResolve?: (resolution: 'local' | 'server' | 'merge', mergedContent?: string) => void
}

export function ConflictDialog({
  conflict,
  open,
  onOpenChange,
  onResolve,
}: ConflictDialogProps) {
  const [activeTab, setActiveTab] = useState('compare')
  const [mergedContent, setMergedContent] = useState('')
  const [isResolving, setIsResolving] = useState(false)
  const { resolveConflict } = useConflictDetection()
  const { copy } = useClipboard()

  if (!conflict) {
    return null
  }

  const { localVersion, serverVersion, resourceType } = conflict

  const handleResolve = async (resolution: 'local' | 'server' | 'merge') => {
    setIsResolving(true)
    try {
      if (resolution === 'merge') {
        await resolveConflict('merge', mergedContent)
        onResolve?.('merge', mergedContent)
      } else {
        await resolveConflict(resolution)
        onResolve?.(resolution)
      }
      onOpenChange(false)
    } finally {
      setIsResolving(false)
    }
  }

  const formatTime = (date: string) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: zhCN,
    })
  }

  // 简单的 diff 高亮（仅用于显示）
  const renderDiff = (local: string, server: string) => {
    const localLines = local.split('\n')
    const serverLines = server.split('\n')
    const maxLines = Math.max(localLines.length, serverLines.length)

    return (
      <div className="space-y-1 font-mono text-sm">
        {Array.from({ length: maxLines }).map((_, i) => {
          const localLine = localLines[i] || ''
          const serverLine = serverLines[i] || ''
          const isDifferent = localLine !== serverLine

          return (
            <div key={i} className="grid grid-cols-2 gap-2">
              <div
                className={cn(
                  'px-2 py-0.5 rounded',
                  isDifferent ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300' : ''
                )}
              >
                <span className="text-muted-foreground select-none w-6 inline-block">
                  {i + 1}
                </span>
                {localLine || ' '}
              </div>
              <div
                className={cn(
                  'px-2 py-0.5 rounded',
                  isDifferent ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300' : ''
                )}
              >
                <span className="text-muted-foreground select-none w-6 inline-block">
                  {i + 1}
                </span>
                {serverLine || ' '}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <DialogTitle>检测到内容冲突</DialogTitle>
          </div>
          <DialogDescription>
            此内容在您编辑期间已被其他人修改。请选择要保留的版本或手动合并更改。
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="compare">对比查看</TabsTrigger>
            <TabsTrigger value="local">您的版本</TabsTrigger>
            <TabsTrigger value="server">服务器版本</TabsTrigger>
          </TabsList>

          <TabsContent value="compare" className="flex-1 mt-4">
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-2 border-b bg-muted/50">
                <div className="px-4 py-2 border-r">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-red-600 dark:text-red-400">
                      您的版本
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(localVersion.timestamp)}
                    </span>
                  </div>
                </div>
                <div className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-green-600 dark:text-green-400">
                      服务器版本
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {serverVersion.user.name || serverVersion.user.email} •{' '}
                      {formatTime(serverVersion.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
              <ScrollArea className="h-[300px]">
                <div className="p-4">
                  {renderDiff(localVersion.content, serverVersion.content)}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="local" className="flex-1 mt-4">
            <div className="border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b bg-muted/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">您的版本</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(localVersion.timestamp)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copy(localVersion.content)}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  复制
                </Button>
              </div>
              <ScrollArea className="h-[300px]">
                <div className="p-4">
                  <pre className="font-mono text-sm whitespace-pre-wrap">
                    {localVersion.content}
                  </pre>
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="server" className="flex-1 mt-4">
            <div className="border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b bg-muted/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">服务器版本</Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    {serverVersion.user.name || serverVersion.user.email}
                    <Clock className="h-3 w-3 ml-1" />
                    {formatTime(serverVersion.timestamp)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copy(serverVersion.content)}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  复制
                </Button>
              </div>
              <ScrollArea className="h-[300px]">
                <div className="p-4">
                  <pre className="font-mono text-sm whitespace-pre-wrap">
                    {serverVersion.content}
                  </pre>
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        {/* 合并编辑器 */}
        {activeTab === 'compare' && (
          <div className="mt-4 space-y-2">
            <Label className="flex items-center gap-2">
              <GitMerge className="h-4 w-4" />
              手动合并（可选）
            </Label>
            <Textarea
              value={mergedContent}
              onChange={(e) => setMergedContent(e.target.value)}
              placeholder="在此处粘贴合并后的内容..."
              className="min-h-[100px] font-mono text-sm"
            />
          </div>
        )}

        <DialogFooter className="gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isResolving}
          >
            稍后处理
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleResolve('local')}
              disabled={isResolving}
              className="text-red-600 hover:text-red-700"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              保留我的版本
            </Button>
            <Button
              variant="outline"
              onClick={() => handleResolve('server')}
              disabled={isResolving}
              className="text-green-600 hover:text-green-700"
            >
              保留服务器版本
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            {mergedContent && (
              <Button
                onClick={() => handleResolve('merge')}
                disabled={isResolving}
              >
                {isResolving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    处理中...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    使用合并版本
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// 简化的冲突警告组件
interface ConflictWarningProps {
  onResolve: () => void
  className?: string
}

export function ConflictWarning({ onResolve, className }: ConflictWarningProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg',
        'bg-yellow-50 dark:bg-yellow-950/20',
        'border border-yellow-200 dark:border-yellow-900',
        className
      )}
    >
      <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
          检测到内容冲突
        </p>
        <p className="text-xs text-yellow-700 dark:text-yellow-300">
          此内容在您编辑期间已被其他人修改。
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onResolve}>
        解决冲突
      </Button>
    </div>
  )
}
