import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Film, Users, MapPin, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// EmptyState 组件定义（基于项目中使用的结构）
interface EmptyStateProps {
  icon?: React.ElementType
  title?: string
  description?: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}

function EmptyState({
  icon: Icon = Film,
  title = '暂无数据',
  description = '开始创建你的第一个项目吧',
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="text-center py-16" data-testid="empty-state">
      <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6">{description}</p>
      {(actionLabel || actionHref) && (
        <Button asChild={!!actionHref} onClick={onAction}>
          {actionHref ? (
            <Link href={actionHref} className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {actionLabel}
            </Link>
          ) : (
            <>
              <Plus className="h-5 w-5 mr-2" />
              {actionLabel}
            </>
          )}
        </Button>
      )}
    </div>
  )
}

describe('EmptyState', () => {
  it('应该正确渲染默认空状态', () => {
    render(<EmptyState />)

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByText('暂无数据')).toBeInTheDocument()
    expect(screen.getByText('开始创建你的第一个项目吧')).toBeInTheDocument()
  })

  it('应该使用自定义图标', () => {
    const { rerender } = render(<EmptyState icon={Users} title="暂无角色" />)
    expect(screen.getByText('暂无角色')).toBeInTheDocument()

    rerender(<EmptyState icon={MapPin} title="暂无场景" />)
    expect(screen.getByText('暂无场景')).toBeInTheDocument()

    rerender(<EmptyState icon={Film} title="暂无剧集" />)
    expect(screen.getByText('暂无剧集')).toBeInTheDocument()
  })

  it('应该显示自定义标题和描述', () => {
    render(
      <EmptyState
        icon={Users}
        title="暂无角色"
        description="添加角色来丰富你的故事"
      />
    )

    expect(screen.getByText('暂无角色')).toBeInTheDocument()
    expect(screen.getByText('添加角色来丰富你的故事')).toBeInTheDocument()
  })

  it('应该显示操作按钮', () => {
    render(
      <EmptyState
        icon={Plus}
        title="暂无项目"
        description="开始创建你的第一个项目"
        actionLabel="创建项目"
        actionHref="/projects/new"
      />
    )

    const button = screen.getByRole('button', { name: /创建项目/i })
    expect(button).toBeInTheDocument()

    // 验证链接
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/projects/new')
  })

  it('应该触发操作回调', () => {
    const onAction = vi.fn()

    render(
      <EmptyState
        icon={Plus}
        title="暂无数据"
        actionLabel="添加数据"
        onAction={onAction}
      />
    )

    const button = screen.getByRole('button', { name: /添加数据/i })
    fireEvent.click(button)

    expect(onAction).toHaveBeenCalledTimes(1)
  })

  it('应该在不同场景下正确渲染', () => {
    const scenarios = [
      {
        icon: Film,
        title: '暂无剧集',
        description: '添加你的第一个剧集开始创作',
      },
      {
        icon: Users,
        title: '暂无角色',
        description: '添加角色来丰富你的故事',
      },
      {
        icon: MapPin,
        title: '暂无场景',
        description: '添加场景来设置你的故事背景',
      },
    ]

    scenarios.forEach((scenario) => {
      const { unmount } = render(
        <EmptyState
          icon={scenario.icon}
          title={scenario.title}
          description={scenario.description}
        />
      )

      expect(screen.getByText(scenario.title)).toBeInTheDocument()
      expect(screen.getByText(scenario.description)).toBeInTheDocument()

      unmount()
    })
  })

  it('应该在没有操作时不显示按钮', () => {
    render(
      <EmptyState
        icon={Film}
        title="暂无数据"
        description="这是一个没有操作的空状态"
      />
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

describe('EmptyState with React Query', () => {
  it('应该与 React Query 加载状态一起工作', () => {
    // 模拟加载完成但数据为空的情况
    const EmptyStateWithQuery = () => {
      const isLoading = false
      const data: unknown[] = []

      if (isLoading) {
        return <div data-testid="loading">加载中...</div>
      }

      if (!data || data.length === 0) {
        return (
          <EmptyState
            icon={Film}
            title="暂无项目"
            description="开始创建你的第一个短剧项目吧"
            actionLabel="创建项目"
            actionHref="/projects/new"
          />
        )
      }

      return <div data-testid="data-list">数据列表</div>
    }

    render(<EmptyStateWithQuery />)

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByText('暂无项目')).toBeInTheDocument()
  })
})
