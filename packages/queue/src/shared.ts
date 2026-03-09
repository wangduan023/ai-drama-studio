/**
 * Worker 共享工具模块
 *
 * 提供任务生命周期管理、进度报告、错误处理等通用功能
 */

import { UnrecoverableError, type Job } from 'bullmq'
import type { TaskJobData, TaskBillingInfo, LLMStreamChunk } from './types'

/**
 * 任务进度报告
 * 用于在 Worker 执行过程中更新任务进度
 */
export async function reportTaskProgress(
  job: Job<TaskJobData>,
  progress: number,
  payload?: Record<string, unknown>,
): Promise<void> {
  const value = Math.max(0, Math.min(99, Math.floor(progress)))
  const nextPayload: Record<string, unknown> = {
    ...payload,
    progress: value,
  }

  // 更新 BullMQ 作业进度
  await job.updateProgress(value)

  // 这里可以集成 SSE 推送
  // 通过事件总线将进度推送给前端
  console.log(`[Task Progress] ${job.data.taskId}: ${value}%`, nextPayload)
}

/**
 * 任务生命周期包装器
 *
 * 提供统一的异常处理、心跳、计费等逻辑
 */
export async function withTaskLifecycle<T>(
  job: Job<TaskJobData>,
  handler: (job: Job<TaskJobData>) => Promise<T>,
): Promise<T | undefined> {
  const taskId = job.data.taskId
  const startedAt = Date.now()

  // 心跳定时器
  const heartbeatTimer = setInterval(() => {
    void touchTaskHeartbeat(taskId)
  }, 10000)

  try {
    console.log(`[Worker] Task ${taskId} started`, {
      queue: job.queueName,
      type: job.data.type,
      targetType: job.data.targetType,
      targetId: job.data.targetId,
    })

    // 执行实际的任务处理逻辑
    const result = await handler(job)

    const durationMs = Date.now() - startedAt
    console.log(`[Worker] Task ${taskId} completed in ${durationMs}ms`, result)

    return result
  } catch (error: unknown) {
    const durationMs = Date.now() - startedAt
    const errorMessage = error instanceof Error ? error.message : String(error)

    console.error(`[Worker] Task ${taskId} failed after ${durationMs}ms:`, errorMessage)

    // 判断是否需要重试
    const attemptsMade = job.attemptsMade ?? 0
    const maxAttempts = job.opts?.attempts ?? 3

    if (attemptsMade < maxAttempts - 1 && isRetryableError(error)) {
      console.log(`[Worker] Task ${taskId} will be retried (${attemptsMade + 1}/${maxAttempts})`)
      throw error // BullMQ 会自动重试
    }

    // 不可重试的错误，抛出 UnrecoverableError
    throw new UnrecoverableError(errorMessage)
  } finally {
    clearInterval(heartbeatTimer)
  }
}

/**
 * 判断错误是否可重试
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    // 网络错误、超时等临时错误可重试
    const retryablePatterns = [
      'timeout',
      'network',
      'connection',
      'rate limit',
      'temporarily',
      'retry',
    ]
    return retryablePatterns.some((pattern) => message.includes(pattern))
  }
  return true // 默认未知错误也可重试
}

/**
 * 触摸任务心跳
 * 用于防止任务长时间无响应
 */
export async function touchTaskHeartbeat(taskId: string): Promise<void> {
  // 这里可以更新数据库中的任务心跳时间
  // await prisma.task.update({ where: { id: taskId }, data: { heartbeatAt: new Date() } })
  console.debug(`[Heartbeat] Task ${taskId} heartbeat`)
}

/**
 * 报告 LLM 流式输出
 * 用于实时推送 LLM 生成的内容
 */
export async function reportLLMStreamChunk(
  job: Job<TaskJobData>,
  chunk: LLMStreamChunk,
  payload?: Record<string, unknown>,
): Promise<void> {
  const mergedPayload = {
    ...payload,
    stream: chunk,
    displayMode: 'detail',
  }

  // 这里可以通过 SSE 推送流式内容
  console.debug(`[LLM Stream] Task ${job.data.taskId}:`, chunk.delta)
}

/**
 * 断言任务处于活跃状态
 * 用于在长时间任务中检查任务是否被取消
 */
export async function assertTaskActive(job: Job<TaskJobData>, stage: string): Promise<boolean> {
  // 检查任务是否被标记为取消
  // const task = await prisma.task.findUnique({ where: { id: job.data.taskId }, select: { status: true } })
  // if (task?.status === 'dismissed' || task?.status === 'failed') {
  //   throw new TaskTerminatedError(`Task was terminated at stage: ${stage}`)
  // }
  return true
}

/**
 * 任务终止错误
 */
export class TaskTerminatedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TaskTerminatedError'
  }
}

/**
 * 标准化错误
 * 将各种错误转换为统一的格式
 */
export interface NormalizedError {
  code: string
  message: string
  retryable: boolean
  provider?: string
}

export function normalizeAnyError(error: unknown, options?: { context?: string }): NormalizedError {
  const context = options?.context || 'worker'

  if (error instanceof TaskTerminatedError) {
    return {
      code: 'TASK_TERMINATED',
      message: error.message,
      retryable: false,
    }
  }

  if (error instanceof Error) {
    const message = error.message
    const code = (error as Error & { code?: string }).code || 'INTERNAL_ERROR'

    return {
      code,
      message,
      retryable: isRetryableError(error),
    }
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: String(error),
    retryable: true,
    provider: context,
  }
}
