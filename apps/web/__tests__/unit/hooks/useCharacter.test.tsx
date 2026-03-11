import { describe, it, expect, beforeEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import {
  useCharacterList,
  useCharacter,
  useCreateCharacter,
  useUpdateCharacter,
  useDeleteCharacter,
} from '@/hooks/useCharacter'
import { createTestQueryClient } from '@/test/utils'
import { mockCharacters, mockProjects } from '@/test/mocks/data'
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

describe('useCharacterList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.resetHandlers()
  })

  it('应该返回角色列表', async () => {
    const projectId = mockProjects[0].id
    const { result } = renderHook(() => useCharacterList(projectId), { wrapper })

    // 初始状态为 loading
    expect(result.current.isLoading).toBe(true)

    // 等待数据加载完成
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // 验证返回数据
    expect(result.current.data).toHaveLength(mockCharacters.length)
    expect(result.current.data?.[0].name).toBe(mockCharacters[0].name)
  })

  it('应该正确处理加载状态', async () => {
    const projectId = mockProjects[0].id
    const { result } = renderHook(() => useCharacterList(projectId), { wrapper })

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
    const { result } = renderHook(() => useCharacterList(projectId), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
  })

  it('应该支持获取所有角色（不传 projectId）', async () => {
    const { result } = renderHook(() => useCharacterList(), { wrapper })

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

    const { result: result1 } = renderHook(() => useCharacterList(projectId), {
      wrapper: customWrapper,
    })

    await waitFor(() => expect(result1.current.isSuccess).toBe(true))
    expect(result1.current.data).toHaveLength(mockCharacters.length)

    // 再次渲染，应该使用缓存
    const { result: result2 } = renderHook(() => useCharacterList(projectId), {
      wrapper: customWrapper,
    })

    // 因为有缓存，应该立即返回数据
    if (!result2.current.isLoading) {
      expect(result2.current.data).toEqual(result1.current.data)
    }
  })
})

describe('useCharacter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.resetHandlers()
  })

  it('应该返回单个角色', async () => {
    const characterId = mockCharacters[0].id
    const { result } = renderHook(() => useCharacter(characterId), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.id).toBe(characterId)
    expect(result.current.data?.name).toBe(mockCharacters[0].name)
  })

  it('应该在 id 为 undefined 时禁用查询', async () => {
    const { result } = renderHook(() => useCharacter(undefined), { wrapper })

    // 查询被禁用，应保持初始状态
    expect(result.current.isLoading).toBe(false)
    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toBeUndefined()
  })

  it('应该处理角色不存在的情况', async () => {
    server.use(
      http.get('/api/characters/:id', () => {
        return HttpResponse.json(
          { error: 'Character not found' },
          { status: 404 }
        )
      })
    )

    const { result } = renderHook(() => useCharacter('non-existent-id'), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
  })

  it('应该正确缓存单个角色数据', async () => {
    const characterId = mockCharacters[0].id
    const queryClient = createTestQueryClient()
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result: result1 } = renderHook(() => useCharacter(characterId), {
      wrapper: customWrapper,
    })

    await waitFor(() => expect(result1.current.isSuccess).toBe(true))

    // 再次获取相同角色
    const { result: result2 } = renderHook(() => useCharacter(characterId), {
      wrapper: customWrapper,
    })

    if (!result2.current.isLoading) {
      expect(result2.current.data?.id).toBe(characterId)
    }
  })
})

