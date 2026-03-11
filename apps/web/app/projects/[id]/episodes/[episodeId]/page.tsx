'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Film,
  Users,
  MapPin,
  Play,
  Sparkles,
  FileText,
  Grid,
  List,
  Wand2,
  Download,
  Clock,
  Image as ImageIcon,
  RefreshCw,
  Save,
  Loader2,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { StoryboardEditor } from '@/components/storyboard/StoryboardEditor'
import { GenerationControl } from '@/components/generation/GenerationControl'
import { useEpisode, useUpdateEpisode } from '@/hooks/useEpisode'
import { useProject } from '@/hooks/useProject'

export default function EpisodeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const episodeId = params.episodeId as string
  
  const [activeTab, setActiveTab] = useState('script')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [scriptContent, setScriptContent] = useState('')
  const [isSavingScript, setIsSavingScript] = useState(false)

  const { 
    data: episode, 
    isLoading: isLoadingEpisode, 
    error: episodeError,
    refetch: refetchEpisode 
  } = useEpisode(episodeId)
  
  const { data: project } = useProject(projectId)
  const updateEpisode = useUpdateEpisode(episodeId)

  // 处理剧本保存
  const handleSaveScript = async () => {
    setIsSavingScript(true)
    try {
      await updateEpisode.mutateAsync({
        projectId,
        input: { novelText: scriptContent }
      })
      toast.success('剧本已保存')
    } catch {
      toast.error('保存失败')
    } finally {
      setIsSavingScript(false)
    }
  }

  // 加载状态
  if (isLoadingEpisode) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EpisodeDetailSkeleton />
      </div>
    )
  }

  // 错误状态
  if (episodeError || !episode) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-destructive/10 mx-auto mb-4 flex items-center justify-center">
            <RefreshCw className="h-10 w-10 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">加载失败</h2>
          <p className="text-muted-foreground mb-6">
            {episodeError instanceof Error ? episodeError.message : '剧集不存在'}
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => refetchEpisode()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              重试
            </Button>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 计算总时长
  const totalDuration = episode.clips.reduce((acc: number, clip) => acc + (clip.duration || 0), 0)
  
  // 计算完成进度
  const completedClips = episode.clips.filter((clip) => clip.status === 'COMPLETED').length
  const progress = episode.clips.length > 0 ? Math.round((completedClips / episode.clips.length) * 100) : 0

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 返回按钮和标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Link href={`/projects/${projectId}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回项目
          </Button>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{episode.name}</h1>
            <p className="text-muted-foreground">
              {project?.title} · 第 {episode.number} 集
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline">
              <Play className="h-4 w-4 mr-2" />
              预览
            </Button>
            <Button>
              <Wand2 className="h-4 w-4 mr-2" />
              开始生成
            </Button>
          </div>
        </div>
      </motion.div>

      {/* 状态栏 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-4 mb-6 p-4 bg-muted/50 rounded-lg"
      >
        <Badge 
          variant={
            episode.scriptStatus === 'COMPLETED' 
              ? 'default' 
              : episode.scriptStatus === 'PROCESSING' 
              ? 'secondary' 
              : 'outline'
          }
        >
          {episode.scriptStatus === 'COMPLETED' 
            ? '已完成' 
            : episode.scriptStatus === 'PROCESSING' 
            ? '处理中' 
            : '待处理'}
        </Badge>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{totalDuration}秒</span>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ImageIcon className="h-4 w-4" />
          <span>{episode.storyboardCount} 个分镜</span>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">进度</span>
          <span className="font-medium">{progress}%</span>
        </div>
      </motion.div>

      {/* 主要内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="script" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            剧本
          </TabsTrigger>
          <TabsTrigger value="clips" className="flex items-center gap-2">
            <Film className="h-4 w-4" />
            片段
          </TabsTrigger>
          <TabsTrigger value="generation" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            生成
          </TabsTrigger>
        </TabsList>

        <TabsContent value="script" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                剧本编辑
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSaveScript}
                  disabled={isSavingScript}
                >
                  {isSavingScript ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  保存
                </Button>
                <Button variant="outline" size="sm">
                  <Wand2 className="h-4 w-4 mr-2" />
                  AI 解析
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  导出
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={scriptContent || episode.novelText || ''}
                onChange={(e) => setScriptContent(e.target.value)}
                className="min-h-[500px] font-mono text-sm leading-relaxed"
                placeholder="在此输入或粘贴剧本内容..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clips" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">片段列表</h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-md p-1">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              <Button>
                <Sparkles className="h-4 w-4 mr-2" />
                生成片段
              </Button>
            </div>
          </div>

          {episode.clips.length === 0 ? (
            <EmptyState 
              icon={Film} 
              title="暂无片段" 
              description="使用 AI 解析剧本或手动添加片段" 
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {episode.clips.map((clip) => (
                <Card key={clip.id} className="hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold text-muted-foreground">{clip.sequence}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {clip.description || '无描述'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={
                              clip.status === 'COMPLETED'
                                ? 'default'
                                : clip.status === 'PROCESSING'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {clip.status === 'COMPLETED'
                              ? '已完成'
                              : clip.status === 'PROCESSING'
                              ? '处理中'
                              : '待处理'}
                          </Badge>
                          {clip.duration && (
                            <span className="text-xs text-muted-foreground">
                              {clip.duration}秒
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="generation" className="space-y-4">
          <GenerationControl
            projectId={projectId}
            episodeId={episodeId}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EpisodeDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-10 w-32 mb-4" />
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-16" />
      <Skeleton className="h-96" />
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="col-span-full text-center py-12 text-muted-foreground">
      <Icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p className="font-medium">{title}</p>
      <p className="text-sm">{description}</p>
    </div>
  )
}
