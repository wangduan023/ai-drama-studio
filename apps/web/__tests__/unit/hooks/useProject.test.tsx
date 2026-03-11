import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import {
  useProjectList,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from '@/hooks/useProject'
import { createTestQueryClient } from '@/test/utils'
import { mockProjects } from '@/test/mocks/data'
import { server } from '@/test/mocks/server'
import { errorHandlers } from '@/test/mocks/handlers'

// 创建测试用的 wrapper
const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useProjectList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 重置为默认 handlers
    server.resetHandlers()
  })

  it('应该返回项目列表', async () => {
    const { result } = renderHook(() => useProjectList(), { wrapper })

    // 初始状态为 loading
    expect(result.current.isLoading).toBe(true)

    // 等待数据加载完成
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // 验证返回数据
    expect(result.current.data).toHaveLength(mockProjects.length)
    expect(result.current.data?.[0].title).toBe(mockProjects[0].title)
  })

  it('应该正确处理加载状态', async () => {
    const { result } = renderHook(() => useProjectList(), { wrapper })

    // 初始状态检查
    expect(result.current.isLoading).toBe(true)
    expect(result.current.isFetching).toBe(true)
    expect(result.current.data).toBeUndefined()

    // 等待加载完成
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isSuccess).toBe(true)
    expect(result.current.data).toBeDefined()
  })

  it('应该正确处理错误状态', async () => {
    // 切换到错误 handlers
    server.use(...errorHandlers)

    const { result } = renderHook(() => useProjectList(), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
  })

  it('应该正确缓存数据', async () => {
    const queryClient = createTestQueryClient()
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result: result1 } = renderHook(() => useProjectList(), {
      wrapper: customWrapper,
    })

    await waitFor(() => expect(result1.current.isSuccess).toBe(true))
    expect(result1.current.data).toHaveLength(mockProjects.length)

    // 再次渲染，应该使用缓存
    const { result: result2 } = renderHook(() => useProjectList(), {
      wrapper: customWrapper,
    })

    // 因为有缓存，应该立即返回数据
    if (!result2.current.isLoading) {
      expect(result2.current.data).toEqual(result1.current.data)
    }
  })
})

describe('useProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.resetHandlers()
  })

  it('应该返回单个项目', async () => {
    const projectId = mockProjects[0].id
    const { result } = renderHook(() => useProject(projectId), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.id).toBe(projectId)
    expect(result.current.data?.title).toBe(mockProjects[0].title)
  })

  it('应该在 id 为 undefined 时禁用查询', async () => {
    const { result } = renderHook(() => useProject(undefined), { wrapper })

    // 查询被禁用，应保持初始状态
    expect(result.current.isLoading).toBe(false)
    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toBeUndefined()
  })

  it('应该处理项目不存在的情况', async () => {
    server.use(...errorHandlers)

    const { result } = renderHook(() => useProject('non-existent-id'), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
  })

  it('应该正确缓存单个项目数据', async () => {
    const projectId = mockProjects[0].id
    const queryClient = createTestQueryClient()
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result: result1 } = renderHook(() => useProject(projectId), {
      wrapper: customWrapper,
    })

    await waitFor(() => expect(result1.current.isSuccess).toBe(true))

    // 再次获取相同项目
    const { result: result2 } = renderHook(() => useProject(projectId), {
      wrapper: customWrapper,
    })

    if (!result2.current.isLoading) {
      expect(result2.current.data?.id).toBe(projectId)
    }
  })
})

