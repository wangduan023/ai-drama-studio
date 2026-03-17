'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Settings2,
  Coins,
  Share2,
  Download,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Scissors,
  Copy,
  Trash2,
  Plus,
  GripVertical,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Film,
  Mic2,
  FileType,
  Music,
  Info,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Slider } from '@/components/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { StepNavigation, PROJECT_STEPS } from '@/components/projects/StepNavigation'
import { cn } from '@/lib/utils'

// 模拟分镜视频数据
const mockStoryboards = [
  {
    id: '1',
    sceneNumber: 1,
    script: '婚宴现场，灯光璀璨。梨月穿着白色婚纱，手捧花束，缓缓走向傅寒舟。',
    duration: 5,
    videoUrl: '/mock/video-1.mp4',
    dubbingUrl: '/mock/dubbing-1.mp3',
    lipsyncUrl: '/mock/lipsync-1.mp4',
    subtitles: [
      { id: 's1', start: 0.5, end: 2.0, text: '（婚礼进行曲）' },
      { id: 's2', start: 2.5, end: 4.0, text: '司仪：现在，请新娘新郎交换戒指！' },
      { id: 's3', start: 4.2, end: 5.0, text: '梨月：（轻声）我愿意。' },
    ],
  },
  {
    id: '2',
    sceneNumber: 2,
    script: '南枝在化妆间照镜子，眼神复杂。她拿起红色高跟鞋，犹豫片刻后放下。',
    duration: 4,
    videoUrl: '/mock/video-2.mp4',
    dubbingUrl: '/mock/dubbing-2.mp3',
    lipsyncUrl: '/mock/lipsync-2.mp4',
    subtitles: [
      { id: 's4', start: 0.3, end: 2.0, text: '南枝：为什么...不是我？' },
      { id: 's5', start: 2.5, end: 3.5, text: '助理：南枝姐，该您上场了。' },
      { id: 's6', start: 3.7, end: 4.0, text: '南枝：知道了。' },
    ],
  },
  {
    id: '3',
    sceneNumber: 3,
    script: '傅烬野站在窗边，背对着镜头，手中把玩着打火机。火光明灭间，看不清表情。',
    duration: 6,
    videoUrl: '/mock/video-3.mp4',
    dubbingUrl: '/mock/dubbing-3.mp3',
    lipsyncUrl: '/mock/lipsync-3.mp4',
    subtitles: [
      { id: 's7', start: 0.5, end: 1.5, text: '（打火机开合声）' },
      { id: 's8', start: 4.0, end: 6.0, text: '傅烬野：（自言自语）这场戏，才刚刚开始...' },
    ],
  },
  {
    id: '4',
    sceneNumber: 4,
    script: '镜头切换至宴会厅外，夜空繁星点点。远处传来婚礼进行曲的旋律。',
    duration: 3,
    videoUrl: '/mock/video-4.mp4',
    dubbingUrl: null,
    lipsyncUrl: '/mock/lipsync-4.mp4',
    subtitles: [
      { id: 's9', start: 0.0, end: 3.0, text: '（婚礼进行曲持续）' },
    ],
  },
]

// 背景音乐选项
const BACKGROUND_MUSIC = [
  { id: 'm1', name: '婚礼进行曲', duration: 180, url: '/music/wedding-march.mp3' },
  { id: 'm2', name: '悲伤钢琴曲', duration: 120, url: '/music/sad-piano.mp3' },
  { id: 'm3', name: '悬疑氛围', duration: 90, url: '/music/suspense.mp3' },
  { id: 'm4', name: '浪漫弦乐', duration: 150, url: '/music/romantic-strings.mp3' },
  { id: 'm5', name: '轻快日常', duration: 60, url: '/music/light-daily.mp3' },
]

// 导出分辨率选项
const EXPORT_RESOLUTIONS = [
  { value: '720p', label: '720P HD', width: 1280, height: 720, tag: '推荐' },
  { value: '1080p', label: '1080P FHD', width: 1920, height: 1080, tag: null },
  { value: '2k', label: '2K', width: 2560, height: 1440, tag: '高质量' },
  { value: '4k', label: '4K UHD', width: 3840, height: 2160, tag: '最佳' },
]

