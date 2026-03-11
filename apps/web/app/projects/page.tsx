'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
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

// 模拟项目数据
const initialProjects = [
  {
    id: '1',
    title: '我的第一个短剧',
    description: '这是一个测试项目，用于学习平台功能',
    episodes: 3,
    status: 'in_progress' as const,
    type: 'original',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: '都市爱情故事',
    description: '现代都市背景的爱情短剧，讲述两个年轻人的相遇相知',
    episodes: 12,
    status: 'completed' as const,
    type: 'adaptation',
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: '3',
    title: '古装武侠剧',
    description: '江湖恩怨，武林争霸，一段传奇的武侠故事',
    episodes: 24,
    status: 'in_progress' as const,
    type: 'original',
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    title: '科幻冒险',
    description: '未来世界的科幻冒险故事',
    episodes: 8,
    status: 'pending' as const,
    type: 'original',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
]

type ViewMode = 'grid' | 'list'
type ProjectStatus = 'all' | 'in_progress' | 'completed' | 'pending'
type ProjectType = 'all' | 'original' | 'adaptation'
type SortBy = 'updatedAt' | 'createdAt' | 'title' | 'episodes'
type SortOrder = 'asc' | 'desc'

export default function ProjectsPage() {
  const [projects] = useState(initialProjects)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus>('all')
  const [typeFilter, setTypeFilter] = useState<ProjectType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('updatedAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [isLoading, setIsLoading] = useState(false)

  // 筛选和排序
  const filteredProjects = useMemo(() => {
    let result = [...projects]

    // 搜索筛选
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
      )
    }

    // 状态筛选
    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter)
    }

    // 类型筛选
    if (typeFilter !== 'all') {
      result = result.filter((p) => p.type === typeFilter)
    }

    // 排序
    result.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'episodes':
          comparison = a.episodes - b.episodes
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
  }, [projects, searchQuery, statusFilter, typeFilter, sortBy, sortOrder])

  const toggleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
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
        <Button >
          <Link href="/projects/new" className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            新建项目
          </Link>
        </Button>
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
              <SelectItem value="pending">待开始</SelectItem>
            </SelectContent>
          </Select>

          {/* 类型筛选 */}
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ProjectType)}>
            <SelectTrigger className="w-[140px]">
              <Film className="h-4 w-4 mr-2" />
              <SelectValue placeholder="类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="original">原创</SelectItem>
              <SelectItem value="adaptation">改编</SelectItem>
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
      {isLoading ? (
        <ProjectListSkeleton viewMode={viewMode} />
      ) : filteredProjects.length === 0 ? (
        <EmptyState />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ProjectCard project={project} />
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
              <ProjectListItem project={project} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

interface Project {
  id: string
  title: string
  description: string
  episodes: number
  status: 'in_progress' | 'completed' | 'pending'
  type: string
  createdAt: string
  updatedAt: string
}

function ProjectCard({ project }: { project: Project }) {
  const statusConfig = {
    in_progress: { label: '制作中', variant: 'secondary' as const, icon: Clock },
    completed: { label: '已完成', variant: 'default' as const, icon: CheckCircle },
    pending: { label: '待开始', variant: 'outline' as const, icon: Film },
  }

  const status = statusConfig[project.status]

  return (
    <Card className="h-full hover:shadow-lg transition-all duration-300 group hover:border-primary cursor-pointer overflow-hidden">
      <CardContent className="p-0">
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
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
              {project.title}
            </h3>
            <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
              {project.description}
            </p>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{project.episodes} 集</span>
              <span>{new Date(project.updatedAt).toLocaleDateString('zh-CN')}</span>
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  )
}

function ProjectListItem({ project }: { project: Project }) {
  const statusConfig = {
    in_progress: { label: '制作中', variant: 'secondary' as const },
    completed: { label: '已完成', variant: 'default' as const },
    pending: { label: '待开始', variant: 'outline' as const },
  }

  return (
    <Card className="hover:shadow-md transition-all duration-300 group hover:border-primary cursor-pointer">
      <CardContent className="p-4">
        <Link href={`/projects/${project.id}`}>
          <div className="flex items-center gap-4">
            <div className="w-20 h-14 rounded bg-muted flex items-center justify-center flex-shrink-0">
              <Film className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                {project.title}
              </h3>
              <p className="text-muted-foreground text-sm truncate">
                {project.description}
              </p>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0">
              <span className="text-muted-foreground text-sm">{project.episodes} 集</span>
              <Badge variant={statusConfig[project.status].variant}>
                {statusConfig[project.status].label}
              </Badge>
              <span className="text-muted-foreground text-sm">
                {new Date(project.updatedAt).toLocaleDateString('zh-CN')}
              </span>
            </div>
          </div>
        </Link>
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

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
        <Film className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">暂无项目</h3>
      <p className="text-muted-foreground mb-6">开始创建你的第一个短剧项目吧</p>
      <Button >
        <Link href="/projects/new" className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          创建项目
        </Link>
      </Button>
    </div>
  )
}
