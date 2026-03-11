'use client'

import { useState, useEffect } from 'react'
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
  const [currentStep, setCurrentStep] = useState(0)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isLoadingDraft, setIsLoadingDraft] = useState(true)

  // 表单状态
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    type: 'original',
    novel: '',
    imageModel: 'dalle3',
    videoModel: 'runway',
    style: 'cinematic',
  })

  // 加载草稿
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

  // 自动保存草稿
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
        title: formData.title,
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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 返回按钮 */}
      <Link href="/projects">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回项目列表
        </Button>
      </Link>

      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">创建新项目</h1>
        <p className="text-muted-foreground">
          按照步骤创建你的短剧项目，随时可以保存为草稿
        </p>
      </div>

      {/* 步骤条 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  index === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : index < currentStep
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <step.icon className="h-4 w-4" />
                <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-2 ${
                    index < currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 自动保存状态 */}
      {lastSaved && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Save className="h-4 w-4" />
          <span>自动保存于 {lastSaved.toLocaleTimeString('zh-CN')}</span>
        </div>
      )}

      {/* 表单步骤 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* 步骤 1: 基础信息 */}
          {currentStep === 0 && (
            <Card>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">项目名称 *</Label>
                  <Input
                    id="title"
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
                    placeholder="简单描述一下这个项目..."
                    className="min-h-[100px]"
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
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <Label>剧本输入</Label>
                  <Badge variant="secondary">支持 .txt, .doc, .pdf</Badge>
                </div>

                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-1">
                    点击或拖拽文件到此处上传
                  </p>
                  <p className="text-xs text-muted-foreground">
                    支持 TXT、Word、PDF 格式
                  </p>
                </div>

                <div className="relative">
                  <Separator className="my-4" />
                  <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-card px-2 text-xs text-muted-foreground">
                    或直接粘贴
                  </span>
                </div>

                <div className="space-y-2">
                  <Textarea
                    placeholder="在此粘贴剧本内容..."
                    className="min-h-[300px] font-mono text-sm"
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
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label>图像生成模型</Label>
                  <Select
                    value={formData.imageModel}
                    onValueChange={(value) => setFormData({ ...formData, imageModel: value || 'dalle3' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dalle3">DALL·E 3 (推荐)</SelectItem>
                      <SelectItem value="midjourney">Midjourney</SelectItem>
                      <SelectItem value="sdxl">Stable Diffusion XL</SelectItem>
                      <SelectItem value="flux">Flux</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">选择用于生成图像的 AI 模型</p>
                </div>

                <div className="space-y-2">
                  <Label>视频生成模型</Label>
                  <Select
                    value={formData.videoModel}
                    onValueChange={(value) => setFormData({ ...formData, videoModel: value || 'runway' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="runway">Runway Gen-3</SelectItem>
                      <SelectItem value="pika">Pika Labs</SelectItem>
                      <SelectItem value="kling">Kling</SelectItem>
                      <SelectItem value="luma">Luma Dream Machine</SelectItem>
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
              <CardContent className="p-6 space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Check className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">确认创建项目</h2>
                  <p className="text-muted-foreground">
                    请检查以下信息，确认无误后点击创建
                  </p>
                </div>

                <div className="space-y-4 bg-muted/50 rounded-lg p-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">项目名称</span>
                    <span className="font-medium">{formData.title}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">项目类型</span>
                    <span className="font-medium">
                      {formData.type === 'original' ? '原创作品' : '改编作品'}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">图像模型</span>
                    <span className="font-medium">{formData.imageModel}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">视频模型</span>
                    <span className="font-medium">{formData.videoModel}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">视觉风格</span>
                    <span className="font-medium">{formData.style}</span>
                  </div>
                </div>

                {formData.description && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <span className="text-muted-foreground block mb-2">项目描述</span>
                    <p className="text-sm">{formData.description}</p>
                  </div>
                )}

                {formData.novel && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <span className="text-muted-foreground block mb-2">剧本内容</span>
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
      <div className="flex justify-between mt-8">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          上一步
        </Button>

        {currentStep < steps.length - 1 ? (
          <Button onClick={nextStep}>
            下一步
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={createProject.isPending}>
            {createProject.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                创建项目
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
