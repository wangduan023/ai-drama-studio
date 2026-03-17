'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Info, Check, ArrowRight, Share2, Coins } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { toast } from 'sonner'
import { StepNavigation, PROJECT_STEPS } from '@/components/projects/StepNavigation'
import { cn } from '@/lib/utils'

// 配置选项定义
const ASPECT_RATIOS = [
  { value: '16:9', label: '16:9', icon: '▭' },
  { value: '9:16', label: '9:16', icon: '▭' },
  { value: '4:3', label: '4:3', icon: '▭' },
  { value: '3:4', label: '3:4', icon: '▉' },
  { value: '1:1', label: '1:1', icon: '▭' },
]

const STORY_TYPES = [
  { value: 'drama', label: '剧情演绎', description: '适合故事类内容' },
  { value: 'narration', label: '真人解说漫', description: '适合解说类内容' },
]

const MODEL_STRATEGIES = [
  { value: 'economy', label: '省钱优先', description: '使用性价比高的 AI 模型' },
  { value: 'quality', label: '画质优先', description: '使用高质量 AI 模型，消耗更多积分' },
]

const CREATION_MODES = [
  { value: 'image-to-video', label: '图生视频模式', description: '基于单张图片生成视频' },
  { value: 'multi-param', label: '多参生视频模式', description: '基于多张参考图生成视频' },
]

const STORYBOARD_MODES = [
  { value: 'single', label: '自动生成单张分镜图', description: '每个分镜生成一张图片' },
  { value: 'grid9', label: '自动生成九宫格机位分镜图', description: '每个分镜生成 9 个机位图供选择' },
]

const STYLE_PRESETS = [
  { value: '3d-fantasy', label: '3D 玄幻', image: '/styles/3d-fantasy.jpg' },
  { value: 'anime', label: '日系动漫', image: '/styles/anime.jpg' },
  { value: 'realistic', label: '写实风格', image: '/styles/realistic.jpg' },
  { value: 'oil-painting', label: '油画风格', image: '/styles/oil-painting.jpg' },
]

interface GlobalSettings {
  aspectRatio: string
  storyType: string
  modelStrategy: string
  creationMode: string
  storyboardMode: string
  stylePreset: string
}

export default function GlobalSettingsPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [settings, setSettings] = useState<GlobalSettings>({
    aspectRatio: '3:4',
    storyType: 'drama',
    modelStrategy: 'economy',
    creationMode: 'image-to-video',
    storyboardMode: 'single',
    stylePreset: '3d-fantasy',
  })

  const handleNext = () => {
    toast.success('全局设定已保存')
    // 跳转到下一步：故事剧本
    router.push(`/projects/${projectId}/workflow/story-script`)
  }

  const selectedStyle = STYLE_PRESETS.find(s => s.value === settings.stylePreset)

  return (
    <div className="flex h-screen bg-background">
      {/* 左侧步骤导航 */}
      <StepNavigation
        steps={PROJECT_STEPS}
        currentStep={0}
        disabledSteps={[1, 2, 3, 4, 5, 6]}
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
              <Button onClick={handleNext} className="ml-4">
                下一步
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </header>

        {/* 配置内容区 */}
        <main className="p-6 space-y-8 max-w-4xl">
          {/* 1. 选择画面比例 */}
          <section>
            <h2 className="text-lg font-semibold mb-4">选择画面比例</h2>
            <div className="flex gap-4">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.value}
                  onClick={() => setSettings({ ...settings, aspectRatio: ratio.value })}
                  className={cn(
                    'relative w-24 h-24 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-2',
                    settings.aspectRatio === ratio.value
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <span className="text-3xl text-muted-foreground">{ratio.icon}</span>
                  <span className="text-sm font-medium">{ratio.label}</span>
                  {settings.aspectRatio === ratio.value && (
                    <div className="absolute top-2 right-2">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* 2. 选择剧本类型 */}
          <section>
            <h2 className="text-lg font-semibold mb-4">选择剧本类型</h2>
            <div className="flex gap-4">
              {STORY_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setSettings({ ...settings, storyType: type.value })}
                  className={cn(
                    'flex-1 p-4 rounded-lg border-2 transition-all text-left',
                    settings.storyType === type.value
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                      settings.storyType === type.value ? 'border-primary' : 'border-muted-foreground'
                    )}>
                      {settings.storyType === type.value && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="font-medium">{type.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* 3. 选择模型策略 */}
          <section>
            <h2 className="text-lg font-semibold mb-4">选择模型策略</h2>
            <div className="flex gap-4">
              {MODEL_STRATEGIES.map((strategy) => (
                <button
                  key={strategy.value}
                  onClick={() => setSettings({ ...settings, modelStrategy: strategy.value })}
                  className={cn(
                    'flex-1 p-4 rounded-lg border-2 transition-all text-left',
                    settings.modelStrategy === strategy.value
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                      settings.modelStrategy === strategy.value ? 'border-primary' : 'border-muted-foreground'
                    )}>
                      {settings.modelStrategy === strategy.value && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="font-medium">{strategy.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{strategy.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* 4. 选择创作模式 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold">选择创作模式</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>图生视频：基于单张图片生成动态视频</p>
                    <p>多参生视频：基于多张参考图生成复杂动作</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex gap-4">
              {CREATION_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setSettings({ ...settings, creationMode: mode.value })}
                  className={cn(
                    'flex-1 p-4 rounded-lg border-2 transition-all text-left',
                    settings.creationMode === mode.value
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                      settings.creationMode === mode.value ? 'border-primary' : 'border-muted-foreground'
                    )}>
                      {settings.creationMode === mode.value && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="font-medium">{mode.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{mode.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* 5. 选择分镜图生成模式 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold">选择分镜图生成模式</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>单张分镜图：每个分镜生成一张图片，快速高效</p>
                    <p>九宫格机位：每个分镜生成 9 个不同角度/构图，供选择最佳方案</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex gap-4">
              {STORYBOARD_MODES.map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => setSettings({ ...settings, storyboardMode: mode.value })}
                  className={cn(
                    'flex-1 p-4 rounded-lg border-2 transition-all text-left',
                    settings.storyboardMode === mode.value
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center',
                      settings.storyboardMode === mode.value ? 'border-primary' : 'border-muted-foreground'
                    )}>
                      {settings.storyboardMode === mode.value && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="font-medium">{mode.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{mode.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* 6. 选择画面风格 */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold">选择画面风格</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>选择不同的视觉风格，AI 将基于此风格生成所有画面</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">已选风格</h3>
              <div className="flex gap-4">
                {STYLE_PRESETS.map((style) => (
                  <button
                    key={style.value}
                    onClick={() => setSettings({ ...settings, stylePreset: style.value })}
                    className={cn(
                      'relative w-32 rounded-lg border-2 overflow-hidden transition-all',
                      settings.stylePreset === style.value
                        ? 'border-primary shadow-md'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      {/* TODO: 替换为真实风格预览图 */}
                      <span className="text-2xl">{style.label[0]}</span>
                    </div>
                    <div className="p-2 text-center">
                      <p className="text-sm font-medium">{style.label}</p>
                    </div>
                    {settings.stylePreset === style.value && (
                      <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 底部操作区 */}
          <div className="pt-8 border-t flex justify-end">
            <Button onClick={handleNext} size="lg" className="px-8">
              下一步：故事剧本
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </main>
      </div>
    </div>
  )
}
