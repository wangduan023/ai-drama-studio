/**
 * 任务进度报告工具
 *
 * 提供统一的进度更新和 SSE 事件通知功能
 */

import { reportTaskProgress as queueReportProgress } from '@ai-drama-studio/queue'
import type { Job } from 'bullmq'
import type { TaskJobData } from '@ai-drama-studio/queue'
import { prisma } from '@ai-drama-studio/db'
import { TaskStatus } from '@ai-drama-studio/db'

/**
 * 进度报告选项
 */
export interface ProgressOptions {
  /** 是否立即报告（跳过防抖） */
  immediate?: boolean
  /** 最小进度变化阈值（百分比） */
  minDelta?: number
  /** 附加元数据 */
  metadata?: Record<string, unknown>
}

/**
 * 报告任务进度
 *
 * 更新数据库中的任务进度并发送 SSE 事件通知前端
 *
 * @param job - BullMQ 任务
 * @param progress - 进度百分比 (0-100)
 * @param message - 进度消息
 * @param options - 报告选项
 */
export async function reportProgress(
  job: Job<TaskJobData>,
  progress: number,
  message?: string,
  options: ProgressOptions = {}
): Promise<void> {
  const { immediate = false, minDelta = 2, metadata = {} } = options

  // 确保进度在有效范围内
  const normalizedProgress = Math.max(0, Math.min(100, Math.floor(progress)))

  // 获取当前任务进度（用于防抖）
  if (!immediate) {
    const currentProgress = job.progress as number || 0
    if (Math.abs(normalizedProgress - currentProgress) < minDelta) {
      return // 进度变化太小，跳过报告
    }
  }

  const taskId = job.data.taskId
  const projectId = job.data.projectId
  const userId = job.data.userId

  try {
    // 并行执行：更新数据库 + 报告队列进度
    await Promise.all([
      // 更新数据库中的任务进度
      prisma.task.update({
        where: { id: taskId },
        data: {
          progress: normalizedProgress,
          updatedAt: new Date(),
        },
      }),

      // 报告到队列系统（会触发 SSE 事件）
      queueReportProgress(job, normalizedProgress, {
        message,
        ...metadata,
        stage: metadata.stage || 'processing',
        timestamp: Date.now(),
      }),
    ])

    console.log(`[Progress] Task ${taskId}: ${normalizedProgress}% - ${message || 'Processing'}`, {
      stage: metadata.stage,
    })
  } catch (error) {
    console.error(`[Progress] Failed to report progress for task ${taskId}:`, error)
    // 进度报告失败不应该中断任务执行
  }
}

/**
 * 报告任务阶段完成
 *
 * @param job - BullMQ 任务
 * @param stage - 阶段名称
 * @param progress - 阶段进度 (0-100)
 * @param data - 阶段数据
 */
export async function reportStage(
  job: Job<TaskJobData>,
  stage: string,
  progress: number,
  data?: Record<string, unknown>
): Promise<void> {
  await reportProgress(job, progress, `Stage: ${stage}`, {
    immediate: true,
    metadata: { stage, ...data },
  })
}

/**
 * 创建分阶段进度报告器
 *
 * 用于多阶段任务，每个阶段占一定比例的总体进度
 *
 * @param job - BullMQ 任务
 * @param stages - 阶段定义数组
 * @returns 进度报告函数
 */
export function createStagedProgress(
  job: Job<TaskJobData>,
  stages: Array<{ name: string; weight: number }>
): (stageName: string, progress: number, message?: string) => Promise<void> {
  const totalWeight = stages.reduce((sum, s) => sum + s.weight, 0)
  let completedWeight = 0

  return async (stageName: string, progress: number, message?: string) => {
    const stage = stages.find((s) => s.name === stageName)
    if (!stage) {
      console.warn(`[Progress] Unknown stage: ${stageName}`)
      return
    }

    // 计算当前阶段之前的已完成权重
    const stageIndex = stages.findIndex((s) => s.name === stageName)
    completedWeight = stages.slice(0, stageIndex).reduce((sum, s) => sum + s.weight, 0)

    // 计算总体进度
    const stageProgress = Math.max(0, Math.min(100, progress)) / 100
    const overallProgress = ((completedWeight + stage.weight * stageProgress) / totalWeight) * 100

    await reportProgress(job, overallProgress, message || `Processing ${stageName}`, {
      metadata: { stage: stageName, subProgress: progress },
    })
  }
}

/**
 * 报告任务成功完成
 *
 * @param job - BullMQ 任务
 * @param result - 任务结果
 */
export async function reportSuccess(
  job: Job<TaskJobData>,
  result: Record<string, unknown>
): Promise<void> {
  const taskId = job.data.taskId

  try {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.COMPLETED,
        progress: 100,
        result: result as any,
        finishedAt: new Date(),
        updatedAt: new Date(),
      },
    })

    console.log(`[Progress] Task ${taskId} completed successfully`)
  } catch (error) {
    console.error(`[Progress] Failed to report success for task ${taskId}:`, error)
    throw error
  }
}

/**
 * 报告任务失败
 *
 * @param job - BullMQ 任务
 * @param error - 错误对象
 * @param errorCode - 错误代码
 */
export async function reportFailure(
  job: Job<TaskJobData>,
  error: Error | unknown,
  errorCode?: string
): Promise<void> {
  const taskId = job.data.taskId
  const errorMessage = error instanceof Error ? error.message : String(error)

  try {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.FAILED,
        errorCode: errorCode || 'UNKNOWN_ERROR',
        errorMessage: errorMessage.slice(0, 1000), // 限制错误消息长度
        finishedAt: new Date(),
        updatedAt: new Date(),
      },
    })

    console.error(`[Progress] Task ${taskId} failed:`, errorMessage)
  } catch (dbError) {
    console.error(`[Progress] Failed to report failure for task ${taskId}:`, dbError)
  }
}

/**
 * 检查任务是否被取消
 *
 * @param taskId - 任务 ID
 * @returns 是否被取消
 */
export async function isTaskCancelled(taskId: string): Promise<boolean> {
  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { status: true },
    })
    return task?.status === TaskStatus.FAILED
  } catch (error) {
    console.error(`[Progress] Failed to check task status for ${taskId}:`, error)
    return false
  }
}

/**
 * 断言任务活跃（未被取消）
 *
 * @param job - BullMQ 任务
 * @param stage - 当前阶段
 * @throws 如果任务被取消则抛出错误
 */
export async function assertTaskActive(
  job: Job<TaskJobData>,
  stage: string
): Promise<void> {
  const isCancelled = await isTaskCancelled(job.data.taskId)
  if (isCancelled) {
    throw new Error(`Task cancelled at stage: ${stage}`)
  }
}
