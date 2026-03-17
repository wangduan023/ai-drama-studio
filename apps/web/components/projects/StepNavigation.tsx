'use client'

import { cn } from '@/lib/utils'
import { CheckCircle, Circle } from 'lucide-react'

export interface Step {
  id: string
  title: string
  description?: string
}

export interface StepNavigationProps {
  steps: Step[]
  currentStep: number
  onStepClick?: (index: number) => void
  disabledSteps?: number[]
}

/**
 * 纳米漫剧流水线 - 步骤导航组件
 * 显示左侧的步骤列表，包含 7 个步骤的状态
 */
export function StepNavigation({
  steps,
  currentStep,
  onStepClick,
  disabledSteps = [],
}: StepNavigationProps) {
  return (
    <div className="w-48 flex-shrink-0 border-r bg-muted/30 min-h-[600px]">
      <div className="p-4">
        <h3 className="text-sm font-medium mb-4 text-muted-foreground">创作流程</h3>
        <div className="space-y-1">
          {steps.map((step, index) => {
            const isActive = index === currentStep
            const isCompleted = index < currentStep
            const isPending = index > currentStep
            const isDisabled = disabledSteps.includes(index)

            return (
              <button
                key={step.id}
                onClick={() => !isDisabled && onStepClick?.(index)}
                disabled={isDisabled}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all',
                  isActive && 'bg-primary text-primary-foreground shadow-sm',
                  isCompleted && 'bg-primary/10 text-primary hover:bg-primary/20',
                  isPending && 'text-muted-foreground',
                  isDisabled && 'opacity-50 cursor-not-allowed',
                  !isDisabled && !isActive && 'hover:bg-accent'
                )}
              >
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Circle
                      className={cn(
                        'h-5 w-5',
                        isActive ? 'stroke-2' : 'stroke-1'
                      )}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{step.title}</p>
                  {step.description && (
                    <p className={cn(
                      'text-xs truncate',
                      isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    )}>
                      {step.description}
                    </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// 预定义的 7 步流程
export const PROJECT_STEPS: Step[] = [
  { id: 'global-settings', title: '全局设定', description: '基础配置' },
  { id: 'story-script', title: '故事剧本', description: '输入剧本' },
  { id: 'assets', title: '场景角色道具', description: 'AI 生成资产' },
  { id: 'storyboard-script', title: '分镜脚本', description: '分镜设计' },
  { id: 'storyboard-video', title: '分镜视频', description: '视频生成' },
  { id: 'dubbing-lipsync', title: '配音对口型', description: '音频合成' },
  { id: 'video-preview', title: '视频预览', description: '编辑导出' },
]
