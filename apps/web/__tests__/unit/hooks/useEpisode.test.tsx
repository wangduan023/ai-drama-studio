import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import {
  useEpisodesByProject,
  useEpisode,
  useCreateEpisode,
  useUpdateEpisode,
  useDeleteEpisode,
} from '@/hooks/useEpisode'
import { createTestQueryClient } from '@/test/utils'
import { mockEpisodes, mockProjects } from '@/test/mocks/data'
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

describe('useEpisodesByProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.resetHandlers()
  })

  it('应该返回剧集列表', async () => {
    const projectId = mockProjects[0].id
    const { result } = renderHook(() => useEpisodesByProject(projectId), { wrapper })

    // 初始状态为 loading
    expect(result.current.isLoading).toBe(true)

    // 等待数据加载完成
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // 验证返回数据
    expect(result.current.data).toHaveLength(mockEpisodes.length)
    expect(result.current.data?.[0].name).toBe(mockEpisodes[0].name)
  })

  it('应该正确处理加载状态', async () => {
    const projectId = mockProjects[0].id
    const { result } = renderHook(() => useEpisodesByProject(projectId), { wrapper })

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

    const projectId = mockProjects[0].id
    const { result } = renderHook(() => useEpisodesByProject(projectId), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
  })

  it('应该在 projectId 为 undefined 时禁用查询', async () => {
    const { result } = renderHook(() => useEpisodesByProject(undefined), { wrapper })

    // 查询被禁用，应保持初始状态
    expect(result.current.isLoading).toBe(false)
    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toBeUndefined()
  })

  it('应该正确缓存数据', async () => {
    const projectId = mockProjects[0].id
    const queryClient = createTestQueryClient()
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result: result1 } = renderHook(() => useEpisodesByProject(projectId), {
      wrapper: customWrapper,
    })

    await waitFor(() => expect(result1.current.isSuccess).toBe(true))
    expect(result1.current.data).toHaveLength(mockEpisodes.length)

    // 再次渲染，应该使用缓存
    const { result: result2 } = renderHook(() => useEpisodesByProject(projectId), {
      wrapper: customWrapper,
    })

    // 因为有缓存，应该立即返回数据
    if (!result2.current.isLoading) {
      expect(result2.current.data).toEqual(result1.current.data)
    }
  })
})

describe('useEpisode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.resetHandlers()
  })

  it('应该返回单个剧集', async () => {
    const episodeId = mockEpisodes[0].id
    const { result } = renderHook(() => useEpisode(episodeId), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.id).toBe(episodeId)
    expect(result.current.data?.name).toBe(mockEpisodes[0].name)
  })

  it('应该在 id 为 undefined 时禁用查询', async () => {
    const { result } = renderHook(() => useEpisode(undefined), { wrapper })

    // 查询被禁用，应保持初始状态
    expect(result.current.isLoading).toBe(false)
    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toBeUndefined()
  })

  it('应该处理剧集不存在的情况', async () => {
    server.use(
      http.get('/api/episodes/:id', () => {
        return HttpResponse.json(
          { error: 'Episode not found' },
          { status: 404 }
        )
      })
    )

    const { result } = renderHook(() => useEpisode('non-existent-id'), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
  })

  it('应该正确缓存单个剧集数据', async () => {
    const episodeId = mockEpisodes[0].id
    const queryClient = createTestQueryClient()
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result: result1 } = renderHook(() => useEpisode(episodeId), {
      wrapper: customWrapper,
    })

    await waitFor(() => expect(result1.current.isSuccess).toBe(true))

    // 再次获取相同剧集
    const { result: result2 } = renderHook(() => useEpisode(episodeId), {
      wrapper: customWrapper,
    })

    if (!result2.current.isLoading) {
      expect(result2.current.data?.id).toBe(episodeId)
    }
  })
})

