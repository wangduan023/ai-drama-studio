'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Film,
  Sparkles,
  Upload,
  FileText,
  Save,
  Loader2,
  X,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useCreateProject } from '@/hooks/useProject'
import { useAiModels } from '@/hooks/useAiModels'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

const steps = [
  { id: 'basic', title: '基础信息', icon: Film },
  { id: 'script', title: '剧本输入', icon: FileText },
  { id: 'ai', title: 'AI 设置', icon: Sparkles },
  { id: 'confirm', title: '确认', icon: Check },
]

const STORAGE_KEY = 'project-draft'

interface FormData {
  title: string
  description: string
  type: 'original' | 'adaptation'
  novel: string
  imageModel: string
  videoModel: string
  style: string
}

export default function NewProjectPage() {
  const router = useRouter()
  const createProject = useCreateProject()
  const { models, fetchModels } = useAiModels()
  const [currentStep, setCurrentStep] = useState(0)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isLoadingDraft, setIsLoadingDraft] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    type: 'original',
    novel: '',
    imageModel: '',
    videoModel: '',
    style: 'cinematic',
  })

  // 加载 AI 模型列表
  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  // 当模型加载完成后，设置默认值
  useEffect(() => {
    if (models.length > 0) {
      const imageModels = models.filter(m => m.type === 'IMAGE' && m.isEnabled)
      const videoModels = models.filter(m => m.type === 'VIDEO' && m.isEnabled)
      
      setFormData(prev => ({
        ...prev,
        imageModel: imageModels[0]?.modelId || prev.imageModel,
        videoModel: videoModels[0]?.modelId || prev.videoModel,
      }))
    }
  }, [models])

  const handleFileSelect = useCallback(async (file: File) => {
    const allowedTypes = [
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf'
    ]
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
      setFormData(prev => ({ ...prev, novel: text }))
      toast.success(`已加载文件: ${file.name}`)
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

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

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

  const handleClearFile = () => {
    setUploadedFile(null)
    setFormData(prev => ({ ...prev, novel: '' }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const draft = JSON.parse(saved)
        setFormData((prev) => ({ ...prev, ...draft }))
        toast.info('已恢复上次保存的草稿')
      } catch {
        // 忽略解析错误
      }
    }
    setIsLoadingDraft(false)
  }, [])

  useEffect(() => {
    if (isLoadingDraft) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData))
    setLastSaved(new Date())
  }, [formData, isLoadingDraft])

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('请输入项目名称')
      setCurrentStep(0)
      return
    }

    try {
      const project = await createProject.mutateAsync({
        name: formData.title,
        description: formData.description,
        novel: formData.novel,
      })
      localStorage.removeItem(STORAGE_KEY)
      toast.success('项目创建成功！')
      router.push(`/projects/${project.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建失败，请重试')
    }
  }

  const nextStep = () => {
    if (currentStep === 0 && !formData.title.trim()) {
      toast.error('请输入项目名称')
      return
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (isLoadingDraft) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* 返回按钮 */}
      <Link href="/projects">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回项目列表
        </Button>
      </Link>

      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">创建新项目</h1>
        <p className="text-sm text-muted-foreground">
          按照步骤创建你的短剧项目，随时可以保存为草稿
        </p>
      </div>

      {/* 紧凑的步骤条和进度区域 */}
      <div className="mb-6 border-2 border-dashed border-border/60 rounded-xl p-4 bg-muted/20">
        {/* 步骤指示器 - 均匀分布 */}
        <div className="flex items-center justify-between mb-3">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = index === currentStep
            const isCompleted = index < currentStep
            const isPending = index > currentStep
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                {/* 步骤按钮 */}
                <div
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 text-sm whitespace-nowrap',
                    isActive
                      ? 'bg-primary text-primary-foreground font-medium shadow-lg shadow-primary/25 scale-105'
                      : isCompleted
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <div className={cn(
                    'flex items-center justify-center w-5 h-5 rounded-full',
                    isActive ? 'bg-primary-foreground text-primary' : 
                    isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20'
                  )}>
                    {isCompleted ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <span className="text-xs font-bold">{index + 1}</span>
                    )}
                  </div>
                  <span className="hidden sm:inline">{step.title}</span>
                </div>
                
                {/* 箭头装饰 - 除了最后一个步骤 */}
                {index < steps.length - 1 && (
                  <div className="flex-1 flex items-center justify-center px-2">
                    <ChevronRight className={cn(
                      'h-5 w-5 transition-colors',
                      isCompleted ? 'text-primary' : 'text-muted-foreground/30'
                    )} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 进度条和状态信息（同一行） */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Progress 
              value={((currentStep + 1) / steps.length) * 100} 
              className="h-1.5" 
            />
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground whitespace-nowrap">
            <span className="font-medium text-foreground">
              步骤 {currentStep + 1} / {steps.length}
            </span>
            <span className="text-primary font-medium">
              {Math.round(((currentStep + 1) / steps.length) * 100)}%
            </span>
            {lastSaved && (
              <span className="flex items-center gap-1">
                <Save className="h-3 w-3" />
                自动保存于 {lastSaved.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 表单步骤 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* 步骤 1: 基础信息 */}
          {currentStep === 0 && (
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="title">项目名称 *</Label>
                  <Input
                    id="title"
                    data-testid="project-name-input"
                    placeholder="输入项目名称..."
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">给你的短剧项目起个名字</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">项目描述</Label>
                  <Textarea
                    id="description"
                    data-testid="project-description-input"
                    placeholder="简单描述一下这个项目..."
                    className="min-h-[80px]"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">简短描述项目内容，方便日后管理</p>
                </div>

                <div className="space-y-2">
                  <Label>项目类型</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value as 'original' | 'adaptation' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择项目类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="original">原创作品</SelectItem>
                      <SelectItem value="adaptation">改编作品</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">选择项目类型有助于 AI 更好地理解和处理</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 步骤 2: 剧本输入 */}
          {currentStep === 1 && (
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <Label>剧本输入</Label>
                  <Badge variant="secondary">支持 .txt, .doc, .pdf</Badge>
                </div>

                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer relative ${
                    isDragging 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={handleUploadClick}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.doc,.docx,.pdf"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                  
                  {uploadedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-6 w-6 text-primary" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">
                          {uploadedFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(uploadedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleClearFile()
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-1">
                        点击或拖拽文件到此处上传
                      </p>
                      <p className="text-xs text-muted-foreground">
                        支持 TXT、Word、PDF 格式，最大 10MB
                      </p>
                    </>
                  )}
                </div>

                <div className="relative">
                  <Separator className="my-3" />
                  <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-card px-2 text-xs text-muted-foreground">
                    或直接粘贴
                  </span>
                </div>

                <div className="space-y-2">
                  <Textarea
                    placeholder="在此粘贴剧本内容..."
                    className="min-h-[200px] font-mono text-sm"
                    value={formData.novel}
                    onChange={(e) => setFormData({ ...formData, novel: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    支持标准剧本格式，AI 将自动解析场景和对话
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 步骤 3: AI 设置 */}
          {currentStep === 2 && (
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label>图像生成模型</Label>
                  <Select
                    value={formData.imageModel}
                    onValueChange={(value: string | null) => value && setFormData({ ...formData, imageModel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择图像模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.filter(m => m.type === 'IMAGE' && m.isEnabled).map((model) => (
                        <SelectItem key={model.id} value={model.modelId}>
                          <div className="flex flex-col">
                            <span>{model.name}</span>
                            {model.description && (
                              <span className="text-xs text-gray-500">{model.description}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                      {models.filter(m => m.type === 'IMAGE' && m.isEnabled).length === 0 && (
                        <SelectItem value="" disabled>暂无可用的图像模型</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">选择用于生成图像的 AI 模型</p>
                </div>

                <div className="space-y-2">
                  <Label>视频生成模型</Label>
                  <Select
                    value={formData.videoModel}
                    onValueChange={(value: string | null) => value && setFormData({ ...formData, videoModel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择视频模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.filter(m => m.type === 'VIDEO' && m.isEnabled).map((model) => (
                        <SelectItem key={model.id} value={model.modelId}>
                          <div className="flex flex-col">
                            <span>{model.name}</span>
                            {model.description && (
                              <span className="text-xs text-gray-500">{model.description}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                      {models.filter(m => m.type === 'VIDEO' && m.isEnabled).length === 0 && (
                        <SelectItem value="" disabled>暂无可用的视频模型</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">选择用于生成视频的 AI 模型</p>
                </div>

                <div className="space-y-2">
                  <Label>视觉风格</Label>
                  <Select
                    value={formData.style}
                    onValueChange={(value) => setFormData({ ...formData, style: value || 'cinematic' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cinematic">电影感 (Cinematic)</SelectItem>
                      <SelectItem value="anime">动漫风格 (Anime)</SelectItem>
                      <SelectItem value="realistic">写实风格 (Realistic)</SelectItem>
                      <SelectItem value="noir">黑白电影 (Film Noir)</SelectItem>
                      <SelectItem value="vintage">复古风格 (Vintage)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">选择整体视觉风格</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 步骤 4: 确认 */}
          {currentStep === 3 && (
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="text-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Check className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold mb-1">确认创建项目</h2>
                  <p className="text-sm text-muted-foreground">
                    请检查以下信息，确认无误后点击创建
                  </p>
                </div>

                <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">项目名称</span>
                    <span className="font-medium">{formData.title}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">项目类型</span>
                    <span className="font-medium">
                      {formData.type === 'original' ? '原创作品' : '改编作品'}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">图像模型</span>
                    <span className="font-medium">{formData.imageModel}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">视频模型</span>
                    <span className="font-medium">{formData.videoModel}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">视觉风格</span>
                    <span className="font-medium">{formData.style}</span>
                  </div>
                </div>

                {formData.description && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <span className="text-muted-foreground block mb-2 text-sm">项目描述</span>
                    <p className="text-sm">{formData.description}</p>
                  </div>
                )}

                {formData.novel && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <span className="text-muted-foreground block mb-2 text-sm">剧本内容</span>
                    <p className="text-sm line-clamp-3">{formData.novel}</p>
                    {formData.novel.length > 100 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        共 {formData.novel.length} 字符
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 导航按钮 */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={prevStep}
          disabled={currentStep === 0}
          data-testid="prev-button"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          上一步
        </Button>

        {currentStep < steps.length - 1 ? (
          <Button size="sm" onClick={nextStep} data-testid="next-button">
            下一步
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button 
            size="sm" 
            onClick={handleSubmit} 
            disabled={createProject.isPending} 
            data-testid="submit-button"
          >
            {createProject.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                创建项目
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
