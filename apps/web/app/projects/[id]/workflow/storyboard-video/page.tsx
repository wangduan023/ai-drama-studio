'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Play,
  Coins,
  Wand2,
  Film,
  Layers,
  ImagePlus,
  Clock,
  Sparkles,
  Loader2,
  Copy,
  Trash2,
  Edit2,
  Zap,
  Info,
  ChevronRight,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
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
    assets?: {
      characters?: string[]
      props?: string[]
    }
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

  // 镜头运动选择弹窗
  const [showCameraMotionSelector, setShowCameraMotionSelector] = useState(false)
  // 特殊拍摄手法弹窗
  const [showSpecialEffectSelector, setShowSpecialEffectSelector] = useState(false)
  // 画面描述
  const [promptDescription, setPromptDescription] = useState('')
  // 当前选中的分镜
  const [currentStoryboardId, setCurrentStoryboardId] = useState<string | null>(null)

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
      assets: {
        characters: storyboard.characters,
        props: storyboard.props,
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

    // 收集所有引用的资产
    const allCharacters = new Set<string>()
    const allProps = new Set<string>()
    selectedStoryboardIds.forEach(id => {
      const storyboard = storyboards.find(sb => sb.id === id)
      if (storyboard) {
        storyboard.characters.forEach(c => allCharacters.add(c))
        storyboard.props.forEach(p => allProps.add(p))
      }
    })

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
      assets: {
        characters: Array.from(allCharacters),
        props: Array.from(allProps),
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
      assets: {
        characters: storyboard.characters,
        props: storyboard.props,
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
          <div className="px-6 py-4">
            {/* 分镜导航栏（横向滚动） */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {storyboards.map((storyboard) => (
                <button
                  key={storyboard.id}
                  onClick={() => setCurrentStoryboardId(storyboard.id)}
                  className={cn(
                    'flex-shrink-0 p-3 rounded-lg border-2 transition-all min-w-[120px]',
                    currentStoryboardId === storyboard.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="text-sm font-medium mb-1">分镜{storyboard.sceneNumber}</div>
                  <div className="text-xs text-muted-foreground">
                    {storyboard.videoStatus === 'completed' ? (
                      <span className="text-green-500">已完成</span>
                    ) : storyboard.videoStatus === 'generating' ? (
                      <span className="text-blue-500">生成中</span>
                    ) : (
                      <span className="text-amber-500">未设置</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* 内容区 */}
        <main className="p-6">
          <div className="max-w-5xl mx-auto">
            {/* 视频生成模式选择 */}
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Film className="h-5 w-5" />
                <h2 className="text-lg font-semibold">视频生成模式</h2>
              </div>
              <div className="flex items-center gap-2">
                {VIDEO_MODES.map((mode) => (
                  <Button
                    key={mode.value}
                    variant={selectedMode === mode.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedMode(mode.value as VideoMode)}
                    className="relative"
                  >
                    <mode.icon className="h-4 w-4 mr-2" />
                    {mode.label}
                    {mode.badge && (
                      <Badge variant="secondary" className="ml-2 text-xs h-5">
                        {mode.badge}
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </section>

            {/* 左侧资产区和生成面板 */}
            <Card className="mb-6">
              <CardContent className="p-4 space-y-4">
                {/* @分镜脚本引用 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">@分镜脚本 1：分镜 1-1</Badge>
                    <Button variant="ghost" size="sm" className="h-6 text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      生成提示词
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-muted-foreground">九宫格多机位</label>
                    <input type="checkbox" className="h-4 w-4" />
                  </div>
                </div>

                {/* 分镜图预览 */}
                <div className="aspect-video bg-muted rounded-lg overflow-hidden border-2 border-dashed flex items-center justify-center">
                  <div className="text-center">
                    <Film className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">分镜图预览区域</p>
                    <p className="text-xs text-muted-foreground mt-1">记者蹲姿偷拍场景</p>
                  </div>
                </div>

                {/* 镜头运动选择 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">镜头运动</label>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => setShowCameraMotionSelector(true)}
                  >
                    <span>请选择镜头运动</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  {videoSettings.cameraMotion !== 'none' && (
                    <Badge variant="secondary" className="text-xs">
                      当前：{CAMERA_MOTIONS.find(m => m.value === videoSettings.cameraMotion)?.label}
                    </Badge>
                  )}
                </div>

                {/* 镜头运动描述 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">请输入镜头运动描述（可选）</label>
                  <Textarea
                    placeholder="可补充具体运动细节，如：镜头缓慢推进，聚焦于主角面部..."
                    className="min-h-[80px]"
                  />
                </div>

                {/* 特殊拍摄手法 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">特殊拍摄手法</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setShowSpecialEffectSelector(true)}
                    >
                      展开 <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => setShowSpecialEffectSelector(true)}
                  >
                    <span>请选择特殊拍摄手法</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  {videoSettings.specialEffect !== 'normal' && (
                    <Badge variant="secondary" className="text-xs">
                      当前：{SPECIAL_EFFECTS.find(e => e.value === videoSettings.specialEffect)?.label}
                    </Badge>
                  )}
                </div>

                {/* 画面描述 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">描述你想要生成的画面内容和动作：</label>
                  <div className="relative">
                    <Textarea
                      placeholder="如：一个穿着红色裙子的小女孩在草地上奔跑"
                      value={promptDescription}
                      onChange={(e) => setPromptDescription(e.target.value)}
                      className="min-h-[100px] pr-10"
                    />
                    <div className="absolute bottom-2 right-2 flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        {promptDescription.length}/3000
                      </span>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 参数配置 */}
                <div className="grid grid-cols-4 gap-2">
                  <Button variant="outline" className="justify-start">
                    <Film className="h-4 w-4 mr-2" />
                    {VIDEO_MODELS.find(m => m.value === videoSettings.model)?.label || 'Vidu Q2-Turbo'}
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Clock className="h-4 w-4 mr-2" />
                    {videoSettings.duration}s
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Layers className="h-4 w-4 mr-2" />
                    {videoSettings.quantity}个
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Zap className="h-4 w-4 mr-2" />
                    {QUALITY_OPTIONS.find(q => q.value === videoSettings.quality)?.label || '高品质'}
                  </Button>
                </div>

                {/* 生成按钮 */}
                <Button className="w-full" onClick={() => handleGenerateVideo(currentStoryboardId || storyboards[0]?.id)}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  开始生成视频  消耗 🪙 {Math.round(parseInt(VIDEO_MODELS.find(m => m.value === videoSettings.model)?.price || '50') * videoSettings.duration)}
                </Button>
              </CardContent>
            </Card>
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
          assets={pendingAction.assets}
        />
      )}

      {/* 镜头运动选择弹窗 */}
      {showCameraMotionSelector && (
        <CameraMotionSelector
          open={showCameraMotionSelector}
          onClose={() => setShowCameraMotionSelector(false)}
          selectedMotion={videoSettings.cameraMotion}
          onSelectMotion={(motion) => {
            setVideoSettings({ ...videoSettings, cameraMotion: motion })
            setShowCameraMotionSelector(false)
          }}
        />
      )}

      {/* 特殊拍摄手法弹窗 */}
      {showSpecialEffectSelector && (
        <SpecialEffectSelector
          open={showSpecialEffectSelector}
          onClose={() => setShowSpecialEffectSelector(false)}
          selectedEffect={videoSettings.specialEffect}
          onSelectEffect={(effect) => {
            setVideoSettings({ ...videoSettings, specialEffect: effect })
            setShowSpecialEffectSelector(false)
          }}
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

// 镜头运动选择弹窗
function CameraMotionSelector({
  open,
  onClose,
  selectedMotion,
  onSelectMotion,
}: {
  open: boolean
  onClose: () => void
  selectedMotion: string
  onSelectMotion: (motion: string) => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="p-6 space-y-4">
          {/* 头部 */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">镜头运动</h2>
              <p className="text-sm text-muted-foreground mt-1">
                选择镜头的运动方式，为视频增加动态效果
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* 镜头运动选项 */}
          <div className="grid grid-cols-2 gap-3">
            {CAMERA_MOTIONS.map((motion) => (
              <button
                key={motion.value}
                onClick={() => onSelectMotion(motion.value)}
                className={cn(
                  'p-4 rounded-lg border-2 text-left transition-all',
                  selectedMotion === motion.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    'w-3 h-3 rounded-full border-2',
                    selectedMotion === motion.value
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground'
                  )} />
                  <span className="font-medium text-sm">{motion.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{motion.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

// 特殊拍摄手法弹窗
function SpecialEffectSelector({
  open,
  onClose,
  selectedEffect,
  onSelectEffect,
}: {
  open: boolean
  onClose: () => void
  selectedEffect: string
  onSelectEffect: (effect: string) => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="p-6 space-y-4">
          {/* 头部 */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">特殊拍摄手法</h2>
              <p className="text-sm text-muted-foreground mt-1">
                添加特殊效果，如慢动作、延时摄影等
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* 特殊效果选项 */}
          <div className="grid grid-cols-2 gap-3">
            {SPECIAL_EFFECTS.map((effect) => (
              <button
                key={effect.value}
                onClick={() => onSelectEffect(effect.value)}
                className={cn(
                  'p-4 rounded-lg border-2 text-left transition-all',
                  selectedEffect === effect.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    'w-3 h-3 rounded-full border-2',
                    selectedEffect === effect.value
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground'
                  )} />
                  <span className="font-medium text-sm">{effect.label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{effect.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

