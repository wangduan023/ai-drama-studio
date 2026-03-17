'use client'

import { useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Play,
  Settings2,
  Coins,
  ArrowRight,
  Share2,
  Wand2,
  Film,
  Layers,
  ImagePlus,
  Clock,
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Copy,
  Trash2,
  Edit2,
  Zap,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { StepNavigation, PROJECT_STEPS } from '@/components/projects/StepNavigation'
import { TaskStatusBadge, type TaskStatus } from '@/components/projects/TaskStatusBadge'
import { PromptConfirmModal } from '@/components/projects/PromptConfirmModal'
import { useTaskQueue } from '@/hooks/useTaskQueue'
import { TaskType } from '@/lib/task-queue'
import { cn } from '@/lib/utils'

// 模拟分镜数据
const mockStoryboards = [
  {
    id: '1',
    sceneNumber: 1,
    script: '婚宴现场，灯光璀璨。梨月穿着白色婚纱，手捧花束，缓缓走向傅寒舟。',
    characters: ['梨月', '傅寒舟'],
    props: ['十克拉粉钻', '白色婚纱'],
    status: 'completed',
    imageUrl: '/mock/storyboard-1.jpg',
    videoStatus: null, // null, pending, generating, completed, failed
    videoUrl: null,
  },
  {
    id: '2',
    sceneNumber: 2,
    script: '南枝在化妆间照镜子，眼神复杂。她拿起红色高跟鞋，犹豫片刻后放下。',
    characters: ['南枝'],
    props: ['红色高跟鞋', '化妆台'],
    status: 'completed',
    imageUrl: '/mock/storyboard-2.jpg',
    videoStatus: 'completed',
    videoUrl: '/mock/video-2.mp4',
  },
  {
    id: '3',
    sceneNumber: 3,
    script: '傅烬野站在窗边，背对着镜头，手中把玩着打火机。火光明灭间，看不清表情。',
    characters: ['傅烬野'],
    props: ['打火机'],
    status: 'completed',
    imageUrl: '/mock/storyboard-3.jpg',
    videoStatus: null,
    videoUrl: null,
  },
  {
    id: '4',
    sceneNumber: 4,
    script: '镜头切换至宴会厅外，夜空繁星点点。远处传来婚礼进行曲的旋律。',
    characters: [],
    props: [],
    status: 'completed',
    imageUrl: '/mock/storyboard-4.jpg',
    videoStatus: null,
    videoUrl: null,
  },
]

// 视频生成模式
const VIDEO_MODES = [
  {
    value: 'image-to-video',
    label: '图生视频',
    description: '基于单张分镜图生成动态视频',
    icon: Film,
    badge: '推荐',
  },
  {
    value: 'multi-param',
    label: '多参生视频',
    description: '基于多张参考图生成复杂动作',
    icon: Layers,
    badge: null,
  },
  {
    value: 'frame-to-frame',
    label: '首尾帧视频',
    description: '指定首尾两帧，AI 生成中间过渡',
    icon: ImagePlus,
    badge: '创意',
  },
]

// 镜头运动选项
const CAMERA_MOTIONS = [
  { value: 'none', label: '无', description: '静态镜头' },
  { value: 'fixed', label: '固定', description: '镜头固定，主体运动' },
  { value: 'follow', label: '跟拍', description: '镜头跟随主体移动' },
  { value: 'orbit', label: '环绕', description: '镜头环绕主体旋转' },
  { value: 'zoom', label: '变焦', description: '推近或拉远镜头' },
  { value: 'pan-left', label: '左摇', description: '镜头水平向左摇动' },
  { value: 'pan-right', label: '右摇', description: '镜头水平向右摇动' },
  { value: 'tilt-up', label: '上摇', description: '镜头垂直向上摇动' },
  { value: 'tilt-down', label: '下摇', description: '镜头垂直向下摇动' },
]

// 特殊拍摄手法
const SPECIAL_EFFECTS = [
  { value: 'normal', label: '正常', description: '标准播放速度' },
  { value: 'slow-mo', label: '慢动作', description: '放慢播放速度，强调细节' },
  { value: 'fast-mo', label: '快动作', description: '加快播放速度，压缩时间' },
  { value: 'timelapse', label: '延时摄影', description: '长时间压缩为短时视频' },
  { value: 'hyperlapse', label: '移动延时', description: '移动中的延时摄影效果' },
  { value: 'bullet-time', label: '子弹时间', description: '超高速摄影凝固瞬间' },
]

// 视频模型选项
const VIDEO_MODELS = [
  {
    value: 'vidu-2',
    label: 'Vidu 2.0',
    price: '50🪙/秒',
    maxDuration: 10,
    tag: '效果最佳',
  },
  {
    value: 'vidu-1.5',
    label: 'Vidu 1.5',
    price: '30🪙/秒',
    maxDuration: 8,
    tag: null,
  },
  {
    value: 'kling-1.5',
    label: '可灵 1.5',
    price: '25🪙/秒',
    maxDuration: 5,
    tag: '性价比高',
  },
  {
    value: 'jimeng-video',
    label: '即梦视频',
    price: '20🪙/秒',
    maxDuration: 6,
    tag: null,
  },
]

// 画质选项
const QUALITY_OPTIONS = [
  { value: 'standard', label: '标准', resolution: '720P', description: '快速生成，适合预览' },
  { value: 'high', label: '高清', resolution: '1080P', description: '平衡质量与速度' },
  { value: 'ultra', label: '超清', resolution: '2K', description: '高质量输出' },
  { value: 'premium', label: '影院级', resolution: '4K', description: '最高质量，耗时最长' },
]

type VideoMode = 'image-to-video' | 'multi-param' | 'frame-to-frame'

interface StoryboardVideo {
  id: string
  sceneNumber: number
  script: string
  characters: string[]
  props: string[]
  status: string
  imageUrl: string | null
  videoStatus: string | null
  videoUrl: string | null
}

export default function StoryboardVideoPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const { submitTask } = useTaskQueue({ projectId, autoPoll: true })

  const [storyboards] = useState<StoryboardVideo[]>(mockStoryboards)
  const [selectedMode, setSelectedMode] = useState<VideoMode>('image-to-video')
  const [selectedStoryboardIds, setSelectedStoryboardIds] = useState<string[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // Pending action for modal
  const [pendingAction, setPendingAction] = useState<{
    targetIds?: string[]
    prompt?: string
    cost?: number
    count?: number
    parameters?: Record<string, string | number>
  } | null>(null)

  // 视频生成设置
  const [videoSettings, setVideoSettings] = useState({
    model: 'vidu-1.5',
    duration: 5,
    quantity: 1,
    quality: 'high',
    cameraMotion: 'none',
    specialEffect: 'normal',
  })

  // 处理分镜选择
  const toggleStoryboardSelection = (id: string) => {
    setSelectedStoryboardIds(prev =>
      prev.includes(id)
        ? prev.filter(sid => sid !== id)
        : [...prev, id]
    )
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedStoryboardIds.length === storyboards.length) {
      setSelectedStoryboardIds([])
    } else {
      setSelectedStoryboardIds(storyboards.map(sb => sb.id))
    }
  }

  // 处理单个分镜生成视频
  const handleGenerateVideo = (storyboardId: string) => {
    const storyboard = storyboards.find(sb => sb.id === storyboardId)
    if (!storyboard) return

    const model = VIDEO_MODELS.find(m => m.value === videoSettings.model)
    const totalCost = Math.round(
      parseInt(model?.price || '50')
      * videoSettings.duration
      * videoSettings.quantity
    )

    setPendingAction({
      targetIds: [storyboardId],
      prompt: `为分镜 ${storyboard.sceneNumber} 生成视频`,
      cost: totalCost,
      parameters: {
        '模型': model?.label || videoSettings.model,
        '时长': `${videoSettings.duration} 秒`,
        '画质': QUALITY_OPTIONS.find(q => q.value === videoSettings.quality)?.label || '',
        '镜头运动': CAMERA_MOTIONS.find(m => m.value === videoSettings.cameraMotion)?.label || '',
      },
    })
    setShowConfirmModal(true)
  }

  // 批量生成视频
  const handleBatchGenerate = () => {
    if (selectedStoryboardIds.length === 0) {
      toast.warning('请选择至少一个分镜')
      return
    }

    const model = VIDEO_MODELS.find(m => m.value === videoSettings.model)
    const totalCost = Math.round(
      parseInt(model?.price || '50')
      * videoSettings.duration
      * videoSettings.quantity
      * selectedStoryboardIds.length
    )

    setPendingAction({
      targetIds: selectedStoryboardIds,
      prompt: `为 ${selectedStoryboardIds.length} 个分镜生成视频`,
      cost: totalCost,
      count: selectedStoryboardIds.length,
      parameters: {
        '模型': model?.label || videoSettings.model,
        '时长': `${videoSettings.duration} 秒`,
        '画质': QUALITY_OPTIONS.find(q => q.value === videoSettings.quality)?.label || '',
        '镜头运动': CAMERA_MOTIONS.find(m => m.value === videoSettings.cameraMotion)?.label || '',
      },
    })
    setShowConfirmModal(true)
  }

  // 确认生成
  const confirmGenerate = () => {
    setShowConfirmModal(false)
    setShowSettings(false)

    const taskPayload = {
      storyboardIds: pendingAction?.targetIds || selectedStoryboardIds,
      settings: videoSettings,
      mode: selectedMode,
    }

    submitTask({
      type: TaskType.GENERATE_VIDEO,
      payload: taskPayload,
      priority: 'medium',
    })
  }

  // 预览视频
  const handlePreviewVideo = (storyboardId: string) => {
    const storyboard = storyboards.find(sb => sb.id === storyboardId)
    if (storyboard?.videoUrl) {
      toast.info(`预览视频：分镜 ${storyboard.sceneNumber}`)
      // 实际实现会打开视频预览弹窗
    }
  }

  // 重新生成
  const handleRegenerate = (storyboardId: string) => {
    const storyboard = storyboards.find(sb => sb.id === storyboardId)
    if (!storyboard) return

    const model = VIDEO_MODELS.find(m => m.value === videoSettings.model)
    const totalCost = Math.round(
      parseInt(model?.price || '50')
      * videoSettings.duration
      * videoSettings.quantity
    )

    setPendingAction({
      targetIds: [storyboardId],
      prompt: `重新生成：分镜 ${storyboard.sceneNumber}`,
      cost: totalCost,
      parameters: {
        '模型': model?.label || videoSettings.model,
        '时长': `${videoSettings.duration} 秒`,
        '画质': QUALITY_OPTIONS.find(q => q.value === videoSettings.quality)?.label || '',
        '镜头运动': CAMERA_MOTIONS.find(m => m.value === videoSettings.cameraMotion)?.label || '',
      },
    })
    setShowConfirmModal(true)
  }

  // 下一步
  const handleNext = () => {
    const completedVideos = storyboards.filter(sb => sb.videoStatus === 'completed')
    if (completedVideos.length === 0) {
      toast.warning('请至少生成一个分镜视频')
      return
    }

    toast.success('分镜视频已保存')
    router.push(`/projects/${projectId}/workflow/dubbing-lipsync`)
  }

  // 统计信息
  const completedCount = storyboards.filter(sb => sb.videoStatus === 'completed').length
  const generatingCount = storyboards.filter(sb => sb.videoStatus === 'generating').length
  const pendingCount = storyboards.length - completedCount - generatingCount

  return (
    <div className="flex h-screen bg-background">
      {/* 左侧步骤导航 */}
      <StepNavigation
        steps={PROJECT_STEPS}
        currentStep={4}
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
                onClick={handleNext}
                className="ml-4"
                disabled={completedCount === 0}
              >
                下一步：配音对口型
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </header>

        {/* 内容区 */}
        <main className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* 页面标题和操作 */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">分镜视频生成</h1>
                <p className="text-sm text-muted-foreground">
                  为分镜生成动态视频，支持多种创作模式和镜头运动
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSettings(true)}
                  disabled={selectedStoryboardIds.length === 0}
                >
                  <Settings2 className="h-4 w-4 mr-2" />
                  批量生成设置
                </Button>
                <Button
                  onClick={handleBatchGenerate}
                  disabled={selectedStoryboardIds.length === 0}
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  批量生成视频
                </Button>
              </div>
            </div>

            {/* 统计信息 */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{completedCount}</p>
                    <p className="text-sm text-muted-foreground">已完成</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{generatingCount}</p>
                    <p className="text-sm text-muted-foreground">生成中</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{pendingCount}</p>
                    <p className="text-sm text-muted-foreground">待生成</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 视频生成模式选择 */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold">选择生成模式</h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>图生视频：基于单张分镜图生成动态视频</p>
                      <p>多参生视频：基于多张参考图生成复杂动作</p>
                      <p>首尾帧视频：指定首尾两帧，AI 生成中间过渡</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {VIDEO_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setSelectedMode(mode.value as VideoMode)}
                    className={cn(
                      'relative p-4 rounded-lg border-2 transition-all text-left hover:border-primary/50',
                      selectedMode === mode.value
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        selectedMode === mode.value
                          ? 'bg-primary/20'
                          : 'bg-muted'
                      )}>
                        <mode.icon className={cn(
                          'h-5 w-5',
                          selectedMode === mode.value
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        )} />
                      </div>
                      {mode.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {mode.badge}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold mb-1">{mode.label}</h3>
                    <p className="text-sm text-muted-foreground">{mode.description}</p>
                    {selectedMode === mode.value && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* 分镜列表 */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">
                    分镜列表
                  </h2>
                  <Badge variant="outline" className="text-xs">
                    {selectedStoryboardIds.length} / {storyboards.length} 已选
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSelectAll}
                  >
                    {selectedStoryboardIds.length === storyboards.length
                      ? '取消全选'
                      : '全选'}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {storyboards.map((storyboard) => (
                  <StoryboardVideoCard
                    key={storyboard.id}
                    storyboard={storyboard}
                    isSelected={selectedStoryboardIds.includes(storyboard.id)}
                    onSelect={() => toggleStoryboardSelection(storyboard.id)}
                    onGenerate={() => handleGenerateVideo(storyboard.id)}
                    onPreview={() => handlePreviewVideo(storyboard.id)}
                    onRegenerate={() => handleRegenerate(storyboard.id)}
                    selectedMode={selectedMode}
                  />
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* 批量生成设置弹窗 */}
      {showSettings && (
        <VideoSettingsModal
          open={showSettings}
          onClose={() => setShowSettings(false)}
          settings={videoSettings}
          onSettingsChange={setVideoSettings}
          onConfirm={() => setShowConfirmModal(true)}
        />
      )}

      {/* 确认生成弹窗 */}
      {showConfirmModal && pendingAction && (
        <PromptConfirmModal
          open={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false)
            setPendingAction(null)
          }}
          onConfirm={confirmGenerate}
          title="确认生成视频"
          description={pendingAction.count ? `将为 ${pendingAction.count} 个分镜生成视频` : '将为选中的分镜生成视频'}
          prompt={pendingAction.prompt || ''}
          cost={pendingAction.cost}
          count={pendingAction.count}
          parameters={pendingAction.parameters}
        />
      )}
    </div>
  )
}

// 分镜视频卡片组件
function StoryboardVideoCard({
  storyboard,
  isSelected,
  onSelect,
  onGenerate,
  onPreview,
  onRegenerate,
  selectedMode,
}: {
  storyboard: StoryboardVideo
  isSelected: boolean
  onSelect: () => void
  onGenerate: () => void
  onPreview: () => void
  onRegenerate: () => void
  selectedMode: VideoMode
}) {
  return (
    <Card className={cn(
      'transition-all',
      isSelected && 'ring-2 ring-primary ring-offset-2'
    )}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* 头部：选择器和状态 */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onSelect}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    分镜 {storyboard.sceneNumber}
                  </Badge>
                  <TaskStatusBadge status={storyboard.videoStatus as TaskStatus || 'pending'} />
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {storyboard.script}
                </p>
                {(storyboard.characters.length > 0 || storyboard.props.length > 0) && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {storyboard.characters.map(char => (
                      <Badge key={char} variant="secondary" className="text-xs">
                        👤 {char}
                      </Badge>
                    ))}
                    {storyboard.props.map(prop => (
                      <Badge key={prop} variant="outline" className="text-xs">
                        🎭 {prop}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 分镜图和视频预览 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 分镜图 */}
            <div className="space-y-2">
              <div className="text-sm font-medium">分镜图</div>
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                {storyboard.imageUrl ? (
                  <img
                    src={storyboard.imageUrl}
                    alt={`分镜 ${storyboard.sceneNumber}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImagePlus className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* 视频预览 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">视频</span>
                <Badge variant="outline" className="text-xs">
                  {selectedMode === 'image-to-video' && '图生视频'}
                  {selectedMode === 'multi-param' && '多参生视频'}
                  {selectedMode === 'frame-to-frame' && '首尾帧视频'}
                </Badge>
              </div>
              <div className="aspect-video bg-muted rounded-lg overflow-hidden border-2 border-dashed">
                {storyboard.videoStatus === 'completed' && storyboard.videoUrl ? (
                  <div className="relative w-full h-full">
                    <video
                      src={storyboard.videoUrl}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => e.currentTarget.pause()}
                    />
                    <button
                      onClick={onPreview}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <Play className="h-8 w-8 text-white" />
                    </button>
                  </div>
                ) : storyboard.videoStatus === 'generating' ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="h-8 w-8 text-primary mx-auto mb-2 animate-spin" />
                      <p className="text-sm text-muted-foreground">生成中...</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center p-4">
                      <Film className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <Button onClick={onGenerate} size="sm" className="mt-2">
                        <Zap className="h-4 w-4 mr-1" />
                        生成视频
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 快捷操作 */}
          {storyboard.videoStatus === 'completed' && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={onRegenerate}>
                重新生成
              </Button>
              <Button variant="outline" size="sm">
                <Sparkles className="h-4 w-4 mr-1" />
                智能优化
              </Button>
              <Button variant="outline" size="sm">
                <Clock className="h-4 w-4 mr-1" />
                调整时长
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// 视频设置弹窗组件
function VideoSettingsModal({
  open,
  onClose,
  settings,
  onSettingsChange,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  settings: {
    model: string
    duration: number
    quantity: number
    quality: string
    cameraMotion: string
    specialEffect: string
  }
  onSettingsChange: (settings: any) => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold">批量生成设置</h2>
            <p className="text-sm text-muted-foreground mt-1">
              配置视频生成参数，将应用于所有选中的分镜
            </p>
          </div>

          {/* 视频模型 */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">视频模型</h3>
            <div className="grid grid-cols-2 gap-3">
              {VIDEO_MODELS.map((model) => (
                <button
                  key={model.value}
                  onClick={() => onSettingsChange({ ...settings, model: model.value })}
                  className={cn(
                    'p-3 rounded-lg border-2 text-left transition-all',
                    settings.model === model.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{model.label}</span>
                    {model.tag && (
                      <Badge variant="secondary" className="text-xs h-5">
                        {model.tag}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{model.price}</span>
                    <span className="text-xs text-muted-foreground">最长{model.maxDuration}秒</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* 时长和数量 */}
          <section className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">视频时长 (秒)</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSettingsChange({ ...settings, duration: Math.max(1, settings.duration - 1) })}
                >
                  -
                </Button>
                <input
                  type="number"
                  value={settings.duration}
                  onChange={(e) => onSettingsChange({ ...settings, duration: parseInt(e.target.value) || 1 })}
                  className="w-full h-10 text-center border rounded-md"
                  min={1}
                  max={10}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSettingsChange({ ...settings, duration: Math.min(10, settings.duration + 1) })}
                >
                  +
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                当前模型最长支持 {VIDEO_MODELS.find(m => m.value === settings.model)?.maxDuration || 10} 秒
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">生成数量</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSettingsChange({ ...settings, quantity: Math.max(1, settings.quantity - 1) })}
                >
                  -
                </Button>
                <input
                  type="number"
                  value={settings.quantity}
                  onChange={(e) => onSettingsChange({ ...settings, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full h-10 text-center border rounded-md"
                  min={1}
                  max={4}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSettingsChange({ ...settings, quantity: Math.min(4, settings.quantity + 1) })}
                >
                  +
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                每个分镜生成 {settings.quantity} 个版本供选择
              </p>
            </div>
          </section>

          {/* 画质选项 */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">输出画质</h3>
            <div className="grid grid-cols-4 gap-3">
              {QUALITY_OPTIONS.map((quality) => (
                <button
                  key={quality.value}
                  onClick={() => onSettingsChange({ ...settings, quality: quality.value })}
                  className={cn(
                    'p-3 rounded-lg border-2 text-center transition-all',
                    settings.quality === quality.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="font-medium text-sm">{quality.label}</div>
                  <div className="text-xs text-muted-foreground">{quality.resolution}</div>
                </button>
              ))}
            </div>
          </section>

          {/* 镜头运动 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">镜头运动</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>选择镜头的运动方式，为视频增加动态效果</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {CAMERA_MOTIONS.map((motion) => (
                <button
                  key={motion.value}
                  onClick={() => onSettingsChange({ ...settings, cameraMotion: motion.value })}
                  className={cn(
                    'p-2 rounded-lg border text-left text-sm transition-all',
                    settings.cameraMotion === motion.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="font-medium">{motion.label}</div>
                  <div className="text-xs text-muted-foreground">{motion.description}</div>
                </button>
              ))}
            </div>
          </section>

          {/* 特殊效果 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">特殊拍摄手法</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>添加特殊效果，如慢动作、延时摄影等</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {SPECIAL_EFFECTS.map((effect) => (
                <button
                  key={effect.value}
                  onClick={() => onSettingsChange({ ...settings, specialEffect: effect.value })}
                  className={cn(
                    'p-2 rounded-lg border text-left text-sm transition-all',
                    settings.specialEffect === effect.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="font-medium">{effect.label}</div>
                  <div className="text-xs text-muted-foreground">{effect.description}</div>
                </button>
              ))}
            </div>
          </section>

          {/* 费用估算 */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  <span className="font-medium">费用估算</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">
                    ~{Math.round(
                      parseInt(VIDEO_MODELS.find(m => m.value === settings.model)?.price || '50')
                      * settings.duration
                      * settings.quantity
                    )}🪙 / 分镜
                  </div>
                  <div className="text-xs text-muted-foreground">
                    实际费用以生成结果为准
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={onConfirm}>
            <Wand2 className="h-4 w-4 mr-2" />
            确认生成
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

