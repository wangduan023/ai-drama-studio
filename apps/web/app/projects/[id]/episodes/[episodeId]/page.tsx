'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Film,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Image,
  Type,
  Settings,
  Save,
  Download,
  Sparkles,
} from 'lucide-react'

// 模拟剧集数据
const mockEpisode = {
  id: '1',
  title: '第一集：初遇',
  projectId: '1',
  status: 'in_progress' as const,
  storyboardPanels: [
    {
      id: '1',
      sceneNumber: 1,
      description: '男主角走进咖啡厅，四处张望',
      character: '张三',
      location: '咖啡厅',
      dialogue: '请问，这里有人吗？',
      imageUrl: null,
      videoUrl: null,
    },
    {
      id: '2',
      sceneNumber: 2,
      description: '女主角抬头看向男主角',
      character: '李四',
      location: '咖啡厅',
      dialogue: '没有，请坐。',
      imageUrl: null,
      videoUrl: null,
    },
  ],
}

export default function EpisodeEditPage() {
  const params = useParams()
  const router = useRouter()
  const [episode] = useState(mockEpisode)
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  if (!episode) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-2">剧集不存在</h2>
          <button onClick={() => router.back()} className="btn btn-primary">
            返回
          </button>
        </div>
      </div>
    )
  }

  const selectedPanel = episode.storyboardPanels.find((p) => p.id === selectedPanelId)

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* 顶部工具栏 */}
      <header className="border-b border-[var(--border)] px-4 py-2 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href={`/projects/${episode.projectId}`}
            className="inline-flex items-center gap-2 text-[var(--color-muted-fg)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Link>
          <div className="h-6 w-px bg-[var(--border)]" />
          <h1 className="font-semibold">{episode.title}</h1>
          <span className="badge badge-primary">制作中</span>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn btn-ghost inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI 生成
          </button>
          <button className="btn btn-ghost inline-flex items-center gap-2">
            <Save className="h-4 w-4" />
            保存
          </button>
          <button className="btn btn-primary inline-flex items-center gap-2">
            <Download className="h-4 w-4" />
            导出
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧分镜面板 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {episode.storyboardPanels.map((panel, index) => (
              <StoryboardPanel
                key={panel.id}
                panel={panel}
                index={index}
                selected={selectedPanelId === panel.id}
                onSelect={() => setSelectedPanelId(panel.id)}
              />
            ))}

            {/* 添加面板按钮 */}
            <button className="aspect-[3/4] border-2 border-dashed border-[var(--border)] rounded-lg flex flex-col items-center justify-center gap-2 text-[var(--color-muted-fg)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors">
              <Plus className="h-8 w-8" />
              <span className="text-sm">添加分镜</span>
            </button>
          </div>
        </div>

        {/* 右侧编辑面板 */}
        {selectedPanel && (
          <div className="w-96 border-l border-[var(--border)] overflow-y-auto flex-shrink-0">
            <PanelEditor panel={selectedPanel} />
          </div>
        )}
      </div>

      {/* 底部播放控制 */}
      <footer className="border-t border-[var(--border)] px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="btn btn-primary rounded-full w-10 h-10 p-0 flex items-center justify-center"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button className="btn btn-ghost rounded-full w-10 h-10 p-0 flex items-center justify-center">
            <SkipBack className="h-5 w-5" />
          </button>
          <button className="btn btn-ghost rounded-full w-10 h-10 p-0 flex items-center justify-center">
            <SkipForward className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--color-muted-fg)]">
            {episode.storyboardPanels.length} 个分镜
          </span>
          <div className="h-4 w-px bg-[var(--border)]" />
          <button className="btn btn-ghost inline-flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            配音
          </button>
          <button className="btn btn-ghost inline-flex items-center gap-2">
            <Settings className="h-4 w-4" />
            设置
          </button>
        </div>
      </footer>
    </div>
  )
}

import { X } from 'lucide-react'

function StoryboardPanel({
  panel,
  index,
  selected,
  onSelect,
}: {
  panel: typeof mockEpisode.storyboardPanels[0]
  index: number
  selected: boolean
  onSelect: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={`aspect-[3/4] rounded-lg border-2 cursor-pointer transition-all overflow-hidden ${
        selected
          ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20'
          : 'border-[var(--border)] hover:border-[var(--border-light)]'
      }`}
    >
      <div className="h-full flex flex-col">
        {/* 预览区域 */}
        <div className="aspect-video bg-[var(--color-secondary)] flex items-center justify-center relative">
          {panel.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={panel.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <Image className="h-8 w-8 text-[var(--color-muted-fg)]" />
          )}
          <div className="absolute top-2 left-2 w-6 h-6 rounded bg-[var(--color-muted)] flex items-center justify-center text-xs font-bold">
            {index + 1}
          </div>
        </div>

        {/* 信息区域 */}
        <div className="flex-1 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs">
            <Type className="h-3 w-3 text-[var(--color-muted-fg)]" />
            <span className="text-[var(--color-muted-fg)] truncate">{panel.character}</span>
          </div>
          <p className="text-sm line-clamp-2 flex-1">{panel.description}</p>
          {panel.dialogue && (
            <div className="text-xs text-[var(--color-muted-fg)] bg-[var(--color-muted)] rounded p-2 line-clamp-2">
              "{panel.dialogue}"
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PanelEditor({ panel }: { panel: typeof mockEpisode.storyboardPanels[0] }) {
  const [formData, setFormData] = useState({
    description: panel.description,
    character: panel.character,
    location: panel.location,
    dialogue: panel.dialogue,
  })

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">编辑分镜</h2>
      </div>

      {/* 场景编号 */}
      <div>
        <label className="block text-sm font-medium mb-1">场景编号</label>
        <input
          type="number"
          defaultValue={panel.sceneNumber}
          className="input"
        />
      </div>

      {/* 角色 */}
      <div>
        <label className="block text-sm font-medium mb-1">角色</label>
        <input
          type="text"
          value={formData.character}
          onChange={(e) => setFormData({ ...formData, character: e.target.value })}
          className="input"
        />
      </div>

      {/* 场景 */}
      <div>
        <label className="block text-sm font-medium mb-1">场景</label>
        <input
          type="text"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          className="input"
        />
      </div>

      {/* 描述 */}
      <div>
        <label className="block text-sm font-medium mb-1">画面描述</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="input min-h-[100px]"
          rows={4}
        />
      </div>

      {/* 对话 */}
      <div>
        <label className="block text-sm font-medium mb-1">对话/旁白</label>
        <textarea
          value={formData.dialogue}
          onChange={(e) => setFormData({ ...formData, dialogue: e.target.value })}
          className="input min-h-[80px]"
          rows={3}
        />
      </div>

      {/* 生成按钮 */}
      <div className="pt-4 space-y-2">
        <button className="btn btn-primary w-full inline-flex items-center justify-center gap-2">
          <Image className="h-4 w-4" />
          生成图像
        </button>
        <button className="btn btn-secondary w-full inline-flex items-center justify-center gap-2">
          <Film className="h-4 w-4" />
          生成视频
        </button>
      </div>
    </div>
  )
}

function Plus({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}
