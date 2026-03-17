'use client'

import { useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Mic2,
  Wand2,
  Settings2,
  Coins,
  ArrowRight,
  Share2,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Copy,
  Trash2,
  Edit2,
  Plus,
  Download,
  Upload,
  Info,
  Sparkles,
  Clock,
  Zap,
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
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { StepNavigation, PROJECT_STEPS } from '@/components/projects/StepNavigation'
import { TaskStatusBadge, type TaskStatus } from '@/components/projects/TaskStatusBadge'
import { PromptConfirmModal } from '@/components/projects/PromptConfirmModal'
import { useTaskQueue } from '@/hooks/useTaskQueue'
import { TaskType } from '@/lib/task-queue'
import { cn } from '@/lib/utils'

// 模拟分镜数据（带台词）
const mockStoryboards = [
  {
    id: '1',
    sceneNumber: 1,
    script: '婚宴现场，灯光璀璨。梨月穿着白色婚纱，手捧花束，缓缓走向傅寒舟。',
    dialogue: [
      { id: 'd1', character: '司仪', text: '现在，请新娘新郎交换戒指！', characterId: 'c1' },
      { id: 'd2', character: '梨月', text: '（轻声）我愿意。', characterId: 'c2' },
    ],
    status: 'completed',
    videoStatus: 'completed',
    videoUrl: '/mock/video-1.mp4',
    dubbingStatus: null, // null, pending, generating, completed, failed
    dubbingUrl: null,
    lipsyncStatus: null,
    lipsyncUrl: null,
  },
  {
    id: '2',
    sceneNumber: 2,
    script: '南枝在化妆间照镜子，眼神复杂。她拿起红色高跟鞋，犹豫片刻后放下。',
    dialogue: [
      { id: 'd3', character: '南枝', text: '为什么...不是我？', characterId: 'c3' },
      { id: 'd4', character: '助理', text: '南枝姐，该您上场了。', characterId: 'c4' },
      { id: 'd5', character: '南枝', text: '知道了。', characterId: 'c3' },
    ],
    status: 'completed',
    videoStatus: 'completed',
    videoUrl: '/mock/video-2.mp4',
    dubbingStatus: 'completed',
    dubbingUrl: '/mock/dubbing-2.mp3',
    lipsyncStatus: 'completed',
    lipsyncUrl: '/mock/lipsync-2.mp4',
  },
  {
    id: '3',
    sceneNumber: 3,
    script: '傅烬野站在窗边，背对着镜头，手中把玩着打火机。火光明灭间，看不清表情。',
    dialogue: [
      { id: 'd6', character: '傅烬野', text: '（自言自语）这场戏，才刚刚开始...', characterId: 'c5' },
    ],
    status: 'completed',
    videoStatus: 'completed',
    videoUrl: '/mock/video-3.mp4',
    dubbingStatus: null,
    dubbingUrl: null,
    lipsyncStatus: null,
    lipsyncUrl: null,
  },
  {
    id: '4',
    sceneNumber: 4,
    script: '镜头切换至宴会厅外，夜空繁星点点。远处传来婚礼进行曲的旋律。',
    dialogue: [],
    status: 'completed',
    videoStatus: 'completed',
    videoUrl: '/mock/video-4.mp4',
    dubbingStatus: null,
    dubbingUrl: null,
    lipsyncStatus: null,
    lipsyncUrl: null,
  },
]

// 角色数据
const mockCharacters = [
  { id: 'c1', name: '司仪', role: '配角', voiceId: null },
  { id: 'c2', name: '梨月', role: '女主角', voiceId: null },
  { id: 'c3', name: '南枝', role: '女配角', voiceId: null },
  { id: 'c4', name: '助理', role: '配角', voiceId: null },
  { id: 'c5', name: '傅烬野', role: '男配角', voiceId: null },
  { id: 'c6', name: '傅寒舟', role: '男主角', voiceId: null },
]

// 音色选项
const VOICE_PRESETS = [
  // 女声
  { id: 'v1', name: '温柔女声', gender: 'female', style: '温柔', age: '青年', sample: '/samples/voice1.mp3' },
  { id: 'v2', name: '甜美少女', gender: 'female', style: '甜美', age: '少女', sample: '/samples/voice2.mp3' },
  { id: 'v3', name: '知性女声', gender: 'female', style: '知性', age: '成熟', sample: '/samples/voice3.mp3' },
  { id: 'v4', name: '高冷御姐', gender: 'female', style: '高冷', age: '成熟', sample: '/samples/voice4.mp3' },
  // 男声
  { id: 'v5', name: '磁性男声', gender: 'male', style: '磁性', age: '青年', sample: '/samples/voice5.mp3' },
  { id: 'v6', name: '阳光少年', gender: 'male', style: '阳光', age: '少年', sample: '/samples/voice6.mp3' },
  { id: 'v7', name: '沉稳大叔', gender: 'male', style: '沉稳', age: '中年', sample: '/samples/voice7.mp3' },
  { id: 'v8', name: '霸气总裁', gender: 'male', style: '霸气', age: '青年', sample: '/samples/voice8.mp3' },
]

// 情绪选项
const EMOTION_OPTIONS = [
  { value: 'normal', label: '平静', icon: '😐' },
  { value: 'happy', label: '开心', icon: '😊' },
  { value: 'sad', label: '悲伤', icon: '😢' },
  { value: 'angry', label: '愤怒', icon: '😠' },
  { value: 'surprised', label: '惊讶', icon: '😲' },
  { value: 'fearful', label: '恐惧', icon: '😨' },
  { value: 'disgusted', label: '厌恶', icon: '🤢' },
  { value: 'romantic', label: '深情', icon: '😍' },
]

// TTS 模型选项
const TTS_MODELS = [
  { value: 'azure-tts', label: 'Azure TTS', price: '5🪙/百字', tag: '效果自然' },
  { value: 'google-tts', label: 'Google TTS', price: '3🪙/百字', tag: '性价比高' },
  { value: 'elevenlabs', label: 'ElevenLabs', price: '10🪙/百字', tag: '最逼真' },
  { value: 'xtts', label: 'XTTS', price: '2🪙/百字', tag: null },
]

interface Storyboard {
  id: string
  sceneNumber: number
  script: string
  dialogue: { id: string; character: string; text: string; characterId: string }[]
  status: string
  videoStatus: string | null
  videoUrl: string | null
  dubbingStatus: string | null
  dubbingUrl: string | null
  lipsyncStatus: string | null
  lipsyncUrl: string | null
}

interface Character {
  id: string
  name: string
  role: string
  voiceId: string | null
}

export default function DubbingLipsyncPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const { submitTask } = useTaskQueue({ projectId, autoPoll: true })

  const [storyboards] = useState<Storyboard[]>(mockStoryboards)
  const [characters, setCharacters] = useState<Character[]>(mockCharacters)
  const [activeTab, setActiveTab] = useState<'dubbing' | 'lipsync'>('dubbing')
  const [selectedStoryboardId, setSelectedStoryboardId] = useState<string | null>(null)
  const [showVoiceAssignModal, setShowVoiceAssignModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [playingDialogueId, setPlayingDialogueId] = useState<string | null>(null)

  // Pending action for modal
  const [pendingAction, setPendingAction] = useState<{
    type: 'dubbing' | 'lipsync'
    targetId?: string
    prompt?: string
    cost?: number
    count?: number
  } | null>(null)

  // 配音设置
  const [dubbingSettings, setDubbingSettings] = useState({
    model: 'azure-tts',
    defaultSpeed: 1.0,
    defaultVolume: 1.0,
    addBackgroundMusic: false,
    backgroundMusicVolume: 0.3,
  })

  // 处理角色音色分配
  const handleAssignVoice = (characterId: string, voiceId: string) => {
    setCharacters(prev =>
      prev.map(c => c.id === characterId ? { ...c, voiceId } : c)
    )
  }

  // 试听音色
  const handlePreviewVoice = (voiceId: string) => {
    const voice = VOICE_PRESETS.find(v => v.id === voiceId)
    if (voice) {
      toast.info(`试听：${voice.name}`)
      // 实际实现会播放音频
    }
  }

  // 播放台词试听
  const handlePlayDialogue = (dialogueId: string) => {
    if (playingDialogueId === dialogueId) {
      setPlayingDialogueId(null)
    } else {
      setPlayingDialogueId(dialogueId)
      toast.info('播放台词配音')
      // 模拟播放完成
      setTimeout(() => setPlayingDialogueId(null), 3000)
    }
  }

  // 生成单个分镜配音
  const handleGenerateDubbing = (storyboardId: string) => {
    const storyboard = storyboards.find(sb => sb.id === storyboardId)
    if (!storyboard) return

    if (storyboard.dialogue.length === 0) {
      toast.warning('该分镜没有台词')
      return
    }

    // 检查是否所有角色都已分配音色
    const characterIds = [...new Set(storyboard.dialogue.map(d => d.characterId))]
    const unassignedCharacters = characterIds.filter(
      cid => !characters.find(c => c.id === cid)?.voiceId
    )

    if (unassignedCharacters.length > 0) {
      toast.warning('请先为所有角色分配音色')
      setShowVoiceAssignModal(true)
      return
    }

    setPendingAction({
      type: 'dubbing',
      targetId: storyboardId,
      prompt: `为分镜 ${storyboard.sceneNumber} 生成配音`,
      cost: 5 * storyboard.dialogue.length,
    })
    setShowConfirmModal(true)
  }

  // 批量生成配音
  const handleBatchGenerateDubbing = () => {
    const storyboardsWithDialogue = storyboards.filter(sb => sb.dialogue.length > 0)
    if (storyboardsWithDialogue.length === 0) {
      toast.warning('没有可生成配音的分镜')
      return
    }

    // 检查音色分配
    const allCharacterIds = new Set<string>()
    storyboardsWithDialogue.forEach(sb => {
      sb.dialogue.forEach(d => allCharacterIds.add(d.characterId))
    })

    const unassignedCharacters = [...allCharacterIds].filter(
      cid => !characters.find(c => c.id === cid)?.voiceId
    )

    if (unassignedCharacters.length > 0) {
      toast.warning('请先为所有角色分配音色')
      setShowVoiceAssignModal(true)
      return
    }

    const totalCost = storyboardsWithDialogue.reduce((acc, sb) => acc + 5 * sb.dialogue.length, 0)

    setPendingAction({
      type: 'dubbing',
      prompt: `为 ${storyboardsWithDialogue.length} 个分镜生成配音`,
      cost: totalCost,
      count: storyboardsWithDialogue.length,
    })
    setShowConfirmModal(true)
  }

  // 确认生成配音
  const confirmGenerateDubbing = () => {
    setShowConfirmModal(false)
    setShowSettingsModal(false)

    const taskPayload = {
      characters: characters.filter(c => c.voiceId),
      settings: dubbingSettings,
      storyboardIds: pendingAction?.targetId
        ? [pendingAction.targetId]
        : storyboards.filter(sb => sb.dialogue.length > 0).map(sb => sb.id),
    }

    submitTask({
      type: TaskType.GENERATE_DUBBING,
      payload: taskPayload,
      priority: 'medium',
    })
  }

  // 生成对口型
  const handleGenerateLipsync = (storyboardId: string) => {
    const storyboard = storyboards.find(sb => sb.id === storyboardId)
    if (!storyboard) return

    if (storyboard.dubbingStatus !== 'completed') {
      toast.warning('请先生成配音')
      return
    }

    setPendingAction({
      type: 'lipsync',
      targetId: storyboardId,
      prompt: `为分镜 ${storyboard.sceneNumber} 生成对口型`,
      cost: 10,
    })
    setShowConfirmModal(true)
  }

  // 批量生成对口型
  const handleBatchGenerateLipsync = () => {
    const completedDubbing = storyboards.filter(
      sb => sb.dubbingStatus === 'completed' && sb.dubbingUrl
    )
    if (completedDubbing.length === 0) {
      toast.warning('没有已完成的配音')
      return
    }

    setPendingAction({
      type: 'lipsync',
      prompt: `为 ${completedDubbing.length} 个分镜生成对口型`,
      cost: 10 * completedDubbing.length,
      count: completedDubbing.length,
    })
    setShowConfirmModal(true)
  }

  // 确认生成对口型
  const confirmGenerateLipsync = () => {
    setShowConfirmModal(false)

    const taskPayload = {
      storyboardIds: pendingAction?.targetId
        ? [pendingAction.targetId]
        : storyboards.filter(sb => sb.dubbingStatus === 'completed' && sb.dubbingUrl).map(sb => sb.id),
    }

    submitTask({
      type: TaskType.GENERATE_LIPSYNC,
      payload: taskPayload,
      priority: 'medium',
    })
  }

  // 下一步
  const handleNext = () => {
    const completedLipsync = storyboards.filter(sb => sb.lipsyncStatus === 'completed').length
    if (completedLipsync === 0) {
      toast.warning('请至少完成一个分镜的配音和对口型')
      return
    }

    toast.success('配音和对口型已保存')
    router.push(`/projects/${projectId}/workflow/video-preview`)
  }

  // 统计信息
  const completedDubbingCount = storyboards.filter(sb => sb.dubbingStatus === 'completed').length
  const completedLipsyncCount = storyboards.filter(sb => sb.lipsyncStatus === 'completed').length
  const totalWithDialogue = storyboards.filter(sb => sb.dialogue.length > 0).length

  return (
    <div className="flex h-screen bg-background">
      {/* 左侧步骤导航 */}
      <StepNavigation
        steps={PROJECT_STEPS}
        currentStep={5}
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
                disabled={completedLipsyncCount === 0}
              >
                下一步：视频预览
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
                <h1 className="text-2xl font-bold mb-1">配音与对口型</h1>
                <p className="text-sm text-muted-foreground">
                  为角色分配音色，生成配音并同步唇形
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSettingsModal(true)}
                >
                  <Settings2 className="h-4 w-4 mr-2" />
                  配音设置
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowVoiceAssignModal(true)}
                >
                  <Mic2 className="h-4 w-4 mr-2" />
                  角色音色分配
                </Button>
                {activeTab === 'dubbing' ? (
                  <Button
                    onClick={handleBatchGenerateDubbing}
                    disabled={totalWithDialogue === 0}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    批量生成配音
                  </Button>
                ) : (
                  <Button
                    onClick={handleBatchGenerateLipsync}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    批量生成对口型
                  </Button>
                )}
              </div>
            </div>

            {/* 统计信息 */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">有台词分镜</p>
                      <p className="text-2xl font-bold">{totalWithDialogue}</p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <Mic2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">配音已完成</p>
                      <p className="text-2xl font-bold">{completedDubbingCount}</p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">对口型已完成</p>
                      <p className="text-2xl font-bold">{completedLipsyncCount}</p>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 标签页切换 */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'dubbing' | 'lipsync')}>
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="dubbing">配音生成</TabsTrigger>
                <TabsTrigger value="lipsync">对口型</TabsTrigger>
              </TabsList>

              {/* 配音生成标签页 */}
              <TabsContent value="dubbing" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">分镜配音列表</h2>
                  <Badge variant="outline">
                    {completedDubbingCount} / {totalWithDialogue} 已完成
                  </Badge>
                </div>

                {storyboards.map((storyboard) => (
                  <DubbingCard
                    key={storyboard.id}
                    storyboard={storyboard}
                    characters={characters}
                    onAssignVoice={() => setShowVoiceAssignModal(true)}
                    onGenerate={() => handleGenerateDubbing(storyboard.id)}
                    onPlayDialogue={handlePlayDialogue}
                    playingDialogueId={playingDialogueId}
                  />
                ))}
              </TabsContent>

              {/* 对口型标签页 */}
              <TabsContent value="lipsync" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">对口型合成列表</h2>
                  <Badge variant="outline">
                    {completedLipsyncCount} / {completedDubbingCount} 已完成
                  </Badge>
                </div>

                {storyboards.filter(sb => sb.dubbingStatus === 'completed' || sb.lipsyncStatus === 'completed').map((storyboard) => (
                  <LipsyncCard
                    key={storyboard.id}
                    storyboard={storyboard}
                    onGenerate={() => handleGenerateLipsync(storyboard.id)}
                  />
                ))}

                {storyboards.filter(sb => sb.dubbingStatus === 'completed' || sb.lipsyncStatus === 'completed').length === 0 && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">暂无可合成的分镜</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        请先生成配音，然后可以为配音生成对口型效果
                      </p>
                      <Button onClick={() => setActiveTab('dubbing')}>
                        前往配音生成
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* 角色音色分配弹窗 */}
      {showVoiceAssignModal && (
        <VoiceAssignModal
          open={showVoiceAssignModal}
          onClose={() => setShowVoiceAssignModal(false)}
          characters={characters}
          onAssignVoice={handleAssignVoice}
          onPreviewVoice={handlePreviewVoice}
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
          onConfirm={activeTab === 'dubbing' ? confirmGenerateDubbing : confirmGenerateLipsync}
          title={pendingAction.type === 'dubbing' ? '确认生成配音' : '确认生成对口型'}
          description={pendingAction.type === 'dubbing'
            ? '将为所有有台词的分镜生成配音'
            : '将为所有已完成配音的分镜生成对口型效果'}
          prompt={pendingAction.prompt || ''}
          cost={pendingAction.cost}
          count={pendingAction.count}
        />
      )}

      {/* 配音设置弹窗 */}
      {showSettingsModal && (
        <DubbingSettingsModal
          open={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          settings={dubbingSettings}
          onSettingsChange={setDubbingSettings}
        />
      )}
    </div>
  )
}

