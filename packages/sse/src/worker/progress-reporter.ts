/**
 * Worker Task Progress Reporting Utilities
 *
 * Utilities for BullMQ workers to report task progress
 * and stream chunks to connected SSE clients.
 */

import { prisma } from '@ai-drama-studio/db'
import { publishTaskEvent, publishTaskStreamEvent } from '../publisher'
import {
  TASK_EVENT_TYPE,
  type TaskType,
  type TaskJobData,
  type StreamChunk,
} from '../types'

/**
 * Task stage labels for progress messages
 */
const TASK_STAGE_LABELS: Record<string, string> = {
  received: 'progress.stage.received',
  processing: 'progress.stage.processing',
  generating: 'progress.stage.generating',
  completing: 'progress.stage.completing',
  retrying: 'progress.stage.retrying',
}

/**
 * Get the label for a task stage
 */
export function getTaskStageLabel(stage: string): string {
  return TASK_STAGE_LABELS[stage] || stage
}

/**
 * Build a progress message for a task event
 */
export function buildTaskProgressMessage(params: {
  eventType: string
  taskType?: TaskType | null
  progress?: number | null
  payload?: Record<string, unknown> | null
}): string {
  const { eventType, taskType, progress, payload } = params
  const stage = payload?.stage as string | undefined
  const stageLabel = stage ? getTaskStageLabel(stage) : ''
  const message = payload?.message as string | undefined

  if (message) return message

  switch (eventType) {
    case TASK_EVENT_TYPE.CREATED:
      return 'Task queued'
    case TASK_EVENT_TYPE.PROCESSING:
      return stageLabel || 'Task processing'
    case TASK_EVENT_TYPE.PROGRESS:
      if (progress !== undefined && progress !== null) {
        return `${progress}% complete`
      }
      return stageLabel || 'Task in progress'
    case TASK_EVENT_TYPE.COMPLETED:
      return 'Task completed'
    case TASK_EVENT_TYPE.FAILED:
      return payload?.error ? (payload.error as Record<string, unknown>)?.message as string || 'Task failed' : 'Task failed'
    default:
      return 'Task update'
  }
}

/**
 * Extract flow fields from job data for progress payload
 */
function withFlowFields(
  jobData: TaskJobData,
  payload?: Record<string, unknown> | null
): Record<string, unknown> {
  return {
    ...(payload || {}),
  }
}

/**
 * Report task progress update
 *
 * @param jobData - Task job data
 * @param progress - Progress percentage (0-100)
 * @param payload - Additional payload data
 */
export async function reportTaskProgress(
  jobData: TaskJobData,
  progress: number,
  payload?: Record<string, unknown>
): Promise<void> {
  const value = Math.max(0, Math.min(99, Math.floor(progress)))
  const nextPayload: Record<string, unknown> = withFlowFields(jobData, payload)

  // Set default stage and display mode
  const stage = typeof nextPayload.stage === 'string' ? nextPayload.stage : null
  if (stage && typeof nextPayload.stageLabel !== 'string') {
    nextPayload.stageLabel = getTaskStageLabel(stage)
  }
  if (typeof nextPayload.displayMode !== 'string') {
    nextPayload.displayMode = 'loading'
  }
  if (typeof nextPayload.message !== 'string') {
    nextPayload.message = buildTaskProgressMessage({
      eventType: TASK_EVENT_TYPE.PROGRESS,
      taskType: jobData.type,
      progress: value,
      payload: nextPayload,
    })
  }

  // Update task progress in database
  const updated = await tryUpdateTaskProgress(jobData.taskId, value, nextPayload)
  if (!updated) {
    return
  }

  // Publish progress event to Redis pub/sub
  await publishTaskEvent({
    taskId: jobData.taskId,
    projectId: jobData.projectId,
    userId: jobData.userId,
    type: TASK_EVENT_TYPE.PROGRESS,
    taskType: jobData.type,
    targetType: jobData.targetType,
    targetId: jobData.targetId,
    episodeId: jobData.episodeId || null,
    payload: {
      progress: value,
      ...nextPayload,
      trace: {
        requestId: jobData.trace?.requestId || null,
      },
    },
    persist: true,
  })
}

/**
 * Report a stream chunk (for LLM streaming)
 *
 * @param jobData - Task job data
 * @param chunk - Stream chunk data
 * @param payload - Additional payload data
 */
export async function reportTaskStreamChunk(
  jobData: TaskJobData,
  chunk: StreamChunk,
  payload?: Record<string, unknown>
): Promise<void> {
  const mergedPayload: Record<string, unknown> = withFlowFields(jobData, {
    ...(payload || {}),
    displayMode: 'detail',
    stream: chunk,
    done: false,
    message:
      payload?.message ||
      (chunk.kind === 'reasoning'
        ? 'Processing with reasoning...'
        : 'Generating output...'),
  })

  await publishTaskStreamEvent({
    taskId: jobData.taskId,
    projectId: jobData.projectId,
    userId: jobData.userId,
    taskType: jobData.type,
    targetType: jobData.targetType,
    targetId: jobData.targetId,
    episodeId: jobData.episodeId || null,
    payload: {
      ...mergedPayload,
      trace: {
        requestId: jobData.trace?.requestId || null,
      },
    },
    persist: true,
  })
}

/**
 * Try to update task progress in database
 *
 * @param taskId - Task ID
 * @param progress - Progress percentage
 * @param payload - Additional payload
 * @returns Whether the update was successful
 */
export async function tryUpdateTaskProgress(
  taskId: string,
  progress: number,
  payload?: Record<string, unknown>
): Promise<boolean> {
  try {
    const result = await prisma.task.updateMany({
      where: {
        id: taskId,
        status: {
          in: ['QUEUED', 'PROCESSING'],
        },
      },
      data: {
        progress,
        payload: payload as Record<string, unknown>,
      },
    })
    return result.count > 0
  } catch (error) {
    console.error(`[TaskProgress] Failed to update task ${taskId}:`, error)
    return false
  }
}

/**
 * Touch task heartbeat to prevent timeout
 *
 * @param taskId - Task ID
 */
export async function touchTaskHeartbeat(taskId: string): Promise<void> {
  try {
    await prisma.task.updateMany({
      where: {
        id: taskId,
        status: {
          in: ['QUEUED', 'PROCESSING'],
        },
      },
      data: {
        updatedAt: new Date(),
      },
    })
  } catch (error) {
    console.error(`[TaskHeartbeat] Failed to touch heartbeat for task ${taskId}:`, error)
  }
}