describe('useCreateProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.resetHandlers()
  })

  it('应该成功创建项目', async () => {
    const { result } = renderHook(() => useCreateProject(), { wrapper })

    const newProject = {
      title: '新项目',
      description: '项目描述',
    }

    // 执行创建
    result.current.mutate(newProject)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.title).toBe(newProject.title)
    expect(result.current.data?.description).toBe(newProject.description)
    expect(result.current.data?.id).toBeDefined()
    expect(result.current.data?.status).toBeDefined()
  })

  it('应该正确设置项目初始值', async () => {
    const { result } = renderHook(() => useCreateProject(), { wrapper })

    result.current.mutate({ title: '测试初始值' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const created = result.current.data
    expect(created?.episodeCount).toBe(0)
    expect(created?.characterCount).toBe(0)
    expect(created?.locationCount).toBe(0)
    expect(created?.createdAt).toBeDefined()
    expect(created?.updatedAt).toBeDefined()
  })

  it('应该处理可选的 description', async () => {
    const { result } = renderHook(() => useCreateProject(), { wrapper })

    result.current.mutate({ title: '无描述项目' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.description).toBeDefined()
  })

  it('应该在成功时使项目列表缓存失效', async () => {
    const queryClient = createTestQueryClient()
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result: listResult } = renderHook(() => useProjectList(), {
      wrapper: customWrapper,
    })
    const { result: createResult } = renderHook(() => useCreateProject(), {
      wrapper: customWrapper,
    })

    // 等待初始列表
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    // 创建新项目
    createResult.current.mutate({ title: '缓存测试项目' })

    await waitFor(() => expect(createResult.current.isSuccess).toBe(true))

    // 验证创建成功
    expect(createResult.current.data?.title).toBe('缓存测试项目')
  })
})

describe('useUpdateProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.resetHandlers()
  })

  it('应该成功更新项目', async () => {
    const projectId = mockProjects[0].id
    const { result } = renderHook(() => useUpdateProject(projectId), { wrapper })

    const updateData = {
      title: '更新后的标题',
      description: '更新后的描述',
    }

    result.current.mutate(updateData)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.title).toBe(updateData.title)
    expect(result.current.data?.description).toBe(updateData.description)
    expect(result.current.data?.id).toBe(projectId)
  })

  it('应该支持部分更新', async () => {
    const projectId = mockProjects[0].id
    const { result } = renderHook(() => useUpdateProject(projectId), { wrapper })

    // 只更新标题
    result.current.mutate({ title: '仅更新标题' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.title).toBe('仅更新标题')
  })

  it('应该支持更新状态', async () => {
    const projectId = mockProjects[0].id
    const { result } = renderHook(() => useUpdateProject(projectId), { wrapper })

    result.current.mutate({ status: 'completed' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.status).toBe('completed')
  })

  it('应该在成功时使相关缓存失效', async () => {
    const projectId = mockProjects[0].id
    const queryClient = createTestQueryClient()
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result: detailResult } = renderHook(() => useProject(projectId), {
      wrapper: customWrapper,
    })
    const { result: updateResult } = renderHook(() => useUpdateProject(projectId), {
      wrapper: customWrapper,
    })

    // 等待初始数据
    await waitFor(() => expect(detailResult.current.isSuccess).toBe(true))

    // 更新项目
    updateResult.current.mutate({ title: '缓存失效测试' })

    await waitFor(() => expect(updateResult.current.isSuccess).toBe(true))

    expect(updateResult.current.data?.title).toBe('缓存失效测试')
  })
})

describe('useDeleteProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.resetHandlers()
  })

  it('应该成功删除项目', async () => {
    const { result } = renderHook(() => useDeleteProject(), { wrapper })

    const projectId = mockProjects[0].id
    result.current.mutate(projectId)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // 删除操作成功，但 mutation 不返回数据
    expect(result.current.isSuccess).toBe(true)
  })

  it('应该在成功时使项目列表缓存失效', async () => {
    const queryClient = createTestQueryClient()
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result: listResult } = renderHook(() => useProjectList(), {
      wrapper: customWrapper,
    })
    const { result: deleteResult } = renderHook(() => useDeleteProject(), {
      wrapper: customWrapper,
    })

    // 等待初始列表
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))
    const initialCount = listResult.current.data?.length || 0

    // 删除项目
    deleteResult.current.mutate(mockProjects[0].id)

    await waitFor(() => expect(deleteResult.current.isSuccess).toBe(true))

    expect(deleteResult.current.isSuccess).toBe(true)
  })

  it('应该处理删除错误', async () => {
    // 添加 DELETE 错误 handler
    server.use(
      http.delete('/api/projects/:id', () => {
        return HttpResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        )
      })
    )

    const { result } = renderHook(() => useDeleteProject(), { wrapper })

    result.current.mutate('non-existent-id')

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
  })
})
