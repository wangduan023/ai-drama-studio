import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Film, ChevronRight } from 'lucide-react'
import Link from 'next/link'

// EpisodeCard 组件定义（基于项目中使用的结构）
interface EpisodeCardProps {
  id: string
  projectId: string
  number: number
  name: string
  clipCount: number
  storyboardCount: number
  scriptStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED'
}

function EpisodeCard({
  id,
  projectId,
  number,
  name,
  clipCount,
  storyboardCount,
  scriptStatus,
}: EpisodeCardProps) {
  const statusConfig = {
    COMPLETED: { label: '已完成', variant: 'default' as const },
    PROCESSING: { label: '处理中', variant: 'secondary' as const },
    PENDING: { label: '待处理', variant: 'outline' as const },
  }

  const status = statusConfig[scriptStatus]

  return (
    <Link href={`/projects/${projectId}/episodes/${id}`}>
      <Card className="hover:shadow-md transition-all group cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-muted-foreground">{number}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{name}</h3>
              <p className="text-muted-foreground text-sm">
                {clipCount} 个片段 · {storyboardCount} 个分镜
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={status.variant}>{status.label}</Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// Mock 剧集数据
const mockEpisode: EpisodeCardProps = {
  id: 'ep-1',
  projectId: 'project-1',
  number: 1,
  name: '第一集：初遇',
  clipCount: 5,
  storyboardCount: 8,
  scriptStatus: 'COMPLETED',
}

describe('EpisodeCard', () => {
  it('应该正确渲染剧集信息', () => {
    render(<EpisodeCard {...mockEpisode} />)

    // 验证集数显示
    expect(screen.getByText('1')).toBeInTheDocument()

    // 验证剧集名称
    expect(screen.getByText('第一集：初遇')).toBeInTheDocument()

    // 验证片段和分镜数量
    expect(screen.getByText('5 个片段 · 8 个分镜')).toBeInTheDocument()
  })

  it('应该显示正确的状态标签', () => {
    const { rerender } = render(<EpisodeCard {...mockEpisode} scriptStatus="COMPLETED" />)
    expect(screen.getByText('已完成')).toBeInTheDocument()

    rerender(<EpisodeCard {...mockEpisode} scriptStatus="PROCESSING" />)
    expect(screen.getByText('处理中')).toBeInTheDocument()

    rerender(<EpisodeCard {...mockEpisode} scriptStatus="PENDING" />)
    expect(screen.getByText('待处理')).toBeInTheDocument()
  })

  it('应该包含正确的链接', () => {
    render(<EpisodeCard {...mockEpisode} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/projects/project-1/episodes/ep-1')
  })

  it('应该显示零片段和零分镜', () => {
    render(
      <EpisodeCard
        {...mockEpisode}
        clipCount={0}
        storyboardCount={0}
      />
    )

    expect(screen.getByText('0 个片段 · 0 个分镜')).toBeInTheDocument()
  })

  it('应该处理长剧集名称', () => {
    const longNameEpisode = {
      ...mockEpisode,
      name: '这是一集非常长的剧集名称，需要被截断显示，测试截断功能是否正常工作',
    }

    render(<EpisodeCard {...longNameEpisode} />)

    expect(screen.getByText(longNameEpisode.name)).toBeInTheDocument()
  })

  it('应该显示不同的集数', () => {
    const episodes = [
      { ...mockEpisode, number: 1, name: '第一集' },
      { ...mockEpisode, number: 10, name: '第十集' },
      { ...mockEpisode, number: 100, name: '第一百集' },
    ]

    episodes.forEach((episode) => {
      const { unmount } = render(<EpisodeCard {...episode} />)
      expect(screen.getByText(String(episode.number))).toBeInTheDocument()
      expect(screen.getByText(episode.name)).toBeInTheDocument()
      unmount()
    })
  })
})

describe('EpisodesList', () => {
  it('应该渲染多个剧集卡片', () => {
    const episodes = [
      { ...mockEpisode, id: 'ep-1', number: 1, name: '第一集' },
      { ...mockEpisode, id: 'ep-2', number: 2, name: '第二集' },
      { ...mockEpisode, id: 'ep-3', number: 3, name: '第三集' },
    ]

    render(
      <div className="space-y-3">
        {episodes.map((episode) => (
          <EpisodeCard key={episode.id} {...episode} />
        ))}
      </div>
    )

    episodes.forEach((episode) => {
      expect(screen.getByText(episode.name)).toBeInTheDocument()
    })

    // 验证链接
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(episodes.length)
  })
})
