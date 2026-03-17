'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Undo2,
  Redo2,
  Copy,
  Trash2,
  Upload,
  History,
  ArrowRight,
  Share2,
  Coins,
  FileText,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { StepNavigation, PROJECT_STEPS } from '@/components/projects/StepNavigation'
import { cn } from '@/lib/utils'

const MAX_CHARS = 10000
const SUGGESTED_CHARS = 2000

export default function StoryScriptPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string

  const [scriptContent, setScriptContent] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const charCount = scriptContent.length

  // 处理文件上传
  const handleFileSelect = useCallback(async (file: File) => {
    const allowedTypes = ['text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/pdf']
    const allowedExtensions = ['.txt', '.doc', '.docx', '.pdf']
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))

    if (!allowedExtensions.includes(fileExtension)) {
      toast.error('不支持的文件格式，请上传 TXT、Word 或 PDF 文件')
      return
    }

    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error('文件大小超过 10MB 限制')
      return
    }

    setUploadedFile(file)

    try {
      const text = await readFileAsText(file)
      setScriptContent(text)
      toast.success(`已加载文件：${file.name}`)
    } catch (error) {
      toast.error('文件读取失败')
      console.error('File read error:', error)
    }
  }, [])

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string || '')
      reader.onerror = (e) => reject(e)
      reader.readAsText(file)
    })
  }

  // 处理拖拽
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  // 操作按钮处理
  const handleCopy = async () => {
    if (!scriptContent) {
      toast.error('没有可复制的内容')
      return
    }
    await navigator.clipboard.writeText(scriptContent)
    toast.success('已复制到剪贴板')
  }

  const handleClear = () => {
    if (!scriptContent) return

    if (confirm('确定要清空所有内容吗？此操作不可恢复。')) {
      setScriptContent('')
      setUploadedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      toast.success('已清空内容')
    }
  }

  const handleUndo = () => {
    toast.info('撤销功能开发中...')
  }

  const handleRedo = () => {
    toast.info('重做功能开发中...')
  }

  const handleHistory = () => {
    setShowHistory(!showHistory)
    toast.info('历史版本功能开发中...')
  }

  const handleNext = () => {
    if (!scriptContent.trim()) {
      toast.error('请输入剧本内容')
      return
    }
    if (charCount > MAX_CHARS) {
      toast.error('剧本内容超过最大字数限制')
      return
    }

    toast.success('剧本已保存')
    // 跳转到下一步：场景角色道具
    router.push(`/projects/${projectId}/workflow/assets`)
  }

  const isOverSuggested = charCount > SUGGESTED_CHARS
  const isOverMax = charCount > MAX_CHARS

  return (
    <div className="flex h-screen bg-background">
      {/* 左侧步骤导航 */}
      <StepNavigation
        steps={PROJECT_STEPS}
        currentStep={1}
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
                disabled={!scriptContent.trim() || isOverMax}
              >
                下一步：场景角色道具
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </header>

        {/* 编辑区 */}
        <main className="p-6 h-full flex flex-col">
          <div className="flex-1 flex flex-col gap-4 max-w-5xl mx-auto w-full">
            {/* 工具栏 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleUndo} title="撤销">
                  <Undo2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleRedo} title="重做">
                  <Redo2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCopy} title="复制">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClear} title="清空">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.doc,.docx,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  导入剧本
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleHistory}
                >
                  <History className="h-4 w-4 mr-1" />
                  历史版本
                </Button>
              </div>
            </div>

            {/* 文件上传区域（如果有文件） */}
            {uploadedFile && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{uploadedFile.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(uploadedFile.size / 1024).toFixed(1)} KB)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-6 w-6 p-0"
                  onClick={() => {
                    setUploadedFile(null)
                    setScriptContent('')
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ''
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* 文本编辑区 */}
            <div
              className={cn(
                'flex-1 border-2 border-dashed rounded-lg p-4 transition-colors',
                isDragging && 'border-primary bg-primary/5'
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Textarea
                placeholder="请输入本集剧本内容（建议 2000 字以内），或点击右上角「导入剧本（单集）」"
                className="w-full h-full min-h-[400px] resize-none border-0 focus-visible:ring-0 font-mono text-base leading-relaxed"
                value={scriptContent}
                onChange={(e) => setScriptContent(e.target.value)}
              />

              {/* 拖拽提示（当没有内容时显示） */}
              {!scriptContent && !uploadedFile && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center text-muted-foreground p-8">
                    <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">
                      拖拽文件到此处上传
                    </p>
                    <p className="text-sm">
                      支持 TXT、Word、PDF 格式，最大 10MB
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 提示信息和字符计数 */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                <p>提示：若为全集/多集内容，请按集拆分后分别创建作品导入</p>
                {isOverSuggested && !isOverMax && (
                  <p className="text-amber-500 mt-1">
                    当前字数已超过建议值（2000 字），可能会影响分镜生成效果
                  </p>
                )}
                {isOverMax && (
                  <p className="text-destructive mt-1">
                    剧本内容已超过最大字数限制（10000 字）
                  </p>
                )}
              </div>
              <div className={cn(
                'px-3 py-1 rounded-full text-sm font-medium',
                isOverMax ? 'bg-destructive/10 text-destructive' :
                isOverSuggested ? 'bg-amber-500/10 text-amber-500' :
                'bg-muted text-muted-foreground'
              )}>
                {charCount} / {MAX_CHARS}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