// 导出格式选项
const EXPORT_FORMATS = [
  { value: 'mp4', label: 'MP4', description: '通用格式，兼容性好' },
  { value: 'mov', label: 'MOV', description: '苹果格式，质量更高' },
  { value: 'webm', label: 'WebM', description: '网络优化，体积小' },
]

interface Storyboard {
  id: string
  sceneNumber: number
  script: string
  duration: number
  videoUrl: string | null
  dubbingUrl: string | null
  lipsyncUrl: string | null
  subtitles: { id: string; start: number; end: number; text: string }[]
}

interface TimelineTrack {
  id: string
  type: 'video' | 'audio' | 'subtitle' | 'music'
  items: TimelineItem[]
  muted: boolean
  locked: boolean
  visible: boolean
}

interface TimelineItem {
  id: string
  storyboardId: string
  start: number
  duration: number
  content?: string
}

export default function VideoPreviewPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [storyboards] = useState<Storyboard[]>(mockStoryboards)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [backgroundMusic, setBackgroundMusic] = useState<string | null>(null)
  const [backgroundMusicVolume, setBackgroundMusicVolume] = useState(0.3)

  const videoRef = useRef<HTMLVideoElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)

  // 计算总时长
  const totalDuration = storyboards.reduce((sum, sb) => sum + sb.duration, 0)

  // 获取当前播放的分镜
  const getCurrentStoryboard = useCallback(() => {
    let accumulatedTime = 0
    for (const sb of storyboards) {
      if (currentTime >= accumulatedTime && currentTime < accumulatedTime + sb.duration) {
        return { storyboard: sb, offset: currentTime - accumulatedTime }
      }
      accumulatedTime += sb.duration
    }
    return { storyboard: storyboards[storyboards.length - 1], offset: 0 }
  }, [currentTime, storyboards])

  // 播放控制
  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(Math.max(0, Math.min(time, totalDuration)))
  }, [totalDuration])

  const skipForward = useCallback(() => {
    handleSeek(currentTime + 5)
  }, [currentTime, handleSeek])

  const skipBackward = useCallback(() => {
    handleSeek(currentTime - 5)
  }, [currentTime, handleSeek])

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 忽略输入框中的按键
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          skipBackward()
          break
        case 'ArrowRight':
          skipForward()
          break
        case 'KeyF':
          setIsFullscreen(prev => !prev)
          break
        case 'KeyM':
          setIsMuted(prev => !prev)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay, skipForward, skipBackward])

  // 模拟播放进度
  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= totalDuration) {
            setIsPlaying(false)
            return totalDuration
          }
          return prev + 0.1
        })
      }, 100)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isPlaying, totalDuration])

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 处理导出
  const handleExport = (resolution: string, format: string) => {
    toast.success(`开始导出视频：${resolution} ${format.toUpperCase()}`)
    setShowExportModal(false)
    // 实际实现会调用后端 API 进行视频合成
  }

  const { storyboard: currentStoryboard, offset: currentOffset } = getCurrentStoryboard()

  // 获取当前字幕
  const currentSubtitles = currentStoryboard?.subtitles.filter(
    s => currentOffset >= s.start && currentOffset <= s.end
  ) || []

  return (
    <div className="flex h-screen bg-background">
      {/* 左侧步骤导航 */}
      <StepNavigation
        steps={PROJECT_STEPS}
        currentStep={6}
      />

      {/* 主内容区 */}
      <div className="flex-1 overflow-auto">
        {/* 顶部导航栏 */}
        <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-sm">
                漫剧工作流
              </Badge>
              <span className="text-sm text-muted-foreground">|</span>
              <span className="text-sm font-medium">☰ 走错婚房</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" title="分享项目">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" title="积分余额">
                <Coins className="h-4 w-4" />
                <span className="ml-1">💰 1,250</span>
              </Button>
              <Button
                onClick={() => setShowExportModal(true)}
                className="ml-4"
              >
                <Download className="h-4 w-4 mr-2" />
                导出视频
              </Button>
            </div>
          </div>
        </header>

        {/* 内容区 */}
        <main className="p-6">
          <div className="max-w-[1600px] mx-auto space-y-4">
            {/* 页面标题 */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">视频预览与编辑</h1>
                <p className="text-sm text-muted-foreground">
                  预览最终视频，调整时间轴，导出成片
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  <Film className="h-3 w-3 mr-1" />
                  {storyboards.length} 个分镜
                </Badge>
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  总时长：{formatTime(totalDuration)}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* 视频播放器 */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardContent className="p-0">
                    <div
                      ref={playerContainerRef}
                      className={cn(
                        'relative bg-black aspect-video',
                        isFullscreen && 'fixed inset-0 z-50'
                      )}
                    >
                      {/* 视频画面 */}
                      {currentStoryboard?.lipsyncUrl ? (
                        <video
                          ref={videoRef}
                          src={currentStoryboard.lipsyncUrl}
                          className="w-full h-full object-contain"
                          muted={isMuted}
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                          onEnded={() => setIsPlaying(false)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center text-white">
                            <Film className="h-16 w-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg">分镜 {currentStoryboard?.sceneNumber}</p>
                            <p className="text-sm opacity-70">{currentStoryboard?.script}</p>
                          </div>
                        </div>
                      )}

                      {/* 字幕显示 */}
                      {currentSubtitles.length > 0 && (
                        <div className="absolute bottom-16 left-0 right-0 text-center px-8">
                          {currentSubtitles.map(subtitle => (
                            <span
                              key={subtitle.id}
                              className="inline-block px-4 py-2 bg-black/70 text-white rounded-lg text-lg"
                            >
                              {subtitle.text}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 播放控制栏 */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                        {/* 进度条 */}
                        <div
                          className="h-1 bg-white/20 rounded-full mb-4 cursor-pointer group"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            const percent = (e.clientX - rect.left) / rect.width
                            handleSeek(percent * totalDuration)
                          }}
                        >
                          <div
                            className="h-full bg-primary rounded-full relative"
                            style={{ width: `${(currentTime / totalDuration) * 100}%` }}
                          >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>

                        {/* 控制按钮 */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-white hover:bg-white/20"
                              onClick={skipBackward}
                            >
                              <SkipBack className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-white hover:bg-white/20"
                              onClick={togglePlay}
                            >
                              {isPlaying ? (
                                <Pause className="h-5 w-5" />
                              ) : (
                                <Play className="h-5 w-5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-white hover:bg-white/20"
                              onClick={skipForward}
                            >
                              <SkipForward className="h-4 w-4" />
                            </Button>

                            {/* 音量控制 */}
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-white hover:bg-white/20"
                                onClick={() => setIsMuted(!isMuted)}
                              >
                                {isMuted ? (
                                  <VolumeX className="h-4 w-4" />
                                ) : (
                                  <Volume2 className="h-4 w-4" />
                                )}
                              </Button>
                              <Slider
                                value={[isMuted ? 0 : volume]}
                                onValueChange={(value) => {
                                  setVolume(value[0])
                                  setIsMuted(value[0] === 0)
                                }}
                                className="w-20"
                                min={0}
                                max={1}
                                step={0.1}
                              />
                            </div>

                            {/* 时间显示 */}
                            <span className="text-white text-sm ml-4">
                              {formatTime(currentTime)} / {formatTime(totalDuration)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-white hover:bg-white/20"
                              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                            >
                              <ZoomOut className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-white hover:bg-white/20"
                              onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}
                            >
                              <ZoomIn className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-white hover:bg-white/20"
                              onClick={() => setIsFullscreen(!isFullscreen)}
                            >
                              <Maximize className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 快捷键提示 */}
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <kbd className="px-2 py-1 bg-muted rounded">空格</kbd>
                        播放/暂停
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-2 py-1 bg-muted rounded">←</kbd>
                        后退 5 秒
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-2 py-1 bg-muted rounded">→</kbd>
                        前进 5 秒
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-2 py-1 bg-muted rounded">F</kbd>
                        全屏
                      </span>
                      <span className="flex items-center gap-1">
                        <kbd className="px-2 py-1 bg-muted rounded">M</kbd>
                        静音
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 右侧信息面板 */}
              <div className="space-y-4">
                {/* 当前分镜信息 */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">当前分镜</h3>
                      <Badge variant="outline">
                        分镜 {currentStoryboard?.sceneNumber}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currentStoryboard?.script}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>时长：{currentStoryboard?.duration}秒</span>
                      <span>进度：{formatTime(currentOffset)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* 背景音乐 */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Music className="h-4 w-4" />
                        背景音乐
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBackgroundMusic(null)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {backgroundMusic ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">
                            {BACKGROUND_MUSIC.find(m => m.id === backgroundMusic)?.name}
                          </span>
                          <Badge variant="secondary">已添加</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Volume2 className="h-4 w-4 text-muted-foreground" />
                          <Slider
                            value={[backgroundMusicVolume]}
                            onValueChange={(value) => setBackgroundMusicVolume(value[0])}
                            className="flex-1"
                            min={0}
                            max={1}
                            step={0.1}
                          />
                          <span className="text-xs w-10">
                            {Math.round(backgroundMusicVolume * 100)}%
                          </span>
                        </div>
                      </div>
                    ) : (
                      <Select onValueChange={setBackgroundMusic}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择背景音乐" />
                        </SelectTrigger>
                        <SelectContent>
                          {BACKGROUND_MUSIC.map(music => (
                            <SelectItem key={music.id} value={music.id}>
                              {music.name} ({formatTime(music.duration)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </CardContent>
                </Card>

                {/* 分镜列表 */}
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-semibold">分镜列表</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {storyboards.map((sb, index) => (
                        <div
                          key={sb.id}
                          className={cn(
                            'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                            currentStoryboard?.id === sb.id
                              ? 'bg-primary/10 border border-primary/20'
                              : 'hover:bg-muted'
                          )}
                          onClick={() => {
                            const time = storyboards.slice(0, index).reduce(
                              (sum, s) => sum + s.duration,
                              0
                            )
                            handleSeek(time)
                          }}
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs h-5">
                                {sb.sceneNumber}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {sb.duration}秒
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {sb.script}
                            </p>
                          </div>
                          {sb.lipsyncUrl && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* 时间轴编辑器 */}
            <Card>
              <CardContent className="p-4 space-y-4">
                {/* 时间轴工具栏 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Undo2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Redo2 className="h-4 w-4" />
                    </Button>
                    <div className="h-6 w-px bg-border mx-2" />
                    <Button variant="ghost" size="sm">
                      <Scissors className="h-4 w-4" />
                      分割
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Copy className="h-4 w-4" />
                      复制
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                      删除
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground w-12 text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.25))}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* 时间轴轨道 */}
                <div ref={timelineRef} className="space-y-2">
                  {/* 时间刻度 */}
                  <div className="h-8 bg-muted/50 rounded relative overflow-hidden">
                    {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute top-0 h-full flex items-center text-xs text-muted-foreground"
                        style={{ left: `${(i / totalDuration) * 100}%` }}
                      >
                        {i % 5 === 0 && formatTime(i)}
                      </div>
                    ))}
                    {/* 播放头 */}
                    <div
                      className="absolute top-0 w-0.5 h-full bg-red-500 z-10"
                      style={{ left: `${(currentTime / totalDuration) * 100}%` }}
                    >
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rotate-45" />
                    </div>
                  </div>

                  {/* 视频轨道 */}
                  <TimelineTrack
                    title="视频"
                    icon={Film}
                    storyboards={storyboards}
                    totalDuration={totalDuration}
                    zoomLevel={zoomLevel}
                    currentTime={currentTime}
                    onSeek={handleSeek}
                    type="video"
                  />

                  {/* 配音轨道 */}
                  <TimelineTrack
                    title="配音"
                    icon={Mic2}
                    storyboards={storyboards}
                    totalDuration={totalDuration}
                    zoomLevel={zoomLevel}
                    currentTime={currentTime}
                    onSeek={handleSeek}
                    type="audio"
                  />

                  {/* 字幕轨道 */}
                  <TimelineTrack
                    title="字幕"
                    icon={FileType}
                    storyboards={storyboards}
                    totalDuration={totalDuration}
                    zoomLevel={zoomLevel}
                    currentTime={currentTime}
                    onSeek={handleSeek}
                    type="subtitle"
                  />

                  {/* 背景音乐轨道 */}
                  <TimelineTrack
                    title="背景音乐"
                    icon={Music}
                    storyboards={backgroundMusic ? [{
                      id: 'music',
                      sceneNumber: 0,
                      script: backgroundMusic,
                      duration: totalDuration,
                      videoUrl: null,
                      dubbingUrl: null,
                      lipsyncUrl: null,
                      subtitles: [],
                    }] : []}
                    totalDuration={totalDuration}
                    zoomLevel={zoomLevel}
                    currentTime={currentTime}
                    onSeek={handleSeek}
                    type="music"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* 导出视频弹窗 */}
      {showExportModal && (
        <ExportModal
          open={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
          totalDuration={totalDuration}
        />
      )}
    </div>
  )
}

// 时间轴轨道组件
function TimelineTrack({
  title,
  icon: Icon,
  storyboards,
  totalDuration,
  zoomLevel,
  currentTime,
  onSeek,
  type,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  storyboards: Storyboard[]
  totalDuration: number
  zoomLevel: number
  currentTime: number
  onSeek: (time: number) => void
  type: 'video' | 'audio' | 'subtitle' | 'music'
}) {
  const [muted, setMuted] = useState(false)
  const [locked, setLocked] = useState(false)
  const [visible, setVisible] = useState(true)

  let accumulatedTime = 0

  const getTrackColor = () => {
    switch (type) {
      case 'video':
        return 'bg-blue-500/20 border-blue-500/40'
      case 'audio':
        return 'bg-green-500/20 border-green-500/40'
      case 'subtitle':
        return 'bg-yellow-500/20 border-yellow-500/40'
      case 'music':
        return 'bg-purple-500/20 border-purple-500/40'
    }
  }

  const getItemColor = () => {
    switch (type) {
      case 'video':
        return 'bg-blue-500'
      case 'audio':
        return 'bg-green-500'
      case 'subtitle':
        return 'bg-yellow-500'
      case 'music':
        return 'bg-purple-500'
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-7 w-7 p-0', muted && 'bg-muted')}
            onClick={() => setMuted(!muted)}
          >
            {muted ? (
              <VolumeX className="h-3 w-3" />
            ) : (
              <Volume2 className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-7 w-7 p-0', !visible && 'bg-muted')}
            onClick={() => setVisible(!visible)}
          >
            {visible ? (
              <Eye className="h-3 w-3" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-7 w-7 p-0', locked && 'bg-muted')}
            onClick={() => setLocked(!locked)}
          >
            {locked ? (
              <Lock className="h-3 w-3" />
            ) : (
              <Unlock className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
      <div
        className={cn('relative h-16', !visible && 'opacity-50')}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const percent = (e.clientX - rect.left) / rect.width
          onSeek(percent * totalDuration)
        }}
      >
        {/* 分镜区块 */}
        {storyboards.map((sb) => {
          const left = (accumulatedTime / totalDuration) * 100
          const width = (sb.duration / totalDuration) * 100 * zoomLevel
          accumulatedTime += sb.duration

          return (
            <div
              key={sb.id}
              className={cn(
                'absolute top-1 bottom-1 rounded border cursor-pointer transition-colors hover:opacity-80',
                getTrackColor(),
                type === 'subtitle' && 'overflow-hidden'
              )}
              style={{
                left: `${left}%`,
                width: `${width}%`,
                minWidth: '2px',
              }}
            >
              {type === 'subtitle' ? (
                <div className="p-1 text-xs overflow-hidden">
                  {sb.subtitles.map(sub => (
                    <div
                      key={sub.id}
                      className="truncate bg-white/50 rounded px-1 mb-1"
                      style={{
                        marginLeft: `${(sub.start / sb.duration) * 100}%`,
                        width: `${((sub.end - sub.start) / sb.duration) * 100}%`,
                      }}
                    >
                      {sub.text}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-1 text-xs font-medium truncate">
                  {type === 'music' ? sb.script : `分镜 ${sb.sceneNumber}`}
                </div>
              )}
            </div>
          )
        })}

        {/* 播放头 */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-10"
          style={{ left: `${(currentTime / totalDuration) * 100}%` }}
        />
      </div>
    </div>
  )
}

// 导出视频弹窗
function ExportModal({
  open,
  onClose,
  onExport,
  totalDuration,
}: {
  open: boolean
  onClose: () => void
  onExport: (resolution: string, format: string) => void
  totalDuration: number
}) {
  const [resolution, setResolution] = useState('1080p')
  const [format, setFormat] = useState('mp4')
  const [includeSubtitles, setIncludeSubtitles] = useState(true)
  const [includeDubbing, setIncludeDubbing] = useState(true)
  const [includeMusic, setIncludeMusic] = useState(true)

  const selectedResolution = EXPORT_RESOLUTIONS.find(r => r.value === resolution)
  const selectedFormat = EXPORT_FORMATS.find(f => f.value === format)

  // 估算文件大小
  const estimateFileSize = () => {
    const baseSize = totalDuration * 0.5 // MB/s
    const resolutionMultiplier = {
      '720p': 1,
      '1080p': 2,
      '2k': 4,
      '4k': 8,
    }[resolution] || 1

    return (baseSize * resolutionMultiplier).toFixed(1)
  }

  // 估算积分消耗
  const estimateCost = () => {
    const baseCost = 10
    const resolutionCost = {
      '720p': 10,
      '1080p': 20,
      '2k': 40,
      '4k': 80,
    }[resolution] || 10

    return baseCost + resolutionCost
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>导出视频</DialogTitle>
          <DialogDescription>
            选择导出参数，开始渲染最终视频
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 分辨率选择 */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">分辨率</h3>
            <div className="grid grid-cols-2 gap-3">
              {EXPORT_RESOLUTIONS.map((res) => (
                <button
                  key={res.value}
                  onClick={() => setResolution(res.value)}
                  className={cn(
                    'p-3 rounded-lg border-2 text-left transition-all',
                    resolution === res.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{res.label}</span>
                    {res.tag && (
                      <Badge variant="secondary" className="text-xs h-5">
                        {res.tag}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {res.width} x {res.height}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* 格式选择 */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">导出格式</h3>
            <div className="grid grid-cols-3 gap-3">
              {EXPORT_FORMATS.map((fmt) => (
                <button
                  key={fmt.value}
                  onClick={() => setFormat(fmt.value)}
                  className={cn(
                    'p-3 rounded-lg border-2 text-center transition-all',
                    format === fmt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="font-medium">{fmt.label}</div>
                  <div className="text-xs text-muted-foreground">{fmt.description}</div>
                </button>
              ))}
            </div>
          </section>

          {/* 包含内容 */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">包含内容</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileType className="h-4 w-4" />
                  <span className="text-sm">字幕</span>
                </div>
                <Switch
                  checked={includeSubtitles}
                  onCheckedChange={setIncludeSubtitles}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic2 className="h-4 w-4" />
                  <span className="text-sm">配音</span>
                </div>
                <Switch
                  checked={includeDubbing}
                  onCheckedChange={setIncludeDubbing}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  <span className="text-sm">背景音乐</span>
                </div>
                <Switch
                  checked={includeMusic}
                  onCheckedChange={setIncludeMusic}
                />
              </div>
            </div>
          </section>

          {/* 导出信息 */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">预计文件大小</span>
                <span className="font-medium">~{estimateFileSize()} MB</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">预计渲染时间</span>
                <span className="font-medium">~{Math.ceil(totalDuration * 2)} 秒</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-primary" />
                  <span className="font-medium">积分消耗</span>
                </div>
                <span className="font-bold text-primary">{estimateCost()}🪙</span>
              </div>
            </CardContent>
          </Card>

          {/* 提示信息 */}
          <div className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700">
              视频渲染将在后台进行，完成后会自动下载到您的设备，并通过站内信通知您。
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={() => onExport(resolution, format)}>
            <Download className="h-4 w-4 mr-2" />
            开始导出
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
