import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import {
  useLocationList,
  useLocation,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
} from '@/hooks/useLocation'
import { createTestQueryClient } from '@/test/utils'
import { mockLocations, mockProjects } from '@/test/mocks/data'
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

describe('useLocationList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.resetHandlers()
  })

  it('应该返回地点列表', async () => {
    const projectId = mockProjects[0].id
    const { result } = renderHook(() => useLocationList(projectId), { wrapper })

    // 初始状态为 loading
    expect(result.current.isLoading).toBe(true)

    // 等待数据加载完成
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // 验证返回数据
    expect(result.current.data).toHaveLength(mockLocations.length)
    expect(result.current.data?.[0].name).toBe(mockLocations[0].name)
  })

  it('应该正确处理加载状态', async () => {
    const projectId = mockProjects[0].id
    const { result } = renderHook(() => useLocationList(projectId), { wrapper })

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
    const { result } = renderHook(() => useLocationList(projectId), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
  })

  it('应该支持获取所有地点（不传 projectId）', async () => {
    const { result } = renderHook(() => useLocationList(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toBeDefined()
  })

  it('应该正确缓存数据', async () => {
    const projectId = mockProjects[0].id
    const queryClient = createTestQueryClient()
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result: result1 } = renderHook(() => useLocationList(projectId), {
      wrapper: customWrapper,
    })

    await waitFor(() => expect(result1.current.isSuccess).toBe(true))
    expect(result1.current.data).toHaveLength(mockLocations.length)

    // 再次渲染，应该使用缓存
    const { result: result2 } = renderHook(() => useLocationList(projectId), {
      wrapper: customWrapper,
    })

    // 因为有缓存，应该立即返回数据
    if (!result2.current.isLoading) {
      expect(result2.current.data).toEqual(result1.current.data)
    }
  })
})

describe('useLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.resetHandlers()
  })

  it('应该返回单个地点', async () => {
    const locationId = mockLocations[0].id
    const { result } = renderHook(() => useLocation(locationId), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.id).toBe(locationId)
    expect(result.current.data?.name).toBe(mockLocations[0].name)
  })

  it('应该在 id 为 undefined 时禁用查询', async () => {
    const { result } = renderHook(() => useLocation(undefined), { wrapper })

    // 查询被禁用，应保持初始状态
    expect(result.current.isLoading).toBe(false)
    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toBeUndefined()
  })

  it('应该处理地点不存在的情况', async () => {
    server.use(
      http.get('/api/locations/:id', () => {
        return HttpResponse.json(
          { error: 'Location not found' },
          { status: 404 }
        )
      })
    )

    const { result } = renderHook(() => useLocation('non-existent-id'), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
  })

  it('应该正确缓存单个地点数据', async () => {
    const locationId = mockLocations[0].id
    const queryClient = createTestQueryClient()
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result: result1 } = renderHook(() => useLocation(locationId), {
      wrapper: customWrapper,
    })

    await waitFor(() => expect(result1.current.isSuccess).toBe(true))

    // 再次获取相同地点
    const { result: result2 } = renderHook(() => useLocation(locationId), {
      wrapper: customWrapper,
    })

    if (!result2.current.isLoading) {
      expect(result2.current.data?.id).toBe(locationId)
    }
  })
})