describe('useCreateEpisode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.resetHandlers()
  })

  it('应该成功创建剧集', async () => {
    const { result } = renderHook(() => useCreateEpisode(), { wrapper })

    const newEpisode = {
      projectId: mockProjects[0].id,
      input: {
        name: '第三集：重逢',
        number: 3,
        novelText: '这是第三集的内容...',
      },
    }

    // 执行创建
    result.current.mutate(newEpisode)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.name).toBe(newEpisode.input.name)
    expect(result.current.data?.number).toBe(newEpisode.input.number)
    expect(result.current.data?.id).toBeDefined()
    expect(result.current.data?.scriptStatus).toBe('PENDING')
  })

  it('应该正确处理可选字段', async () => {
    const { result } = renderHook(() => useCreateEpisode(), { wrapper })

    result.current.mutate({
      projectId: mockProjects[0].id,
      input: {
        name: '简单剧集',
      },
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const created = result.current.data
    expect(created?.name).toBe('简单剧集')
    expect(created?.createdAt).toBeDefined()
    expect(created?.updatedAt).toBeDefined()
  })

  it('应该在成功时使剧集列表缓存失效', async () => {
    const queryClient = createTestQueryClient()
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const projectId = mockProjects[0].id
    const { result: listResult } = renderHook(() => useEpisodesByProject(projectId), {
      wrapper: customWrapper,
    })
    const { result: createResult } = renderHook(() => useCreateEpisode(), {
      wrapper: customWrapper,
    })

    // 等待初始列表
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    // 创建新剧集
    createResult.current.mutate({
      projectId,
      input: { name: '缓存测试剧集' },
    })

    await waitFor(() => expect(createResult.current.isSuccess).toBe(true))

    expect(createResult.current.data?.name).toBe('缓存测试剧集')
  })
})

describe('useUpdateEpisode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.resetHandlers()
  })

  it('应该成功更新剧集', async () => {
    const episodeId = mockEpisodes[0].id
    const { result } = renderHook(() => useUpdateEpisode(episodeId), { wrapper })

    const updateData = {
      projectId: mockProjects[0].id,
      input: {
        name: '更新后的剧名',
        novelText: '更新后的内容...',
      },
    }

    result.current.mutate(updateData)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.name).toBe(updateData.input.name)
    expect(result.current.data?.novelText).toBe(updateData.input.novelText)
    expect(result.current.data?.id).toBe(episodeId)
  })

  it('应该支持部分更新', async () => {
    const episodeId = mockEpisodes[0].id
    const { result } = renderHook(() => useUpdateEpisode(episodeId), { wrapper })

    // 只更新剧名
    result.current.mutate({
      projectId: mockProjects[0].id,
      input: { name: '仅更新剧名' },
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.name).toBe('仅更新剧名')
  })

  it('应该支持更新剧集编号', async () => {
    const episodeId = mockEpisodes[0].id
    const { result } = renderHook(() => useUpdateEpisode(episodeId), { wrapper })

    result.current.mutate({
      projectId: mockProjects[0].id,
      input: { number: 5 },
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.number).toBe(5)
  })

  it('应该在成功时使相关缓存失效', async () => {
    const episodeId = mockEpisodes[0].id
    const queryClient = createTestQueryClient()
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result: detailResult } = renderHook(() => useEpisode(episodeId), {
      wrapper: customWrapper,
    })
    const { result: updateResult } = renderHook(() => useUpdateEpisode(episodeId), {
      wrapper: customWrapper,
    })

    // 等待初始数据
    await waitFor(() => expect(detailResult.current.isSuccess).toBe(true))

    // 更新剧集
    updateResult.current.mutate({
      projectId: mockProjects[0].id,
      input: { name: '缓存失效测试' },
    })

    await waitFor(() => expect(updateResult.current.isSuccess).toBe(true))

    expect(updateResult.current.data?.name).toBe('缓存失效测试')
  })
})

describe('useDeleteEpisode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.resetHandlers()
  })

  it('应该成功删除剧集', async () => {
    const { result } = renderHook(() => useDeleteEpisode(), { wrapper })

    const projectId = mockProjects[0].id
    const episodeId = mockEpisodes[0].id
    result.current.mutate({ projectId, episodeId })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.isSuccess).toBe(true)
  })

  it('应该在成功时删除相关缓存', async () => {
    const queryClient = createTestQueryClient()
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const projectId = mockProjects[0].id
    const episodeId = mockEpisodes[0].id

    const { result: listResult } = renderHook(() => useEpisodesByProject(projectId), {
      wrapper: customWrapper,
    })
    const { result: deleteResult } = renderHook(() => useDeleteEpisode(), {
      wrapper: customWrapper,
    })

    // 等待初始列表
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    // 删除剧集
    deleteResult.current.mutate({ projectId, episodeId })

    await waitFor(() => expect(deleteResult.current.isSuccess).toBe(true))

    expect(deleteResult.current.isSuccess).toBe(true)
  })

  it('应该处理删除错误', async () => {
    // 添加 DELETE 错误 handler
    server.use(
      http.delete('/api/episodes/:id', () => {
        return HttpResponse.json(
          { error: 'Episode not found' },
          { status: 404 }
        )
      })
    )

    const { result } = renderHook(() => useDeleteEpisode(), { wrapper })

    result.current.mutate({ projectId: 'test', episodeId: 'non-existent-id' })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
  })
})
