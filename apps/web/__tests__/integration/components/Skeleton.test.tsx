import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Skeleton } from '@/components/ui/skeleton'

describe('Skeleton', () => {
  it('应该正确渲染骨架屏', () => {
    render(<Skeleton data-testid="skeleton" />)

    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toBeInTheDocument()
  })

  it('应该具有正确的默认样式', () => {
    render(<Skeleton data-testid="skeleton" />)

    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveClass('animate-pulse')
    expect(skeleton).toHaveClass('rounded-md')
    expect(skeleton).toHaveClass('bg-muted')
  })

  it('应该支持自定义 className', () => {
    render(<Skeleton className="custom-skeleton-class" data-testid="skeleton" />)

    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveClass('custom-skeleton-class')
    expect(skeleton).toHaveClass('animate-pulse')
  })

  it('应该支持自定义尺寸', () => {
    const { rerender } = render(
      <Skeleton className="h-4 w-full" data-testid="skeleton" />
    )
    expect(screen.getByTestId('skeleton')).toHaveClass('h-4', 'w-full')

    rerender(<Skeleton className="h-8 w-32" data-testid="skeleton" />)
    expect(screen.getByTestId('skeleton')).toHaveClass('h-8', 'w-32')

    rerender(<Skeleton className="h-16 w-16 rounded-full" data-testid="skeleton" />)
    expect(screen.getByTestId('skeleton')).toHaveClass('h-16', 'w-16', 'rounded-full')
  })

  it('应该支持自定义圆角', () => {
    render(<Skeleton className="rounded-lg" data-testid="skeleton" />)

    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveClass('rounded-lg')
  })

  it('应该支持作为不同元素渲染', () => {
    const { container } = render(
      <>
        <Skeleton data-testid="skeleton-div" />
        <Skeleton asChild data-testid="skeleton-span">
          <span />
        </Skeleton>
      </>
    )

    expect(screen.getByTestId('skeleton-div').tagName).toBe('DIV')
  })

  it('应该支持自定义样式属性', () => {
    render(
      <Skeleton
        className="h-20 w-full"
        style={{ backgroundColor: '#e2e8f0' }}
        data-testid="skeleton"
      />
    )

    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveAttribute('style', 'background-color: rgb(226, 232, 240);')
  })
})

describe('Skeleton Card', () => {
  it('应该渲染卡片骨架', () => {
    const SkeletonCard = () => (
      <div className="p-4 border rounded-lg" data-testid="skeleton-card">
        <Skeleton className="h-4 w-3/4 mb-4" data-testid="skeleton-title" />
        <Skeleton className="h-3 w-full mb-2" data-testid="skeleton-line-1" />
        <Skeleton className="h-3 w-full mb-2" data-testid="skeleton-line-2" />
        <Skeleton className="h-3 w-2/3" data-testid="skeleton-line-3" />
      </div>
    )

    render(<SkeletonCard />)

    expect(screen.getByTestId('skeleton-card')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-title')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-line-1')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-line-2')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-line-3')).toBeInTheDocument()
  })

  it('应该渲染头像骨架', () => {
    const SkeletonAvatar = () => (
      <Skeleton
        className="h-12 w-12 rounded-full"
        data-testid="skeleton-avatar"
      />
    )

    render(<SkeletonAvatar />)

    const avatar = screen.getByTestId('skeleton-avatar')
    expect(avatar).toBeInTheDocument()
    expect(avatar).toHaveClass('rounded-full', 'h-12', 'w-12')
  })

  it('应该渲染文本行骨架', () => {
    const SkeletonText = ({ lines = 3 }: { lines?: number }) => (
      <div className="space-y-2" data-testid="skeleton-text">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-4 w-full"
            data-testid={`skeleton-text-line-${i}`}
          />
        ))}
      </div>
    )

    render(<SkeletonText lines={3} />)

    expect(screen.getByTestId('skeleton-text')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-text-line-0')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-text-line-1')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-text-line-2')).toBeInTheDocument()
  })

  it('应该渲染图片骨架', () => {
    const SkeletonImage = () => (
      <Skeleton
        className="h-48 w-full rounded-lg"
        data-testid="skeleton-image"
      />
    )

    render(<SkeletonImage />)

    const image = screen.getByTestId('skeleton-image')
    expect(image).toBeInTheDocument()
    expect(image).toHaveClass('h-48', 'w-full', 'rounded-lg')
  })
})

