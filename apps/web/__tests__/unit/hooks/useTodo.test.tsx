import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import {
  useTodoList,
  useCreateTodo,
  useUpdateTodo,
  useDeleteTodo,
  useToggleTodo,
  useClearCompleted,
  Todo,
} from '@/hooks/useTodo'
import { createTestQueryClient } from '@/test/utils'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// 创建测试用的 wrapper
const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// 测试数据
const mockTodos: Todo[] = [
  {
    id: 'todo-1',
    title: '测试任务 1',
    completed: false,
    priority: 'high',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'todo-2',
    title: '测试任务 2',
    completed: true,
    priority: 'medium',
    createdAt: '2024-01-15T11:00:00Z',
    updatedAt: '2024-01-15T11:00:00Z',
  },
]

describe('useTodoList', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('应该返回空列表（初始状态）', async () => {
    const { result } = renderHook(() => useTodoList(), { wrapper })

    // 初始状态为 loading
    expect(result.current.isLoading).toBe(true)

    // 等待数据加载完成
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // 验证返回空数组
    expect(result.current.data).toEqual([])
  })

  it('应该从 localStorage 读取已有数据', async () => {
    // 预置 localStorage 数据
    localStorageMock.setItem('ai-drama-studio-todos', JSON.stringify(mockTodos))

    const { result } = renderHook(() => useTodoList(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data?.[0].title).toBe('测试任务 1')
    expect(result.current.data?.[1].title).toBe('测试任务 2')
  })

  it('应该正确处理加载状态', async () => {
    const { result } = renderHook(() => useTodoList(), { wrapper })

    // 初始状态检查
    expect(result.current.isLoading).toBe(true)
    expect(result.current.isFetching).toBe(true)
    expect(result.current.data).toBeUndefined()

    // 等待加载完成
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isSuccess).toBe(true)
  })
})

describe('useCreateTodo', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('应该成功创建新的 Todo', async () => {
    const { result: listResult } = renderHook(() => useTodoList(), { wrapper })
    const { result: createResult } = renderHook(() => useCreateTodo(), { wrapper })

    // 等待初始列表加载
    await waitFor(() => {
      expect(listResult.current.isSuccess).toBe(true)
    })

    // 初始列表为空
    expect(listResult.current.data).toEqual([])

    // 创建新 Todo
    createResult.current.mutate({ title: '新任务', priority: 'high' })

    await waitFor(() => {
      expect(createResult.current.isSuccess).toBe(true)
    })

    // 验证创建的 Todo
    expect(createResult.current.data?.title).toBe('新任务')
    expect(createResult.current.data?.priority).toBe('high')
    expect(createResult.current.data?.completed).toBe(false)
    expect(createResult.current.data?.id).toBeDefined()
    expect(createResult.current.data?.createdAt).toBeDefined()
  })

  it('应该使用默认优先级 medium', async () => {
    const { result } = renderHook(() => useCreateTodo(), { wrapper })

    result.current.mutate({ title: '默认优先级任务' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.priority).toBe('medium')
  })

  it('应该缓存失效并刷新列表', async () => {
    const queryClient = createTestQueryClient()
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result: listResult } = renderHook(() => useTodoList(), {
      wrapper: customWrapper,
    })
    const { result: createResult } = renderHook(() => useCreateTodo(), {
      wrapper: customWrapper,
    })

    // 等待初始列表
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))

    // 创建任务
    createResult.current.mutate({ title: '缓存测试任务' })

    await waitFor(() => expect(createResult.current.isSuccess).toBe(true))

    // 验证 localStorage 已更新
    const stored = localStorageMock.getItem('ai-drama-studio-todos')
    const parsed = JSON.parse(stored || '[]')
    expect(parsed).toHaveLength(1)
    expect(parsed[0].title).toBe('缓存测试任务')
  })
})

describe('useUpdateTodo', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('应该成功更新 Todo', async () => {
    // 预置数据
    localStorageMock.setItem('ai-drama-studio-todos', JSON.stringify(mockTodos))

    const { result } = renderHook(() => useUpdateTodo('todo-1'), { wrapper })

    result.current.mutate({ title: '更新的任务标题' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.title).toBe('更新的任务标题')
    expect(result.current.data?.id).toBe('todo-1')
    expect(result.current.data?.priority).toBe('high') // 保持不变
  })

  it('应该更新完成状态', async () => {
    localStorageMock.setItem('ai-drama-studio-todos', JSON.stringify(mockTodos))

    const { result } = renderHook(() => useUpdateTodo('todo-1'), { wrapper })

    result.current.mutate({ completed: true })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.completed).toBe(true)
  })

  it('应该处理不存在的 Todo', async () => {
    localStorageMock.setItem('ai-drama-studio-todos', JSON.stringify(mockTodos))

    const { result } = renderHook(() => useUpdateTodo('non-existent-id'), { wrapper })

    result.current.mutate({ title: '更新的标题' })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toBe('Todo not found')
  })

  it('应该更新 updatedAt 时间戳', async () => {
    localStorageMock.setItem('ai-drama-studio-todos', JSON.stringify(mockTodos))

    const { result } = renderHook(() => useUpdateTodo('todo-1'), { wrapper })

    const beforeUpdate = new Date().toISOString()
    result.current.mutate({ title: '更新时间测试' })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const afterUpdate = new Date().toISOString()
    const updatedAt = result.current.data?.updatedAt || ''
    
    // 验证时间戳已更新
    expect(updatedAt).not.toBe('2024-01-15T10:00:00Z')
    expect(new Date(updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(beforeUpdate).getTime())
    expect(new Date(updatedAt).getTime()).toBeLessThanOrEqual(new Date(afterUpdate).getTime())
  })
})

