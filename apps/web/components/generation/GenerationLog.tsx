'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  Info, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Terminal,
  Clock,
  Sparkles,
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { SSEEvent } from '@/hooks/useSSE'

// 日志级别类型
type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug' | 'stream'

// 日志条目类型
interface LogEntry {
  id: string
  timestamp: Date
  level: LogLevel
  message: string
  details?: string
  stage?: string
  progress?: number
}

export interface GenerationLogProps {
  events: SSEEvent[]
  maxHeight?: number
  className?: string
  showTimestamp?: boolean
  autoScroll?: boolean
}

/**
 * 生成日志组件
 * 
 * 实时显示任务生成过程的日志消息
 * - 不同级别使用不同颜色
 * - 自动滚动到最新日志
 * - 支持时间戳显示
 */
export function GenerationLog({
  events,
  maxHeight = 300,
  className,
  showTimestamp = true,
  autoScroll = true,
}: GenerationLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // 将 SSE 事件转换为日志条目
  const logEntries: LogEntry[] = events
    .filter((event) => {
      // 过滤掉心跳事件
      if (event.type === 'heartbeat') return false
      // 过滤掉没有 payload 的事件
      if (!event.payload && event.type !== 'task.lifecycle') return false
      return true
    })
    .map((event, index) => convertEventToLogEntry(event, index))

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [events, autoScroll])

  // 获取日志级别图标
  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="h-3.5 w-3.5" />
      case 'error':
        return <AlertCircle className="h-3.5 w-3.5" />
      case 'warning':
        return <AlertCircle className="h-3.5 w-3.5" />
      case 'stream':
        return <Sparkles className="h-3.5 w-3.5" />
      case 'debug':
        return <Terminal className="h-3.5 w-3.5" />
      case 'info':
      default:
        return <Info className="h-3.5 w-3.5" />
    }
  }

  // 获取日志级别颜色
  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'success':
        return 'text-green-500 bg-green-500/10 border-green-500/20'
      case 'error':
        return 'text-red-500 bg-red-500/10 border-red-500/20'
      case 'warning':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
      case 'stream':
        return 'text-purple-500 bg-purple-500/10 border-purple-500/20'
      case 'debug':
        return 'text-gray-500 bg-gray-500/10 border-gray-500/20'
      case 'info':
      default:
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20'
    }
  }

  // 获取日志级别标签
  const getLevelLabel = (level: LogLevel) => {
    switch (level) {
      case 'success':
        return '成功'
      case 'error':
        return '错误'
      case 'warning':
        return '警告'
      case 'stream':
        return '流式'
      case 'debug':
        return '调试'
      case 'info':
      default:
        return '信息'
    }
  }

  // 格式化时间戳
  const formatTimestamp = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    const seconds = date.getSeconds().toString().padStart(2, '0')
    const ms = date.getMilliseconds().toString().padStart(3, '0')
    return `${hours}:${minutes}:${seconds}.${ms}`
  }

  return (
    <div className={cn('rounded-lg border bg-muted/30', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">生成日志</span>
          <span className="text-xs text-muted-foreground">({logEntries.length} 条)</span>
        </div>
        <div className="flex items-center gap-1">
          {logEntries.length > 0 && logEntries[logEntries.length - 1].level === 'stream' && (
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
          )}
        </div>
      </div>

      {/* 日志列表 */}
      <ScrollArea 
        className="p-0" 
        style={{ maxHeight }}
        ref={scrollRef}
      >
        <div className="p-3 space-y-1.5">
          {logEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              等待日志输出...
            </div>
          ) : (
            logEntries.map((entry, index) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15, delay: index * 0.01 }}
                className={cn(
                  'flex items-start gap-2 p-2 rounded-md text-sm',
                  'border',
                  getLevelColor(entry.level)
                )}
              >
                {/* 图标 */}
                <div className="mt-0.5 flex-shrink-0">
                  {getLevelIcon(entry.level)}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {showTimestamp && (
                      <span className="text-xs opacity-60 font-mono">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    )}
                    <span className="text-xs opacity-80 font-medium">
                      {getLevelLabel(entry.level)}
                    </span>
                    {entry.stage && (
                      <span className="text-xs opacity-60 px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10">
                        {entry.stage}
                      </span>
                    )}
                    {entry.progress !== undefined && entry.progress > 0 && (
                      <span className="text-xs opacity-60">
                        {entry.progress}%
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 break-words">{entry.message}</p>
                  {entry.details && (
                    <p className="mt-1 text-xs opacity-70 break-words">{entry.details}</p>
                  )}
                </div>
              </motion.div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  )
}

/**
 * 将 SSE 事件转换为日志条目
 */
function convertEventToLogEntry(event: SSEEvent, index: number): LogEntry {
  const timestamp = event.ts ? new Date(event.ts) : new Date()
  const payload = event.payload || {}
  
  let level: LogLevel = 'info'
  let message = ''
  let details = ''

  switch (event.type) {
    case 'task.lifecycle':
      const lifecycleType = payload.lifecycleType
      switch (lifecycleType) {
        case 'task.created':
          level = 'info'
          message = payload.message as string || '任务已创建'
          break
        case 'task.processing':
          level = 'info'
          message = payload.message as string || `开始处理: ${payload.stage || ''}`
          break
        case 'task.progress':
          level = 'debug'
          message = payload.message as string || `进度更新: ${payload.progress || 0}%`
          break
        case 'task.completed':
          level = 'success'
          message = payload.message as string || '任务完成'
          break
        case 'task.failed':
          level = 'error'
          message = payload.message as string || '任务失败'
          details = payload.error as string || ''
          break
        default:
          level = 'info'
          message = payload.message as string || '任务状态更新'
      }
      break

    case 'task.stream':
      level = 'stream'
      const stream = payload.stream as { kind?: string; delta?: string; content?: string } | undefined
      if (stream?.kind === 'text' && stream.delta) {
        message = stream.delta
      } else if (stream?.kind === 'reasoning') {
        message = '[思考中...]'
        details = stream.delta || ''
      } else {
        message = '流式数据'
      }
      break

    case 'connected':
      level = 'success'
      message = 'SSE 连接已建立'
      break

    case 'error':
      level = 'error'
      message = payload.error as string || '连接错误'
      break

    default:
      level = 'debug'
      message = `事件: ${event.type}`
  }

  return {
    id: event.id || `log-${index}-${timestamp.getTime()}`,
    timestamp,
    level,
    message,
    details,
    stage: payload.stage as string | undefined,
    progress: payload.progress as number | undefined,
  }
}

/**
 * 紧凑日志组件
 * 
 * 适用于空间有限的场景
 */
export function CompactGenerationLog({
  events,
  maxHeight = 150,
  className,
}: Omit<GenerationLogProps, 'showTimestamp' | 'autoScroll'>) {
  const latestEvent = events[events.length - 1]
  
  if (!latestEvent) {
    return (
      <div className={cn('text-sm text-muted-foreground p-2', className)}>
        等待任务开始...
      </div>
    )
  }

  const logEntry = convertEventToLogEntry(latestEvent, 0)

  return (
    <div className={cn('flex items-center gap-2 p-2 text-sm', className)}>
      {logEntry.level === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
      {logEntry.level === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
      {logEntry.level === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
      {logEntry.level === 'info' && <Info className="h-4 w-4 text-blue-500" />}
      <span className="flex-1 truncate">{logEntry.message}</span>
      {logEntry.progress !== undefined && (
        <span className="text-xs text-muted-foreground">{logEntry.progress}%</span>
      )}
    </div>
  )
}

export default GenerationLog
