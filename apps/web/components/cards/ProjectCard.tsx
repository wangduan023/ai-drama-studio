import { Film, Clock, MoreVertical } from 'lucide-react'
import Link from 'next/link'

export interface ProjectCardProps {
  id: string
  title: string
  description: string
  episodes: number
  status: 'in_progress' | 'completed'
  updatedAt: string
  thumbnail?: string
}

export function ProjectCard({
  id,
  title,
  description,
  episodes,
  status,
  updatedAt,
  thumbnail,
}: ProjectCardProps) {
  return (
    <Link href={`/projects/${id}`} className="block group">
      <div className="card h-full hover:shadow-lg transition-all duration-300 group-hover:border-[var(--color-primary)]">
        <div className="aspect-video rounded-lg bg-[var(--color-secondary)] mb-4 flex items-center justify-center overflow-hidden relative">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnail} alt="" className="w-full h-full object-cover" />
          ) : (
            <Film className="h-12 w-12 text-[var(--color-muted-fg)] group-hover:text-[var(--color-primary)] transition-colors" />
          )}
          <div className="absolute top-2 right-2">
            <span className={`badge ${
              status === 'completed' ? 'badge-success' : 'badge-primary'
            }`}>
              {status === 'completed' ? '已完成' : '制作中'}
            </span>
          </div>
        </div>
        <h3 className="text-lg font-semibold mb-2 group-hover:text-[var(--color-primary)] transition-colors">
          {title}
        </h3>
        <p className="text-[var(--color-muted-fg)] text-sm mb-4 line-clamp-2">
          {description}
        </p>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 text-[var(--color-muted-fg)]">
            <Film className="h-4 w-4" />
            {episodes} 集
          </span>
          <span className="flex items-center gap-1 text-[var(--color-muted-fg)]">
            <Clock className="h-4 w-4" />
            {new Date(updatedAt).toLocaleDateString('zh-CN')}
          </span>
        </div>
      </div>
    </Link>
  )
}

export function ProjectCardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="aspect-video rounded-lg bg-[var(--color-secondary)] mb-4" />
      <div className="h-5 bg-[var(--color-secondary)] rounded w-3/4 mb-2" />
      <div className="h-4 bg-[var(--color-secondary)] rounded w-full mb-4" />
      <div className="flex justify-between">
        <div className="h-4 bg-[var(--color-secondary)] rounded w-16" />
        <div className="h-4 bg-[var(--color-secondary)] rounded w-20" />
      </div>
    </div>
  )
}
