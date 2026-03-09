/**
 * Task Event Publisher
 *
 * Publishes task lifecycle and stream events to Redis pub/sub channels
 * for real-time SSE distribution to connected clients.
 */

import { prisma, type TaskEvent } from '@ai-drama-studio/db'
import { getSharedSubscriber, createPublisher } from './redis'
import type {
  TaskEventType,
  TaskSSEEventType,
  TaskLifecycleEventType,
  SSEEvent,
  TaskType,
} from './types'
import {
  TASK_EVENT_TYPE,
  TASK_SSE_EVENT_TYPE,
  TASK_LIFECYCLE_EVENT_TYPES,
} from './types'

const CHANNEL_PREFIX = 'task-events:project:'
const STREAM_EPHEMERAL_ENABLED = process.env.SSE_STREAM_EPHEMERAL_ENABLED !== 'false'

type TaskEventRow = Pick<TaskEvent, 'id' | 'taskId' | 'projectId' | 'userId' | 'eventType' | 'payload' | 'createdAt'>

type TaskMeta = {
  id: string
  type: string
  targetType: string
  targetId: string
  episodeId: string | null
}

/**
 * Get the Redis channel name for a project
 */
export function getProjectChannel(projectId: string): string {
  return `${CHANNEL_PREFIX}${projectId}`
}

/**
 * Create an ephemeral event ID for non-persisted events
 */
