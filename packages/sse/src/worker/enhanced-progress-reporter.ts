/**
 * Enhanced Task Progress Reporter
 *
 * Provides advanced progress reporting with error resilience,
 * deduplication, and connection recovery.
 */

import { prisma } from '@ai-drama-studio/db'
import { publishTaskEvent, publishTaskStreamEvent } from '../publisher'
import {
  TASK_EVENT_TYPE,
  type TaskType,
  type TaskJobData,
  type StreamChunk,
} from '../types'
import { logError, logInfo, logDebug } from '../logger'

/**
 * Cache for last reported progress to avoid duplicate emissions
 */
const lastProgressCache = new Map<string, { progress: number; timestamp: number }>()

/**
 * Debounce interval in milliseconds to avoid excessive progress updates
 */
const PROGRESS_DEBOUNCE_MS = 500

/**
 * Configuration options for enhanced progress reporter
 */
export interface EnhancedProgressReporterOptions {
  /**
   * Minimum progress difference required to emit an update
   * @default 1
   */
  minProgressDelta?: number

  /**
   * Whether to debounce progress updates
   * @default true
   */
  debounceUpdates?: boolean

  /**
   * Whether to persist events to database
   * @default true
   */
  persist?: boolean

  /**
   * Whether to log progress to console
   * @default false
   */
  verbose?: boolean
}

/**
 * Report task progress with deduplication and debouncing
 *
 * @param jobData - Task job data
 * @param progress - Progress percentage (0-100)
 * @param payload - Additional payload data
 * @param options - Reporting options
 */
export async function reportTaskProgressEnhanced(
  jobData: TaskJobData,
  progress: number,
  payload?: Record<string, unknown>,
  options: EnhancedProgressReporterOptions = {}
): Promise<boolean> {
  const {
    minProgressDelta = 1,
    debounceUpdates = true,
    persist = true,
    verbose = false,
  } = options

  const taskId = jobData.taskId
  const value = Math.max(0, Math.min(100, Math.floor(progress)))

  // Check cache to avoid duplicate emissions
  const cacheKey = `${jobData.projectId}:${taskId}`
  const lastProgress = lastProgressCache.get(cacheKey)

  if (lastProgress) {
    // Skip if progress hasn't changed significantly
    if (Math.abs(lastProgress.progress - value) < minProgressDelta) {
      if (verbose) {
        logDebug(`[Progress] Skipping progress update for ${taskId} (${value}%) - below threshold`, {
          lastProgress: lastProgress.progress,
          minDelta: minProgressDelta,
        })
      }
      return false
    }

    // Skip if update is too frequent
    if (debounceUpdates && Date.now() - lastProgress.timestamp < PROGRESS_DEBOUNCE_MS) {
      if (verbose) {
        logDebug(`[Progress] Skipping progress update for ${taskId} (${value}%) - too frequent`, {
          timeSinceLast: Date.now() - lastProgress.timestamp,
          debounceMs: PROGRESS_DEBOUNCE_MS,
        })
      }
      return false
    }
  }

  try {
    const nextPayload: Record<string, unknown> = { ...(payload || {}) }

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
      logError(`[Progress] Failed to update task progress in DB for ${taskId}`)
      return false
    }

    // Update cache
    lastProgressCache.set(cacheKey, { progress: value, timestamp: Date.now() })

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
      persist,
    })

    if (verbose) {
      logInfo(`[Progress] Updated progress for ${taskId} to ${value}%`, {
        stage: nextPayload.stage,
        message: nextPayload.message,
      })
    }

    return true
  } catch (error) {
    logError(`[Progress] Failed to report progress for task ${taskId}: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

/**
 * Report a stream chunk with enhanced error handling
 *
 * @param jobData - Task job data
 * @param chunk - Stream chunk data
 * @param payload - Additional payload data
 * @param options - Reporting options
 */
export async function reportTaskStreamChunkEnhanced(
  jobData: TaskJobData,
  chunk: StreamChunk,
  payload?: Record<string, unknown>,
  options: Omit<EnhancedProgressReporterOptions, 'minProgressDelta'> = {}
): Promise<boolean> {
  const { persist = true, verbose = false } = options

  try {
    const mergedPayload: Record<string, unknown> = {
      ...(payload || {}),
      displayMode: 'detail',
      stream: chunk,
      done: false,
      message:
        payload?.message ||
        (chunk.kind === 'reasoning'
          ? 'Processing with reasoning...'
          : 'Generating output...'),
    }

    const result = await publishTaskStreamEvent({
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
      persist,
    })

    if (verbose) {
      logInfo(`[Stream] Sent stream chunk for ${jobData.taskId}`, {
        seq: chunk.seq,
        kind: chunk.kind,
      })
    }

    return !!result
  } catch (error) {
    logError(`[Stream] Failed to report stream chunk for task ${jobData.taskId}: ${error instanceof Error ? error.message : String(error)}`)
    return false
  }
}

/**
 * Get the label for a task stage
 */
function getTaskStageLabel(stage: string): string {
  const TASK_STAGE_LABELS: Record<string, string> = {
    received: 'progress.stage.received',
    processing: 'progress.stage.processing',
    generating: 'progress.stage.generating',
    completing: 'progress.stage.completing',
    retrying: 'progress.stage.retrying',
  }

  return TASK_STAGE_LABELS[stage] || stage
}

/**
 * Build a progress message for a task event
 */
function buildTaskProgressMessage(params: {
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
 * Try to update task progress in database
 *
 * @param taskId - Task ID
 * @param progress - Progress percentage
 * @param payload - Additional payload
 * @returns Whether the update was successful
 */
async function tryUpdateTaskProgress(
  taskId: string,
  progress: number,
  payload?: Record<string, unknown>
): Promise<boolean> {
  try {
    // Convert payload to JSON string for database storage
    const result = await prisma.task.updateMany({
      where: {
        id: taskId,
        status: {
          in: ['QUEUED', 'PROCESSING'],
        },
      },
      data: {
        progress,
        payload: payload as any, // Type assertion to handle the mapping
      },
    })
    return result.count > 0
  } catch (error) {
    logError(`[TaskProgress] Failed to update task ${taskId}:`, error)
    return false
  }
}

/**
 * Clear the progress cache (useful for testing)
 */
export function clearProgressCache(): void {
  lastProgressCache.clear()
}

/**
 * Get current cache size
 */
export function getProgressCacheSize(): number {
  return lastProgressCache.size
}