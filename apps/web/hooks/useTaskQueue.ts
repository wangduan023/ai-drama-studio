'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { TaskType, TaskStatus, type Task } from '@/lib/task-queue'

export type { TaskStatus, Task } from '@/lib/task-queue'

export interface UseTaskQueueOptions {
  projectId?: string
  pollInterval?: number
  autoPoll?: boolean
  onStatusChange?: (task: Task) => void
}

export function useTaskQueue({
  projectId,
  pollInterval = 2000,
  autoPoll = true,
  onStatusChange,
}: UseTaskQueueOptions = {}) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const taskCache = useRef<Map<string, Task>>(new Map())

  // 获取任务列表
  const fetchTasks = useCallback(async (filters?: {
    status?: TaskStatus
    type?: TaskType
    limit?: number
  }) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json()
      if (data.success) {
        setTasks(data.tasks)
        // 更新缓存
        data.tasks.forEach((task: Task) => {
          taskCache.current.set(task.id, task)
        })
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
      toast.error('获取任务列表失败')
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  // 提交新任务
  const submitTask = useCallback(async (taskData: {
    type: TaskType
    payload: Record<string, any>
    priority?: 'low' | 'medium' | 'high'
  }): Promise<string | null> => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      })
      const data = await response.json()

      if (data.success) {
        toast.success('任务已提交到队列')
        // 更新缓存
        const newTask = {
          id: data.taskId,
          type: taskData.type,
          status: 'pending' as TaskStatus,
          progress: 0,
          payload: taskData.payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        taskCache.current.set(data.taskId, newTask)
        return data.taskId
      }

      toast.error(data.error || '提交任务失败')
      return null
    } catch (error) {
      console.error('Failed to submit task:', error)
      toast.error('提交任务失败')
      return null
    }
  }, [projectId])

  // 获取单个任务状态
  const getTaskStatus = useCallback(async (taskId: string): Promise<Task | null> => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`)
      const data = await response.json()
      if (data.success) {
        const task = data.task
        taskCache.current.set(taskId, task)
        return task
      }
      return null
    } catch (error) {
      console.error('Failed to get task status:', error)
      return null
    }
  }, [projectId])

  // 取消任务
  const cancelTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: 'DELETE',
      })
      const data = await response.json()
      if (data.success) {
        toast.info('任务已取消')
        // 更新缓存
        const existing = taskCache.current.get(taskId)
        if (existing) {
          taskCache.current.set(taskId, { ...existing, status: 'failed' as TaskStatus, error: 'Cancelled by user' })
        }
        return true
      }
      return false
    } catch (error) {
      console.error('Failed to cancel task:', error)
      toast.error('取消任务失败')
      return false
    }
  }, [projectId])

  // 批量取消任务
  const cancelAllTasks = useCallback(async (): Promise<boolean> => {
    const cancellableTasks = tasks.filter(t =>
      t.status === 'pending' || t.status === 'queued' || t.status === 'generating'
    )

    if (cancellableTasks.length === 0) {
      toast.info('没有可取消的任务')
      return true
    }

    const results = await Promise.all(
      cancellableTasks.map(t => cancelTask(t.id))
    )

    const successCount = results.filter(r => r).length
    toast.success(`已取消 ${successCount}/${cancellableTasks.length} 个任务`)

    return successCount === cancellableTasks.length
  }, [tasks, cancelTask])

  // 轮询任务状态
  const startPolling = useCallback(() => {
    if (pollingRef.current) return

    const poll = async () => {
      const activeTaskIds = Array.from(taskCache.current.entries())
        .filter(([_, task]) => task.status === 'pending' || task.status === 'queued' || task.status === 'generating')
        .map(([id]) => id)

      if (activeTaskIds.length === 0) {
        stopPolling()
        return
      }

      // 批量获取任务状态
      for (const taskId of activeTaskIds) {
        try {
          const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`)
          const data = await response.json()
          if (data.success) {
            const task = data.task
            taskCache.current.set(taskId, task)
            if (onStatusChange) {
              onStatusChange(task)
            }
          }
        } catch (error) {
          console.error(`Failed to poll task ${taskId}:`, error)
        }
      }
    }

    pollingRef.current = setInterval(poll, pollInterval)
  }, [pollInterval, projectId, onStatusChange])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  // 初始化
  useEffect(() => {
    if (autoPoll && projectId) {
      fetchTasks()
      startPolling()
    }

    return () => {
      stopPolling()
    }
  }, [projectId, autoPoll, fetchTasks, startPolling, stopPolling])

  // 获取特定类型的任务
  const getTasksByType = useCallback((type: TaskType) => {
    return Array.from(taskCache.current.values()).filter(t => t.type === type)
  }, [])

  // 获取活跃任务数量
  const getActiveTaskCount = useCallback(() => {
    return Array.from(taskCache.current.values()).filter(
      t => t.status === 'pending' || t.status === 'queued' || t.status === 'generating'
    ).length
  }, [])

  // 获取已完成任务数量
  const getCompletedTaskCount = useCallback(() => {
    return Array.from(taskCache.current.values()).filter(
      t => t.status === 'completed'
    ).length
  }, [])

  // 更新任务缓存
  const updateTaskCache = useCallback((taskId: string, updates: Partial<Task>) => {
    const existing = taskCache.current.get(taskId)
    if (existing) {
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
      taskCache.current.set(taskId, updated)

      if (onStatusChange) {
        onStatusChange(updated)
      }

      // 如果任务完成或失败，停止轮询
      if (updated.status === 'completed' || updated.status === 'failed') {
        // 检查是否还有其他活跃任务
        const hasActiveTasks = Array.from(taskCache.current.values()).some(
          t => t.status === 'pending' || t.status === 'queued' || t.status === 'generating'
        )
        if (!hasActiveTasks) {
          stopPolling()
        }
      }
    }
  }, [onStatusChange, stopPolling])

  // 模拟任务进度更新（用于开发测试）
  const simulateTaskProgress = useCallback((taskId: string) => {
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 20
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
        updateTaskCache(taskId, {
          status: 'completed',
          progress: 100,
          result: { url: '/mock/result.mp4' }
        })
        toast.success('任务已完成')
      } else {
        updateTaskCache(taskId, {
          status: 'generating',
          progress: Math.min(progress, 99)
        })
      }
    }, 1000)
  }, [updateTaskCache])

  return {
    // 状态
    tasks,
    isLoading,

    // 任务操作
    submitTask,
    getTaskStatus,
    cancelTask,
    cancelAllTasks,
    fetchTasks,

    // 查询方法
    getTasksByType,
    getActiveTaskCount,
    getCompletedTaskCount,

    // 轮询控制
    startPolling,
    stopPolling,

    // 内部方法（用于更新任务状态）
    updateTaskCache,
    simulateTaskProgress,
  }
}
