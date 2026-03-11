'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Image,
  Film,
  Type,
  Sparkles,
  MoreVertical,
  Edit,
  Trash2,
  GripVertical,
  Clock,
  Camera,
  Move,
  CheckCircle,
  AlertCircle,
  Loader2,
  Play,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface Storyboard {
  id: string
  sceneNumber: number
  shotNumber?: number
  description: string
  character?: string | null
  location?: string | null
  dialogue?: string | null
  narration?: string | null
  camera?: string
  movement?: string
  duration: number
  imageUrl?: string | null
  videoUrl?: string | null
  prompt?: string | null
  status: 'pending' | 'generating_image' | 'generating_video' | 'completed' | 'failed'
}

interface StoryboardEditorProps {
  storyboards: Storyboard[]
  viewMode: 'grid' | 'list'
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onGenerateImage?: (id: string) => void
  onGenerateVideo?: (id: string) => void
  onReorder?: (storyboards: Storyboard[]) => void
}

export function StoryboardEditor({
  storyboards,
  viewMode,
  onEdit,
  onDelete,
  onGenerateImage,
  onGenerateVideo,
}: StoryboardEditorProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    if (selectedIds.length === storyboards.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(storyboards.map((s) => s.id))
    }
  }

  const statusConfig = {
    pending: { label: '待生成', color: 'bg-muted text-muted-foreground', icon: Clock },
    generating_image: { label: '生成图像中', color: 'bg-primary/20 text-primary', icon: Loader2 },
    generating_video: { label: '生成视频中', color: 'bg-accent/20 text-accent', icon: Loader2 },
    completed: { label: '已完成', color: 'bg-green-500/20 text-green-500', icon: CheckCircle },
    failed: { label: '失败', color: 'bg-red-500/20 text-red-500', icon: AlertCircle },
  }

  return (
    <div className="space-y-4">
      {/* 批量操作栏 */}
      {selectedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-3 bg-muted rounded-lg"
        >
          <div className="flex items-center gap-3">
            <Checkbox
              checked={selectedIds.length === storyboards.length}
              onCheckedChange={selectAll}
            />
            <span className="text-sm">已选择 {selectedIds.length} 个分镜</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedIds.forEach((id) => onGenerateImage?.(id))}
            >
              <Image className="h-4 w-4 mr-2" />
              生成图像
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedIds.forEach((id) => onGenerateVideo?.(id))}
            >
              <Film className="h-4 w-4 mr-2" />
              生成视频
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => selectedIds.forEach((id) => onDelete?.(id))}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              删除
            </Button>
          </div>
        </motion.div>
      )}

      {/* 分镜列表 */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {storyboards.map((storyboard, index) => (
            <StoryboardGridCard
              key={storyboard.id}
              storyboard={storyboard}
              index={index}
              selected={selectedIds.includes(storyboard.id)}
              onSelect={() => toggleSelection(storyboard.id)}
              onEdit={() => onEdit?.(storyboard.id)}
              onDelete={() => onDelete?.(storyboard.id)}
              onGenerateImage={() => onGenerateImage?.(storyboard.id)}
              onGenerateVideo={() => onGenerateVideo?.(storyboard.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {storyboards.map((storyboard, index) => (
            <StoryboardListItem
              key={storyboard.id}
              storyboard={storyboard}
              index={index}
              selected={selectedIds.includes(storyboard.id)}
              onSelect={() => toggleSelection(storyboard.id)}
              onEdit={() => onEdit?.(storyboard.id)}
              onDelete={() => onDelete?.(storyboard.id)}
              onGenerateImage={() => onGenerateImage?.(storyboard.id)}
              onGenerateVideo={() => onGenerateVideo?.(storyboard.id)}
            />
          ))}
        </div>
      )}

      {/* 添加分镜按钮 */}
      <Button variant="outline" className="w-full border-dashed py-8">
        <Sparkles className="h-4 w-4 mr-2" />
        AI 生成分镜
      </Button>
    </div>
  )
}

interface StoryboardCardProps {
  storyboard: Storyboard
  index: number
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onGenerateImage: () => void
  onGenerateVideo: () => void
}

function StoryboardGridCard({
  storyboard,
  index,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onGenerateImage,
  onGenerateVideo,
}: StoryboardCardProps) {
  const statusConfig = {
    pending: { label: '待生成', color: 'bg-muted text-muted-foreground', icon: Clock },
    generating_image: { label: '生成图像中', color: 'bg-primary/20 text-primary', icon: Loader2 },
    generating_video: { label: '生成视频中', color: 'bg-accent/20 text-accent', icon: Loader2 },
    completed: { label: '已完成', color: 'bg-green-500/20 text-green-500', icon: CheckCircle },
    failed: { label: '失败', color: 'bg-red-500/20 text-red-500', icon: AlertCircle },
  }

  const status = statusConfig[storyboard.status]
  const StatusIcon = status.icon

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all cursor-pointer',
        selected ? 'ring-2 ring-primary' : 'hover:shadow-lg'
      )}
    >
      {/* 选择框 */}
      <div className="absolute top-2 left-2 z-10">
        <Checkbox checked={selected} onCheckedChange={onSelect} className="bg-background/80" />
      </div>

      {/* 操作菜单 */}
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <div className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-secondary text-secondary-foreground hover:bg-secondary/80 h-7 w-7 bg-background/80 cursor-pointer">
              <MoreVertical className="h-4 w-4" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              编辑
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onGenerateImage}>
              <Image className="h-4 w-4 mr-2" />
              生成图像
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onGenerateVideo}>
              <Film className="h-4 w-4 mr-2" />
              生成视频
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 预览区域 */}
      <div className="aspect-[4/3] bg-muted relative group/preview">
        {storyboard.imageUrl ? (
          <img
            src={storyboard.imageUrl}
            alt={`分镜 ${storyboard.sceneNumber}`}
            className="w-full h-full object-cover"
          />
        ) : storyboard.videoUrl ? (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <Play className="h-8 w-8 text-white" />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image className="h-10 w-10 text-muted-foreground" />
          </div>
        )}

        {/* 悬停遮罩 */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {!storyboard.imageUrl && (
            <Button size="sm" onClick={onGenerateImage}>
              <Sparkles className="h-4 w-4 mr-1" />
              生成图像
            </Button>
          )}
          {!storyboard.videoUrl && storyboard.imageUrl && (
            <Button size="sm" onClick={onGenerateVideo}>
              <Film className="h-4 w-4 mr-1" />
              生成视频
            </Button>
          )}
        </div>

        {/* 序号 */}
        <div className="absolute bottom-2 left-2 px-2 py-1 rounded bg-black/50 text-white text-xs font-bold">
          {storyboard.sceneNumber}
          {storyboard.shotNumber && `.${storyboard.shotNumber}`}
        </div>

        {/* 时长 */}
        <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-black/50 text-white text-xs flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {storyboard.duration}s
        </div>
      </div>

      {/* 信息区域 */}
      <CardContent className="p-3">
        <p className="text-sm line-clamp-2 mb-2">{storyboard.description}</p>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Camera className="h-3 w-3" />
          <span className="truncate">{storyboard.camera || '标准'}</span>
          {storyboard.movement && (
            <>
              <span>·</span>
              <Move className="h-3 w-3" />
              <span className="truncate">{storyboard.movement}</span>
            </>
          )}
        </div>

        <div className="mt-2">
          <Badge variant="secondary" className={`text-xs ${status.color}`}>
            <StatusIcon className={cn('h-3 w-3 mr-1', storyboard.status.includes('generating') && 'animate-spin')} />
            {status.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

function StoryboardListItem({
  storyboard,
  index,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onGenerateImage,
  onGenerateVideo,
}: StoryboardCardProps) {
  const statusConfig = {
    pending: { label: '待生成', color: 'bg-muted text-muted-foreground', icon: Clock },
    generating_image: { label: '生成图像中', color: 'bg-primary/20 text-primary', icon: Loader2 },
    generating_video: { label: '生成视频中', color: 'bg-accent/20 text-accent', icon: Loader2 },
    completed: { label: '已完成', color: 'bg-green-500/20 text-green-500', icon: CheckCircle },
    failed: { label: '失败', color: 'bg-red-500/20 text-red-500', icon: AlertCircle },
  }

  const status = statusConfig[storyboard.status]
  const StatusIcon = status.icon

  return (
    <Card
      className={cn(
        'group transition-all cursor-pointer',
        selected ? 'ring-2 ring-primary' : 'hover:shadow-md'
      )}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-4">
          <Checkbox checked={selected} onCheckedChange={onSelect} />

          {/* 拖拽手柄 */}
          <div className="cursor-move text-muted-foreground">
            <GripVertical className="h-5 w-5" />
          </div>

          {/* 序号 */}
          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center font-bold text-sm">
            {storyboard.sceneNumber}
          </div>

          {/* 缩略图 */}
          <div className="w-24 h-16 rounded bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
            {storyboard.imageUrl ? (
              <img
                src={storyboard.imageUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : storyboard.videoUrl ? (
              <Play className="h-6 w-6 text-muted-foreground" />
            ) : (
              <Image className="h-6 w-6 text-muted-foreground" />
            )}
          </div>

          {/* 描述 */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium line-clamp-1">{storyboard.description}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Camera className="h-3 w-3" />
                {storyboard.camera || '标准'}
              </span>
              {storyboard.movement && (
                <span className="flex items-center gap-1">
                  <Move className="h-3 w-3" />
                  {storyboard.movement}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {storyboard.duration}s
              </span>
            </div>
          </div>

          {/* 状态 */}
          <Badge variant="secondary" className={`text-xs ${status.color}`}>
            <StatusIcon className={cn('h-3 w-3 mr-1', storyboard.status.includes('generating') && 'animate-spin')} />
            {status.label}
          </Badge>

          {/* 操作 */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onGenerateImage}>
              <Image className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onGenerateVideo}>
              <Film className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
