/**
 * Worker SSE Event Publishing Utilities
 *
 * 任务事件发布工具，用于 Worker 向 SSE 客户端推送任务进度和状态更新
 */

import {
  publishTaskEvent,
  publishTaskStreamEvent,
  publishTaskLifecycleEvent,
  reportTaskProgress,
  reportTaskStreamChunk,
  tryUpdateTaskProgress,
  touchTaskHeartbeat,
  getTaskStageLabel,
  buildTaskProgressMessage,
  TASK_EVENT_TYPE,
  type TaskJobData,
  type StreamChunk,
  type TaskType,
  type SSEEvent,
} from '@ai-drama-studio/sse'

export {
  // 重新导出核心功能
  publishTaskEvent,
  publishTaskStreamEvent,
  publishTaskLifecycleEvent,
  reportTaskProgress,
  reportTaskStreamChunk,
  tryUpdateTaskProgress,
  touchTaskHeartbeat,
  getTaskStageLabel,
  buildTaskProgressMessage,
  TASK_EVENT_TYPE,
}

export type { TaskJobData, StreamChunk, TaskType, SSEEvent }

/**
 * 发布任务进度事件
 *
 * @param taskId - 任务 ID
 * @param projectId - 项目 ID
 * @param userId - 用户 ID
 * @param progress - 进度百分比 (0-100)
 * @param message - 可选的进度消息
 * @param payload - 额外的负载数据
 */
export async function publishTaskProgress(
  taskId: string,
  projectId: string,
  userId: string,
  progress: number,
  message?: string,
  payload?: Record<string, unknown>
): Promise<SSEEvent> {
  const value = Math.max(0, Math.min(100, Math.floor(progress)))

  const eventPayload: Record<string, unknown> = {
    progress: value,
    ...(payload || {}),
  }

  if (message) {
    eventPayload.message = message
  }

  // 1. 保存到 TaskEvent 表
  // 2. 发送到 SSE 连接
  const event = await publishTaskLifecycleEvent({
    taskId,
    projectId,
    userId,
    lifecycleType: TASK_EVENT_TYPE.PROGRESS,
    payload: eventPayload,
    persist: true,
  })

  // 同时更新任务进度
  await tryUpdateTaskProgress(taskId, value, eventPayload)

  return event
}

/**
 * 发布任务完成事件
 *
 * @param taskId - 任务 ID
 * @param projectId - 项目 ID
 * @param userId - 用户 ID
 * @param result - 任务结果数据
 * @param message - 可选的完成消息
 */
export async function publishTaskComplete(
  taskId: string,
  projectId: string,
  userId: string,
  result: any,
  message?: string
): Promise<SSEEvent> {
  const payload: Record<string, unknown> = {
    result,
    done: true,
  }

  if (message) {
    payload.message = message
  }

  // 保存完成事件并推送
  const event = await publishTaskLifecycleEvent({
    taskId,
    projectId,
    userId,
    lifecycleType: TASK_EVENT_TYPE.COMPLETED,
    payload,
    persist: true,
  })

  return event
}

/**
 * 发布任务失败事件
 *
 * @param taskId - 任务 ID
 * @param projectId - 项目 ID
 * @param userId - 用户 ID
 * @param error - 错误信息
 * @param errorCode - 可选的错误代码
 * @param retryable - 是否可重试
 */
export async function publishTaskFailed(
  taskId: string,
  projectId: string,
  userId: string,
  error: string,
  errorCode?: string,
  retryable: boolean = false
): Promise<SSEEvent> {
  const payload: Record<string, unknown> = {
    error,
    retryable,
  }

  if (errorCode) {
    payload.errorCode = errorCode
  }

  // 保存失败事件并推送
  const event = await publishTaskLifecycleEvent({
    taskId,
    projectId,
    userId,
    lifecycleType: TASK_EVENT_TYPE.FAILED,
    payload,
    persist: true,
  })

  return event
}

/**
 * 发布任务开始处理事件
 *
 * @param taskId - 任务 ID
 * @param projectId - 项目 ID
 * @param userId - 用户 ID
 * @param stage - 当前阶段
 * @param message - 可选的消息
 */
export async function publishTaskStarted(
  taskId: string,
  projectId: string,
  userId: string,
  stage?: string,
  message?: string
): Promise<SSEEvent> {
  const payload: Record<string, unknown> = {}

  if (stage) {
    payload.stage = stage
    payload.stageLabel = getTaskStageLabel(stage)
  }

  if (message) {
    payload.message = message
  }

  const event = await publishTaskLifecycleEvent({
    taskId,
    projectId,
    userId,
    lifecycleType: TASK_EVENT_TYPE.PROCESSING,
    payload,
    persist: true,
  })

  return event
}

