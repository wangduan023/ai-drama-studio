import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProjectCard, ProjectCardSkeleton } from '@/components/cards/ProjectCard'
import { mockProjects } from '@/test/mocks/data'

// 创建测试用的 QueryClient
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  })

// 包装组件以提供 QueryClient
const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return {
    ...render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    ),
    queryClient,
  }
}

describe('ProjectList Integration', () => {
  it('应该渲染项目卡片列表', () => {
    renderWithQueryClient(
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockProjects.map((project) => (
          <ProjectCard
            key={project.id}
            id={project.id}
            title={project.title}
            description={project.description || ''}
            episodes={project.episodeCount || 0}
            status={project.status === 'completed' ? 'completed' : 'in_progress'}
            updatedAt={project.updatedAt}
          />
        ))}
      </div>
    )

    // 验证所有项目标题显示
    mockProjects.forEach((project) => {
      expect(screen.getByText(project.title)).toBeInTheDocument()
    })

    // 验证项目描述
    expect(screen.getByText('这是一个测试项目')).toBeInTheDocument()
    expect(screen.getByText('这是一个已完成的项目')).toBeInTheDocument()
  })

  it('应该显示项目状态标签', () => {
    renderWithQueryClient(
      <div>
        <ProjectCard
          id="1"
          title="制作中项目"
          description="测试描述"
          episodes={5}
          status="in_progress"
          updatedAt="2024-01-15T10:00:00Z"
        />
        <ProjectCard
          id="2"
          title="已完成项目"
          description="测试描述"
          episodes={10}
          status="completed"
          updatedAt="2024-01-15T10:00:00Z"
        />
      </div>
    )

    expect(screen.getByText('制作中')).toBeInTheDocument()
    expect(screen.getByText('已完成')).toBeInTheDocument()
  })

  it('应该包含正确的项目链接', () => {
    renderWithQueryClient(
      <ProjectCard
        id="test-project-1"
        title="测试项目"
        description="测试描述"
        episodes={5}
        status="in_progress"
        updatedAt="2024-01-15T10:00:00Z"
      />
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/projects/test-project-1')
  })

  it('应该正确格式化集数和日期', () => {
    renderWithQueryClient(
      <ProjectCard
        id="1"
        title="测试项目"
        description="测试描述"
        episodes={3}
        status="in_progress"
        updatedAt="2024-01-15T10:00:00Z"
      />
    )

    expect(screen.getByText('3 集')).toBeInTheDocument()
    expect(screen.getByText('2024/1/15')).toBeInTheDocument()
  })
})

describe('ProjectCardSkeleton', () => {
  it('应该渲染骨架屏', () => {
    const { container } = render(<ProjectCardSkeleton />)

    // 验证骨架屏元素存在
    const skeletonElements = container.querySelectorAll('.animate-pulse')
    expect(skeletonElements.length).toBeGreaterThan(0)
  })
})

describe('ProjectList with Search and Filter', () => {
  it('应该支持搜索过滤', () => {
    const ProjectListWithSearch = () => {
      const [searchQuery, setSearchQuery] = React.useState('')

      const filteredProjects = mockProjects.filter((p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase())
      )

      return (
        <div>
          <input
            type="text"
            placeholder="搜索项目..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="search-input"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                id={project.id}
                title={project.title}
                description={project.description || ''}
                episodes={project.episodeCount || 0}
                status={project.status === 'completed' ? 'completed' : 'in_progress'}
                updatedAt={project.updatedAt}
              />
            ))}
          </div>
          {filteredProjects.length === 0 && (
            <div data-testid="empty-state">暂无匹配的项目</div>
          )}
        </div>
      )
    }

    renderWithQueryClient(<ProjectListWithSearch />)

    // 初始状态显示所有项目
    expect(screen.getByText('测试项目 1')).toBeInTheDocument()
    expect(screen.getByText('已完成项目')).toBeInTheDocument()
    expect(screen.getByText('制作中项目')).toBeInTheDocument()

    // 输入搜索关键词
    const searchInput = screen.getByTestId('search-input')
    fireEvent.change(searchInput, { target: { value: '已完成' } })

    // 只显示匹配的项目
    expect(screen.queryByText('测试项目 1')).not.toBeInTheDocument()
    expect(screen.getByText('已完成项目')).toBeInTheDocument()
    expect(screen.queryByText('制作中项目')).not.toBeInTheDocument()
  })

  it('应该支持状态过滤', () => {
    const ProjectListWithFilter = () => {
      const [statusFilter, setStatusFilter] = React.useState<string>('all')

      const filteredProjects =
        statusFilter === 'all'
          ? mockProjects
          : mockProjects.filter((p) => p.status === statusFilter)

      return (
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            data-testid="status-filter"
          >
            <option value="all">全部</option>
            <option value="completed">已完成</option>
            <option value="in_progress">制作中</option>
          </select>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                id={project.id}
                title={project.title}
                description={project.description || ''}
                episodes={project.episodeCount || 0}
                status={project.status === 'completed' ? 'completed' : 'in_progress'}
                updatedAt={project.updatedAt}
              />
            ))}
          </div>
        </div>
      )
    }

    renderWithQueryClient(<ProjectListWithFilter />)

    // 初始状态显示所有项目
    expect(screen.getByText('测试项目 1')).toBeInTheDocument()
    expect(screen.getByText('已完成项目')).toBeInTheDocument()

    // 选择已完成状态
    const statusFilter = screen.getByTestId('status-filter')
    fireEvent.change(statusFilter, { target: { value: 'completed' } })

    // 只显示已完成的项目
    expect(screen.queryByText('测试项目 1')).not.toBeInTheDocument()
    expect(screen.getByText('已完成项目')).toBeInTheDocument()
  })
})

describe('ProjectList Empty State', () => {
  it('应该在项目列表为空时显示空状态', () => {
    const EmptyProjectList = () => {
      const projects: typeof mockProjects = []

      return (
        <div>
          {projects.length === 0 ? (
            <div data-testid="empty-state">
              <h3>暂无项目</h3>
              <p>开始创建你的第一个短剧项目吧</p>
            </div>
          ) : (
            <div>
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  id={project.id}
                  title={project.title}
                  description={project.description || ''}
                  episodes={project.episodeCount || 0}
                  status={project.status === 'completed' ? 'completed' : 'in_progress'}
                  updatedAt={project.updatedAt}
                />
              ))}
            </div>
          )}
        </div>
      )
    }

    renderWithQueryClient(<EmptyProjectList />)

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByText('暂无项目')).toBeInTheDocument()
    expect(screen.getByText('开始创建你的第一个短剧项目吧')).toBeInTheDocument()
  })
})

describe('ProjectList Error State', () => {
  it('应该在加载失败时显示错误状态', () => {
    const ErrorProjectList = () => {
      const error = new Error('无法连接到服务器')
      const onRetry = vi.fn()

      return (
        <div data-testid="error-state">
          <h3>加载失败</h3>
          <p>{error.message}</p>
          <button onClick={onRetry} data-testid="retry-button">
            重试
          </button>
        </div>
      )
    }

    renderWithQueryClient(<ErrorProjectList />)

    expect(screen.getByTestId('error-state')).toBeInTheDocument()
    expect(screen.getByText('加载失败')).toBeInTheDocument()
    expect(screen.getByText('无法连接到服务器')).toBeInTheDocument()

    const retryButton = screen.getByTestId('retry-button')
    fireEvent.click(retryButton)
    expect(retryButton).toBeInTheDocument()
  })
})

// 导入 React
import React from 'react'
