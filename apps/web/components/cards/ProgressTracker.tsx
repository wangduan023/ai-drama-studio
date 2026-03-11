'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

type TaskStage = 'script' | 'storyboard' | 'image' | 'video' | 'voice' | 'compose'
type TaskStatus = 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'paused'

interface TaskProgress {
  stage: TaskStage
  status: TaskStatus
  progress: number
  message?: string
  error?: string
  estimatedTime?: number
}

interface ProgressTrackerProps {
  tasks?: TaskProgress[]
  overallProgress?: number
  status?: 'idle' | 'running' | 'paused' | 'completed' | 'failed'
  onPause?: () => void
  onResume?: () => void
  onCancel?: () => void
  onRetry?: (stage: TaskStage) => void
}

const stageConfig: Record<TaskStage, { label: string; icon: React.ElementType; description: string }> = {
  script: { label: '剧本解析', icon: FileText, description: '解析剧本内容' },
  storyboard: { label: '分镜生成', icon: Layers, description: '生成分镜脚本' },
  image: { label: '图像生成', icon: Image, description: '生成场景图像' },
  video: { label: '视频生成', icon: Film, description: '图像转视频' },
  voice: { label: '语音合成', icon: Mic, description: '生成配音' },
  compose: { label: '视频合成', icon: Sparkles, description: '合成最终视频' },
}

export function ProgressTracker({
  tasks: propTasks,
  overallProgress: propProgress,
  status: propStatus,
  onPause,
  onResume,
  onCancel,
  onRetry,
}: ProgressTrackerProps) {
  // 如果没有传入 props，使用模拟数据
  const [tasks, setTasks] = useState<TaskProgress[]>(
    propTasks || [
      { stage: 'script', status: 'completed', progress: 100 },
      { stage: 'storyboard', status: 'completed', progress: 100 },
      { stage: 'image', status: 'processing', progress: 65, estimatedTime: 120 },
      { stage: 'video', status: 'pending', progress: 0 },
      { stage: 'voice', status: 'pending', progress: 0 },
      { stage: 'compose', status: 'pending', progress: 0 },
    ]
  )

  const [status, setStatus] = useState(propStatus || 'running')
  const [overallProgress, setOverallProgress] = useState(propProgress || 35)
  const [elapsedTime, setElapsedTime] = useState(0)

  // 模拟进度更新
  useEffect(() => {
    if (status !== 'running') return

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1)

      setTasks((prevTasks) => {
        const newTasks = [...prevTasks]
        const processingTask = newTasks.find((t) => t.status === 'processing')

        if (processingTask) {
          processingTask.progress = Math.min(processingTask.progress + Math.random() * 5, 100)
          
          if (processingTask.progress >= 100) {
            processingTask.status = 'completed'
            const nextTask = newTasks.find((t) => t.status === 'pending')
            if (nextTask) {
              nextTask.status = 'processing'
            }
          }
        }

        // 计算总体进度
        const totalProgress = newTasks.reduce((acc, t) => acc + t.progress, 0)
        const newOverallProgress = totalProgress / newTasks.length
        setOverallProgress(newOverallProgress)

        // 检查是否全部完成
        if (newTasks.every((t) => t.status === 'completed')) {
          setStatus('completed')
        }

        return newTasks
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [status])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}分${secs}秒`
  }

  const getStatusIcon = (taskStatus: TaskStatus) => {
    switch (taskStatus) {
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusColor = (taskStatus: TaskStatus) => {
    switch (taskStatus) {
      case 'processing':
        return 'bg-primary/20 text-primary border-primary/50'
      case 'completed':
        return 'bg-green-500/20 text-green-500 border-green-500/50'
      case 'failed':
        return 'bg-red-500/20 text-red-500 border-red-500/50'
      case 'paused':
        return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const getStatusLabel = (taskStatus: TaskStatus) => {
    switch (taskStatus) {
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
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {status === 'running' ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : status === 'completed' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : status === 'failed' ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : (
              <Clock className="h-5 w-5 text-muted-foreground" />
            )}
            生成进度
          </CardTitle>
          <div className="flex items-center gap-2">
            {status === 'running' && (
              <>
                <Button variant="outline" size="sm" onClick={onPause}>
                  <Pause className="h-4 w-4 mr-2" />
                  暂停
                </Button>
                <Button variant="destructive" size="sm" onClick={onCancel}>
                  <Square className="h-4 w-4 mr-2" />
                  取消
                </Button>
              </>
            )}
            {status === 'paused' && (
              <>
                <Button size="sm" onClick={onResume}>
                  <Play className="h-4 w-4 mr-2" />
                  继续
                </Button>
                <Button variant="destructive" size="sm" onClick={onCancel}>
                  <Square className="h-4 w-4 mr-2" />
                  取消
                </Button>
              </>
            )}
            {(status === 'completed' || status === 'failed') && (
              <Button variant="outline" size="sm" onClick={() => setStatus('running')}>
                <RotateCcw className="h-4 w-4 mr-2" />
                重新开始
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 总体进度 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">总体进度</span>
            <span className="text-muted-foreground">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>已用时间: {formatTime(elapsedTime)}</span>
            {status === 'running' && (
              <span>预计剩余: ~{formatTime(Math.max(0, 300 - elapsedTime))}</span>
            )}
          </div>
        </div>

        <Separator />

        {/* 各阶段进度 */}
        <div className="space-y-3">
          {tasks.map((task) => {
            const config = stageConfig[task.stage]
            const Icon = config.icon

            return (
              <motion.div
                key={task.stage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'flex items-center gap-4 p-3 rounded-lg border transition-colors',
                  task.status === 'processing' && 'bg-primary/5 border-primary/20',
                  task.status === 'completed' && 'bg-green-500/5 border-green-500/20',
                  task.status === 'failed' && 'bg-red-500/5 border-red-500/20',
                  task.status === 'pending' && 'bg-muted/50'
                )}
              >
                {/* 图标 */}
                <div className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  task.status === 'processing' && 'bg-primary/10',
                  task.status === 'completed' && 'bg-green-500/10',
                  task.status === 'failed' && 'bg-red-500/10',
                  task.status === 'pending' && 'bg-muted'
                )}>
                  <Icon className={cn(
                    'h-5 w-5',
                    task.status === 'processing' && 'text-primary',
                    task.status === 'completed' && 'text-green-500',
                    task.status === 'failed' && 'text-red-500',
                    task.status === 'pending' && 'text-muted-foreground'
                  )} />
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{config.label}</span>
                    <Badge variant="outline" className={cn('text-xs', getStatusColor(task.status))}>
                      {getStatusLabel(task.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{config.description}</p>
                  {task.message && (
                    <p className="text-xs text-muted-foreground mt-1">{task.message}</p>
                  )}
                  {task.error && (
                    <p className="text-xs text-red-500 mt-1">{task.error}</p>
                  )}
                </div>

                {/* 进度 */}
                <div className="w-24">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{Math.round(task.progress)}%</span>
                  </div>
                  <Progress value={task.progress} className="h-1.5" />
                </div>

                {/* 状态图标 */}
                <div className="w-6">
                  {getStatusIcon(task.status)}
                </div>

                {/* 重试按钮 */}
                {task.status === 'failed' && onRetry && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRetry(task.stage)}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