// 配音卡片组件
function DubbingCard({
  storyboard,
  characters,
  onAssignVoice,
  onGenerate,
  onPlayDialogue,
  playingDialogueId,
}: {
  storyboard: Storyboard
  characters: Character[]
  onAssignVoice: () => void
  onGenerate: () => void
  onPlayDialogue: (dialogueId: string) => void
  playingDialogueId: string | null
}) {
  const hasDubbing = storyboard.dubbingStatus === 'completed'

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* 头部 */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">分镜 {storyboard.sceneNumber}</Badge>
              <TaskStatusBadge status={storyboard.dubbingStatus as TaskStatus || 'pending'} />
            </div>
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

          {/* 分镜脚本 */}
          <p className="text-sm text-muted-foreground">{storyboard.script}</p>

          {/* 台词列表 */}
          {storyboard.dialogue.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">台词</span>
                <span className="text-xs text-muted-foreground">
                  {storyboard.dialogue.length} 句
                </span>
              </div>
              {storyboard.dialogue.map((dialogue) => {
                const character = characters.find(c => c.id === dialogue.characterId)
                const hasVoice = character?.voiceId
                const isPlaying = playingDialogueId === dialogue.id

                return (
                  <div
                    key={dialogue.id}
                    className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{dialogue.character}</span>
                        {hasVoice ? (
                          <Badge variant="secondary" className="text-xs h-5">
                            <Mic2 className="h-3 w-3 mr-1" />
                            已分配音色
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs h-5">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            待分配
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{dialogue.text}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!hasVoice || !hasDubbing}
                        onClick={() => onPlayDialogue(dialogue.id)}
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Mic2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">该分镜无台词</p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 pt-2 border-t">
            {!hasDubbing && storyboard.dubbingStatus !== 'generating' && (
              <Button
                onClick={onGenerate}
                disabled={storyboard.dialogue.length === 0}
                size="sm"
              >
                <Wand2 className="h-4 w-4 mr-1" />
                生成配音
              </Button>
            )}
            {hasDubbing && (
              <>
                <Button variant="outline" size="sm">
                  <Sparkles className="h-4 w-4 mr-1" />
                  智能优化
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  导出音频
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 对口型卡片组件
function LipsyncCard({
  storyboard,
  onGenerate,
}: {
  storyboard: Storyboard
  onGenerate: () => void
}) {
  const hasLipsync = storyboard.lipsyncStatus === 'completed'
  const hasDubbing = storyboard.dubbingStatus === 'completed'

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* 头部 */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">分镜 {storyboard.sceneNumber}</Badge>
              <TaskStatusBadge status={storyboard.lipsyncStatus as TaskStatus || 'pending'} />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 预览区域 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 视频 */}
            <div className="space-y-2">
              <span className="text-sm font-medium">视频</span>
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                {storyboard.videoUrl ? (
                  <video
                    src={storyboard.videoUrl}
                    className="w-full h-full object-cover"
                    muted
                    loop
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* 对口型结果 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">对口型结果</span>
                {hasLipsync && (
                  <Badge variant="secondary" className="text-xs">已完成</Badge>
                )}
              </div>
              <div className="aspect-video bg-muted rounded-lg overflow-hidden border-2 border-dashed">
                {hasLipsync && storyboard.lipsyncUrl ? (
                  <div className="relative w-full h-full">
                    <video
                      src={storyboard.lipsyncUrl}
                      className="w-full h-full object-cover"
                      loop
                    />
                    <button className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                      <Play className="h-8 w-8 text-white" />
                    </button>
                  </div>
                ) : storyboard.lipsyncStatus === 'generating' ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      {!hasDubbing ? (
                        <p className="text-sm text-muted-foreground">请先生成配音</p>
                      ) : (
                        <Button onClick={onGenerate} size="sm" className="mt-2">
                          <Zap className="h-4 w-4 mr-1" />
                          生成对口型
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          {hasLipsync && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button variant="outline" size="sm">
                重新生成
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                导出视频
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// 角色音色分配弹窗
function VoiceAssignModal({
  open,
  onClose,
  characters,
  onAssignVoice,
  onPreviewVoice,
}: {
  open: boolean
  onClose: () => void
  characters: Character[]
  onAssignVoice: (characterId: string, voiceId: string) => void
  onPreviewVoice: (voiceId: string) => void
}) {
  const unassignedCharacters = characters.filter(c => !c.voiceId)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold">角色音色分配</h2>
            <p className="text-sm text-muted-foreground mt-1">
              为每个角色分配合适的音色
            </p>
          </div>

          {unassignedCharacters.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-700">
                还有 {unassignedCharacters.length} 个角色未分配音色，请完成分配后生成配音
              </p>
            </div>
          )}

          {/* 角色列表 */}
          <div className="space-y-4">
            {characters.map((character) => {
              const assignedVoice = VOICE_PRESETS.find(v => v.id === character.voiceId)

              return (
                <div
                  key={character.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg">
                        {character.role === '男主角' || character.role === '女配角' ? '👨' : '👩'}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{character.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {character.role}
                        </Badge>
                      </div>
                      {assignedVoice ? (
                        <p className="text-sm text-muted-foreground">
                          已分配：{assignedVoice.name}
                        </p>
                      ) : (
                        <p className="text-sm text-amber-500">待分配音色</p>
                      )}
                    </div>
                  </div>

                  <Select
                    value={character.voiceId || undefined}
                    onValueChange={(value) => onAssignVoice(character.id, value)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="选择音色" />
                    </SelectTrigger>
                    <SelectContent>
                      {VOICE_PRESETS.map((voice) => (
                        <SelectItem key={voice.id} value={voice.id}>
                          <div className="flex items-center gap-2">
                            <span>{voice.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {voice.gender === 'female' ? '♀' : '♂'} {voice.style}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {character.voiceId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onPreviewVoice(character.voiceId!)}
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>

          {/* 音色预览 */}
          <section>
            <h3 className="text-sm font-semibold mb-3">可选音色预览</h3>
            <div className="grid grid-cols-4 gap-3">
              {VOICE_PRESETS.map((voice) => (
                <Card
                  key={voice.id}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <CardContent className="p-3">
                    <div className="text-center space-y-2">
                      <div className="text-2xl">{voice.gender === 'female' ? '👩' : '👨'}</div>
                      <div className="font-medium text-sm">{voice.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {voice.style} · {voice.age}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => onPreviewVoice(voice.id)}
                      >
                        <Volume2 className="h-3 w-3 mr-1" />
                        试听
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={onClose}>
            完成分配
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

// 配音设置弹窗
function DubbingSettingsModal({
  open,
  onClose,
  settings,
  onSettingsChange,
}: {
  open: boolean
  onClose: () => void
  settings: {
    model: string
    defaultSpeed: number
    defaultVolume: number
    addBackgroundMusic: boolean
    backgroundMusicVolume: number
  }
  onSettingsChange: (settings: any) => void
}) {
  const model = TTS_MODELS.find(m => m.value === settings.model)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-xl font-bold">配音设置</h2>
            <p className="text-sm text-muted-foreground mt-1">
              配置 TTS 模型和配音参数
            </p>
          </div>

          {/* TTS 模型选择 */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">TTS 模型</h3>
            <div className="grid grid-cols-2 gap-3">
              {TTS_MODELS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => onSettingsChange({ ...settings, model: m.value })}
                  className={cn(
                    'p-3 rounded-lg border-2 text-left transition-all',
                    settings.model === m.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{m.label}</span>
                    {m.tag && (
                      <Badge variant="secondary" className="text-xs h-5">
                        {m.tag}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{m.price}</div>
                </button>
              ))}
            </div>
          </section>

          {/* 默认语速 */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">默认语速</h3>
              <span className="text-sm text-muted-foreground">{settings.defaultSpeed}x</span>
            </div>
            <Slider
              value={[settings.defaultSpeed]}
              onValueChange={(value) => onSettingsChange({ ...settings, defaultSpeed: value[0] })}
              min={0.5}
              max={2}
              step={0.1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>慢 (0.5x)</span>
              <span>正常 (1.0x)</span>
              <span>快 (2.0x)</span>
            </div>
          </section>

          {/* 默认音量 */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">默认音量</h3>
              <span className="text-sm text-muted-foreground">
                {Math.round(settings.defaultVolume * 100)}%
              </span>
            </div>
            <Slider
              value={[settings.defaultVolume]}
              onValueChange={(value) => onSettingsChange({ ...settings, defaultVolume: value[0] })}
              min={0}
              max={1}
              step={0.1}
            />
          </section>

          {/* 背景音乐 */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">添加背景音乐</h3>
              <Button
                variant={settings.addBackgroundMusic ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  onSettingsChange({ ...settings, addBackgroundMusic: !settings.addBackgroundMusic })
                }
              >
                {settings.addBackgroundMusic ? '已开启' : '已关闭'}
              </Button>
            </div>
            {settings.addBackgroundMusic && (
              <>
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">背景音乐音量</span>
                </div>
                <Slider
                  value={[settings.backgroundMusicVolume]}
                  onValueChange={(value) =>
                    onSettingsChange({ ...settings, backgroundMusicVolume: value[0] })
                  }
                  min={0}
                  max={1}
                  step={0.1}
                />
                <div className="text-xs text-muted-foreground">
                  当前音量：{Math.round(settings.backgroundMusicVolume * 100)}%
                </div>
              </>
            )}
          </section>

          {/* 费用估算 */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  <span className="font-medium">当前模型</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">{model?.price}</div>
                  <div className="text-xs text-muted-foreground">
                    实际费用以台词字数为准
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
          <Button onClick={onClose}>
            保存设置
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
