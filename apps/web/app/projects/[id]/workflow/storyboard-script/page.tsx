'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Share2,
  Coins,
  Settings2,
  Plus,
  Wand2,
  Edit2,
  Trash2,
  Copy,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  Film,
  Mic,
  PencilLine,
  MessageSquare,
  Grid3X3,
  List,
  RefreshCw,
  Info,
  MoreVertical,
  Download,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

// 镜头密度选项
const LENS_DENSITY = [
  {
    value: 'minimal',
    label: '精简模式',
    description: '镜头少而精，强调核心情节',
    count: '~35 镜头/千字',
  },
  {
    value: 'standard',
    label: '标准模式',
    description: '结构完整，情节与细节兼顾',
    count: '~65 镜头/千字',
  },
  {
    value: 'detailed',
    label: '细拆模式',
    description: '特写与动作拆解，画面感强',
    count: '~80 镜头/千字',
  },
]

// 生图模型选项
const IMAGE_MODELS = [
  { value: 'nanomi-pro', label: '纳米修图 Pro', price: '16🪙/张 (4K)', tag: '效果最好' },
  { value: 'nanomi-2', label: '纳米修图 2', price: '14🪙/张 (4K)', tag: '' },
  { value: 'jimeng-lite', label: '即梦 5.0lite', price: '4🪙/张', tag: '性价比最高' },
  { value: 'keru-omni', label: '可图 omni', price: '2🪙/张', tag: '' },
]

// 模拟分镜数据
const mockStoryboards = [
  {
    id: '1',
    name: '分镜 1-1',
    script: '记者蹲姿偷拍场景，镜头聚焦于台上两位新娘',
    imageUrl: null,
    status: 'pending' as TaskStatus, // pending, generating, completed
    taskId: null as string | null,
    location: '傅家婚宴现场',
    characters: ['记者组'],
    props: ['专业相机'],
  },
  {
    id: '2',
    name: '分镜 1-2',
    script: '婚宴大厅全景，水晶吊灯闪烁，宾客们注视台上',
    imageUrl: '/mock/storyboard-2.jpg',
    status: 'completed' as TaskStatus,
    taskId: null as string | null,
    location: '傅家婚宴现场',
    characters: ['宾客组'],
    props: [],
  },
]

type ViewMode = 'list' | 'card'
type GenerateMode = 'single' | 'chat' | 'grid9'

