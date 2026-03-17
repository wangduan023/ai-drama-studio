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
  Image as ImageIcon,
  Loader2,
  Building,
  User,
  Film,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { StepNavigation, PROJECT_STEPS } from '@/components/projects/StepNavigation'
import { TaskStatusBadge, type TaskStatus } from '@/components/projects/TaskStatusBadge'
import { PromptConfirmModal } from '@/components/projects/PromptConfirmModal'
import { useTaskQueue } from '@/hooks/useTaskQueue'
import { TaskType, TaskPriority } from '@/lib/task-queue'
import { cn } from '@/lib/utils'

// 场景预览弹窗组件
function ScenePreviewModal({ open, onClose, imageUrl, title }: { open: boolean; onClose: () => void; imageUrl: string; title: string }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>关闭</Button>
          <Button onClick={() => window.open(imageUrl, '_blank')}>
            在新窗口打开
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// 模拟数据 - 添加 taskId 字段用于任务追踪
const mockScenes = [
  {
    id: '1',
    name: '傅家婚宴现场',
    type: '室内/宴会厅',
    description: '傅家举办的盛大婚宴，京圈豪门云集，台上两位新娘交换戒指的场景，台下记者们架满了镜头，气氛热烈而紧张。',
    status: 'pending' as TaskStatus, // pending, generating, completed, failed
    imageUrl: null,
    taskId: null as string | null,
    views: [] as { name: string; imageUrl: string | null; status: TaskStatus }[],
  },
  {
    id: '2',
    name: '化妆间',
    type: '室内/私人房间',
    description: '新娘专用的化妆间，用于整理妆容和私下交谈的空间，有沙发、化妆台等设施。',
    status: 'completed' as TaskStatus,
    imageUrl: '/mock/scene-2.jpg',
    taskId: null as string | null,
    views: [
      { name: '北面视角', imageUrl: '/mock/scene-2-north.jpg', status: 'completed' as TaskStatus },
      { name: '南面视角', imageUrl: '/mock/scene-2-south.jpg', status: 'completed' as TaskStatus },
      { name: '西面视角', imageUrl: '/mock/scene-2-west.jpg', status: 'pending' as TaskStatus },
    ],
  },
]

const mockCharacters = [
  { id: '1', name: '梨月', role: '女主角', description: '替嫁新娘', status: 'pending' as TaskStatus, imageUrl: null, taskId: null as string | null },
  { id: '2', name: '南枝', role: '女配角', description: '豪门新娘', status: 'pending' as TaskStatus, imageUrl: null, taskId: null as string | null },
  { id: '3', name: '傅寒舟', role: '男主角', description: '未登场侧写', status: 'pending' as TaskStatus, imageUrl: null, taskId: null as string | null },
  { id: '4', name: '傅烬野', role: '男配角', description: '未登场侧写', status: 'pending' as TaskStatus, imageUrl: null, taskId: null as string | null },
]

const mockProps = [
  { id: '1', name: '十克拉全美粉钻', type: '首饰', related: '梨月、婚宴现场', status: 'pending' as TaskStatus, taskId: null as string | null, imageUrl: null },
  { id: '2', name: '白色露肩婚纱', type: '服装', related: '梨月、南枝', status: 'pending' as TaskStatus, taskId: null as string | null, imageUrl: null },
  { id: '3', name: '红色高跟鞋', type: '服饰', related: '南枝、化妆间', status: 'pending' as TaskStatus, taskId: null as string | null, imageUrl: null },
]

type TabValue = 'scenes' | 'characters' | 'props'

// 智能体配置
const AGENT_CONFIGS = {
  scene: {
    name: '场景编剧',
    version: '漫剧版 v3',
    description: '拆解剧本切分场次，让故事结构清晰好拍!',
    icon: Building,
  },
  character: {
    name: '角色编剧',
    version: '漫剧版 v3',
    description: '深挖角色性格特质，快速生成趣味人设!',
    icon: User,
  },
  prop: {
    name: '道具编剧',
    version: '漫剧版 v3',
    description: '提取剧本道具创意，丰富细节添加巧思!',
    icon: Film,
  },
}

export default function AssetsPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  // 使用任务队列 hook
  const { submitTask, updateTaskCache } = useTaskQueue({ projectId, autoPoll: true })

  const [activeTab, setActiveTab] = useState<TabValue>('scenes')
  const [scenes] = useState(mockScenes)
  const [characters] = useState(mockCharacters)
  const [props] = useState(mockProps)
  const [isExtracting, setIsExtracting] = useState(false)

  // 场景预览弹窗状态
  const [previewScene, setPreviewScene] = useState<{ imageUrl: string; title: string } | null>(null)

  // 提示词确认弹窗状态
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showAgentSelector, setShowAgentSelector] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    type: 'extract' | 'generate_scene' | 'generate_character' | 'generate_prop'
    targetId?: string
    prompt?: string
    cost?: number
    parameters?: {
      model: string
      resolution: string
      aspectRatio: string
      quality: string
    }
  } | null>(null)

  // 智能体选择
  const [selectedAgents, setSelectedAgents] = useState({
    scene: 'manhua-v3',
    character: 'manhua-v3',
    prop: 'manhua-v3',
  })

  // 打开智能体选择弹窗
  const handleOpenAgentSelector = () => {
    setShowAgentSelector(true)
  }

  // 确认智能体选择并开始提取
  const confirmAgentSelection = () => {
    setShowAgentSelector(false)
    setPendingAction({ type: 'extract', prompt: '从剧本中提取场景、角色、道具信息', cost: 5 })
    setShowConfirmModal(true)
  }

  // 手动添加
  const handleManualAdd = () => {
    toast.info('手动添加功能开发中...')
  }

  // handleExtract 函数
  const handleExtract = () => {
    setShowAgentSelector(true)
  }

  // AI 调整
  const handleAiAdjust = () => {
    setPendingAction({ type: 'extract', prompt: '重新分析剧本并调整场景、角色、道具信息', cost: 5 })
    setShowConfirmModal(true)
  }

  // 确认提取 - 提交任务到队列
  const confirmExtract = () => {
    setIsExtracting(true)
    setShowConfirmModal(false)

    // 提交资产提取任务
    submitTask({
      type: TaskType.EXTRACT_ASSETS,
      payload: { script: '从项目获取剧本内容...' },
      priority: 'medium',
    }).then((taskId) => {
      if (taskId) {
        toast.info('正在分析剧本并提取场景、角色、道具...')
      }
    })
  }

  // 处理生成场景图 - 打开确认弹窗
  const handleGenerateSceneImage = (sceneId: string) => {
    const scene = scenes.find(s => s.id === sceneId)
    if (!scene) return

    setPendingAction({
      type: 'generate_scene',
      targetId: sceneId,
      prompt: `生成场景图：${scene.name} - ${scene.description}`,
      cost: 16,
      parameters: {
        model: '纳米修图 Pro',
        resolution: '4K',
        aspectRatio: '16:9',
        quality: '高品质',
      },
    })
    setShowConfirmModal(true)
  }

  // 确认生成场景图
  const confirmGenerateSceneImage = () => {
    if (!pendingAction?.targetId) return

    const scene = scenes.find(s => s.id === pendingAction.targetId)
    if (!scene) return

    submitTask({
      type: TaskType.GENERATE_SCENE_IMAGE,
      payload: {
        assetId: scene.id,
        prompt: scene.description,
        settings: { model: 'nanomi-pro', resolution: '4K' },
      },
      priority: 'medium',
    }).then((taskId) => {
      if (taskId) {
        toast.info(`开始生成场景图：${scene.name}`)
        // 更新本地状态
        const sceneIndex = scenes.findIndex(s => s.id === scene.id)
        if (sceneIndex !== -1) {
          scenes[sceneIndex].taskId = taskId
          scenes[sceneIndex].status = 'queued'
        }
      }
    })
  }

  // 处理生成角色图 - 打开确认弹窗
  const handleGenerateCharacterImage = (characterId: string) => {
    const character = characters.find(c => c.id === characterId)
    if (!character) return

    setPendingAction({
      type: 'generate_character',
      targetId: characterId,
      prompt: `生成角色图：${character.name} - ${character.role} - ${character.description}`,
      cost: 16,
      parameters: {
        model: '纳米修图 Pro',
        resolution: '4K',
        aspectRatio: '3:4',
        quality: '高品质',
      },
    })
    setShowConfirmModal(true)
  }

  // 确认生成角色图
  const confirmGenerateCharacterImage = () => {
    if (!pendingAction?.targetId) return

    const character = characters.find(c => c.id === pendingAction.targetId)
    if (!character) return

    submitTask({
      type: TaskType.GENERATE_CHARACTER_IMAGE,
      payload: {
        assetId: character.id,
        prompt: `${character.name}, ${character.role}, ${character.description}`,
        settings: { model: 'nanomi-pro', resolution: '4K' },
      },
      priority: 'medium',
    }).then((taskId) => {
      if (taskId) {
        toast.info(`开始生成角色图：${character.name}`)
        const charIndex = characters.findIndex(c => c.id === character.id)
        if (charIndex !== -1) {
          characters[charIndex].taskId = taskId
          characters[charIndex].status = 'queued'
        }
      }
    })
  }

  // 处理生成道具图 - 打开确认弹窗
  const handleGeneratePropImage = (propId: string) => {
    const prop = props.find(p => p.id === propId)
    if (!prop) return

    setPendingAction({
      type: 'generate_prop',
      targetId: propId,
      prompt: `生成道具图：${prop.name} - ${prop.type}`,
      cost: 16,
      parameters: {
        model: '纳米修图 Pro',
        resolution: '4K',
        aspectRatio: '1:1',
        quality: '高品质',
      },
    })
    setShowConfirmModal(true)
  }

  // 确认生成道具图
  const confirmGeneratePropImage = () => {
    if (!pendingAction?.targetId) return

    const prop = props.find(p => p.id === pendingAction.targetId)
    if (!prop) return

    submitTask({
      type: TaskType.GENERATE_PROP_IMAGE,
      payload: {
        assetId: prop.id,
        prompt: `${prop.name}, ${prop.type}, 关联：${prop.related}`,
        settings: { model: 'nanomi-pro', resolution: '4K' },
      },
      priority: 'medium',
    }).then((taskId) => {
      if (taskId) {
        toast.info(`开始生成道具图：${prop.name}`)
        const propIndex = props.findIndex(p => p.id === prop.id)
        if (propIndex !== -1) {
          props[propIndex].taskId = taskId
          props[propIndex].status = 'queued'
        }
      }
    })
  }

  // 更新提示词
  const handleUpdatePrompt = (newPrompt: string) => {
    if (pendingAction) {
      setPendingAction({ ...pendingAction, prompt: newPrompt })
    }
  }

  const handleNext = () => {
    // 检查是否所有场景都有图片
    const scenesWithoutImage = scenes.filter(s => !s.imageUrl)
    if (scenesWithoutImage.length > 0) {
      toast.warning('请为所有场景生成或上传图片')
      return
    }

    toast.success('资产已保存')
    router.push(`/projects/${projectId}/workflow/storyboard-script`)
  }

  return (
    <div className="flex h-screen bg-background">
      {/* 左侧步骤导航 */}
      <StepNavigation
        steps={PROJECT_STEPS}
        currentStep={2}
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
              <Button variant="outline" size="sm" title="生成设置">
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
                下一步：分镜脚本
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </header>

        {/* 内容区 */}
        <main className="p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* 页面标题和操作 */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-1">场景、角色、道具</h1>
                <p className="text-sm text-muted-foreground">
                  AI 智能提取剧本中的场景、角色和道具，并生成视觉资产
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleExtract}>
                  <Wand2 className="h-4 w-4 mr-2" />
                  AI 分析并提取
                </Button>
                <Button variant="outline" onClick={handleManualAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  手动添加
                </Button>
              </div>
            </div>

            {/* 提取进度提示 */}
            {isExtracting && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  <span className="text-sm font-medium">AI 正在分析剧本并提取元素...</span>
                </CardContent>
              </Card>
            )}

            {/* 标签页 - 原型风格紧凑按钮 */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setActiveTab('scenes')}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                    activeTab === 'scenes'
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {activeTab === 'scenes' ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  场景
                  <span className={cn(
                    'ml-1 text-xs',
                    activeTab === 'scenes' ? 'text-green-100' : 'text-muted-foreground'
                  )}>
                    {scenes.length > 0 ? `(${scenes.length})` : ''}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('characters')}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                    activeTab === 'characters'
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {activeTab === 'characters' ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  角色
                  <span className={cn(
                    'ml-1 text-xs',
                    activeTab === 'characters' ? 'text-green-100' : 'text-muted-foreground'
                  )}>
                    {characters.length > 0 ? `(${characters.length})` : ''}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('props')}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                    activeTab === 'props'
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {activeTab === 'props' ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                  道具
                  <span className={cn(
                    'ml-1 text-xs',
                    activeTab === 'props' ? 'text-green-100' : 'text-muted-foreground'
                  )}>
                    {props.length > 0 ? `(${props.length})` : ''}
                  </span>
                </button>
              </div>

            {/* 场景列表 */}
            <div className="space-y-4">
              {activeTab === 'scenes' && (
                <>
                  {scenes.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="py-16 text-center">
                        <Building className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">暂无场景</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                          使用 AI 分析自动提取 或 手动添加
                        </p>
                        <div className="flex items-center justify-center gap-3">
                          <Button onClick={handleExtract}>
                            <Wand2 className="h-4 w-4 mr-2" />
                            AI 分析并提取
                          </Button>
                          <Button variant="outline" onClick={handleManualAdd}>
                            <Plus className="h-4 w-4 mr-2" />
                            手动添加
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">
                          场景数：{scenes.length} 项
                        </h2>
                        <Button variant="ghost" size="sm" onClick={handleManualAdd}>
                          <Plus className="h-4 w-4 mr-1" />
                          添加场景
                        </Button>
                      </div>

                      {scenes.map((scene, index) => (
                        <SceneCard
                          key={scene.id}
                          scene={scene}
                          index={index}
                          onGenerate={() => handleGenerateSceneImage(scene.id)}
                          onPreview={(imageUrl, title) => setPreviewScene({ imageUrl, title })}
                        />
                      ))}

                      <div className="flex justify-center pt-4">
                        <Button variant="outline" onClick={handleAiAdjust}>
                          <Wand2 className="h-4 w-4 mr-2" />
                          AI 调整
                        </Button>
                      </div>
                    </>
                  )}
                </>
              )}

              {activeTab === 'characters' && (
                <>
                  {characters.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="py-16 text-center">
                        <User className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">暂无角色</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                          使用 AI 分析自动提取 或 手动添加
                        </p>
                        <div className="flex items-center justify-center gap-3">
                          <Button onClick={handleExtract}>
                            <Wand2 className="h-4 w-4 mr-2" />
                            AI 分析并提取
                          </Button>
                          <Button variant="outline" onClick={handleManualAdd}>
                            <Plus className="h-4 w-4 mr-2" />
                            手动添加
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">
                          角色数：{characters.length} 项
                        </h2>
                        <Button variant="ghost" size="sm" onClick={handleManualAdd}>
                          <Plus className="h-4 w-4 mr-1" />
                          添加角色
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {characters.map((character) => (
                          <CharacterCard
                            key={character.id}
                            character={character}
                            onGenerate={() => handleGenerateCharacterImage(character.id)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}

              {activeTab === 'props' && (
                <>
                  {props.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="py-16 text-center">
                        <Film className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">暂无道具</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                          使用 AI 分析自动提取 或 手动添加
                        </p>
                        <div className="flex items-center justify-center gap-3">
                          <Button onClick={handleExtract}>
                            <Wand2 className="h-4 w-4 mr-2" />
                            AI 分析并提取
                          </Button>
                          <Button variant="outline" onClick={handleManualAdd}>
                            <Plus className="h-4 w-4 mr-2" />
                            手动添加
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">
                          道具数：{props.length} 项
                        </h2>
                        <Button variant="ghost" size="sm" onClick={handleManualAdd}>
                          <Plus className="h-4 w-4 mr-1" />
                          添加道具
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {props.map((prop) => (
                          <PropCard
                            key={prop.id}
                            prop={prop}
                            onGenerate={() => handleGeneratePropImage(prop.id)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* AI 提取/生成确认弹窗 */}
      <PromptConfirmModal
        open={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false)
          setPendingAction(null)
        }}
        onConfirm={() => {
          if (pendingAction?.type === 'extract') {
            confirmExtract()
          } else if (pendingAction?.type === 'generate_scene') {
            confirmGenerateSceneImage()
          } else if (pendingAction?.type === 'generate_character') {
            confirmGenerateCharacterImage()
          } else if (pendingAction?.type === 'generate_prop') {
            confirmGeneratePropImage()
          }
        }}
        title={
          pendingAction?.type === 'extract'
            ? '提取场景/角色/道具'
            : 'AI 图像生成'
        }
        description={
          pendingAction?.type === 'extract'
            ? '选择智能体来为您精准提取'
            : '确认提示词并生成图像'
        }
        prompt={pendingAction?.prompt || ''}
        onUpdatePrompt={handleUpdatePrompt}
        cost={pendingAction?.cost}
        parameters={pendingAction?.type !== 'extract' ? {
          '模型': pendingAction?.parameters?.model || '纳米修图 Pro',
          '分辨率': pendingAction?.parameters?.resolution || '4K',
          '比例': pendingAction?.parameters?.aspectRatio || '16:9',
          '画质': pendingAction?.parameters?.quality || '高品质',
        } : undefined}
        loading={isExtracting}
      />

      {/* 智能体选择弹窗 */}
      <Dialog open={showAgentSelector} onOpenChange={setShowAgentSelector}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>提取场景/角色/道具</DialogTitle>
            <DialogDescription>
              选择智能体来为您精准提取
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 场景提取智能体 */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">场景编剧（漫剧版 v3）</h4>
                    <select
                      value={selectedAgents.scene}
                      onChange={(e) => setSelectedAgents({ ...selectedAgents, scene: e.target.value })}
                      className="text-sm border rounded px-2 py-1 bg-background"
                    >
                      <option value="manhua-v3">漫剧版 v3</option>
                      <option value="novel-v2">小说版 v2</option>
                      <option value="short-v1">短剧版 v1</option>
                    </select>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    拆解剧本切分场次，让故事结构清晰好拍!
                  </p>
                </div>
              </div>
            </div>

            {/* 角色提取智能体 */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">角色编剧（漫剧版 v3）</h4>
                    <select
                      value={selectedAgents.character}
                      onChange={(e) => setSelectedAgents({ ...selectedAgents, character: e.target.value })}
                      className="text-sm border rounded px-2 py-1 bg-background"
                    >
                      <option value="manhua-v3">漫剧版 v3</option>
                      <option value="novel-v2">小说版 v2</option>
                      <option value="short-v1">短剧版 v1</option>
                    </select>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    深挖角色性格特质，快速生成趣味人设!
                  </p>
                </div>
              </div>
            </div>

            {/* 道具提取智能体 */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Film className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">道具编剧（漫剧版 v3）</h4>
                    <select
                      value={selectedAgents.prop}
                      onChange={(e) => setSelectedAgents({ ...selectedAgents, prop: e.target.value })}
                      className="text-sm border rounded px-2 py-1 bg-background"
                    >
                      <option value="manhua-v3">漫剧版 v3</option>
                      <option value="novel-v2">小说版 v2</option>
                      <option value="short-v1">短剧版 v1</option>
                    </select>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    提取剧本道具创意，丰富细节添加巧思!
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAgentSelector(false)}>
              取消
            </Button>
            <Button onClick={confirmAgentSelection}>
              <Wand2 className="h-4 w-4 mr-2" />
              开始提取
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 场景预览弹窗 */}
      {previewScene && (
        <ScenePreviewModal
          open={true}
          onClose={() => setPreviewScene(null)}
          imageUrl={previewScene.imageUrl}
          title={previewScene.title}
        />
      )}
    </div>
  )
}

// 场景卡片组件
function SceneCard({ scene, index, onGenerate, onPreview }: {
  scene: typeof mockScenes[0],
  index: number,
  onGenerate: () => void,
  onPreview: (imageUrl: string, title: string) => void
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs">
                  场景 {index + 1}
                </Badge>
                <span className="text-xs text-muted-foreground">{scene.type}</span>
              </div>
              <h3 className="font-semibold text-lg">{scene.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{scene.description}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                修改场景设定
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                编辑场景图
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                复制场景
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 多机位场景图展示 */}
          {scene.views && scene.views.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">多机位视角</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="12" cy="5" r="1" />
                      <circle cx="12" cy="19" r="1" />
                    </svg>
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-xs h-7">
                    <Edit2 className="h-3 w-3 mr-1" />
                    编辑场景图
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs h-7">
                    <Plus className="h-3 w-3 mr-1" />
                    复制场景
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {scene.views.map((view, viewIndex) => (
                  <div key={viewIndex} className="space-y-2">
                    <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border">
                      {view.status === 'completed' && view.imageUrl ? (
                        <img src={view.imageUrl} alt={view.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {view.status === 'generating' ? (
                            <Loader2 className="h-6 w-6 text-primary animate-spin" />
                          ) : (
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                      )}
                      {view.status === 'completed' && view.imageUrl && (
                        <div className="absolute top-2 left-2">
                          <Badge variant="secondary" className="text-xs h-5">
                            {view.name}
                          </Badge>
                        </div>
                      )}
                    </div>
                    {view.status === 'completed' && view.imageUrl ? (
                      <div className="flex items-center justify-between gap-1">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onPreview(view.imageUrl!, view.name)}>
                          预览
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          替换
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          下载
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="5" r="1" />
                            <circle cx="12" cy="19" r="1" />
                          </svg>
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <TaskStatusBadge status={view.status} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : scene.status === 'completed' && scene.imageUrl ? (
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <img src={scene.imageUrl} alt={scene.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="flex items-center justify-center aspect-video bg-muted rounded-lg border-2 border-dashed">
              {scene.status === 'generating' ? (
                <div className="text-center">
                  <Loader2 className="h-8 w-8 text-primary mx-auto mb-2 animate-spin" />
                  <p className="text-sm text-muted-foreground">生成中...</p>
                </div>
              ) : (
                <div className="text-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <Button onClick={onGenerate} size="sm" className="mt-2">
                    <Wand2 className="h-4 w-4 mr-1" />
                    生成场景图
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TaskStatusBadge status={scene.status} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 角色卡片组件
function CharacterCard({ character, onGenerate }: { character: typeof mockCharacters[0], onGenerate: () => void }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* 角色头像区域 */}
          <div className="aspect-square bg-muted rounded-lg overflow-hidden border">
            {character.status === 'completed' && character.imageUrl ? (
              <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="h-12 w-12 text-muted-foreground opacity-50" />
              </div>
            )}
          </div>

          {/* 角色信息 */}
          <div>
            <h3 className="font-semibold text-center">{character.name}</h3>
            <p className="text-sm text-muted-foreground text-center">{character.role}</p>
          </div>

          {/* 生成按钮 */}
          {character.status === 'completed' && character.imageUrl ? (
            <div className="flex items-center justify-center gap-1">
              <Button variant="outline" size="sm" className="h-8 text-xs">
                预览
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                替换
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                下载
              </Button>
            </div>
          ) : (
            <Button onClick={onGenerate} className="w-full">
              <Wand2 className="h-4 w-4 mr-2" />
              生成三视图
            </Button>
          )}

          <div className="w-full">
            <TaskStatusBadge status={character.status} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// 道具卡片组件
function PropCard({ prop, onGenerate }: { prop: typeof mockProps[0], onGenerate: () => void }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* 道具图片区域 */}
          <div className="aspect-square bg-muted rounded-lg overflow-hidden border">
            {prop.status === 'completed' && prop.imageUrl ? (
              <img src={prop.imageUrl} alt={prop.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Film className="h-12 w-12 text-muted-foreground opacity-50" />
              </div>
            )}
          </div>

          {/* 道具信息 */}
          <div>
            <h3 className="font-semibold text-center">{prop.name}</h3>
            <div className="flex items-center justify-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">{prop.type}</Badge>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-1">关联：{prop.related}</p>
          </div>

          {/* 生成按钮 */}
          {prop.status === 'completed' && prop.imageUrl ? (
            <div className="flex items-center justify-center gap-1">
              <Button variant="outline" size="sm" className="h-8 text-xs">
                预览
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                替换
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                下载
              </Button>
            </div>
          ) : (
            <Button onClick={onGenerate} className="w-full">
              <Wand2 className="h-4 w-4 mr-2" />
              生成道具图
            </Button>
          )}

          <div className="w-full">
            <TaskStatusBadge status={prop.status} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
