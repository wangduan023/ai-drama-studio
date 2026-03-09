import { Image, Film, Type, Sparkles } from 'lucide-react'

export interface StoryboardPanel {
  id: string
  sceneNumber: number
  description: string
  character?: string
  location?: string
  dialogue?: string
  imageUrl?: string | null
  videoUrl?: string | null
  status?: 'pending' | 'generating' | 'completed' | 'failed'
}

export interface StoryboardPanelProps {
  panel: StoryboardPanel
  index: number
  selected?: boolean
  onSelect?: () => void
  onGenerateImage?: () => void
  onGenerateVideo?: () => void
}

export function StoryboardPanel({
  panel,
  index,
  selected = false,
  onSelect,
  onGenerateImage,
  onGenerateVideo,
}: StoryboardPanelProps) {
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
        <div className="aspect-video bg-[var(--color-secondary)] flex items-center justify-center relative group">
          {panel.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={panel.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <Image className="h-8 w-8 text-[var(--color-muted-fg)]" />
          )}

          {/* 场景编号 */}
          <div className="absolute top-2 left-2 w-6 h-6 rounded bg-[var(--color-muted)] flex items-center justify-center text-xs font-bold">
            {index + 1}
          </div>

          {/* 状态指示器 */}
          {panel.status === 'generating' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-[var(--color-primary)] animate-pulse" />
            </div>
          )}

          {/* 悬停操作按钮 */}
          {!panel.imageUrl && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {onGenerateImage && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onGenerateImage()
                  }}
                  className="btn btn-primary text-sm py-1.5 px-3"
                >
                  <Image className="h-4 w-4" />
                  生成图像
                </button>
              )}
            </div>
          )}
        </div>

        {/* 信息区域 */}
        <div className="flex-1 p-3 flex flex-col gap-2 overflow-hidden">
          <div className="flex items-center gap-2 text-xs">
            <Type className="h-3 w-3 text-[var(--color-muted-fg)]" />
            <span className="text-[var(--color-muted-fg)] truncate">{panel.character}</span>
          </div>
          <p className="text-sm line-clamp-2 flex-1">{panel.description}</p>
          {panel.dialogue && (
            <div className="text-xs text-[var(--color-muted-fg)] bg-[var(--color-muted)] rounded p-2 line-clamp-2">
              &ldquo;{panel.dialogue}&rdquo;
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function StoryboardPanelSkeleton() {
  return (
    <div className="aspect-[3/4] rounded-lg border-2 border-[var(--border)] overflow-hidden animate-pulse">
      <div className="aspect-video bg-[var(--color-secondary)]" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-[var(--color-secondary)] rounded w-1/3" />
        <div className="h-4 bg-[var(--color-secondary)] rounded w-full" />
        <div className="h-4 bg-[var(--color-secondary)] rounded w-2/3" />
      </div>
    </div>
  )
}