export default function StoryboardScriptPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  // 使用任务队列 hook
  const { submitTask } = useTaskQueue({ projectId, autoPoll: true })

  const [storyboards] = useState(mockStoryboards)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [generateMode, setGenerateMode] = useState<GenerateMode>('single')
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showSplitModal, setShowSplitModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [selectedLensDensity, setSelectedLensDensity] = useState('standard')
  const [selectedImageModel, setSelectedImageModel] = useState('nanomi-pro')

  // 提示词确认弹窗状态
  const [pendingAction, setPendingAction] = useState<{
    type: 'split' | 'generate_image'
    storyboardId?: string
    prompt?: string
    cost?: number
  } | null>(null)

  // 处理自动拆分剧本 - 打开确认弹窗
  const handleAutoSplit = () => {
    setPendingAction({
      type: 'split',
      prompt: '将剧本拆分为分镜脚本',
      cost: 10,
    })
    setShowConfirmModal(true)
  }

  // 确认拆分
  const confirmSplit = () => {
    setShowConfirmModal(false)

    // 提交分镜拆分任务
    submitTask({
      type: TaskType.SPLIT_STORYBOARD,
      payload: {
        script: '从项目获取剧本内容...',
        lensDensity: selectedLensDensity,
      },
      priority: 'medium',
    }).then((taskId) => {
      if (taskId) {
        toast.info('正在分析剧本并拆分为分镜...')
      }
    })
  }

  // 处理生成单个分镜图 - 打开确认弹窗
  const handleGenerateImage = (storyboardId: string) => {
    const storyboard = storyboards.find(s => s.id === storyboardId)
    if (!storyboard) return

    setPendingAction({
      type: 'generate_image',
      storyboardId,
      prompt: `生成分镜图：${storyboard.name} - ${storyboard.script}`,
      cost: 4,
    })
    setShowConfirmModal(true)
  }

  // 确认生成分镜图
  const confirmGenerateImage = () => {
    if (!pendingAction?.storyboardId) return

    const storyboard = storyboards.find(s => s.id === pendingAction.storyboardId)
    if (!storyboard) return

    submitTask({
      type: TaskType.GENERATE_STORYBOARD_IMAGE,
      payload: {
        storyboardId: storyboard.id,
        prompt: storyboard.script,
        settings: { model: selectedImageModel, quantity: 1 },
      },
      priority: 'medium',
    }).then((taskId) => {
      if (taskId) {
        toast.info(`开始生成分镜图：${storyboard.name}`)
        const index = storyboards.findIndex(s => s.id === storyboard.id)
        if (index !== -1) {
          storyboards[index].taskId = taskId
          storyboards[index].status = 'queued'
        }
      }
    })
  }

  // 处理自动生成所有图片 - 打开确认弹窗
  const handleAutoGenerateImages = () => {
    const pendingStoryboards = storyboards.filter(s => s.status !== 'completed')
    if (pendingStoryboards.length === 0) {
      toast.success('所有分镜图已生成完成')
      return
    }

    const totalCost = pendingStoryboards.length * 4
    setPendingAction({
      type: 'generate_image',
      prompt: `批量生成 ${pendingStoryboards.length} 个分镜图`,
      cost: totalCost,
    })
    setShowConfirmModal(true)
  }

  // 确认批量生成图片
  const confirmAutoGenerateImages = () => {
    const pendingStoryboards = storyboards.filter(s => s.status !== 'completed')

    pendingStoryboards.forEach((storyboard) => {
      submitTask({
        type: TaskType.GENERATE_STORYBOARD_IMAGE,
        payload: {
          storyboardId: storyboard.id,
          prompt: storyboard.script,
          settings: { model: selectedImageModel, quantity: 1 },
        },
        priority: 'medium',
      }).then((taskId) => {
        if (taskId) {
          const index = storyboards.findIndex(s => s.id === storyboard.id)
          if (index !== -1) {
            storyboards[index].taskId = taskId
            storyboards[index].status = 'queued'
          }
        }
      })
    })

    setShowConfirmModal(false)
    toast.info(`已提交 ${pendingStoryboards.length} 个分镜图生成任务`)
  }

  // 更新提示词
  const handleUpdatePrompt = (newPrompt: string) => {
    if (pendingAction) {
      setPendingAction({ ...pendingAction, prompt: newPrompt })
    }
  }

  // 处理添加分镜
  const handleAddStoryboard = () => {
    toast.info('添加新分镜功能开发中...')
  }

  // 处理编辑分镜脚本
  const handleEditScript = (id: string) => {
    toast.info('编辑分镜脚本功能开发中...')
  }

  // 处理编辑分镜图
  const handleEditImage = (id: string) => {
    toast.info('编辑分镜图功能开发中...')
  }

  // 处理复制分镜
  const handleCopyStoryboard = (id: string) => {
    toast.success('已复制分镜')
  }

  // 处理删除分镜
  const handleDeleteStoryboard = (id: string) => {
    toast.success('已删除分镜')
  }

  const handleNext = () => {
    toast.success('分镜脚本已保存')
    router.push(`/projects/${projectId}/workflow/storyboard-video`)
  }

  const completedCount = storyboards.filter(s => s.status === 'completed').length

  return (
    <div className="flex h-screen bg-background">
      {/* 左侧步骤导航 */}
      <StepNavigation
        steps={PROJECT_STEPS}
        currentStep={3}
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
              <Button variant="outline" size="sm" onClick={() => setShowSettingsModal(true)}>
                <Settings2 className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">生成设置</span>
              </Button>
              <Button variant="outline" size="sm" title="积分余额">
                <Coins className="h-4 w-4" />
                <span className="ml-1">💰 1,250</span>
              </Button>
              <Button
                onClick={handleNext}
                className="ml-4"
              >
                下一步：分镜视频
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </header>

        {/* 内容区 */}
        <main className="p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* 页面标题和工具栏 */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">分镜脚本</h1>
                <p className="text-sm text-muted-foreground">
                  AI 拆分剧本为分镜，并生成视觉画面
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === 'list' ? 'card' : 'list')}>
                  {viewMode === 'list' ? <Grid3X3 className="h-4 w-4" /> : <List className="h-4 w-4" />}
                </Button>
                <div className="text-sm text-muted-foreground">
                  分镜完成进度：<span className="font-medium text-foreground">{completedCount}/{storyboards.length}</span>
                </div>
              </div>
            </div>

            {/* 快捷操作栏 */}
            <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg border">
              <Button variant="outline" size="sm" onClick={handleAddStoryboard}>
                <Plus className="h-4 w-4 mr-1" />
                添加分镜
              </Button>
              <Button variant="outline" size="sm" onClick={handleAutoSplit}>
                <RefreshCw className="h-4 w-4 mr-1" />
                自动拆分剧本
              </Button>
              <Button variant="outline" size="sm" onClick={handleAutoGenerateImages}>
                <Wand2 className="h-4 w-4 mr-1" />
                自动生成图片
              </Button>
            </div>

            {/* 分镜列表 */}
            <div className="space-y-4">
              {storyboards.length === 0 ? (
                <EmptyState onSplit={handleAutoSplit} onAdd={handleAddStoryboard} />
              ) : (
                storyboards.map((storyboard, index) => (
                  <StoryboardCard
                    key={storyboard.id}
                    storyboard={storyboard}
                    index={index}
                    viewMode={viewMode}
                    onEditScript={() => handleEditScript(storyboard.id)}
                    onEditImage={() => handleEditImage(storyboard.id)}
                    onGenerateImage={() => handleGenerateImage(storyboard.id)}
                    onCopy={() => handleCopyStoryboard(storyboard.id)}
                    onDelete={() => handleDeleteStoryboard(storyboard.id)}
                  />
                ))
              )}
            </div>
          </div>
        </main>
      </div>

      {/* 生成设置弹窗 */}
      {showSettingsModal && (
        <SettingsModal
          open={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          lensDensity={selectedLensDensity}
          setLensDensity={setSelectedLensDensity}
          imageModel={selectedImageModel}
          setImageModel={setSelectedImageModel}
        />
      )}

      {/* 拆分设置弹窗 */}
      {showSplitModal && (
        <SplitModal
          open={showSplitModal}
          onClose={() => setShowSplitModal(false)}
          lensDensity={selectedLensDensity}
          setLensDensity={setSelectedLensDensity}
          onConfirm={confirmSplit}
        />
      )}

      {/* AI 生成确认弹窗 */}
      <PromptConfirmModal
        open={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false)
          setPendingAction(null)
        }}
        onConfirm={() => {
          if (pendingAction?.type === 'split') {
            confirmSplit()
          } else if (pendingAction?.type === 'generate_image') {
            if (pendingAction.storyboardId) {
              confirmGenerateImage()
            } else {
              confirmAutoGenerateImages()
            }
          }
        }}
        title={
          pendingAction?.type === 'split'
            ? '拆分分镜脚本'
            : 'AI 分镜图生成'
        }
        description={
          pendingAction?.type === 'split'
            ? '选择镜头密度，AI 将自动拆分剧本为分镜'
            : '确认提示词并生成分镜图'
        }
        prompt={pendingAction?.prompt || ''}
        onUpdatePrompt={handleUpdatePrompt}
        cost={pendingAction?.cost}
        loading={false}
      />
    </div>
  )
}

