'use client'

import { ReactNode } from 'react'
import { StepNavigation, PROJECT_STEPS } from '@/components/projects/StepNavigation'

interface WorkflowLayoutProps {
  children: ReactNode
  currentStep: number
}

export default function WorkflowLayout({ children, currentStep }: WorkflowLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      {/* 左侧步骤导航 */}
      <StepNavigation
        steps={PROJECT_STEPS}
        currentStep={currentStep}
      />
      {/* 主内容区 */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
