'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useCreateProject } from '@/hooks/useProject'

interface NewProjectModalProps {
  open: boolean
  onClose: () => void
}

/**
 * 纳米漫剧流水线 - 新建作品弹窗
 * 对应原型文档：docs/dev/01-new-project-modal.md
 */
export function NewProjectModal({ open, onClose }: NewProjectModalProps) {
  const router = useRouter()
  const createProject = useCreateProject()
  const [projectName, setProjectName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 字符计数
  const charCount = projectName.length
  const maxChars = 25

  // 校验规则
  const isValid = projectName.trim().length > 0 && projectName.trim().length <= maxChars
  const hasInvalidChars = /[<>/\\]/.test(projectName)

  const handleSubmit = async () => {
    if (!projectName.trim()) {
      toast.error('请输入作品名称')
      return
    }

    if (hasInvalidChars) {
      toast.error('作品名称包含非法字符')
      return
    }

    setIsSubmitting(true)
    try {
      const project = await createProject.mutateAsync({
        name: projectName.trim(),
        description: '',
        novel: '',
      })
      toast.success('作品创建成功！')
      // 跳转到全局设定页面
      router.push(`/projects/${project.id}/workflow/global-settings`)
      onClose()
      setProjectName('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setProjectName('')
    onClose()
  }

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid && !isSubmitting) {
      handleSubmit()
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                新建作品
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                仅需填写名称，即可新建作品（所有作品素材将自动保存至资产库）
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* 内容区 */}
          <div className="p-6 space-y-6">
            {/* 作品名称输入 */}
            <div className="space-y-2">
              <Label htmlFor="project-name" className="text-base">
                作品名称 (单集) *
              </Label>
              <p className="text-xs text-muted-foreground">
                （适用于有连续剧情的作品）
              </p>
              <div className="relative">
                <Input
                  id="project-name"
                  placeholder="请填写本集作品名称"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  maxLength={maxChars}
                  className={cn(
                    'text-lg pr-16',
                    !isValid && projectName.trim().length > 0 && 'border-destructive focus-visible:ring-destructive'
                  )}
                  data-testid="project-name-input"
                />
                <span className={cn(
                  'absolute right-3 top-1/2 -translate-y-1/2 text-sm',
                  charCount > maxChars * 0.9 ? 'text-destructive' : 'text-muted-foreground'
                )}>
                  {charCount}/{maxChars}
                </span>
              </div>
              {!isValid && projectName.trim().length > 0 && (
                <p className="text-xs text-destructive">请输入作品名称（1-25 字符）</p>
              )}
              {hasInvalidChars && (
                <p className="text-xs text-destructive">作品名称不能包含 &lt; &gt; / \ 等特殊符号</p>
              )}
            </div>

            {/* 4 步流程说明 */}
            <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl p-6 border border-primary/10">
              <h3 className="text-lg font-semibold mb-4 text-center">
                作品创作，仅需 4 步
              </h3>
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 text-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <span className="text-sm font-bold text-primary">①</span>
                  </div>
                  <p className="text-xs font-medium">全局设定</p>
                </div>
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M9 18l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex-1 text-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <span className="text-sm font-bold text-primary">②</span>
                  </div>
                  <p className="text-xs font-medium">添加剧本</p>
                </div>
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M9 18l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex-1 text-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <span className="text-sm font-bold text-primary">③</span>
                  </div>
                  <p className="text-xs font-medium">生成资产</p>
                </div>
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M9 18l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="flex-1 text-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                    <span className="text-sm font-bold text-primary">④</span>
                  </div>
                  <p className="text-xs font-medium">生成视频</p>
                </div>
              </div>
            </div>
          </div>

          {/* 底部操作按钮 */}
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-muted/30">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || hasInvalidChars || isSubmitting}
              className="px-8"
              data-testid="create-project-button"
            >
              {isSubmitting ? '创建中...' : '确定新建'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
