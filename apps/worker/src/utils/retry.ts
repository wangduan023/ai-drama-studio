/**
 * 错误处理和重试工具
 *
 * 提供指数退避重试策略和错误分类功能
 */

import { prisma, TaskStatus } from '@ai-drama-studio/db'
import type { Job } from 'bullmq'
import type { TaskJobData } from '@ai-drama-studio/queue'

/**
 * 重试配置
 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxRetries: number
  /** 初始延迟（毫秒） */
  initialDelayMs: number
  /** 最大延迟（毫秒） */
  maxDelayMs: number
  /** 退避因子 */
  backoffFactor: number
  /** 可重试的错误类型 */
  retryableErrors: string[]
}

/**
 * 默认重试配置
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2,
  retryableErrors: [
    'NETWORK_ERROR',
    'RATE_LIMIT',
    'TIMEOUT',
    'TEMPORARY_ERROR',
    'SERVICE_UNAVAILABLE',
    'connection',
    'timeout',
    'rate limit',
    'temporarily',
    'retry',
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
  ],
}

/**
 * 错误分类
 */
export enum ErrorCategory {
  /** 可重试的临时错误 */
  RETRYABLE = 'RETRYABLE',
  /** 不可重试的永久错误 */
  PERMANENT = 'PERMANENT',
  /** 配置错误 */
  CONFIGURATION = 'CONFIGURATION',
  /** 验证错误 */
  VALIDATION = 'VALIDATION',
  /** 资源不存在 */
  NOT_FOUND = 'NOT_FOUND',
  /** 权限错误 */
  PERMISSION = 'PERMISSION',
  /** 未知错误 */
  UNKNOWN = 'UNKNOWN',
}

/**
 * 分类错误
 *
 * @param error - 错误对象
 * @returns 错误分类
 */
export function categorizeError(error: Error | unknown): ErrorCategory {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

  // 配置错误
  if (
    message.includes('api key') ||
    message.includes('apikey') ||
    message.includes('authentication') ||
    message.includes('unauthorized') ||
    message.includes('invalid config')
  ) {
    return ErrorCategory.CONFIGURATION
  }

  // 验证错误
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required') ||
    message.includes('must be')
  ) {
    return ErrorCategory.VALIDATION
  }

  // 资源不存在
  if (
    message.includes('not found') ||
    message.includes('does not exist') ||
    message.includes('404')
  ) {
    return ErrorCategory.NOT_FOUND
  }

  // 权限错误
  if (
    message.includes('forbidden') ||
    message.includes('permission') ||
    message.includes('unauthorized') ||
    message.includes('403')
  ) {
    return ErrorCategory.PERMISSION
  }

  // 可重试错误
  const retryablePatterns = [
    'timeout',
    'network',
    'connection',
    'rate limit',
    'temporarily',
    'retry',
    'econnreset',
    'etimedout',
    'econnrefused',
    '503',
    '502',
    '504',
    '429',
  ]

  if (retryablePatterns.some((pattern) => message.includes(pattern))) {
    return ErrorCategory.RETRYABLE
  }

  return ErrorCategory.UNKNOWN
}

/**
 * 检查错误是否可重试
 *
 * @param error - 错误对象
 * @returns 是否可重试
 */
export function isRetryableError(error: Error | unknown): boolean {
  return categorizeError(error) === ErrorCategory.RETRYABLE
}

/**
 * 计算指数退避延迟
 *
 * @param attempt - 当前尝试次数（从 1 开始）
 * @param config - 重试配置
 * @returns 延迟时间（毫秒）
 */
export function calculateBackoffDelay(
  attempt: number,
  config: Partial<RetryConfig> = {}
): number {
  const {
    initialDelayMs = DEFAULT_RETRY_CONFIG.initialDelayMs,
    maxDelayMs = DEFAULT_RETRY_CONFIG.maxDelayMs,
    backoffFactor = DEFAULT_RETRY_CONFIG.backoffFactor,
  } = config

  const exponentialDelay = initialDelayMs * Math.pow(backoffFactor, attempt - 1)
  const jitter = Math.random() * 0.1 * exponentialDelay // 10% 随机抖动

  return Math.min(exponentialDelay + jitter, maxDelayMs)
}

/**
 * 带指数退避的重试执行
 *
 * @param fn - 要执行的函数
 * @param config - 重试配置
 * @returns 执行结果
 */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const maxRetries = config.maxRetries ?? DEFAULT_RETRY_CONFIG.maxRetries
  let lastError: Error | unknown

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn(attempt)
    } catch (error) {
      lastError = error

      const category = categorizeError(error)

      // 如果是最后一次尝试，或者错误不可重试，直接抛出
      if (attempt > maxRetries || category !== ErrorCategory.RETRYABLE) {
        throw error
      }

      // 计算并等待延迟
      const delay = calculateBackoffDelay(attempt, config)
      console.log(`[Retry] Attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`)
      await sleep(delay)
    }
  }

  throw lastError
}

/**
 * 记录失败信息到数据库
 *
 * @param job - BullMQ 任务
 * @param error - 错误对象
 * @param category - 错误分类
 */
export async function recordFailure(
  job: Job<TaskJobData>,
  error: Error | unknown,
  category?: ErrorCategory
): Promise<void> {
  const taskId = job.data.taskId
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined
  const errorCategory = category || categorizeError(error)

  try {
    // 获取当前任务信息
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { attempt: true },
    })

    const currentAttempt = task?.attempt || 0
    const maxRetries = job.opts?.attempts || DEFAULT_RETRY_CONFIG.maxRetries

    // 更新任务状态
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: currentAttempt >= maxRetries ? TaskStatus.FAILED : TaskStatus.RETRYING,
        attempt: currentAttempt + 1,
        errorCode: errorCategory,
        errorMessage: errorMessage.slice(0, 1000),
        updatedAt: new Date(),
      },
    })

    // 创建任务事件记录
    await prisma.taskEvent.create({
      data: {
        taskId,
        projectId: job.data.projectId,
        userId: job.data.userId,
        eventType: 'task.failed',
        payload: {
          error: errorMessage,
          errorCategory,
          attempt: currentAttempt + 1,
          maxRetries,
          stack: errorStack?.slice(0, 2000),
        },
      },
    })

    console.error(`[Failure] Task ${taskId} recorded as ${errorCategory}:`, errorMessage)
  } catch (dbError) {
    console.error(`[Failure] Failed to record failure for task ${taskId}:`, dbError)
  }
}

/**
 * 睡眠函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 包装任务执行，提供统一的错误处理和重试
 *
 * @param job - BullMQ 任务
 * @param handler - 任务处理函数
 * @param config - 重试配置
 * @returns 执行结果
 */
export async function withRetryHandler<T>(
  job: Job<TaskJobData>,
  handler: (job: Job<TaskJobData>) => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  try {
    return await withRetry(async (attempt) => {
      console.log(`[Task] ${job.data.taskId} - Attempt ${attempt}`)
      return await handler(job)
    }, config)
  } catch (error) {
    const category = categorizeError(error)

    // 记录失败信息
    await recordFailure(job, error, category)

    throw error
  }
}