function createEphemeralId(): string {
  return `ephemeral:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Check if an event type is a lifecycle event
 */
function isLifecycleEventType(value: string): value is TaskLifecycleEventType {
  return (
    value === TASK_EVENT_TYPE.CREATED ||
    value === TASK_EVENT_TYPE.PROCESSING ||
    value === TASK_EVENT_TYPE.COMPLETED ||
    value === TASK_EVENT_TYPE.FAILED
  )
}

/**
 * Normalize a task event type to a lifecycle type
 */
function normalizeLifecycleType(type: TaskEventType): TaskLifecycleEventType {
  if (isLifecycleEventType(type)) return type
  return TASK_EVENT_TYPE.PROCESSING
}

/**
 * Check if an event type is a stream event
 */
function isStreamEventType(type: string): boolean {
  return type === TASK_SSE_EVENT_TYPE.STREAM
}

/**
 * Determine if a lifecycle row should be replayed
 */
function shouldReplayLifecycleRow(type: string): boolean {
  return isLifecycleEventType(type)
}

/**
 * Determine if a task event row should be replayed
 */
function shouldReplayTaskRow(type: string): boolean {
  return shouldReplayLifecycleRow(type) || isStreamEventType(type)
}

/**
 * Normalize lifecycle event payload
 */
function normalizeLifecyclePayload(
  type: TaskEventType,
  taskType: string | null | undefined,
  payload?: Record<string, unknown> | null
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(payload || {}) }
  const lifecycleType = normalizeLifecycleType(type)
  next.lifecycleType = lifecycleType
  return next
}

/**
 * Build a lifecycle SSE event
 */
function buildLifecycleEvent(params: {
  id: string
  ts: string
  lifecycleType: TaskEventType
  taskId: string
  projectId: string
  userId: string
  taskType?: string | null
  targetType?: string | null
  targetId?: string | null
  episodeId?: string | null
  payload?: Record<string, unknown> | null
}): SSEEvent {
  return {
    id: params.id,
    type: TASK_SSE_EVENT_TYPE.LIFECYCLE,
    taskId: params.taskId,
    projectId: params.projectId,
    userId: params.userId,
    ts: params.ts,
    taskType: params.taskType || null,
    targetType: params.targetType || null,
    targetId: params.targetId || null,
    episodeId: params.episodeId || null,
    payload: normalizeLifecyclePayload(params.lifecycleType, params.taskType, params.payload || null),
  }
}

/**
 * Normalize stream event payload
 */
function normalizeStreamPayload(
  taskType: string | null | undefined,
  payload?: Record<string, unknown> | null
): Record<string, unknown> {
  return {
    ...(payload || {}),
  }
}

/**
 * Build a stream SSE event
 */
function buildStreamEvent(params: {
  id: string
  ts: string
  taskId: string
  projectId: string
  userId: string
  taskType?: string | null
  targetType?: string | null
  targetId?: string | null
  episodeId?: string | null
  payload?: Record<string, unknown> | null
}): SSEEvent {
  return {
    id: params.id,
    type: TASK_SSE_EVENT_TYPE.STREAM,
    taskId: params.taskId,
    projectId: params.projectId,
    userId: params.userId,
    ts: params.ts,
    taskType: params.taskType || null,
    targetType: params.targetType || null,
    targetId: params.targetId || null,
    episodeId: params.episodeId || null,
    payload: normalizeStreamPayload(params.taskType, params.payload || null),
  }
}

/**
 * Map database rows to replay events
 */
async function mapRowsToReplayEvents(rows: TaskEventRow[]): Promise<SSEEvent[]> {
  if (rows.length === 0) return []

  const taskIds = Array.from(new Set(rows.map((row) => row.taskId)))
  const tasks: TaskMeta[] = taskIds.length
    ? await prisma.task.findMany({
        where: { id: { in: taskIds } },
        select: {
          id: true,
          type: true,
          targetType: true,
          targetId: true,
          episodeId: true,
        },
      })
    : []
  const taskMap = new Map<string, TaskMeta>(tasks.map((task) => [task.id, task]))

  return rows.map((row): SSEEvent => {
    const task = taskMap.get(row.taskId)
    if (isStreamEventType(row.eventType)) {
      return buildStreamEvent({
        id: String(row.id),
        ts: row.createdAt.toISOString(),
        taskId: row.taskId,
        projectId: row.projectId,
        userId: row.userId,
        taskType: task?.type || null,
        targetType: task?.targetType || null,
        targetId: task?.targetId || null,
        episodeId: task?.episodeId || null,
        payload: row.payload as Record<string, unknown> | null,
      })
    }
    const lifecycleType = row.eventType as TaskEventType
    return buildLifecycleEvent({
      id: String(row.id),
      ts: row.createdAt.toISOString(),
      lifecycleType,
      taskId: row.taskId,
      projectId: row.projectId,
      userId: row.userId,
      taskType: task?.type || null,
      targetType: task?.targetType || null,
      targetId: task?.targetId || null,
      episodeId: task?.episodeId || null,
      payload: row.payload as Record<string, unknown> | null,
    })
  })
}

/**
 * List lifecycle events for a task (for replay)
 */
export async function listTaskLifecycleEvents(
  taskId: string,
  limit = 500
): Promise<SSEEvent[]> {
  const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 5000) : 500
  const latestRows = await prisma.taskEvent.findMany({
    where: { taskId },
    orderBy: { id: 'desc' },
    take: safeLimit,
  })
  const rows = [...latestRows].reverse()
  const replayRows = rows.filter((row) => shouldReplayTaskRow(row.eventType))
  return await mapRowsToReplayEvents(replayRows)
}

/**
 * List events after a specific ID (for replay with cursor)
 */
export async function listEventsAfter(
  projectId: string,
  afterId: number,
  limit = 200
): Promise<SSEEvent[]> {
  const pageSize = Math.max(limit * 2, 400)
  const maxScanRows = Math.max(limit * 50, 20_000)
  let cursor = afterId
  let scannedRows = 0
  const collected: TaskEventRow[] = []

  while (collected.length < limit && scannedRows < maxScanRows) {
    const rows = await prisma.taskEvent.findMany({
      where: {
        projectId,
        id: { gt: cursor },
      },
      orderBy: { id: 'asc' },
      take: pageSize,
    })

    if (rows.length === 0) break
    scannedRows += rows.length

    for (const row of rows) {
      if (!shouldReplayTaskRow(row.eventType)) continue
      collected.push(row)
      if (collected.length >= limit) break
    }

    cursor = rows[rows.length - 1]?.id || cursor
    if (rows.length < pageSize) break
  }

  return await mapRowsToReplayEvents(collected.slice(0, limit))
}

/**
 * Get active task lifecycle snapshot (for initial connection)
 */
export async function listActiveLifecycleSnapshot(params: {
  projectId: string
  episodeId: string | null
  userId: string
  limit?: number
}): Promise<SSEEvent[]> {
  const limit = params.limit || 500
  const rows = await prisma.task.findMany({
    where: {
      projectId: params.projectId,
      userId: params.userId,
      status: {
        in: ['QUEUED', 'PROCESSING'],
      },
      ...(params.episodeId ? { episodeId: params.episodeId } : {}),
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take: limit,
  })

  return rows.map((row): SSEEvent => {
    const payload = row.payload as Record<string, unknown> | null
    const lifecycleType =
      row.status === 'QUEUED' ? TASK_EVENT_TYPE.CREATED : TASK_EVENT_TYPE.PROCESSING
    const eventPayload: Record<string, unknown> = {
      ...(payload || {}),
      lifecycleType,
      progress: typeof row.progress === 'number' ? row.progress : null,
    }

    return {
      id: `snapshot:${row.id}:${row.updatedAt.getTime()}`,
      type: TASK_SSE_EVENT_TYPE.LIFECYCLE,
      taskId: row.id,
      projectId: params.projectId,
      userId: params.userId,
      ts: row.updatedAt.toISOString(),
      taskType: row.type,
      targetType: row.targetType,
      targetId: row.targetId,
      episodeId: row.episodeId,
      payload: eventPayload,
    }
  })
}

/**
 * Publish a task lifecycle event
 */
export async function publishTaskLifecycleEvent(params: {
  taskId: string
  projectId: string
  userId: string
  lifecycleType: TaskEventType
  taskType?: string | null
  targetType?: string | null
  targetId?: string | null
  episodeId?: string | null
  payload?: Record<string, unknown> | null
  persist?: boolean
}): Promise<SSEEvent> {
  const persist = params.persist !== false
  const normalizedType = normalizeLifecycleType(params.lifecycleType)

  const event = persist
    ? await prisma.taskEvent.create({
        data: {
          taskId: params.taskId,
          projectId: params.projectId,
          userId: params.userId,
          eventType: normalizedType,
          payload: normalizeLifecyclePayload(
            params.lifecycleType,
            params.taskType,
            params.payload || null
          ),
        },
      })
    : null

  const ts = (event?.createdAt || new Date()).toISOString()
  const id = event?.id ? String(event.id) : createEphemeralId()

  const message = buildLifecycleEvent({
    id,
    ts,
    lifecycleType: params.lifecycleType,
    taskId: params.taskId,
    projectId: params.projectId,
    userId: params.userId,
    taskType: params.taskType || null,
    targetType: params.targetType || null,
    targetId: params.targetId || null,
    episodeId: params.episodeId || null,
    payload: params.payload || null,
  })

  // Publish to Redis pub/sub
  const publisher = createPublisher()
  await publisher.publish(getProjectChannel(params.projectId), JSON.stringify(message))
  await publisher.quit()

  return message
}

/**
 * Publish a task event (lifecycle event wrapper)
 */
export async function publishTaskEvent(params: {
  taskId: string
  projectId: string
  userId: string
  type: TaskEventType
  taskType?: string | null
  targetType?: string | null
  targetId?: string | null
  episodeId?: string | null
  payload?: Record<string, unknown> | null
  persist?: boolean
}): Promise<SSEEvent> {
  return await publishTaskLifecycleEvent({
    taskId: params.taskId,
    projectId: params.projectId,
    userId: params.userId,
    lifecycleType: params.type,
    taskType: params.taskType,
    targetType: params.targetType,
    targetId: params.targetId,
    episodeId: params.episodeId,
    payload: params.payload,
    persist: params.persist,
  })
}

/**
 * Publish a task stream event (for LLM streaming)
 */
export async function publishTaskStreamEvent(params: {
  taskId: string
  projectId: string
  userId: string
  taskType?: string | null
  targetType?: string | null
  targetId?: string | null
  episodeId?: string | null
  payload?: Record<string, unknown> | null
  persist?: boolean
}): Promise<SSEEvent | null> {
  if (!STREAM_EPHEMERAL_ENABLED) return null

  const persist = params.persist === true
  const normalizedPayload = normalizeStreamPayload(params.taskType, params.payload || null)

  const event = persist
    ? await prisma.taskEvent.create({
        data: {
          taskId: params.taskId,
          projectId: params.projectId,
          userId: params.userId,
          eventType: TASK_SSE_EVENT_TYPE.STREAM,
          payload: normalizedPayload,
        },
      })
    : null

  const ts = (event?.createdAt || new Date()).toISOString()
  const id = event?.id ? String(event.id) : createEphemeralId()

  const message = buildStreamEvent({
    id,
    ts,
    taskId: params.taskId,
    projectId: params.projectId,
    userId: params.userId,
    taskType: params.taskType || null,
    targetType: params.targetType || null,
    targetId: params.targetId || null,
    episodeId: params.episodeId || null,
    payload: normalizedPayload,
  })

  // Publish to Redis pub/sub
  const publisher = createPublisher()
  await publisher.publish(getProjectChannel(params.projectId), JSON.stringify(message))
  await publisher.quit()

  return message
}
