'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  Square,
  Settings,
  Image,
  Film,
  Mic,
  FileText,
  Sparkles,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Terminal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface GenerationControlProps {
  projectId: string
  episodeId: string
}

type GenerationStage = 'script' | 'storyboard' | 'character' | 'image' | 'video' | 'voice' | 'compose'
type GenerationStatus = 'idle' | 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'

interface StageConfig {
  id: GenerationStage
  label: string
  icon: React.ElementType
  description: string
  estimatedCost: number
}

const stages: StageConfig[] = [
  { id: 'script', label: '剧本解析', icon: FileText, description: '解析剧本内容，提取场景和对话', estimatedCost: 0.01 },
  { id: 'storyboard', label: '分镜生成', icon: Image, description: '生成分镜脚本和镜头描述', estimatedCost: 0.05 },
  { id: 'character', label: '角色验证', icon: Sparkles, description: '验证角色设定的一致性', estimatedCost: 0.02 },
  { id: 'image', label: '图像生成', icon: Image, description: '为每个分镜生成图像', estimatedCost: 0.5 },
  { id: 'video', label: '视频生成', icon: Film, description: '将图像转换为视频片段', estimatedCost: 1.0 },
  { id: 'voice', label: '语音合成', icon: Mic, description: '生成角色配音', estimatedCost: 0.1 },
  { id: 'compose', label: '视频合成', icon: Film, description: '合成最终视频', estimatedCost: 0.05 },
]

interface LogEntry {
  id: string
  timestamp: Date
  level: 'info' | 'warning' | 'error' | 'success'
  message: string
  stage?: GenerationStage
}

