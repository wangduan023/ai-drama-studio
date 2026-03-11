'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Pause,
  Play,
  Square,
  RotateCcw,
  Image,
  Film,
  FileText,
  Sparkles,
  Mic,
  Layers,
  X,
  ChevronDown,
  ChevronUp,
  Terminal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useSSE, type SSEEvent } from '@/hooks/useSSE'
import { GenerationLog } from './GenerationLog'

// 任务阶段配置
const STAGE_CONFIG: Record<string, { 
  label: string
  icon: React.ElementType
  description: string
  order: number
}> = {
  script: { label: '剧本解析', icon: FileText, description: '解析剧本内容', order: 1 },
  storyboard: { label: '分镜生成', icon: Layers, description: '生成分镜脚本', order: 2 },
  image: { label: '图像生成', icon: Image, description: '生成场景图像', order: 3 },
  video: { label: '视频生成', icon: Film, description: '图像转视频', order: 4 },
  voice: { label: '语音合成', icon: Mic, description: '生成配音', order: 5 },
  compose: { label: '视频合成', icon: Sparkles, description: '合成最终视频', order: 6 },
}

// 任务状态类型
type TaskStatus = 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'paused' | 'unknown'

// 阶段进度类型
interface StageProgress {
  stage: string
  status: TaskStatus
  progress: number
  message?: string
  error?: string
  startedAt?: Date
  completedAt?: Date
}

// 任务整体进度
interface TaskOverallProgress {
  taskId: string
  status: TaskStatus
  overallProgress: number
  currentStage?: string
  stages: StageProgress[]
  startedAt?: Date
  estimatedRemaining?: number
  error?: string
}

export interface GenerationProgressProps {
  taskId: string
  projectId: string
  episodeId?: string
  onComplete?: (result?: unknown) => void
  onError?: (error: string) => void
  onCancel?: () => void
  showLog?: boolean
  className?: string
}

/**
 * 生成进度组件
 * 
 * 显示 AI 生成任务的实时进度，包括:
 * - 总体进度条
 * - 各阶段进度
 * - 实时日志
 * - 操作按钮 (暂停/继续/取消/重试)
 */