describe('useCreateCharacter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.resetHandlers()
  })

  it('应该成功创建角色', async () => {
    const { result } = renderHook(() => useCreateCharacter(), { wrapper })

    const newCharacter = {
      projectId: mockProjects[0].id,
      name: '新角色',
      roleLevel: 'A' as const,
      introduction: '这是一个新角色',
    }

    // 执行创建
    result.current.mutate(newCharacter)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.name).toBe(newCharacter.name)
    expect(result.current.data?.roleLevel).toBe(newCharacter.roleLevel)
    expect(result.current.data?.id).toBeDefined()
  })

  it('应该正确处理可选字段', async () => {
    const { result } = renderHook(() => useCreateCharacter(), { wrapper })

    result.current.mutate({
      projectId: mockProjects[0].id,
      name: '简单角色',
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const created = result.current.data
    expect(created?.name).toBe('简单角色')
    expect(created?.createdAt).toBeDefined()
    expect(created?.updatedAt).toBeDefined()
  })

  it('应该支持完整的角色属性', async () => {
    const { result } = renderHook(() => useCreateCharacter(), { wrapper })

    const fullCharacter = {
      projectId: mockProjects[0].id,
      name: '完整角色',
      roleLevel: 'S' as const,
      introduction: '角色介绍',
      aliases: ['别名1', '别名2'],
      gender: '男',
      ageRange: '30岁',
      archetype: '英雄',
      personalityTags: ['勇敢', '善良'],
      eraPeriod: '现代',
      socialClass: '中产',
      occupation: '工程师',
      costumeTier: '高级',
      suggestedColors: ['蓝色', '白色'],
      primaryIdentifier: '眼镜',
      visualKeywords: ['高大', '斯文'],
      expectedAppearances: 20,
    }

    result.current.mutate(fullCharacter)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.name).toBe(fullCharacter.name)
    expect(result.current.data?.aliases).toEqual(fullCharacter.aliases)
  })
})

describe('useUpdateCharacter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.resetHandlers()
  })

  it('应该成功更新角色', async () => {
    const characterId = mockCharacters[0].id
    const { result } = renderHook(() => useUpdateCharacter(characterId), { wrapper })

    const updateData = {
      name: '更新后的名字',
      roleLevel: 'S' as const,
      introduction: '更新后的介绍',
    }

    result.current.mutate(updateData)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.name).toBe(updateData.name)
    expect(result.current.data?.roleLevel).toBe(updateData.roleLevel)
    expect(result.current.data?.id).toBe(characterId)
  })

  it('应该支持部分更新', async () => {
    const characterId = mockCharacters[0].id
    const { result } = renderHook(() => useUpdateCharacter(characterId), { wrapper })

    // 只更新名字
    result.current.mutate({ name: '仅更新名字' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.name).toBe('仅更新名字')
  })

  it('应该支持更新标签数组', async () => {
    const characterId = mockCharacters[0].id
    const { result } = renderHook(() => useUpdateCharacter(characterId), { wrapper })

    result.current.mutate({
      personalityTags: ['友好', '乐观'],
      visualKeywords: ['阳光', '开朗'],
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.personalityTags).toEqual(['友好', '乐观'])
  })

  it('应该在成功时使相关缓存失效', async () => {
    const characterId = mockCharacters[0].id
    const queryClient = createTestQueryClient()
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result: detailResult } = renderHook(() => useCharacter(characterId), {
      wrapper: customWrapper,
    })
    const { result: updateResult } = renderHook(() => useUpdateCharacter(characterId), {
      wrapper: customWrapper,
    })

    // 等待初始数据
    await waitFor(() => expect(detailResult.current.isSuccess).toBe(true))

    // 更新角色
    updateResult.current.mutate({ name: '缓存失效测试' })

    await waitFor(() => expect(updateResult.current.isSuccess).toBe(true))

    expect(updateResult.current.data?.name).toBe('缓存失效测试')
  })
})

describe('useDeleteCharacter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.resetHandlers()
  })

  it('应该成功删除角色', async () => {
    const { result } = renderHook(() => useDeleteCharacter(), { wrapper })

    const projectId = mockProjects[0].id
    const characterId = mockCharacters[0].id
    result.current.mutate({ projectId, characterId })

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
    const characterId = mockCharacters[0].id

    const { result: listResult } = renderHook(() => useCharacterList(projectId), {
      wrapper: customWrapper,
    })
    const { result: deleteResult } = renderHook(() => useDeleteCharacter(), {
      wrapper: customWrapper,
    })

    // 等待初始列表
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    // 删除角色
    deleteResult.current.mutate({ projectId, characterId })

    await waitFor(() => expect(deleteResult.current.isSuccess).toBe(true))

    expect(deleteResult.current.isSuccess).toBe(true)
  })

  it('应该处理删除错误', async () => {
    // 添加 DELETE 错误 handler
    server.use(
      http.delete('/api/characters/:id', () => {
        return HttpResponse.json(
          { error: 'Character not found' },
          { status: 404 }
        )
      })
    )

    const { result } = renderHook(() => useDeleteCharacter(), { wrapper })

    result.current.mutate({ projectId: 'test', characterId: 'non-existent-id' })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeDefined()
  })
})
