'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Grid, List, Film, MoreVertical, Trash2, Edit } from 'lucide-react'

// 模拟项目数据
const initialProjects = [
  {
    id: '1',
    title: '我的第一个短剧',
    description: '这是一个测试项目，用于学习平台功能',
    episodes: 3,
    status: 'in_progress' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: '都市爱情故事',
    description: '现代都市背景的爱情短剧，讲述两个年轻人的相遇相知',
    episodes: 12,
    status: 'completed' as const,
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: '3',
    title: '古装武侠剧',
    description: '江湖恩怨，武林争霸',
    episodes: 24,
    status: 'in_progress' as const,
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

type ViewMode = 'grid' | 'list'
type ProjectStatus = 'all' | 'in_progress' | 'completed'

export default function ProjectsPage() {
  const [projects] = useState(initialProjects)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredProjects = projects.filter((project) => {
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">项目列表</h1>
          <p className="text-[var(--color-muted-fg)]">管理和创建你的短剧项目</p>
        </div>
        <Link
          href="/projects/new"
          className="btn btn-primary inline-flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          新建项目
        </Link>
      </div>

      {/* 工具栏 */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* 搜索框 */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted-fg)]" />
          <input
            type="text"
            placeholder="搜索项目..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* 状态筛选 */}
        <div className="flex gap-2">
          {(['all', 'in_progress', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-muted)] text-[var(--color-muted-fg)] hover:text-[var(--foreground)]'
              }`}
            >
              {status === 'all' && '全部'}
              {status === 'in_progress' && '制作中'}
              {status === 'completed' && '已完成'}
            </button>
          ))}
        </div>

        {/* 视图切换 */}
        <div className="flex gap-1 bg-[var(--color-muted)] rounded-md p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded ${
              viewMode === 'grid' ? 'bg-[var(--background)]' : ''
            }`}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded ${
              viewMode === 'list' ? 'bg-[var(--background)]' : ''
            }`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 项目列表 */}
      {filteredProjects.length === 0 ? (
        <EmptyState />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProjects.map((project) => (
            <ProjectListItem key={project.id} project={project} />
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
  status: 'in_progress' | 'completed'
  createdAt: string
  updatedAt: string
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.id}`} className="block group">
      <div className="card h-full hover:shadow-lg transition-all duration-300 group-hover:border-[var(--color-primary)]">
        <div className="aspect-video rounded-lg bg-[var(--color-secondary)] mb-4 flex items-center justify-center overflow-hidden relative">
          <Film className="h-12 w-12 text-[var(--color-muted-fg)] group-hover:text-[var(--color-primary)] transition-colors" />
          <div className="absolute top-2 right-2">
            <span className={`badge ${
              project.status === 'completed' ? 'badge-success' : 'badge-primary'
            }`}>
              {project.status === 'completed' ? '已完成' : '制作中'}
            </span>
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2 group-hover:text-[var(--color-primary)] transition-colors">
          {project.title}
        </h3>
        <p className="text-[var(--color-muted-fg)] text-sm mb-4 line-clamp-2">
          {project.description}
        </p>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--color-muted-fg)]">
            {project.episodes} 集
          </span>
          <span className="text-[var(--color-muted-fg)]">
            更新于 {new Date(project.updatedAt).toLocaleDateString('zh-CN')}
          </span>
        </div>
      </div>
    </Link>
  )
}

function ProjectListItem({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.id}`} className="block">
      <div className="card hover:shadow-md transition-all duration-300 group hover:border-[var(--color-primary)]">
        <div className="flex items-center gap-4">
          <div className="w-20 h-14 rounded bg-[var(--color-secondary)] flex items-center justify-center flex-shrink-0">
            <Film className="h-6 w-6 text-[var(--color-muted-fg)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate group-hover:text-[var(--color-primary)] transition-colors">
              {project.title}
            </h3>
            <p className="text-[var(--color-muted-fg)] text-sm truncate">
              {project.description}
            </p>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <span className="text-[var(--color-muted-fg)] text-sm">
              {project.episodes} 集
            </span>
            <span className={`badge ${
              project.status === 'completed' ? 'badge-success' : 'badge-primary'
            }`}>
              {project.status === 'completed' ? '已完成' : '制作中'}
            </span>
            <span className="text-[var(--color-muted-fg)] text-sm">
              {new Date(project.updatedAt).toLocaleDateString('zh-CN')}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 rounded-full bg-[var(--color-muted)] mx-auto mb-4 flex items-center justify-center">
        <Film className="h-10 w-10 text-[var(--color-muted-fg)]" />
      </div>
      <h3 className="text-xl font-semibold mb-2">暂无项目</h3>
      <p className="text-[var(--color-muted-fg)] mb-6">开始创建你的第一个短剧项目吧</p>
      <Link href="/projects/new" className="btn btn-primary inline-flex items-center gap-2">
        <Plus className="h-5 w-5" />
        创建项目
      </Link>
    </div>
  )
}