export function GenerationControl({ projectId, episodeId }: GenerationControlProps) {
  const [selectedStages, setSelectedStages] = useState<GenerationStage[]>(['image', 'video'])
  const [status, setStatus] = useState<GenerationStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [currentStage, setCurrentStage] = useState<GenerationStage | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const [imageModel, setImageModel] = useState('dalle3')
  const [videoModel, setVideoModel] = useState('runway')
  const [estimatedCost, setEstimatedCost] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // 计算预估成本
  useEffect(() => {
    const cost = stages
      .filter((s) => selectedStages.includes(s.id))
      .reduce((acc, s) => acc + s.estimatedCost, 0)
    setEstimatedCost(cost)
  }, [selectedStages])

  // 模拟生成过程
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (status === 'running') {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1)
        setProgress((prev) => {
          if (prev >= 100) {
            setStatus('completed')
            addLog('success', '所有阶段已完成！')
            return 100
          }
          return prev + Math.random() * 2
        })
      }, 1000)
    }

    return () => clearInterval(interval)
  }, [status])

  // 自动滚动日志
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const addLog = (level: LogEntry['level'], message: string, stage?: GenerationStage) => {
    setLogs((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: new Date(),
        level,
        message,
        stage,
      },
    ])
  }

  const startGeneration = () => {
    setStatus('running')
    setProgress(0)
    setElapsedTime(0)
    setLogs([])
    addLog('info', '开始生成任务...')
    addLog('info', `选中的阶段: ${selectedStages.map((s) => stages.find((st) => st.id === s)?.label).join(', ')}`)
  }

  const pauseGeneration = () => {
    setStatus('paused')
    addLog('warning', '任务已暂停')
  }

  const resumeGeneration = () => {
    setStatus('running')
    addLog('info', '任务已恢复')
  }

  const cancelGeneration = () => {
    setStatus('cancelled')
    addLog('error', '任务已取消')
  }

  const toggleStage = (stageId: GenerationStage) => {
    setSelectedStages((prev) =>
      prev.includes(stageId) ? prev.filter((s) => s !== stageId) : [...prev, stageId]
    )
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-6 w-6 animate-spin text-primary" />
      case 'completed':
        return <CheckCircle className="h-6 w-6 text-green-500" />
      case 'failed':
      case 'cancelled':
        return <AlertCircle className="h-6 w-6 text-red-500" />
      default:
        return <Clock className="h-6 w-6 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-6">
      {/* 阶段选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            生成阶段
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stages.map((stage) => (
              <div
                key={stage.id}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all',
                  selectedStages.includes(stage.id)
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/50'
                )}
                onClick={() => toggleStage(stage.id)}
              >
                <Checkbox
                  checked={selectedStages.includes(stage.id)}
                  onCheckedChange={() => toggleStage(stage.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <stage.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{stage.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stage.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 模型配置 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Image className="h-4 w-4" />
              图像模型
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={imageModel} onValueChange={(value) => setImageModel(value || 'dalle3')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dalle3">DALL·E 3</SelectItem>
                <SelectItem value="midjourney">Midjourney</SelectItem>
                <SelectItem value="sdxl">Stable Diffusion XL</SelectItem>
                <SelectItem value="flux">Flux</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Film className="h-4 w-4" />
              视频模型
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={videoModel} onValueChange={(value) => setVideoModel(value || 'runway')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="runway">Runway Gen-3</SelectItem>
                <SelectItem value="pika">Pika Labs</SelectItem>
                <SelectItem value="kling">Kling</SelectItem>
                <SelectItem value="luma">Luma Dream Machine</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* 控制面板 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* 状态 */}
            <div className="flex items-center gap-4">
              {getStatusIcon()}
              <div>
                <h3 className="font-semibold">
                  {status === 'idle' && '准备就绪'}
                  {status === 'queued' && '排队中'}
                  {status === 'running' && '生成中...'}
                  {status === 'paused' && '已暂停'}
                  {status === 'completed' && '已完成'}
                  {status === 'failed' && '失败'}
                  {status === 'cancelled' && '已取消'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {status === 'running' && currentStage
                    ? `当前阶段: ${stages.find((s) => s.id === currentStage)?.label}`
                    : `${selectedStages.length} 个阶段待生成`}
                </p>
              </div>
            </div>

            {/* 进度 */}
            <div className="flex-1 max-w-md w-full">
              <div className="flex justify-between text-sm mb-2">
                <span>进度</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>已用时间: {formatTime(elapsedTime)}</span>
                <span>预计剩余: {status === 'running' ? '~2分钟' : '-'}</span>
              </div>
            </div>

            {/* 成本 */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>预估成本</span>
                </div>
                <p className="font-semibold">${estimatedCost.toFixed(2)}</p>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-2">
                {status === 'idle' || status === 'completed' || status === 'failed' || status === 'cancelled' ? (
                  <Button onClick={startGeneration} disabled={selectedStages.length === 0}>
                    <Play className="h-4 w-4 mr-2" />
                    开始生成
                  </Button>
                ) : status === 'running' ? (
                  <>
                    <Button variant="outline" onClick={pauseGeneration}>
                      <Pause className="h-4 w-4 mr-2" />
                      暂停
                    </Button>
                    <Button variant="destructive" onClick={cancelGeneration}>
                      <Square className="h-4 w-4 mr-2" />
                      取消
                    </Button>
                  </>
                ) : status === 'paused' ? (
                  <>
                    <Button onClick={resumeGeneration}>
                      <Play className="h-4 w-4 mr-2" />
                      继续
                    </Button>
                    <Button variant="destructive" onClick={cancelGeneration}>
                      <Square className="h-4 w-4 mr-2" />
                      取消
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 日志区域 */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setShowLogs(!showLogs)}
        >
          <CardTitle className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              生成日志
            </div>
            {showLogs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CardTitle>
        </CardHeader>
        <AnimatePresence>
          {showLogs && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent>
                <ScrollArea className="h-64 rounded border bg-muted/50 p-4 font-mono text-sm">
                  {logs.length === 0 ? (
                    <p className="text-muted-foreground">等待开始...</p>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="mb-1">
                        <span className="text-muted-foreground">
                          [{log.timestamp.toLocaleTimeString()}]
                        </span>{' '}
                        <span
                          className={cn(
                            'font-semibold',
                            log.level === 'error' && 'text-red-500',
                            log.level === 'warning' && 'text-yellow-500',
                            log.level === 'success' && 'text-green-500',
                            log.level === 'info' && 'text-blue-500'
                          )}
                        >
                          [{log.level.toUpperCase()}]
                        </span>{' '}
                        {log.stage && (
                          <Badge variant="outline" className="text-xs mr-2">
                            {stages.find((s) => s.id === log.stage)?.label}
                          </Badge>
                        )}
                        <span>{log.message}</span>
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
                </ScrollArea>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  )
}
