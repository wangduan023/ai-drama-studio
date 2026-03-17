import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// 任务类型定义
export enum TaskType {
  // 资产生成
  EXTRACT_ASSETS = 'extract_assets',
  GENERATE_SCENE_IMAGE = 'generate_scene_image',
  GENERATE_CHARACTER_IMAGE = 'generate_character_image',
  GENERATE_PROP_IMAGE = 'generate_prop_image',

  // 分镜相关
  SPLIT_STORYBOARD = 'split_storyboard',
  GENERATE_STORYBOARD_IMAGE = 'generate_storyboard_image',
  CHAT_GENERATE_IMAGE = 'chat_generate_image',
  GENERATE_GRID_NINE = 'generate_grid_nine',

  // 视频生成
  GENERATE_VIDEO = 'generate_video',
  GENERATE_MULTI_PARAM_VIDEO = 'generate_multi_param_video',
  GENERATE_FRAME_VIDEO = 'generate_frame_video',

  // 配音相关
  GENERATE_DUBBING = 'generate_dubbing',
  GENERATE_LIPSYNC = 'generate_lipsync',

  // 导出
  EXPORT_VIDEO = 'export_video',
}

// 任务状态
export enum TaskStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// 任务优先级
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

// 任务数据结构
export interface Task {
  id: string
  projectId: string
  type: TaskType
  status: TaskStatus
  priority: TaskPriority
  progress: number
  result?: any
  error?: string
  retryCount: number
  maxRetries: number
  payload: Record<string, any>
  createdAt: string
  updatedAt: string
  completedAt?: string
}

// API 请求验证 Schema
export const SubmitTaskSchema = z.object({
  type: z.nativeEnum(TaskType),
  payload: z.record(z.any()),
  priority: z.nativeEnum(TaskPriority).optional().default(TaskPriority.MEDIUM),
})

export const UpdateTaskSchema = z.object({
  status: z.nativeEnum(TaskStatus).optional(),
  progress: z.number().min(0).max(100).optional(),
  result: z.any().optional(),
  error: z.string().optional(),
})

// 任务队列接口
export interface TaskQueue {
  add(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'progress' | 'retryCount'>): Promise<string>
  get(taskId: string): Promise<Task | null>
  update(taskId: string, updates: Partial<Task>): Promise<void>
  cancel(taskId: string): Promise<void>
  list(projectId: string, filters?: { status?: TaskStatus; type?: TaskType }): Promise<Task[]>
  remove(taskId: string): Promise<void>
}

// 内存任务队列实现（开发用，生产环境应使用 Redis/BullMQ）
export class InMemoryTaskQueue implements TaskQueue {
  private tasks: Map<string, Task> = new Map()
  private projectIndexes: Map<string, Set<string>> = new Map()

  async add(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'progress' | 'retryCount'>): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const task: Task = {
      ...taskData,
      id: taskId,
      progress: 0,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.tasks.set(taskId, task)

    // 更新项目索引
    if (!this.projectIndexes.has(taskData.projectId)) {
      this.projectIndexes.set(taskData.projectId, new Set())
    }
    this.projectIndexes.get(taskData.projectId)!.add(taskId)

    return taskId
  }

  async get(taskId: string): Promise<Task | null> {
    return this.tasks.get(taskId) || null
  }

  async update(taskId: string, updates: Partial<Task>): Promise<void> {
    const task = this.tasks.get(taskId)
    if (!task) throw new Error(`Task ${taskId} not found`)

    const updated = {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    if (updates.result || updates.error) {
      updated.completedAt = new Date().toISOString()
    }

    this.tasks.set(taskId, updated)
  }

  async cancel(taskId: string): Promise<void> {
    await this.update(taskId, { status: TaskStatus.FAILED, error: 'Cancelled by user' })
  }

  async list(projectId: string, filters?: { status?: TaskStatus; type?: TaskType }): Promise<Task[]> {
    const taskIds = this.projectIndexes.get(projectId)
    if (!taskIds) return []

    const tasks = Array.from(taskIds)
      .map(id => this.tasks.get(id))
      .filter((t): t is Task => t !== undefined)

    if (filters?.status) {
      return tasks.filter(t => t.status === filters.status)
    }

    if (filters?.type) {
      return tasks.filter(t => t.type === filters.type)
    }

    return tasks
  }

  async remove(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)
    if (task) {
      this.projectIndexes.get(task.projectId)?.delete(taskId)
      this.tasks.delete(taskId)
    }
  }
}

// 全局任务队列实例
let globalTaskQueue: TaskQueue | null = null

export function getTaskQueue(): TaskQueue {
  if (!globalTaskQueue) {
    globalTaskQueue = new InMemoryTaskQueue()
  }
  return globalTaskQueue
}

// 通用 API 响应辅助函数
export function createResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status })
}

export function createErrorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status })
}

// 处理任务提交的通用函数
export async function handleSubmitTask(
  request: NextRequest,
  projectId: string
): Promise<NextResponse> {
  try {
    const body = await request.json()
    const validation = SubmitTaskSchema.safeParse(body)

    if (!validation.success) {
      return createErrorResponse(validation.errors[0].message, 400)
    }

    const { type, payload, priority } = validation.data

    const queue = getTaskQueue()
    const taskId = await queue.add({
      projectId,
      type,
      status: TaskStatus.PENDING,
      priority,
      payload,
    })

    return createResponse({
      success: true,
      taskId,
      message: 'Task submitted successfully',
    })
  } catch (error) {
    console.error('Error submitting task:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// 处理任务查询的通用函数
export async function handleGetTask(
  projectId: string,
  taskId: string
): Promise<NextResponse> {
  try {
    const queue = getTaskQueue()
    const task = await queue.get(taskId)

    if (!task) {
      return createErrorResponse('Task not found', 404)
    }

    if (task.projectId !== projectId) {
      return createErrorResponse('Task not found', 404)
    }

    return createResponse({
      success: true,
      task,
    })
  } catch (error) {
    console.error('Error getting task:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// 处理任务列表查询的通用函数
export async function handleListTasks(
  projectId: string,
  filters?: { status?: TaskStatus; type?: TaskType }
): Promise<NextResponse> {
  try {
    const queue = getTaskQueue()
    const tasks = await queue.list(projectId, filters)

    return createResponse({
      success: true,
      tasks,
      count: tasks.length,
    })
  } catch (error) {
    console.error('Error listing tasks:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// 处理任务取消的通用函数
export async function handleCancelTask(
  projectId: string,
  taskId: string
): Promise<NextResponse> {
  try {
    const queue = getTaskQueue()
    const task = await queue.get(taskId)

    if (!task) {
      return createErrorResponse('Task not found', 404)
    }

    if (task.projectId !== projectId) {
      return createErrorResponse('Task not found', 404)
    }

    await queue.cancel(taskId)

    return createResponse({
      success: true,
      message: 'Task cancelled successfully',
    })
  } catch (error) {
    console.error('Error cancelling task:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
