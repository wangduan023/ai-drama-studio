'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Film,
  Users,
  MapPin,
  Clock,
  Plus,
  Play,
  Settings,
  MoreVertical,
  Edit,
  Trash2,
  ChevronRight,
} from 'lucide-react'

// 模拟项目详情数据
const mockProject = {
  id: '1',
  title: '我的第一个短剧',
  description: '这是一个测试项目，用于学习平台功能',
  novel: '从前有一个年轻人，他梦想成为一名伟大的艺术家...',
  status: 'in_progress' as const,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  characters: [
    { id: '1', name: '张三', role: '主角', avatar: null },
    { id: '2', name: '李四', role: '配角', avatar: null },
  ],
  locations: [
    { id: '1', name: '城市广场', type: '室外' },
    { id: '2', name: '咖啡厅', type: '室内' },
  ],
  episodes: [
    { id: '1', title: '第一集：初遇', status: 'completed' as const, duration: 120 },
    { id: '2', title: '第二集：误会', status: 'in_progress' as const, duration: 0 },
    { id: '3', title: '第三集：和解', status: 'pending' as const, duration: 0 },
  ],
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [project] = useState(mockProject)
  const [activeTab, setActiveTab] = useState<'episodes' | 'characters' | 'locations'>('episodes')

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-2">项目不存在</h2>
          <button onClick={() => router.back()} className="btn btn-primary">
            返回
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 返回按钮和标题 */}
      <div className="mb-6">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-[var(--color-muted-fg)] hover:text-[var(--foreground)] mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          返回项目列表
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-[var(--color-primary)] flex items-center justify-center">
              <Film className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{project.title}</h1>
              <p className="text-[var(--color-muted-fg)]">{project.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${project.id}/episodes/${project.episodes[0]?.id}`}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              继续编辑
            </Link>
            <button className="btn btn-secondary inline-flex items-center gap-2">
              <Settings className="h-4 w-4" />
              设置
            </button>
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Film} label="剧集数" value={`${project.episodes.length}`} />
        <StatCard icon={Users} label="角色数" value={`${project.characters.length}`} />
        <StatCard icon={MapPin} label="场景数" value={`${project.locations.length}`} />
        <StatCard icon={Clock} label="最后更新" value={new Date(project.updatedAt).toLocaleDateString('zh-CN')} />
      </div>

      {/* 选项卡 */}
      <div className="flex gap-2 border-b border-[var(--border)] mb-6">
        <TabButton
          active={activeTab === 'episodes'}
          onClick={() => setActiveTab('episodes')}
          icon={Film}
          label="剧集"
          count={project.episodes.length}
        />
        <TabButton
          active={activeTab === 'characters'}
          onClick={() => setActiveTab('characters')}
          icon={Users}
          label="角色"
          count={project.characters.length}
        />
        <TabButton
          active={activeTab === 'locations'}
          onClick={() => setActiveTab('locations')}
          icon={MapPin}
          label="场景"
          count={project.locations.length}
        />
      </div>

      {/* 选项卡内容 */}
      {activeTab === 'episodes' && (
        <EpisodesList episodes={project.episodes} projectId={project.id} />
      )}
      {activeTab === 'characters' && (
        <CharactersList characters={project.characters} />
      )}
      {activeTab === 'locations' && (
        <LocationsList locations={project.locations} />
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-[var(--color-primary)]" />
        </div>
        <div>
          <p className="text-[var(--color-muted-fg)] text-sm">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
  count: number
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
        active
          ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
          : 'border-transparent text-[var(--color-muted-fg)] hover:text-[var(--foreground)]'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
      <span className="text-xs bg-[var(--color-muted)] px-2 py-0.5 rounded-full">{count}</span>
    </button>
  )
}

function EpisodesList({ episodes, projectId }: { episodes: typeof mockProject.episodes; projectId: string }) {
  return (
    <div className="space-y-3">
      {episodes.map((episode, index) => (
        <Link
          key={episode.id}
          href={`/projects/${projectId}/episodes/${episode.id}`}
          className="block"
        >
          <div className="card hover:shadow-md transition-all flex items-center gap-4 p-4">
            <div className="w-12 h-12 rounded-lg bg-[var(--color-secondary)] flex items-center justify-center flex-shrink-0">
              <Film className="h-6 w-6 text-[var(--color-muted-fg)]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{episode.title}</h3>
              <p className="text-[var(--color-muted-fg)] text-sm">
                {episode.duration > 0 ? `${episode.duration}秒` : '未生成'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge ${
                episode.status === 'completed' ? 'badge-success' :
                episode.status === 'in_progress' ? 'badge-primary' : 'badge-warning'
              }`}>
                {episode.status === 'completed' ? '已完成' :
                 episode.status === 'in_progress' ? '制作中' : '待制作'}
              </span>
              <ChevronRight className="h-4 w-4 text-[var(--color-muted-fg)]" />
            </div>
          </div>
        </Link>
      ))}

      <button className="w-full card border-dashed hover:border-[var(--color-primary)] py-4 flex items-center justify-center gap-2 text-[var(--color-muted-fg)]">
        <Plus className="h-5 w-5" />
        添加剧集
      </button>
    </div>
  )
}

function CharactersList({ characters }: { characters: typeof mockProject.characters }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {characters.map((character) => (
        <div key={character.id} className="card p-4">
          <div className="aspect-square rounded-lg bg-[var(--color-secondary)] mb-4 flex items-center justify-center">
            <Users className="h-12 w-12 text-[var(--color-muted-fg)]" />
          </div>
          <h3 className="font-semibold mb-1">{character.name}</h3>
          <p className="text-[var(--color-muted-fg)] text-sm">{character.role}</p>
        </div>
      ))}

      <button className="card border-dashed hover:border-[var(--color-primary)] min-h-[200px] flex flex-col items-center justify-center gap-2 text-[var(--color-muted-fg)]">
        <Plus className="h-8 w-8" />
        <span>添加角色</span>
      </button>
    </div>
  )
}

function LocationsList({ locations }: { locations: typeof mockProject.locations }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {locations.map((location) => (
        <div key={location.id} className="card p-4">
          <div className="aspect-video rounded-lg bg-[var(--color-secondary)] mb-4 flex items-center justify-center">
            <MapPin className="h-12 w-12 text-[var(--color-muted-fg)]" />
          </div>
          <h3 className="font-semibold mb-1">{location.name}</h3>
          <p className="text-[var(--color-muted-fg)] text-sm">{location.type}</p>
        </div>
      ))}

      <button className="card border-dashed hover:border-[var(--color-primary)] min-h-[200px] flex flex-col items-center justify-center gap-2 text-[var(--color-muted-fg)]">
        <Plus className="h-8 w-8" />
        <span>添加场景</span>
      </button>
    </div>
  )
}
