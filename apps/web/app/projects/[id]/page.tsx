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
  Clock,
  Plus,
  Play,
  Settings,
  ChevronRight,
  Activity,
  CheckCircle,
  Trash2,
  Edit,
  Save,
  X,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  useProject,
  useUpdateProject,
  useDeleteProject,
} from '@/hooks/useProject'
import { useEpisodesByProject } from '@/hooks/useEpisode'
import { useCharacterList } from '@/hooks/useCharacter'
import { useLocationList } from '@/hooks/useLocation'

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const [activeTab, setActiveTab] = useState('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', description: '' })

  const {
    data: project,
    isLoading: isLoadingProject,
    error: projectError,
    refetch: refetchProject,
  } = useProject(projectId)

  const { data: episodes = [], isLoading: isLoadingEpisodes } = useEpisodesByProject(projectId)
  const { data: characters = [], isLoading: isLoadingCharacters } = useCharacterList(projectId)
  const { data: locations = [], isLoading: isLoadingLocations } = useLocationList(projectId)

  const updateProject = useUpdateProject(projectId)
  const deleteProject = useDeleteProject()

  // 开始编辑
  const handleStartEdit = () => {
    if (project) {
      setEditForm({
        title: project.title,
        description: project.description || '',
      })
      setIsEditing(true)
    }
  }

  // 保存编辑
  const handleSaveEdit = async () => {
    try {
      await updateProject.mutateAsync({
        title: editForm.title,
        description: editForm.description,
      })
      toast.success('项目信息已更新')
      setIsEditing(false)
    } catch {
      toast.error('更新失败，请重试')
    }
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false)
  }

  // 删除项目
  const handleDelete = async () => {
    if (!project) return
    
    if (!confirm(`确定要删除项目 "${project.title}" 吗？此操作不可恢复。`)) {
      return
    }

    try {
      await deleteProject.mutateAsync(projectId)
      toast.success('项目已删除')
      router.push('/projects')
    } catch {
      toast.error('删除失败，请重试')
    }
  }

  // 加载状态
  if (isLoadingProject) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ProjectDetailSkeleton />
      </div>
    )
  }

  // 错误状态
  if (projectError || !project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <div className="w-20 h-20 rounded-full bg-destructive/10 mx-auto mb-4 flex items-center justify-center">
            <RefreshCw className="h-10 w-10 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">加载失败</h2>
          <p className="text-muted-foreground mb-6">
            {projectError instanceof Error ? projectError.message : '项目不存在'}
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => refetchProject()}>
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 返回按钮和标题 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Link href="/projects">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回项目列表
          </Button>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center">
              <Film className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="text-lg font-bold"
                    placeholder="项目名称"
                  />
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="text-sm min-h-[60px]"
                    placeholder="项目描述"
                  />
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold">{project.title}</h1>
                  <p className="text-muted-foreground">{project.description || '暂无描述'}</p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-2" />
                  取消
                </Button>
                <Button onClick={handleSaveEdit} disabled={updateProject.isPending}>
                  {updateProject.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  保存
                </Button>
              </>
            ) : (
              <>
                {episodes.length > 0 && (
                  <Link href={`/projects/${project.id}/episodes/${episodes[0]?.id}`}>
                    <Button>
                      <Play className="h-4 w-4 mr-2" />
                      继续编辑
                    </Button>
                  </Link>
                )}
                <Button variant="outline" onClick={handleStartEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  编辑
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleteProject.isPending}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  删除
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* 统计卡片 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
      >
        <StatCard
          icon={Film}
          label="剧集数"
          value={isLoadingEpisodes ? '...' : `${episodes.length}`}
        />
        <StatCard
          icon={Users}
          label="角色数"
          value={isLoadingCharacters ? '...' : `${characters.length}`}
        />
        <StatCard
          icon={MapPin}
          label="场景数"
          value={isLoadingLocations ? '...' : `${locations.length}`}
        />
        <StatCard
          icon={Clock}
          label="最后更新"
          value={new Date(project.updatedAt).toLocaleDateString('zh-CN')}
        />
      </motion.div>

      {/* 主要内容区 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="episodes">剧集</TabsTrigger>
          <TabsTrigger value="characters">角色</TabsTrigger>
          <TabsTrigger value="locations">场景</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 进度概览 */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  项目进度
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {isLoadingEpisodes
                          ? '...'
                          : episodes.filter((e) => e.storyboardCount > 0).length}
                      </div>
                      <div className="text-sm text-muted-foreground">已有分镜</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-secondary">
                        {isLoadingEpisodes
                          ? '...'
                          : episodes.filter((e) => e.clipCount > 0).length}
                      </div>
                      <div className="text-sm text-muted-foreground">已有片段</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-muted-foreground">
                        {isLoadingEpisodes
                          ? '...'
                          : episodes.filter((e) => e.scriptStatus === 'COMPLETED').length}
                      </div>
                      <div className="text-sm text-muted-foreground">剧本完成</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 项目信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  项目信息
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">创建时间</p>
                    <p className="font-medium">
                      {new Date(project.createdAt).toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">状态</p>
                    <Badge variant={project.status === 'completed' ? 'default' : 'secondary'}>
                      {project.status === 'completed' ? '已完成' : '制作中'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">项目ID</p>
                    <p className="font-medium text-xs">{project.id}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 快捷入口 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-6">
                <Link href={`/library/characters?project=${project.id}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">角色库</h3>
                      <p className="text-sm text-muted-foreground">
                        管理 {isLoadingCharacters ? '...' : characters.length} 个角色
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-6">
                <Link href={`/library/locations?project=${project.id}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">场景库</h3>
                      <p className="text-sm text-muted-foreground">
                        管理 {isLoadingLocations ? '...' : locations.length} 个场景
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Link>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="episodes" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">剧集列表</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              添加剧集
            </Button>
          </div>

          {isLoadingEpisodes ? (
            <EpisodesSkeleton />
          ) : episodes.length === 0 ? (
            <EmptyState icon={Film} title="暂无剧集" description="添加你的第一个剧集开始创作" />
          ) : (
            <div className="space-y-3">
              {episodes.map((episode, index) => (
                <Link key={episode.id} href={`/projects/${project.id}/episodes/${episode.id}`}>
                  <Card className="hover:shadow-md transition-all group cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <span className="text-lg font-bold text-muted-foreground">{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{episode.name}</h3>
                          <p className="text-muted-foreground text-sm">
                            {episode.clipCount || 0} 个片段 · {episode.storyboardCount || 0} 个分镜
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
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
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="characters" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">角色列表</h2>
            <Link href={`/projects/${project.id}/characters/new`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                添加角色
              </Button>
            </Link>
          </div>

          {isLoadingCharacters ? (
            <CharactersSkeleton />
          ) : characters.length === 0 ? (
            <EmptyState icon={Users} title="暂无角色" description="添加角色来丰富你的故事" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {characters.map((character) => (
                <Link
                  key={character.id}
                  href={`/projects/${project.id}/characters/${character.id}`}
                >
                  <Card className="hover:shadow-md transition-all group cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-14 w-14">
                          <AvatarFallback className="bg-primary/10 text-primary text-lg">
                            {character.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">{character.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              {character.roleLevel || 'E'}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-sm">{character.archetype || '未知角色'}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}

              <Link href={`/projects/${project.id}/characters/new`}>
                <Card className="border-dashed hover:border-primary transition-colors cursor-pointer min-h-[100px] flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Plus className="h-6 w-6" />
                    <span className="text-sm">添加角色</span>
                  </div>
                </Card>
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="locations" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">场景列表</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              添加场景
            </Button>
          </div>

          {isLoadingLocations ? (
            <LocationsSkeleton />
          ) : locations.length === 0 ? (
            <EmptyState icon={MapPin} title="暂无场景" description="添加场景来设置你的故事背景" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((location) => (
                <Card
                  key={location.id}
                  className="hover:shadow-md transition-all group cursor-pointer overflow-hidden"
                >
                  <CardContent className="p-0">
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <MapPin className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold">{location.name}</h3>
                      <Badge variant="secondary" className="mt-2">
                        {location.locationType === 'INDOOR'
                          ? '室内'
                          : location.locationType === 'OUTDOOR'
                          ? '室外'
                          : location.locationType === 'VIRTUAL'
                          ? '虚拟'
                          : '过渡'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card className="border-dashed hover:border-primary transition-colors cursor-pointer min-h-[200px] flex flex-col items-center justify-center">
                <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-muted-foreground">添加场景</span>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string | number
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-muted-foreground text-sm">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ProjectDetailSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-xl" />
        <div className="flex-1">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  )
}

function EpisodesSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function CharactersSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function LocationsSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-0">
            <Skeleton className="aspect-video" />
            <div className="p-4">
              <Skeleton className="h-5 w-24 mb-2" />
              <Skeleton className="h-4 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
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
    <div className="text-center py-16">
      <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}