export function GenerationProgress({
  taskId,
  projectId,
  episodeId,
  onComplete,
  onError,
  onCancel,
  showLog = true,
  className,
}: GenerationProgressProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showLogPanel, setShowLogPanel] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [taskProgress, setTaskProgress] = useState<TaskOverallProgress>({
    taskId,
    status: 'queued',
    overallProgress: 0,
    stages: [],
  })

  // 使用 SSE Hook 接收实时事件
  const { 
    connected, 
    connecting, 
    events, 
    lastEvent, 
    reconnectAttempts,
    error: sseError,
    reconnect,
    disconnect,
  } = useSSE({
    projectId,
    episodeId,
    enabled: true,
    onEvent: handleSSEEvent,
    onConnected: () => console.log('[GenerationProgress] SSE connected'),
    onDisconnected: () => console.log('[GenerationProgress] SSE disconnected'),
    onError: (error) => console.error('[GenerationProgress] SSE error:', error),
    reconnect: {
      enabled: true,
      maxAttempts: 10,
      interval: 3000,
    },
  })

  // 处理 SSE 事件
  function handleSSEEvent(event: SSEEvent) {
    // 只处理当前任务的事件
    if (event.taskId !== taskId) return

    const { type, payload } = event

    setTaskProgress((prev) => {
      const next = { ...prev }

      switch (type) {
        case 'task.lifecycle':
          const lifecycleType = payload?.lifecycleType
          
          switch (lifecycleType) {
            case 'task.created':
              next.status = 'queued'
              next.startedAt = new Date()
              break
            case 'task.processing':
              next.status = 'processing'
              if (payload?.stage) {
                next.currentStage = payload.stage as string
              }
              break
            case 'task.progress':
              next.status = 'processing'
              if (typeof payload?.progress === 'number') {
                next.overallProgress = payload.progress
              }
              if (payload?.stage) {
                next.currentStage = payload.stage as string
                // 更新阶段进度
                updateStageProgress(next, payload.stage as string, {
                  progress: payload.progress as number || 0,
                  status: 'processing',
                  message: payload?.message as string,
                })
              }
              break
            case 'task.completed':
              next.status = 'completed'
              next.overallProgress = 100
              onComplete?.(payload?.result)
              break
            case 'task.failed':
              next.status = 'failed'
              next.error = (payload?.error as string) || 'Task failed'
              onError?.(next.error)
              break
          }
          break

        case 'task.stream':
          // 流式输出事件，主要用于日志
          break
      }

      return next
    })
  }

  // 更新阶段进度
  function updateStageProgress(
    taskProgress: TaskOverallProgress,
    stage: string,
    update: Partial<StageProgress>
  ) {
    const existingStage = taskProgress.stages.find((s) => s.stage === stage)
    if (existingStage) {
      Object.assign(existingStage, update)
      if (update.status === 'completed') {
        existingStage.completedAt = new Date()
      }
    } else {
      taskProgress.stages.push({
        stage,
        status: update.status || 'processing',
        progress: update.progress || 0,
        message: update.message,
        startedAt: new Date(),
        ...update,
      })
    }
  }

  // 计时器
  useEffect(() => {
    if (taskProgress.status !== 'processing' && taskProgress.status !== 'queued') {
      return
    }

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [taskProgress.status])

  // 计算预计剩余时间
  const estimatedRemaining = useMemo(() => {
    if (taskProgress.status !== 'processing' || taskProgress.overallProgress <= 0) {
      return undefined
    }
    const rate = elapsedTime / taskProgress.overallProgress
    return Math.max(0, Math.round(rate * (100 - taskProgress.overallProgress)))
  }, [elapsedTime, taskProgress.overallProgress, taskProgress.status])

  // 格式化时间
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}分${secs}秒` : `${secs}秒`
  }, [])

  // 获取状态图标
  const getStatusIcon = useCallback((status: TaskStatus) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />
      case 'queued':
        return <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }, [])

  // 获取状态颜色
  const getStatusColor = useCallback((status: TaskStatus) => {
    switch (status) {
      case 'processing':
        return 'bg-primary/20 text-primary border-primary/50'
      case 'completed':
        return 'bg-green-500/20 text-green-500 border-green-500/50'
      case 'failed':
        return 'bg-red-500/20 text-red-500 border-red-500/50'
      case 'paused':
        return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50'
      case 'queued':
        return 'bg-blue-500/20 text-blue-500 border-blue-500/50'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }, [])

  // 获取状态标签
  const getStatusLabel = useCallback((status: TaskStatus) => {
    switch (status) {
      case 'processing':
        return '进行中'
      case 'completed':
        return '已完成'
      case 'failed':
        return '失败'
      case 'paused':
        return '已暂停'
      case 'queued':
        return '排队中'
      default:
        return '等待中'
    }
  }, [])

  // 获取所有阶段（包括未开始的）
  const allStages = useMemo(() => {
    const stages: StageProgress[] = []
    const sortedStageKeys = Object.keys(STAGE_CONFIG).sort(
      (a, b) => STAGE_CONFIG[a].order - STAGE_CONFIG[b].order
    )

    for (const stageKey of sortedStageKeys) {
      const existing = taskProgress.stages.find((s) => s.stage === stageKey)
      if (existing) {
        stages.push(existing)
      } else {
        // 根据总体进度推断阶段状态
        const stageOrder = STAGE_CONFIG[stageKey].order
        const currentOrder = taskProgress.currentStage 
          ? STAGE_CONFIG[taskProgress.currentStage]?.order || 0
          : 0
        
        let status: TaskStatus = 'pending'
        if (stageOrder < currentOrder) {
          status = 'completed'
        } else if (stageOrder === currentOrder) {
          status = taskProgress.status === 'processing' ? 'processing' : 'queued'
        }

        stages.push({
          stage: stageKey,
          status,
          progress: status === 'completed' ? 100 : 0,
        })
      }
    }

    return stages
  }, [taskProgress.stages, taskProgress.currentStage, taskProgress.status])

  // 处理取消
  const handleCancel = useCallback(() => {
    disconnect()
    onCancel?.()
  }, [disconnect, onCancel])

  // 处理重试
  const handleRetry = useCallback(() => {
    setTaskProgress({
      taskId,
      status: 'queued',
      overallProgress: 0,
      stages: [],
    })
    setElapsedTime(0)
    reconnect()
  }, [taskId, reconnect])

  // 连接状态指示器
  const ConnectionStatus = () => (
    <div className="flex items-center gap-2 text-xs">
      {connecting ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span className="text-muted-foreground">连接中...</span>
        </>
      ) : connected ? (
        <>
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-green-600">已连接</span>
        </>
      ) : (
        <>
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-red-600">已断开</span>
          {reconnectAttempts > 0 && (
            <span className="text-muted-foreground">(重试 {reconnectAttempts})</span>
          )}
        </>
      )}
    </div>
  )

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {taskProgress.status === 'processing' ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : taskProgress.status === 'completed' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : taskProgress.status === 'failed' ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : (
              <Clock className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <CardTitle className="text-base">生成进度</CardTitle>
              <ConnectionStatus />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* 日志切换按钮 */}
            {showLog && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLogPanel(!showLogPanel)}
                className={cn(showLogPanel && 'bg-muted')}
              >
                <Terminal className="h-4 w-4 mr-1" />
                日志
              </Button>
            )}
            
            {/* 展开/收起按钮 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {/* 操作按钮 */}
            {taskProgress.status === 'processing' && (
              <Button variant="destructive" size="sm" onClick={handleCancel}>
                <Square className="h-4 w-4 mr-1" />
                取消
              </Button>
            )}
            {taskProgress.status === 'failed' && (
              <Button size="sm" onClick={handleRetry}>
                <RotateCcw className="h-4 w-4 mr-1" />
                重试
              </Button>
            )}
            {!connected && taskProgress.status !== 'completed' && taskProgress.status !== 'failed' && (
              <Button variant="outline" size="sm" onClick={reconnect}>
                <RotateCcw className="h-4 w-4 mr-1" />
                重连
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <CardContent className="space-y-4">
              {/* 总体进度 */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">
                    {taskProgress.currentStage 
                      ? STAGE_CONFIG[taskProgress.currentStage]?.label || taskProgress.currentStage
                      : '准备中...'
                    }
                  </span>
                  <span className="text-muted-foreground">
                    {Math.round(taskProgress.overallProgress)}%
                  </span>
                </div>
                <Progress value={taskProgress.overallProgress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>已用时间: {formatTime(elapsedTime)}</span>
                  {estimatedRemaining !== undefined && taskProgress.status === 'processing' && (
                    <span>预计剩余: ~{formatTime(estimatedRemaining)}</span>
                  )}
                </div>
              </div>

              {/* 错误信息 */}
              {taskProgress.error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{taskProgress.error}</span>
                  </div>
                </div>
              )}

              <Separator />

              {/* 各阶段进度 */}
              <ScrollArea className="h-auto max-h-[240px]">
                <div className="space-y-2">
                  {allStages.map((stage) => {
                    const config = STAGE_CONFIG[stage.stage]
                    const Icon = config?.icon || Sparkles
                    const isActive = stage.status === 'processing'

                    return (
                      <motion.div
                        key={stage.stage}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          'flex items-center gap-3 p-2.5 rounded-lg border transition-all',
                          isActive && 'bg-primary/5 border-primary/20',
                          stage.status === 'completed' && 'bg-green-500/5 border-green-500/20',
                          stage.status === 'failed' && 'bg-red-500/5 border-red-500/20',
                          stage.status === 'pending' && 'bg-muted/30 border-transparent opacity-60'
                        )}
                      >
                        {/* 图标 */}
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center',
                          isActive && 'bg-primary/10',
                          stage.status === 'completed' && 'bg-green-500/10',
                          stage.status === 'failed' && 'bg-red-500/10',
                          stage.status === 'pending' && 'bg-muted'
                        )}>
                          <Icon className={cn(
                            'h-4 w-4',
                            isActive && 'text-primary',
                            stage.status === 'completed' && 'text-green-500',
                            stage.status === 'failed' && 'text-red-500',
                            stage.status === 'pending' && 'text-muted-foreground'
                          )} />
                        </div>

                        {/* 信息 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{config?.label || stage.stage}</span>
                            <Badge variant="outline" className={cn('text-xs', getStatusColor(stage.status))}>
                              {getStatusLabel(stage.status)}
                            </Badge>
                          </div>
                          {stage.message && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{stage.message}</p>
                          )}
                          {stage.error && (
                            <p className="text-xs text-red-500 mt-0.5">{stage.error}</p>
                          )}
                        </div>

                        {/* 进度 */}
                        <div className="w-16">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className={isActive ? 'text-primary' : 'text-muted-foreground'}>
                              {Math.round(stage.progress)}%
                            </span>
                          </div>
                          <Progress value={stage.progress} className="h-1" />
                        </div>

                        {/* 状态图标 */}
                        <div className="w-5">
                          {getStatusIcon(stage.status)}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </ScrollArea>

              {/* 日志面板 */}
              {showLog && showLogPanel && (
                <>
                  <Separator />
                  <GenerationLog 
                    events={events.filter((e) => e.taskId === taskId)} 
                    maxHeight={200}
                  />
                </>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

export default GenerationProgress