describe('Skeleton List', () => {
  it('应该渲染列表骨架', () => {
    const SkeletonList = ({ count = 3 }: { count?: number }) => (
      <div className="space-y-4" data-testid="skeleton-list">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4" data-testid={`skeleton-item-${i}`}>
            <Skeleton className="h-12 w-12 rounded-full" data-testid={`skeleton-avatar-${i}`} />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/4" data-testid={`skeleton-title-${i}`} />
              <Skeleton className="h-3 w-3/4" data-testid={`skeleton-desc-${i}`} />
            </div>
          </div>
        ))}
      </div>
    )

    render(<SkeletonList count={3} />)

    expect(screen.getByTestId('skeleton-list')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-item-0')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-avatar-0')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-title-0')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-desc-0')).toBeInTheDocument()
  })

  it('应该渲染表格骨架', () => {
    const SkeletonTable = () => (
      <div className="border rounded-lg overflow-hidden" data-testid="skeleton-table">
        <div className="grid grid-cols-4 gap-4 p-4 border-b bg-muted/50">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" data-testid={`skeleton-header-${i}`} />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-4 gap-4 p-4 border-b last:border-0">
            {Array.from({ length: 4 }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className="h-3 w-full"
                data-testid={`skeleton-cell-${rowIndex}-${colIndex}`}
              />
            ))}
          </div>
        ))}
      </div>
    )

    render(<SkeletonTable />)

    expect(screen.getByTestId('skeleton-table')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-header-0')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-cell-0-0')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-cell-2-3')).toBeInTheDocument()
  })
})

describe('Skeleton Scenarios', () => {
  it('应该渲染项目卡片骨架', () => {
    const ProjectCardSkeleton = () => (
      <div className="border rounded-lg p-4 space-y-3" data-testid="project-card-skeleton">
        <Skeleton className="h-40 w-full rounded-md" data-testid="project-image-skeleton" />
        <Skeleton className="h-5 w-3/4" data-testid="project-title-skeleton" />
        <Skeleton className="h-3 w-full" data-testid="project-desc-skeleton" />
        <div className="flex justify-between pt-2">
          <Skeleton className="h-3 w-20" data-testid="project-date-skeleton" />
          <Skeleton className="h-3 w-16" data-testid="project-status-skeleton" />
        </div>
      </div>
    )

    render(<ProjectCardSkeleton />)

    expect(screen.getByTestId('project-card-skeleton')).toBeInTheDocument()
    expect(screen.getByTestId('project-image-skeleton')).toBeInTheDocument()
    expect(screen.getByTestId('project-title-skeleton')).toBeInTheDocument()
    expect(screen.getByTestId('project-desc-skeleton')).toBeInTheDocument()
  })

  it('应该渲染详情页骨架', () => {
    const DetailPageSkeleton = () => (
      <div className="space-y-6" data-testid="detail-page-skeleton">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" data-testid={`detail-line-${i}`} />
          ))}
        </div>
      </div>
    )

    render(<DetailPageSkeleton />)

    expect(screen.getByTestId('detail-page-skeleton')).toBeInTheDocument()
    expect(screen.getByTestId('detail-line-0')).toBeInTheDocument()
    expect(screen.getByTestId('detail-line-4')).toBeInTheDocument()
  })

  it('应该渲染仪表板统计骨架', () => {
    const DashboardStatsSkeleton = () => (
      <div className="grid grid-cols-4 gap-4" data-testid="dashboard-stats-skeleton">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-2" data-testid={`stat-card-${i}`}>
            <Skeleton className="h-4 w-20" data-testid={`stat-label-${i}`} />
            <Skeleton className="h-8 w-24" data-testid={`stat-value-${i}`} />
            <Skeleton className="h-3 w-16" data-testid={`stat-change-${i}`} />
          </div>
        ))}
      </div>
    )

    render(<DashboardStatsSkeleton />)

    expect(screen.getByTestId('dashboard-stats-skeleton')).toBeInTheDocument()
    expect(screen.getByTestId('stat-card-0')).toBeInTheDocument()
    expect(screen.getByTestId('stat-label-0')).toBeInTheDocument()
    expect(screen.getByTestId('stat-value-0')).toBeInTheDocument()
  })
})

describe('Skeleton Animation', () => {
  it('应该具有脉冲动画', () => {
    render(<Skeleton data-testid="skeleton" />)

    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveClass('animate-pulse')
  })

  it('应该保持动画类不被自定义类覆盖', () => {
    render(<Skeleton className="custom-class" data-testid="skeleton" />)

    const skeleton = screen.getByTestId('skeleton')
    expect(skeleton).toHaveClass('animate-pulse', 'custom-class')
  })
})
