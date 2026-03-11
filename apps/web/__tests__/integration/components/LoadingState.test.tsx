import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/utils'
import { LoadingState, LoadingOverlay, LoadingCard } from '@/components/LoadingState'

describe('LoadingState', () => {
  it('应该正确渲染加载状态', () => {
    render(<LoadingState />)

    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('应该显示默认加载文本', () => {
    render(<LoadingState />)

    expect(screen.getByTestId('loading-message')).toHaveTextContent('加载中...')
  })

  it('应该显示自定义加载消息', () => {
    render(<LoadingState message="正在加载项目..." />)

    expect(screen.getByTestId('loading-message')).toHaveTextContent('正在加载项目...')
  })

  it('应该支持不显示消息', () => {
    render(<LoadingState message="" />)

    expect(screen.queryByTestId('loading-message')).not.toBeInTheDocument()
  })

  it('应该支持不同的尺寸变体', () => {
    const { rerender } = render(<LoadingState size="sm" />)
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()

    rerender(<LoadingState size="default" />)
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()

    rerender(<LoadingState size="lg" />)
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
  })

  it('应该支持自定义 className', () => {
    render(<LoadingState className="custom-loading-class" />)

    expect(screen.getByTestId('loading-state')).toHaveClass('custom-loading-class')
  })

  it('应该在 fullPage 模式下渲染', () => {
    render(<LoadingState fullPage />)

    const loadingState = screen.getByTestId('loading-state')
    expect(loadingState).toBeInTheDocument()
    expect(loadingState).toHaveClass('min-h-[50vh]')
  })

  it('应该具有正确的 aria 属性', () => {
    render(<LoadingState />)

    const loadingState = screen.getByTestId('loading-state')
    expect(loadingState).toHaveAttribute('role', 'status')
    expect(loadingState).toHaveAttribute('aria-live', 'polite')
  })

  it('应该在不同场景下正确渲染', () => {
    const scenarios = [
      { message: '加载项目中...', size: 'default' as const },
      { message: '保存数据中...', size: 'sm' as const },
      { message: '正在生成内容，请稍候...', size: 'lg' as const },
      { message: '正在上传文件...', size: 'default' as const },
    ]

    scenarios.forEach((scenario) => {
      const { unmount } = render(
        <LoadingState message={scenario.message} size={scenario.size} />
      )

      expect(screen.getByTestId('loading-message')).toHaveTextContent(scenario.message)
      unmount()
    })
  })
})

describe('LoadingOverlay', () => {
  it('应该正确渲染加载遮罩层', () => {
    render(<LoadingOverlay />)

    expect(screen.getByTestId('loading-overlay')).toBeInTheDocument()
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
  })

  it('应该具有遮罩层样式', () => {
    render(<LoadingOverlay />)

    const overlay = screen.getByTestId('loading-overlay')
    expect(overlay).toHaveClass('absolute', 'inset-0', 'z-50', 'bg-background/80', 'backdrop-blur-sm')
  })

  it('应该显示自定义消息', () => {
    render(<LoadingOverlay message="正在处理..." />)

    expect(screen.getByTestId('loading-message')).toHaveTextContent('正在处理...')
  })

  it('应该支持不同尺寸', () => {
    const { rerender } = render(<LoadingOverlay size="sm" />)
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()

    rerender(<LoadingOverlay size="lg" />)
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
  })
})

describe('LoadingCard', () => {
  it('应该正确渲染加载卡片', () => {
    render(<LoadingCard />)

    expect(screen.getByTestId('loading-card')).toBeInTheDocument()
    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
  })

  it('应该具有卡片样式', () => {
    render(<LoadingCard />)

    const card = screen.getByTestId('loading-card')
    expect(card).toHaveClass('rounded-lg', 'border', 'bg-card', 'p-8')
  })

  it('应该显示自定义消息', () => {
    render(<LoadingCard message="加载详情中..." />)

    expect(screen.getByTestId('loading-message')).toHaveTextContent('加载详情中...')
  })

  it('应该默认使用 sm 尺寸', () => {
    render(<LoadingCard />)

    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
  })
})

describe('LoadingState Integration', () => {
  it('应该在数据加载场景下工作', () => {
    const DataLoadingExample = () => {
      const isLoading = true

      if (isLoading) {
        return <LoadingState message="正在加载数据..." />
      }

      return <div data-testid="content">数据内容</div>
    }

    render(<DataLoadingExample />)

    expect(screen.getByTestId('loading-state')).toBeInTheDocument()
    expect(screen.getByText('正在加载数据...')).toBeInTheDocument()
  })

  it('应该在提交表单场景下工作', () => {
    const FormSubmittingExample = () => {
      const isSubmitting = true

      return (
        <div className="relative">
          <form data-testid="form">
            <input type="text" placeholder="项目名称" />
          </form>
          {isSubmitting && <LoadingOverlay message="正在提交..." />}
        </div>
      )
    }

    render(<FormSubmittingExample />)

    expect(screen.getByTestId('loading-overlay')).toBeInTheDocument()
    expect(screen.getByText('正在提交...')).toBeInTheDocument()
  })

  it('应该在卡片加载场景下工作', () => {
    const CardLoadingExample = () => {
      return (
        <div className="grid grid-cols-3 gap-4">
          <LoadingCard message="加载项目中..." />
          <LoadingCard message="加载角色中..." />
          <LoadingCard message="加载场景中..." />
        </div>
      )
    }

    render(<CardLoadingExample />)

    const loadingCards = screen.getAllByTestId('loading-card')
    expect(loadingCards).toHaveLength(3)
  })

  it('应该在页面初始化场景下工作', () => {
    const PageInitExample = () => {
      const isInitializing = true

      if (isInitializing) {
        return (
          <div className="container mx-auto py-8">
            <LoadingState
              message="正在初始化页面..."
              size="lg"
              fullPage
            />
          </div>
        )
      }

      return <div data-testid="page-content">页面内容</div>
    }

    render(<PageInitExample />)

    const loadingState = screen.getByTestId('loading-state')
    expect(loadingState).toBeInTheDocument()
    expect(loadingState).toHaveClass('min-h-[50vh]')
    expect(screen.getByText('正在初始化页面...')).toBeInTheDocument()
  })
})