/**
 * 发布任务创建事件
 *
 * @param taskId - 任务 ID
 * @param projectId - 项目 ID
 * @param userId - 用户 ID
 * @param taskType - 任务类型
 * @param message - 可选的消息
 */
export async function publishTaskCreated(
  taskId: string,
  projectId: string,
  userId: string,
  taskType?: string,
  message?: string
): Promise<SSEEvent> {
  const payload: Record<string, unknown> = {}

  if (taskType) {
    payload.taskType = taskType
  }

  if (message) {
    payload.message = message
  } else {
    payload.message = 'Task queued'
  }

  const event = await publishTaskLifecycleEvent({
    taskId,
    projectId,
    userId,
    lifecycleType: TASK_EVENT_TYPE.CREATED,
    payload,
    persist: true,
  })

  return event
}

/**
 * 发布 LLM 流式输出事件
 *
 * @param taskId - 任务 ID
 * @param projectId - 项目 ID
 * @param userId - 用户 ID
 * @param chunk - 流式数据块
 * @param payload - 额外的负载数据
 */
export async function publishTaskStream(
  taskId: string,
  projectId: string,
  userId: string,
  chunk: StreamChunk,
  payload?: Record<string, unknown>
): Promise<SSEEvent | null> {
  const event = await publishTaskStreamEvent({
    taskId,
    projectId,
    userId,
    payload: {
      ...payload,
      stream: chunk,
      done: false,
    },
    persist: true,
  })

  return event
}

/**
 * 任务进度报告器类
 *
 * 提供更便捷的方式来报告任务进度
 */
export class TaskProgressReporter {
  private taskId: string
  private projectId: string
  private userId: string
  private lastProgress: number = 0
  private minProgressDelta: number = 1

  constructor(
    taskId: string,
    projectId: string,
    userId: string,
    options?: { minProgressDelta?: number }
  ) {
    this.taskId = taskId
    this.projectId = projectId
    this.userId = userId
    if (options?.minProgressDelta !== undefined) {
      this.minProgressDelta = options.minProgressDelta
    }
  }

  /**
   * 报告进度
   */
  async report(progress: number, message?: string, payload?: Record<string, unknown>): Promise<void> {
    const value = Math.max(0, Math.min(100, Math.floor(progress)))

    // 检查进度变化是否超过最小阈值
    if (Math.abs(value - this.lastProgress) < this.minProgressDelta && value < 100) {
      return
    }

    this.lastProgress = value

    await publishTaskProgress(
      this.taskId,
      this.projectId,
      this.userId,
      value,
      message,
      payload
    )
  }

  /**
   * 报告任务开始
   */
  async start(stage?: string, message?: string): Promise<void> {
    await publishTaskStarted(this.taskId, this.projectId, this.userId, stage, message)
  }

  /**
   * 报告任务完成
   */
  async complete(result: any, message?: string): Promise<void> {
    await publishTaskComplete(this.taskId, this.projectId, this.userId, result, message)
  }

  /**
   * 报告任务失败
   */
  async fail(error: string, errorCode?: string, retryable: boolean = false): Promise<void> {
    await publishTaskFailed(this.taskId, this.projectId, this.userId, error, errorCode, retryable)
  }

  /**
   * 报告流式输出
   */
  async stream(chunk: StreamChunk, payload?: Record<string, unknown>): Promise<void> {
    await publishTaskStream(this.taskId, this.projectId, this.userId, chunk, payload)
  }

  /**
   * 发送心跳
   */
  async heartbeat(): Promise<void> {
    await touchTaskHeartbeat(this.taskId)
  }

  /**
   * 获取当前进度
   */
  getProgress(): number {
    return this.lastProgress
  }
}

/**
 * 创建任务进度报告器
 */
export function createProgressReporter(
  taskId: string,
  projectId: string,
  userId: string,
  options?: { minProgressDelta?: number }
): TaskProgressReporter {
  return new TaskProgressReporter(taskId, projectId, userId, options)
}

/**
 * 从 TaskJobData 创建进度报告器
 */
export function createProgressReporterFromJob(
  jobData: TaskJobData,
  options?: { minProgressDelta?: number }
): TaskProgressReporter {
  return new TaskProgressReporter(
    jobData.taskId,
    jobData.projectId,
    jobData.userId,
    options
  )
}
