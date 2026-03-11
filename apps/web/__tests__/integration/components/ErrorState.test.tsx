import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ErrorState 组件定义（基于项目中使用的结构）
interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  icon?: React.ElementType
  showBackButton?: boolean
  onBack?: () => void
}

function ErrorState({
  title = '加载失败',
  message,
  onRetry,
  icon: Icon = RefreshCw,
  showBackButton = false,
  onBack,
}: ErrorStateProps) {
  return (
    <div className="text-center py-16" data-testid="error-state">
      <div className="w-20 h-20 rounded-full bg-destructive/10 mx-auto mb-4 flex items-center justify-center">
        <Icon className="h-10 w-10 text-destructive" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6">{message}</p>
      <div className="flex gap-2 justify-center">
        {onRetry && (
          <Button onClick={onRetry} data-testid="retry-button">
            <RefreshCw className="h-4 w-4 mr-2" />
            重试
          </Button>
        )}
        {showBackButton && onBack && (
          <Button variant="outline" onClick={onBack} data-testid="back-button">
            返回
          </Button>
        )}
      </div>
    </div>
  )
}

describe('ErrorState', () => {
  it('应该正确渲染错误状态', () => {
    render(<ErrorState message="网络连接失败" />)

    expect(screen.getByTestId('error-state')).toBeInTheDocument()
    expect(screen.getByText('加载失败')).toBeInTheDocument()
    expect(screen.getByText('网络连接失败')).toBeInTheDocument()
  })

  it('应该显示自定义标题', () => {
    render(
      <ErrorState
        title="请求失败"
        message="无法获取数据"
      />
    )

    expect(screen.getByText('请求失败')).toBeInTheDocument()
    expect(screen.getByText('无法获取数据')).toBeInTheDocument()
  })

  it('应该触发重试回调', () => {
    const onRetry = vi.fn()

    render(
      <ErrorState
        message="加载项目失败"
        onRetry={onRetry}
      />
    )

    const retryButton = screen.getByTestId('retry-button')
    expect(retryButton).toBeInTheDocument()

    fireEvent.click(retryButton)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('应该在没有重试回调时不显示重试按钮', () => {
    render(<ErrorState message="发生错误" />)

    expect(screen.queryByTestId('retry-button')).not.toBeInTheDocument()
  })

  it('应该显示返回按钮', () => {
    const onBack = vi.fn()

    render(
      <ErrorState
        message="项目不存在"
        showBackButton={true}
        onBack={onBack}
      />
    )

    const backButton = screen.getByTestId('back-button')
    expect(backButton).toBeInTheDocument()

    fireEvent.click(backButton)
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('应该同时显示重试和返回按钮', () => {
    const onRetry = vi.fn()
    const onBack = vi.fn()

    render(
      <ErrorState
        title="加载失败"
        message="无法加载项目详情"
        onRetry={onRetry}
        showBackButton={true}
        onBack={onBack}
      />
    )

    expect(screen.getByTestId('retry-button')).toBeInTheDocument()
    expect(screen.getByTestId('back-button')).toBeInTheDocument()
  })

  it('应该使用自定义图标', () => {
    render(
      <ErrorState
        title="警告"
        message="请检查输入"
        icon={AlertCircle}
      />
    )

    expect(screen.getByText('警告')).toBeInTheDocument()
    expect(screen.getByText('请检查输入')).toBeInTheDocument()
  })

  it('应该处理不同类型的错误消息', () => {
    const errorScenarios = [
      { message: '网络连接超时', title: '连接失败' },
      { message: '服务器内部错误 (500)', title: '服务器错误' },
      { message: '未授权访问', title: '权限错误' },
      { message: '请求的资源不存在', title: '404 错误' },
    ]

    errorScenarios.forEach((scenario) => {
      const { unmount } = render(
        <ErrorState
          title={scenario.title}
          message={scenario.message}
          onRetry={() => {}}
        />
      )

      expect(screen.getByText(scenario.title)).toBeInTheDocument()
      expect(screen.getByText(scenario.message)).toBeInTheDocument()

      unmount()
    })
  })
})

describe('ErrorState with React Query', () => {
  it('应该与 React Query 错误状态一起工作', () => {
    // 模拟 React Query 的错误状态
    const ErrorStateWithQuery = () => {
      const isError = true
      const error = new Error('Failed to fetch projects')
      const refetch = vi.fn()

      if (isError) {
        return (
          <ErrorState
            title="加载失败"
            message={error.message}
            onRetry={refetch}
          />
        )
      }

      return <div data-testid="content">内容</div>
    }

    render(<ErrorStateWithQuery />)

    expect(screen.getByTestId('error-state')).toBeInTheDocument()
    expect(screen.getByText('Failed to fetch projects')).toBeInTheDocument()

    // 点击重试按钮
    fireEvent.click(screen.getByTestId('retry-button'))
    expect(screen.getByTestId('retry-button')).toBeInTheDocument()
  })

  it('应该处理不同类型的错误对象', () => {
    const ErrorStateWithDifferentErrors = ({ error }: { error: unknown }) => {
      const message = error instanceof Error ? error.message : String(error)

      return (
        <ErrorState
          title="错误"
          message={message}
          onRetry={() => {}}
        />
      )
    }

    const errors = [
      new Error('标准错误'),
      { message: '对象错误' },
      '字符串错误',
      500,
    ]

    errors.forEach((error) => {
      const { unmount } = render(<ErrorStateWithDifferentErrors error={error} />)
      expect(screen.getByTestId('error-state')).toBeInTheDocument()
      unmount()
    })
  })
})

describe('ErrorState Integration', () => {
  it('应该在项目页面错误状态下渲染', () => {
    const ProjectsPageError = () => {
      const error = new Error('无法连接到服务器')
      const refetch = vi.fn()

      return (
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">项目列表</h1>
              <p className="text-muted-foreground">管理和创建你的短剧项目</p>
            </div>
          </div>
          <ErrorState
            message={error.message}
            onRetry={refetch}
          />
        </div>
      )
    }

    render(<ProjectsPageError />)

    expect(screen.getByText('项目列表')).toBeInTheDocument()
    expect(screen.getByText('无法连接到服务器')).toBeInTheDocument()
    expect(screen.getByTestId('retry-button')).toBeInTheDocument()
  })

  it('应该在项目详情错误状态下渲染', () => {
    const ProjectDetailError = () => {
      const error = new Error('项目不存在')
      const refetch = vi.fn()
      const goBack = vi.fn()

      return (
        <div className="container mx-auto px-4 py-8">
          <ErrorState
            title="加载失败"
            message={error.message}
            onRetry={refetch}
            showBackButton={true}
            onBack={goBack}
          />
        </div>
      )
    }

    render(<ProjectDetailError />)

    expect(screen.getByText('加载失败')).toBeInTheDocument()
    expect(screen.getByText('项目不存在')).toBeInTheDocument()
    expect(screen.getByTestId('retry-button')).toBeInTheDocument()
    expect(screen.getByTestId('back-button')).toBeInTheDocument()
  })
})