describe('useDeleteTodo', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('应该成功删除 Todo', async () => {
    localStorageMock.setItem('ai-drama-studio-todos', JSON.stringify(mockTodos))

    const { result: listResult } = renderHook(() => useTodoList(), { wrapper })
    const { result: deleteResult } = renderHook(() => useDeleteTodo(), { wrapper })

    // 等待初始列表
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))
    expect(listResult.current.data).toHaveLength(2)

    // 删除第一个任务
    deleteResult.current.mutate('todo-1')

    await waitFor(() => {
      expect(deleteResult.current.isSuccess).toBe(true)
    })

    // 验证 localStorage 已更新
    const stored = localStorageMock.getItem('ai-drama-studio-todos')
    const parsed = JSON.parse(stored || '[]')
    expect(parsed).toHaveLength(1)
    expect(parsed[0].id).toBe('todo-2')
  })

  it('应该处理删除不存在的 Todo', async () => {
    localStorageMock.setItem('ai-drama-studio-todos', JSON.stringify(mockTodos))

    const { result } = renderHook(() => useDeleteTodo(), { wrapper })

    // 删除不存在的任务应该静默成功（过滤逻辑）
    result.current.mutate('non-existent-id')

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // 数据应保持不变
    const stored = localStorageMock.getItem('ai-drama-studio-todos')
    const parsed = JSON.parse(stored || '[]')
    expect(parsed).toHaveLength(2)
  })
})

describe('useToggleTodo', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('应该切换 Todo 完成状态为 true', async () => {
    localStorageMock.setItem('ai-drama-studio-todos', JSON.stringify(mockTodos))

    const { result } = renderHook(() => useToggleTodo(), { wrapper })

    result.current.mutate({ id: 'todo-1', completed: true })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.completed).toBe(true)
    expect(result.current.data?.id).toBe('todo-1')
  })

  it('应该切换 Todo 完成状态为 false', async () => {
    localStorageMock.setItem('ai-drama-studio-todos', JSON.stringify(mockTodos))

    const { result } = renderHook(() => useToggleTodo(), { wrapper })

    // todo-2 初始状态为已完成，切换回未完成
    result.current.mutate({ id: 'todo-2', completed: false })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.completed).toBe(false)
  })

  it('应该处理不存在的 Todo', async () => {
    localStorageMock.setItem('ai-drama-studio-todos', JSON.stringify(mockTodos))

    const { result } = renderHook(() => useToggleTodo(), { wrapper })

    result.current.mutate({ id: 'non-existent-id', completed: true })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error?.message).toBe('Todo not found')
  })
})

describe('useClearCompleted', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  it('应该清除所有已完成的 Todo', async () => {
    localStorageMock.setItem('ai-drama-studio-todos', JSON.stringify(mockTodos))

    const { result: listResult } = renderHook(() => useTodoList(), { wrapper })
    const { result: clearResult } = renderHook(() => useClearCompleted(), { wrapper })

    // 等待初始列表
    await waitFor(() => expect(listResult.current.isSuccess).toBe(true))
    expect(listResult.current.data?.some(t => t.completed)).toBe(true)

    // 清除已完成任务
    clearResult.current.mutate()

    await waitFor(() => {
      expect(clearResult.current.isSuccess).toBe(true)
    })

    // 验证返回值只包含未完成任务
    expect(clearResult.current.data).toHaveLength(1)
    expect(clearResult.current.data?.[0].id).toBe('todo-1')
    expect(clearResult.current.data?.[0].completed).toBe(false)

    // 验证 localStorage
    const stored = localStorageMock.getItem('ai-drama-studio-todos')
    const parsed = JSON.parse(stored || '[]')
    expect(parsed).toHaveLength(1)
    expect(parsed[0].completed).toBe(false)
  })

  it('应该处理空列表情况', async () => {
    const { result } = renderHook(() => useClearCompleted(), { wrapper })

    result.current.mutate()

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual([])
  })

  it('应该处理全部已完成的情况', async () => {
    const allCompleted = mockTodos.map(t => ({ ...t, completed: true }))
    localStorageMock.setItem('ai-drama-studio-todos', JSON.stringify(allCompleted))

    const { result } = renderHook(() => useClearCompleted(), { wrapper })

    result.current.mutate()

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual([])

    const stored = localStorageMock.getItem('ai-drama-studio-todos')
    const parsed = JSON.parse(stored || '[]')
    expect(parsed).toEqual([])
  })
})