// 分镜卡片组件
function StoryboardCard({
  storyboard,
  index,
  viewMode,
  onEditScript,
  onEditImage,
  onGenerateImage,
  onCopy,
  onDelete,
}: {
  storyboard: typeof mockStoryboards[0]
  index: number
  viewMode: ViewMode
  onEditScript: () => void
  onEditImage: () => void
  onGenerateImage: () => void
  onCopy: () => void
  onDelete: () => void
}) {
  if (viewMode === 'card') {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{storyboard.name}</Badge>
              <TaskStatusBadge status={storyboard.status} />
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={onCopy}>
                <Copy className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {/* 分镜图 */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">分镜图：</p>
              <div
                className={cn(
                  'aspect-square rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition-colors relative',
                  storyboard.imageUrl
                    ? 'border-solid bg-muted overflow-hidden'
                    : 'hover:border-primary'
                )}
                onClick={storyboard.imageUrl ? onEditImage : onGenerateImage}
              >
                {storyboard.imageUrl ? (
                  <img src={storyboard.imageUrl} alt={storyboard.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center p-2">
                    <Edit2 className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">点击编辑<br/>分镜图</p>
                  </div>
                )}
              </div>
            </div>

            {/* 参考图片 */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">参考图片：</p>
              <div className="aspect-square rounded-lg bg-muted border flex items-center justify-center">
                <p className="text-xs text-muted-foreground text-center px-2">暂无参考图</p>
              </div>
            </div>

            {/* 分镜脚本 */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">分镜脚本：</p>
              <div
                className="aspect-square rounded-lg border bg-muted/50 p-2 cursor-pointer hover:border-primary transition-colors overflow-auto"
                onClick={onEditScript}
              >
                <p className="text-xs line-clamp-4">{storyboard.script || '可点击「自动生成分镜」或「编辑分镜脚本」，生成脚本'}</p>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="text-xs">
              <Film className="h-3 w-3 mr-1" />
              分镜视频
            </Button>
            <Button variant="outline" size="sm" className="text-xs">
              <Mic className="h-3 w-3 mr-1" />
              配音对口型
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={onEditScript}>
              <PencilLine className="h-3 w-3 mr-1" />
              修改分镜脚本
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={onEditImage}>
              <ImageIcon className="h-3 w-3 mr-1" />
              编辑分镜图
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={onCopy}>
              <Copy className="h-3 w-3 mr-1" />
              复制分镜
            </Button>
            <Button variant="outline" size="sm" className="text-xs text-destructive hover:text-destructive hover:border-destructive" onClick={onDelete}>
              <Trash2 className="h-3 w-3 mr-1" />
              删除分镜
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 列表视图
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* 分镜图预览 */}
          <div
            className={cn(
              'w-32 h-24 rounded-lg border-2 border-dashed flex items-center justify-center flex-shrink-0 cursor-pointer transition-colors',
              storyboard.imageUrl
                ? 'border-solid bg-muted overflow-hidden'
                : 'hover:border-primary'
            )}
            onClick={storyboard.imageUrl ? onEditImage : onGenerateImage}
          >
            {storyboard.imageUrl ? (
              <img src={storyboard.imageUrl} alt={storyboard.name} className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <ImageIcon className="h-6 w-6 text-muted-foreground mx-auto" />
                <p className="text-xs text-muted-foreground mt-1">点击生成</p>
              </div>
            )}
          </div>

          {/* 分镜信息 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{storyboard.name}</Badge>
              <TaskStatusBadge status={storyboard.status} />
              <span className="text-xs text-muted-foreground">
                场景：{storyboard.location}
              </span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {storyboard.script}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {storyboard.characters.map((char) => (
                <Badge key={char} variant="outline" className="text-xs">
                  {char}
                </Badge>
              ))}
              {storyboard.props.map((prop) => (
                <Badge key={prop} variant="outline" className="text-xs">
                  {prop}
                </Badge>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={onCopy}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onEditScript}>
                <PencilLine className="h-4 w-4 mr-1" />
                修改分镜脚本
              </Button>
              <Button variant="outline" size="sm" onClick={onEditImage}>
                <ImageIcon className="h-4 w-4 mr-1" />
                编辑分镜图
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 空状态组件
function EmptyState({ onSplit, onAdd }: { onSplit: () => void, onAdd: () => void }) {
  return (
    <div className="text-center py-16 border-2 border-dashed rounded-lg bg-muted/30">
      <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
        <Film className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">暂无分镜</h3>
      <p className="text-muted-foreground mb-6">
        使用 AI 自动拆分剧本，或手动添加分镜
      </p>
      <div className="flex items-center justify-center gap-3">
        <Button onClick={onSplit}>
          <RefreshCw className="h-4 w-4 mr-2" />
          AI 分析并提取
        </Button>
        <Button variant="outline" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-2" />
          手动添加
        </Button>
      </div>
    </div>
  )
}

// 生成设置弹窗
function SettingsModal({
  open,
  onClose,
  lensDensity,
  setLensDensity,
  imageModel,
  setImageModel,
}: {
  open: boolean
  onClose: () => void
  lensDensity: string
  setLensDensity: (v: string) => void
  imageModel: string
  setImageModel: (v: string) => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] overflow-auto"
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">生成设置</h2>
              <p className="text-sm text-muted-foreground">为分镜脚本、分镜图设置生成参数</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* 分镜脚本设置 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b">
              <PencilLine className="h-4 w-4" />
              <h3 className="font-semibold">分镜脚本</h3>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">智能体</Label>
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Film className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">分镜编剧（漫剧版 v3）</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">将场景拆解成分镜脚本，情节推进有节奏!</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">镜头密度</Label>
              <div className="grid grid-cols-3 gap-3">
                {LENS_DENSITY.map((density) => (
                  <button
                    key={density.value}
                    onClick={() => setLensDensity(density.value)}
                    className={cn(
                      'p-3 rounded-lg border-2 text-left transition-all',
                      lensDensity === density.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <p className="font-medium text-sm">{density.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{density.description}</p>
                    <p className="text-xs text-muted-foreground mt-2 font-medium">{density.count}</p>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 分镜图设置 */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b">
              <ImageIcon className="h-4 w-4" />
              <h3 className="font-semibold">分镜图（消耗 🪙 4/张）</h3>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">智能体</Label>
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">分镜画师（漫剧版 v3）</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">让分镜脚本配上视觉画面，帧帧都有看点!</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">生图模型</Label>
              <div className="space-y-2">
                {IMAGE_MODELS.map((model) => (
                  <button
                    key={model.value}
                    onClick={() => setImageModel(model.value)}
                    className={cn(
                      'w-full p-3 rounded-lg border-2 text-left transition-all flex items-center justify-between',
                      imageModel === model.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{model.label}</span>
                        {model.tag && (
                          <Badge variant="secondary" className="text-xs h-5">{model.tag}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{model.price}</p>
                    </div>
                    {imageModel === model.value && (
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </section>
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

// 拆分设置弹窗
function SplitModal({
  open,
  onClose,
  lensDensity,
  setLensDensity,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  lensDensity: string
  setLensDensity: (v: string) => void
  onConfirm: () => void
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
          <div className="text-center">
            <RefreshCw className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold">自动拆分剧本</h2>
            <p className="text-sm text-muted-foreground mt-1">
              选择镜头密度，AI 将自动拆分剧本为分镜
            </p>
          </div>

          <div className="space-y-2">
            <Label>镜头密度</Label>
            <div className="space-y-2">
              {LENS_DENSITY.map((density) => (
                <button
                  key={density.value}
                  onClick={() => setLensDensity(density.value)}
                  className={cn(
                    'w-full p-4 rounded-lg border-2 text-left transition-all',
                    lensDensity === density.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{density.label}</p>
                      <p className="text-sm text-muted-foreground mt-1">{density.description}</p>
                    </div>
                    <Badge variant={lensDensity === density.value ? 'default' : 'outline'}>
                      {density.count}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-muted/30">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={onConfirm}>
            <RefreshCw className="h-4 w-4 mr-2" />
            开始拆分
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

// Label 组件（如果不存在）
function Label({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <label className={cn('text-sm font-medium text-foreground', className)}>
      {children}
    </label>
  )
}
