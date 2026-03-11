'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface Todo {
  id: string
  title: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  createdAt: string
  updatedAt: string
}

export interface CreateTodoInput {
  title: string
  priority?: 'low' | 'medium' | 'high'
}

export interface UpdateTodoInput {
  title?: string
  completed?: boolean
  priority?: 'low' | 'medium' | 'high'
}

// 本地存储键名
const STORAGE_KEY = 'ai-drama-studio-todos'

// 从 localStorage 读取
const getTodosFromStorage = (): Todo[] => {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(STORAGE_KEY)
  return data ? JSON.parse(data) : []
}

// 保存到 localStorage
const saveTodosToStorage = (todos: Todo[]) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
}

const queryKeys = {
  todos: {
    all: ['todos'] as const,
    list: () => [...queryKeys.todos.all, 'list'] as const,
  },
}

/**
 * 获取 Todo 列表
 */
export function useTodoList() {
  return useQuery({
    queryKey: queryKeys.todos.list(),
    queryFn: async () => {
      // 模拟 API 延迟
      await new Promise(resolve => setTimeout(resolve, 100))
      return getTodosFromStorage()
    },
  })
}

/**
 * 创建 Todo
 */
export function useCreateTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateTodoInput) => {
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const newTodo: Todo = {
        id: `todo-${Date.now()}`,
        title: input.title,
        completed: false,
        priority: input.priority || 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      const todos = getTodosFromStorage()
      const updatedTodos = [newTodo, ...todos]
      saveTodosToStorage(updatedTodos)
      
      return newTodo
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todos.list() })
    },
  })
}

/**
 * 更新 Todo
 */
export function useUpdateTodo(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateTodoInput) => {
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const todos = getTodosFromStorage()
      const todo = todos.find(t => t.id === id)
      if (!todo) throw new Error('Todo not found')
      
      const updatedTodo = { ...todo, ...input, updatedAt: new Date().toISOString() }
      const updatedTodos = todos.map(t => t.id === id ? updatedTodo : t)
      saveTodosToStorage(updatedTodos)
      
      return updatedTodo
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todos.list() })
    },
  })
}

/**
 * 删除 Todo
 */
export function useDeleteTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const todos = getTodosFromStorage()
      const updatedTodos = todos.filter(t => t.id !== id)
      saveTodosToStorage(updatedTodos)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todos.list() })
    },
  })
}

/**
 * 切换 Todo 完成状态
 */
export function useToggleTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const todos = getTodosFromStorage()
      const todo = todos.find(t => t.id === id)
      if (!todo) throw new Error('Todo not found')
      
      const updatedTodo = { ...todo, completed, updatedAt: new Date().toISOString() }
      const updatedTodos = todos.map(t => t.id === id ? updatedTodo : t)
      saveTodosToStorage(updatedTodos)
      
      return updatedTodo
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todos.list() })
    },
  })
}

/**
 * 清空已完成 Todo
 */
export function useClearCompleted() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const todos = getTodosFromStorage()
      const updatedTodos = todos.filter(t => !t.completed)
      saveTodosToStorage(updatedTodos)
      
      return updatedTodos
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.todos.list() })
    },
  })
}
