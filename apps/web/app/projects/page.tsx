'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Plus,
  Search,
  Grid,
  List,
  Film,
  MoreVertical,
  Trash2,
  Edit,
  ArrowUpDown,
  Filter,
  Calendar,
  CheckCircle,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useProjectList, useDeleteProject, type Project } from '@/hooks/useProject'
import { useAuth } from '@/hooks/useAuth'
import { LoginPrompt } from '@/components/ui/LoginPrompt'

type ViewMode = 'grid' | 'list'
type ProjectStatus = 'all' | 'in_progress' | 'completed' | 'pending'
type ProjectType = 'all' | 'original' | 'adaptation'
type SortBy = 'updatedAt' | 'createdAt' | 'title' | 'episodes'
type SortOrder = 'asc' | 'desc'

export default function ProjectsPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { data: projects = [], isLoading, error, refetch } = useProjectList()
  const deleteProject = useDeleteProject()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  // 处理新建项目按钮点击
  const handleCreateProject = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true)
      return
    }
    router.push('/projects/new')
  }

  const handleLogin = () => {
    setShowLoginPrompt(false)
    router.push('/login')
  }
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus>('all')
  const [typeFilter, setTypeFilter] = useState<ProjectType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('updatedAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // 筛选和排序
  const filteredProjects = useMemo(() => {
    let result = [...projects]

    // 搜索筛选
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          (p.title?.toLowerCase() || '').includes(query) ||
          (p.description?.toLowerCase() || '').includes(query)
      )
    }

    // 状态筛选
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter)
    }

    // 排序
    result.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'episodes':
          comparison = (a.episodeCount || 0) - (b.episodeCount || 0)
          break
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'updatedAt':
        default:
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [projects, searchQuery, statusFilter, sortBy, sortOrder])

  const toggleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const handleDeleteProject = async (id: string, title: string) => {
    try {
      await deleteProject.mutateAsync(id)
      toast.success(`项目 "${title}" 已删除`)
    } catch {
      toast.error('删除项目失败')
    }
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">项目列表</h1>
            <p className="text-muted-foreground">管理和创建你的短剧项目</p>
          </div>
          <Button onClick={handleCreateProject} data-testid="create-project-button">
            <Plus className="h-5 w-5 mr-2" />
            新建项目
          </Button>
        </div>
        <ProjectListSkeleton viewMode={viewMode} />
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">项目列表</h1>
            <p className="text-muted-foreground">管理和创建你的短剧项目</p>
          </div>
          <Button onClick={handleCreateProject} data-testid="create-project-button">
            <Plus className="h-5 w-5 mr-2" />
            新建项目
          </Button>
        </div>
        <ErrorState 
          message={error instanceof Error ? error.message : '加载项目失败'} 
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面头部 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">项目列表</h1>
          <p className="text-muted-foreground">管理和创建你的短剧项目</p>
        </div>
        <Link href="/projects/new" data-testid="create-project-button">
          <Button>
            <Plus className="h-5 w-5 mr-2" />
            新建项目
          </Button>
        </Link>
      </motion.div>

      {/* 工具栏 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col lg:flex-row gap-4 mb-6"
      >
        {/* 搜索框 */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="搜索项目..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 筛选器 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 状态筛选 */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ProjectStatus)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="in_progress">制作中</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
            </SelectContent>
          </Select>

          {/* 排序 */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="w-[140px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="排序" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updatedAt">最近更新</SelectItem>
              <SelectItem value="createdAt">创建时间</SelectItem>
              <SelectItem value="title">名称</SelectItem>
              <SelectItem value="episodes">集数</SelectItem>
            </SelectContent>
          </Select>

          {/* 视图切换 */}
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
        </div>
      </motion.div>

      {/* 结果统计 */}
      <div className="mb-4 text-sm text-muted-foreground">
        共 {filteredProjects.length} 个项目
      </div>

      {/* 项目列表 */}
      {filteredProjects.length === 0 ? (
        <EmptyState onCreate={handleCreateProject} />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              data-testid="project-card"
            >
              <ProjectCard 
                project={project} 
                onDelete={() => handleDeleteProject(project.id, project.title)}
                isDeleting={deleteProject.isPending}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ProjectListItem 
                project={project} 
                onDelete={() => handleDeleteProject(project.id, project.title)}
                isDeleting={deleteProject.isPending}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* 登录提示弹窗 */}
      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        onLogin={handleLogin}
      />
    </div>
  )
}

interface ProjectCardProps {
  project: Project
  onDelete: () => void
  isDeleting: boolean
}

function ProjectCard({ project, onDelete, isDeleting }: ProjectCardProps) {
  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ComponentType<{ className?: string }> }> = {
    in_progress: { label: '制作中', variant: 'secondary', icon: Clock },
    completed: { label: '已完成', variant: 'default', icon: CheckCircle },
    DRAFT: { label: '草稿', variant: 'outline', icon: Clock },
    PENDING: { label: '待处理', variant: 'secondary', icon: Clock },
  }

  const status = statusConfig[project.status] || { label: '草稿', variant: 'outline' as const, icon: Clock }

  return (
    <Card className="h-full hover:shadow-lg transition-all duration-300 group hover:border-primary cursor-pointer overflow-hidden">
      <CardContent className="p-0">
        <div className="relative">
          <Link href={`/projects/${project.id}`}>
            <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden relative">
              <Film className="h-12 w-12 text-muted-foreground group-hover:text-primary transition-colors" />
              <div className="absolute top-2 right-2">
                <Badge variant={status.variant} className="flex items-center gap-1">
                  <status.icon className="h-3 w-3" />
                  {status.label}
                </Badge>
              </div>
            </div>
          </Link>
          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger >
                <Button variant="secondary" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem >
                  <Link href={`/projects/${project.id}`}>
                    <Edit className="h-4 w-4 mr-2" />
                    编辑
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={onDelete}
                  disabled={isDeleting}
                  className="text-destructive focus:text-destructive"
                  data-testid="delete-project-button"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? '删除中...' : '删除'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <Link href={`/projects/${project.id}`}>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors" data-testid="project-title">
              {project.title}
            </h3>
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
              {project.description || '暂无描述'}
            </p>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{project.episodeCount || 0} 集</span>
              <span>{new Date(project.updatedAt).toLocaleDateString('zh-CN')}</span>
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  )
}

interface ProjectListItemProps {
  project: Project
  onDelete: () => void
  isDeleting: boolean
}

function ProjectListItem({ project, onDelete, isDeleting }: ProjectListItemProps) {
  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    in_progress: { label: '制作中', variant: 'secondary' },
    completed: { label: '已完成', variant: 'default' },
    DRAFT: { label: '草稿', variant: 'outline' },
    PENDING: { label: '待处理', variant: 'secondary' },
  }

  return (
    <Card className="hover:shadow-md transition-all duration-300 group hover:border-primary cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Link href={`/projects/${project.id}`} className="flex items-center gap-4 flex-1">
            <div className="w-20 h-14 rounded bg-muted flex items-center justify-center flex-shrink-0">
              <Film className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate group-hover:text-primary transition-colors" data-testid="project-title">
                {project.title}
              </h3>
              <p className="text-muted-foreground text-sm truncate">
                {project.description || '暂无描述'}
              </p>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <span className="text-muted-foreground text-sm">{project.episodeCount || 0} 集</span>
              <Badge variant={statusConfig[project.status].variant}>
                {statusConfig[project.status].label}
              </Badge>
              <span className="text-muted-foreground text-sm">
                {new Date(project.updatedAt).toLocaleDateString('zh-CN')}
              </span>
            </div>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger >
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem >
                <Link href={`/projects/${project.id}`}>
                  <Edit className="h-4 w-4 mr-2" />
                  编辑
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={onDelete}
                disabled={isDeleting}
                className="text-destructive focus:text-destructive"
                data-testid="delete-project-button"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? '删除中...' : '删除'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

function ProjectListSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="aspect-video rounded-lg mb-4" />
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-20 h-14 rounded" />
              <div className="flex-1">
                <Skeleton className="h-5 w-48 mb-2" />
                <Skeleton className="h-4 w-96" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
        <Film className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">暂无项目</h3>
      <p className="text-muted-foreground mb-6">开始创建你的第一个短剧项目吧</p>
      <Button onClick={onCreate}>
        <Plus className="h-5 w-5 mr-2" />
        创建项目
      </Button>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 rounded-full bg-destructive/10 mx-auto mb-4 flex items-center justify-center">
        <RefreshCw className="h-10 w-10 text-destructive" />
      </div>
      <h3 className="text-xl font-semibold mb-2">加载失败</h3>
      <p className="text-muted-foreground mb-6">{message}</p>
      <Button onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        重试
      </Button>
    </div>
  )
}
