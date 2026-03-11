import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import NewProjectPage from '@/app/projects/new/page'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { toast } from 'sonner'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/projects/new',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

// 等待动画完成的辅助函数
const waitForAnimation = () => new Promise(resolve => setTimeout(resolve, 300))

describe('项目创建表单', () => {
  beforeEach(() => {
    mockPush.mockClear()
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('应该正确渲染项目创建表单的所有步骤', async () => {
    render(<NewProjectPage />)

    // 等待加载完成
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    // 验证页面标题
    expect(screen.getByText('创建新项目')).toBeInTheDocument()

    // 验证步骤条
    expect(screen.getByText('基础信息')).toBeInTheDocument()
    expect(screen.getByText('剧本输入')).toBeInTheDocument()
    expect(screen.getByText('AI 设置')).toBeInTheDocument()
    expect(screen.getByText('确认')).toBeInTheDocument()

    // 验证第一步表单字段
    expect(screen.getByLabelText('项目名称 *')).toBeInTheDocument()
    expect(screen.getByLabelText('项目描述')).toBeInTheDocument()
    expect(screen.getByText('项目类型')).toBeInTheDocument()
  })

  it('应该允许用户输入项目名称和描述', async () => {
    const user = userEvent.setup()
    render(<NewProjectPage />)

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    const titleInput = screen.getByLabelText('项目名称 *')
    const descriptionInput = screen.getByLabelText('项目描述')

    await user.type(titleInput, '我的测试项目')
    await user.type(descriptionInput, '这是一个测试项目描述')

    expect(titleInput).toHaveValue('我的测试项目')
    expect(descriptionInput).toHaveValue('这是一个测试项目描述')
  })

  it('应该验证项目名称必填', async () => {
    const user = userEvent.setup()
    render(<NewProjectPage />)

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    // 尝试不输入项目名称就点击下一步
    const nextButton = screen.getByText('下一步')
    await user.click(nextButton)

    // 验证错误提示（通过 toast.error）
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('请输入项目名称')
    })
  })

  it('应该能够切换到下一步并返回', async () => {
    const user = userEvent.setup()
    render(<NewProjectPage />)

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    // 输入项目名称
    const titleInput = screen.getByLabelText('项目名称 *')
    await user.type(titleInput, '测试项目')

    // 点击下一步
    const nextButton = screen.getByText('下一步')
    await user.click(nextButton)

    // 等待动画完成
    await waitForAnimation()

    // 验证进入第二步（剧本输入）- 通过检查元素是否存在
    await waitFor(() => {
      expect(screen.getByPlaceholderText('在此粘贴剧本内容...')).toBeInTheDocument()
    })

    // 点击上一步返回
    const prevButton = screen.getByText('上一步')
    await user.click(prevButton)

    // 等待动画完成
    await waitForAnimation()

    // 验证回到第一步
    await waitFor(() => {
      expect(screen.getByLabelText('项目名称 *')).toBeInTheDocument()
    })
  })

  it('应该允许用户输入剧本内容', async () => {
    const user = userEvent.setup()
    render(<NewProjectPage />)

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    // 输入项目名称并进入第二步
    const titleInput = screen.getByLabelText('项目名称 *')
    await user.type(titleInput, '测试项目')
    await user.click(screen.getByText('下一步'))

    // 等待动画完成
    await waitForAnimation()

    // 等待第二步渲染
    await waitFor(() => {
      expect(screen.getByPlaceholderText('在此粘贴剧本内容...')).toBeInTheDocument()
    })

    // 输入剧本内容
    const novelInput = screen.getByPlaceholderText('在此粘贴剧本内容...')
    await user.type(novelInput, '这是一个测试剧本内容')

    expect(novelInput).toHaveValue('这是一个测试剧本内容')
  })

  it('应该允许用户选择项目类型', async () => {
    const user = userEvent.setup()
    render(<NewProjectPage />)

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    // 点击项目类型下拉
    const typeSelect = screen.getByRole('combobox')
    await user.click(typeSelect)

    // 选择改编作品
    await waitFor(() => {
      expect(screen.getByText('改编作品')).toBeInTheDocument()
    })
    await user.click(screen.getByText('改编作品'))

    // 验证选择成功（下拉框关闭）
    await waitFor(() => {
      expect(screen.queryByText('原创作品')).not.toBeVisible()
    })
  })

  it('应该能够到达确认页面并创建项目', async () => {
    const user = userEvent.setup()
    
    // 设置创建项目的 API mock
    server.use(
      http.post('/api/projects', async () => {
        return HttpResponse.json({
          id: 'new-project-123',
          title: '测试项目',
          description: '测试描述',
          status: 'DRAFT',
          episodeCount: 0,
          characterCount: 0,
          locationCount: 0,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }, { status: 201 })
      })
    )

    render(<NewProjectPage />)

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    // 填写表单数据
    await user.type(screen.getByLabelText('项目名称 *'), '测试项目')
    await user.type(screen.getByLabelText('项目描述'), '测试描述')

    // 进入第二步
    await user.click(screen.getByText('下一步'))
    await waitForAnimation()
    await waitFor(() => {
      expect(screen.getByPlaceholderText('在此粘贴剧本内容...')).toBeInTheDocument()
    })

    // 输入剧本内容
    await user.type(screen.getByPlaceholderText('在此粘贴剧本内容...'), '剧本内容')

    // 进入第三步
    await user.click(screen.getByText('下一步'))
    await waitForAnimation()
    await waitFor(() => {
      expect(screen.getByText('图像生成模型')).toBeInTheDocument()
    })

    // 进入第四步（确认页）
    await user.click(screen.getByText('下一步'))
    await waitForAnimation()
    await waitFor(() => {
      expect(screen.getByText('确认创建项目')).toBeInTheDocument()
    })

    // 验证确认页面显示的信息
    expect(screen.getByText('测试项目')).toBeInTheDocument()
    expect(screen.getByText('测试描述')).toBeInTheDocument()

    // 点击创建项目
    await user.click(screen.getByText('创建项目'))

    // 验证成功 toast 和跳转
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('项目创建成功！')
      expect(mockPush).toHaveBeenCalledWith('/projects/new-project-123')
    })
  })

  it('应该处理项目创建失败的情况', async () => {
    const user = userEvent.setup()
    
    // 设置创建失败的 API mock
    server.use(
      http.post('/api/projects', async () => {
        return HttpResponse.json(
          { error: '创建项目失败' },
          { status: 500 }
        )
      })
    )

    render(<NewProjectPage />)

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    // 填写表单并到达确认页
    await user.type(screen.getByLabelText('项目名称 *'), '测试项目')
    
    // 快速进入确认页
    await user.click(screen.getByText('下一步'))
    await waitForAnimation()
    await waitFor(() => expect(screen.getByPlaceholderText('在此粘贴剧本内容...')).toBeInTheDocument())
    
    await user.click(screen.getByText('下一步'))
    await waitForAnimation()
    await waitFor(() => expect(screen.getByText('图像生成模型')).toBeInTheDocument())
    
    await user.click(screen.getByText('下一步'))
    await waitForAnimation()
    await waitFor(() => expect(screen.getByText('确认创建项目')).toBeInTheDocument())

    // 点击创建
    await user.click(screen.getByText('创建项目'))

    // 验证错误提示（通过检查 toast.error 被调用）
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })
  })

  it('应该在本地存储中自动保存草稿', async () => {
    const user = userEvent.setup()
    render(<NewProjectPage />)

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    // 输入项目名称
    await user.type(screen.getByLabelText('项目名称 *'), '草稿项目')
    await user.type(screen.getByLabelText('项目描述'), '草稿描述')

    // 等待自动保存（使用 fake timers 或直接等待）
    await waitFor(() => {
      const saved = localStorage.getItem('project-draft')
      expect(saved).toBeTruthy()
      const draft = JSON.parse(saved!)
      expect(draft.title).toBe('草稿项目')
      expect(draft.description).toBe('草稿描述')
    }, { timeout: 3000 })
  })

  it('应该能够从草稿恢复数据', async () => {
    // 预先设置草稿
    localStorage.setItem('project-draft', JSON.stringify({
      title: '恢复的项目',
      description: '恢复的描述',
      type: 'adaptation',
      novel: '恢复的剧本',
      imageModel: 'midjourney',
      videoModel: 'pika',
      style: 'anime',
    }))

    render(<NewProjectPage />)

    // 等待加载完成并验证数据已恢复
    await waitFor(() => {
      const titleInput = screen.getByLabelText('项目名称 *') as HTMLInputElement
      expect(titleInput.value).toBe('恢复的项目')
    })

    // 验证 toast.info 被调用（草稿恢复提示）
    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith('已恢复上次保存的草稿')
    })

    // 验证描述也已恢复
    await waitFor(() => {
      const descInput = screen.getByLabelText('项目描述') as HTMLTextAreaElement
      expect(descInput.value).toBe('恢复的描述')
    })
  })

  it('应该在创建成功后清除草稿', async () => {
    const user = userEvent.setup()
    
    // 设置草稿
    localStorage.setItem('project-draft', JSON.stringify({
      title: '测试项目',
      description: '测试描述',
      type: 'original',
      novel: '',
      imageModel: 'dalle3',
      videoModel: 'runway',
      style: 'cinematic',
    }))

    server.use(
      http.post('/api/projects', async () => {
        return HttpResponse.json({
          id: 'new-project-456',
          title: '测试项目',
          description: '测试描述',
          status: 'DRAFT',
          episodeCount: 0,
          characterCount: 0,
          locationCount: 0,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }, { status: 201 })
      })
    )

    render(<NewProjectPage />)

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    // 快速到达确认页并创建
    await user.click(screen.getByText('下一步'))
    await waitForAnimation()
    await waitFor(() => expect(screen.getByPlaceholderText('在此粘贴剧本内容...')).toBeInTheDocument())
    await user.click(screen.getByText('下一步'))
    await waitForAnimation()
    await waitFor(() => expect(screen.getByText('图像生成模型')).toBeInTheDocument())
    await user.click(screen.getByText('下一步'))
    await waitForAnimation()
    await waitFor(() => expect(screen.getByText('确认创建项目')).toBeInTheDocument())

    await user.click(screen.getByText('创建项目'))

    // 验证草稿被清除
    await waitFor(() => {
      expect(localStorage.getItem('project-draft')).toBeNull()
    })
  })

  it('应该在提交时显示加载状态', async () => {
    const user = userEvent.setup()
    
    // 延迟响应以测试加载状态
    server.use(
      http.post('/api/projects', async () => {
        await new Promise(resolve => setTimeout(resolve, 500))
        return HttpResponse.json({
          id: 'new-project-789',
          title: '测试项目',
          description: '测试描述',
          status: 'DRAFT',
          episodeCount: 0,
          characterCount: 0,
          locationCount: 0,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }, { status: 201 })
      })
    )

    render(<NewProjectPage />)

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    // 填写并到达确认页
    await user.type(screen.getByLabelText('项目名称 *'), '测试项目')
    await user.click(screen.getByText('下一步'))
    await waitForAnimation()
    await waitFor(() => expect(screen.getByPlaceholderText('在此粘贴剧本内容...')).toBeInTheDocument())
    await user.click(screen.getByText('下一步'))
    await waitForAnimation()
    await waitFor(() => expect(screen.getByText('图像生成模型')).toBeInTheDocument())
    await user.click(screen.getByText('下一步'))
    await waitForAnimation()
    await waitFor(() => expect(screen.getByText('确认创建项目')).toBeInTheDocument())

    // 点击创建
    await user.click(screen.getByText('创建项目'))

    // 验证加载状态
    await waitFor(() => {
      expect(screen.getByText('创建中...')).toBeInTheDocument()
    })
  })
})