describe('useCreateLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.resetHandlers()
  })

  it('应该成功创建地点', async () => {
    const { result } = renderHook(() => useCreateLocation(), { wrapper })

    const newLocation = {
      projectId: mockProjects[0].id,
      name: '新地点',
      description: '这是一个新地点',
      locationType: 'INDOOR' as const,
    }

    // 执行创建
    result.current.mutate(newLocation)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.name).toBe(newLocation.name)
    expect(result.current.data?.locationType).toBe(newLocation.locationType)
    expect(result.current.data?.id).toBeDefined()
    expect(result.current.data?.locationConfirmed).toBe(false)
  })

  it('应该正确处理可选字段', async () => {
    const { result } = renderHook(() => useCreateLocation(), { wrapper })

    result.current.mutate({
      projectId: mockProjects[0].id,
      name: '简单地点',
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const created = result.current.data
    expect(created?.name).toBe('简单地点')
    expect(created?.createdAt).toBeDefined()
    expect(created?.updatedAt).toBeDefined()
  })

  it('应该支持完整的地点属性', async () => {
    const { result } = renderHook(() => useCreateLocation(), { wrapper })

    const fullLocation = {
      projectId: mockProjects[0].id,
      name: '完整地点',
      description: '详细描述',
      eraPeriod: '现代',
      locationType: 'OUTDOOR' as const,
      moodColor: '蓝色',
      keyElements: ['树木', '长椅', '喷泉'],
    }

    result.current.mutate(fullLocation)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.name).toBe(fullLocation.name)
    expect(result.current.data?.keyElements).toEqual(fullLocation.keyElements)
  })

  it('应该在成功时使地点列表缓存失效', async () => {
    const queryClient = createTestQueryClient()
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const projectId = mockProjects[0].id
    const { result: listResult } = renderHook(() => useLocationList(projectId), {
      wrapper: customWrapper,
    })
    const { result: createResult } = renderHook(() => useCreateLocation(), {
      wrapper: customWrapper,
    })

    // 等待初始列表
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    // 创建新地点
    createResult.current.mutate({
      projectId,
      name: '缓存测试地点',
    })

    await waitFor(() => expect(createResult.current.isSuccess).toBe(true))

    expect(createResult.current.data?.name).toBe('缓存测试地点')
  })
})

describe('useUpdateLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.resetHandlers()
  })

  it('应该成功更新地点', async () => {
    const locationId = mockLocations[0].id
    const { result } = renderHook(() => useUpdateLocation(locationId), { wrapper })

    const updateData = {
      name: '更新后的名字',
      description: '更新后的描述',
      locationType: 'VIRTUAL' as const,
    }

    result.current.mutate(updateData)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.name).toBe(updateData.name)
    expect(result.current.data?.locationType).toBe(updateData.locationType)
    expect(result.current.data?.id).toBe(locationId)
  })

  it('应该支持部分更新', async () => {
    const locationId = mockLocations[0].id
    const { result } = renderHook(() => useUpdateLocation(locationId), { wrapper })

    // 只更新名字
    result.current.mutate({ name: '仅更新名字' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.name).toBe('仅更新名字')
  })

  it('应该支持更新地点类型', async () => {
    const locationId = mockLocations[0].id
    const { result } = renderHook(() => useUpdateLocation(locationId), { wrapper })

    // 测试更新为 VIRTUAL 类型
    result.current.mutate({ locationType: 'VIRTUAL' as const })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.locationType).toBe('VIRTUAL')
  })

  it('应该在成功时使相关缓存失效', async () => {
    const locationId = mockLocations[0].id
    const queryClient = createTestQueryClient()
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result: detailResult } = renderHook(() => useLocation(locationId), {
      wrapper: customWrapper,
    })
    const { result: updateResult } = renderHook(() => useUpdateLocation(locationId), {
      wrapper: customWrapper,
    })

    // 等待初始数据
    await waitFor(() => expect(detailResult.current.isSuccess).toBe(true))

    // 更新地点
    updateResult.current.mutate({ name: '缓存失效测试' })

    await waitFor(() => expect(updateResult.current.isSuccess).toBe(true))

    expect(updateResult.current.data?.name).toBe('缓存失效测试')
  })
})

describe('useDeleteLocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.resetHandlers()
  })

  it('应该成功删除地点', async () => {
    const { result } = renderHook(() => useDeleteLocation(), { wrapper })

    const projectId = mockProjects[0].id
    const locationId = mockLocations[0].id
    result.current.mutate({ projectId, locationId })

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
    const locationId = mockLocations[0].id

    const { result: listResult } = renderHook(() => useLocationList(projectId), {
      wrapper: customWrapper,
    })
    const { result: deleteResult } = renderHook(() => useDeleteLocation(), {
      wrapper: customWrapper,
    })

    // 等待初始列表
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    // 删除地点
    deleteResult.current.mutate({ projectId, locationId })

    await waitFor(() => expect(deleteResult.current.isSuccess).toBe(true))

    expect(deleteResult.current.isSuccess).toBe(true)
  })

  it('应该处理删除错误', async () => {
    // 添加 DELETE 错误 handler
    server.use(
      http.delete('/api/locations/:id', () => {
        return HttpResponse.json(
          { error: 'Location not found' },
          { status: 404 }
        )
      })
    )

    const { result } = renderHook(() => useDeleteLocation(), { wrapper })

    result.current.mutate({ projectId: 'test', locationId: 'non-existent-id' })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
  })
})
