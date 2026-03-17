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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { StepNavigation, PROJECT_STEPS } from '@/components/projects/StepNavigation'
import { TaskStatusBadge, type TaskStatus } from '@/components/projects/TaskStatusBadge'
import { PromptConfirmModal } from '@/components/projects/PromptConfirmModal'
import { useTaskQueue } from '@/hooks/useTaskQueue'
import { TaskType, TaskPriority } from '@/lib/task-queue'
import { cn } from '@/lib/utils'

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
  },
  {
    id: '2',
    name: '化妆间',
    type: '室内/私人房间',
    description: '新娘专用的化妆间，用于整理妆容和私下交谈的空间，有沙发、化妆台等设施。',
    status: 'completed' as TaskStatus,
    imageUrl: '/mock/scene-2.jpg',
    taskId: null as string | null,
  },
]

const mockCharacters = [
  { id: '1', name: '梨月', role: '女主角', description: '替嫁新娘', status: 'pending' as TaskStatus, imageUrl: null, taskId: null as string | null },
  { id: '2', name: '南枝', role: '女配角', description: '豪门新娘', status: 'pending' as TaskStatus, imageUrl: null, taskId: null as string | null },
  { id: '3', name: '傅寒舟', role: '男主角', description: '未登场侧写', status: 'pending' as TaskStatus, imageUrl: null, taskId: null as string | null },
  { id: '4', name: '傅烬野', role: '男配角', description: '未登场侧写', status: 'pending' as TaskStatus, imageUrl: null, taskId: null as string | null },
]

const mockProps = [
  { id: '1', name: '十克拉全美粉钻', type: '首饰', related: '梨月、婚宴现场', status: 'pending' as TaskStatus, taskId: null as string | null },
  { id: '2', name: '白色露肩婚纱', type: '服装', related: '梨月、南枝', status: 'pending' as TaskStatus, taskId: null as string | null },
  { id: '3', name: '红色高跟鞋', type: '服饰', related: '南枝、化妆间', status: 'pending' as TaskStatus, taskId: null as string | null },
]

type TabValue = 'scenes' | 'characters' | 'props'

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

  // 提示词确认弹窗状态
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    type: 'extract' | 'generate_scene' | 'generate_character' | 'generate_prop'
    targetId?: string
    prompt?: string
    cost?: number
  } | null>(null)

  // 处理 AI 提取 - 打开确认弹窗
  const handleExtract = () => {
    setPendingAction({ type: 'extract', prompt: '从剧本中提取场景、角色、道具信息', cost: 5 })
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
      cost: 10,
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
      cost: 10,
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
      cost: 10,
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
                纳米漫剧流水线
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
                  AI 重新提取
                </Button>
                <Button onClick={() => setActiveTab('scenes')}>
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

            {/* 标签页 */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
              <TabsList className="grid w-full max-w-md grid-cols-3">
                <TabsTrigger value="scenes">场景</TabsTrigger>
                <TabsTrigger value="characters">角色</TabsTrigger>
                <TabsTrigger value="props">道具</TabsTrigger>
              </TabsList>

              {/* 场景列表 */}
              <TabsContent value="scenes" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    场景数：{scenes.length} 项
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('scenes')}>
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
                  />
                ))}

                <div className="flex justify-center pt-4">
                  <Button variant="outline">
                    <Wand2 className="h-4 w-4 mr-2" />
                    AI 调整
                  </Button>
                </div>
              </TabsContent>

              {/* 角色列表 */}
              <TabsContent value="characters" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    角色数：{characters.length} 项
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('characters')}>
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
              </TabsContent>

              {/* 道具列表 */}
              <TabsContent value="props" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    道具数：{props.length} 项
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('props')}>
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
              </TabsContent>
            </Tabs>
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
        loading={isExtracting}
      />
    </div>
  )
}

// 场景卡片组件
function SceneCard({ scene, index, onGenerate }: { scene: typeof mockScenes[0], index: number, onGenerate: () => void }) {
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
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {scene.status === 'completed' && scene.imageUrl ? (
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
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold">{character.name}</h3>
              <p className="text-sm text-muted-foreground">{character.role} · {character.description}</p>
            </div>
          </div>

          {character.status === 'completed' && character.imageUrl ? (
            <div className="aspect-square bg-muted rounded-lg overflow-hidden">
              <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="flex items-center justify-center aspect-square bg-muted rounded-lg border-2 border-dashed">
              <div className="text-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <Button onClick={onGenerate} size="sm" className="mt-2">
                  <Wand2 className="h-4 w-4 mr-1" />
                  生成角色图
                </Button>
              </div>
            </div>
          )}

          {character.status === 'completed' && character.imageUrl ? (
            <div className="w-full">
              <TaskStatusBadge status={character.status} />
            </div>
          ) : (
            <div className="w-full">
              <TaskStatusBadge status={character.status} />
            </div>
          )}
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
          <div>
            <h3 className="font-semibold">{prop.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">{prop.type}</Badge>
              <span className="text-xs text-muted-foreground">关联：{prop.related}</span>
            </div>
          </div>

          <div className="flex items-center justify-center aspect-square bg-muted rounded-lg border-2 border-dashed">
            <div className="text-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <Button onClick={onGenerate} size="sm" className="mt-2">
                <Wand2 className="h-4 w-4 mr-1" />
                生成道具图
              </Button>
            </div>
          </div>

          <TaskStatusBadge status={prop.status} />
        </div>
      </CardContent>
    </Card>
  )
}
