/**
 * SSE Real-time Push System - Type Definitions
 */

// ============================================
// Task Status & Event Types
// ============================================

export const TASK_STATUS = {
  QUEUED: 'QUEUED',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  RETRYING: 'RETRYING',
} as const

export type TaskStatus = (typeof TASK_STATUS)[keyof typeof TASK_STATUS]

export const TASK_EVENT_TYPE = {
  CREATED: 'task.created',
  PROCESSING: 'task.processing',
  PROGRESS: 'task.progress',
  COMPLETED: 'task.completed',
  FAILED: 'task.failed',
} as const

export type TaskEventType = (typeof TASK_EVENT_TYPE)[keyof typeof TASK_EVENT_TYPE]

export const TASK_SSE_EVENT_TYPE = {
  LIFECYCLE: 'task.lifecycle',
  STREAM: 'task.stream',
} as const

export type TaskSSEEventType = (typeof TASK_SSE_EVENT_TYPE)[keyof typeof TASK_SSE_EVENT_TYPE]

export const TASK_LIFECYCLE_EVENT_TYPES = [
  TASK_EVENT_TYPE.CREATED,
  TASK_EVENT_TYPE.PROCESSING,
  TASK_EVENT_TYPE.COMPLETED,
  TASK_EVENT_TYPE.FAILED,
] as const

export type TaskLifecycleEventType = (typeof TASK_LIFECYCLE_EVENT_TYPES)[number]

// ============================================
// Task Types
// ============================================

export const TASK_TYPE = {
  SCRIPT_GENERATE: 'script_generate',
  STORYBOARD_GENERATE: 'storyboard_generate',
  IMAGE_GENERATE: 'image_generate',
  VIDEO_GENERATE: 'video_generate',
  VOICE_GENERATE: 'voice_generate',
  CHARACTER_PROFILE_ANALYZE: 'character_profile_analyze',
  CHARACTER_VISUAL_GENERATE: 'character_visual_generate',
  LOCATION_ANALYZE: 'location_analyze',
  LOCATION_VISUAL_GENERATE: 'location_visual_generate',
  EPISODE_SPLIT: 'episode_split',
  SCREENPLAY_CONVERT: 'screenplay_convert',
} as const

export type TaskType = (typeof TASK_TYPE)[keyof typeof TASK_TYPE]

export type QueueType = 'image' | 'video' | 'voice' | 'text'

// ============================================
// Task Progress Event
// ============================================

export type TaskProgressEvent = {
  taskId: string
  projectId: string
  userId: string
  type: TaskEventType
  taskType?: TaskType | null
  targetType?: string | null
  targetId?: string | null
  episodeId?: string | null
  progress?: number | null
  stage?: string | null
  stageLabel?: string | null
  message?: string
  payload?: Record<string, unknown>
}

// ============================================
// Stream Chunk (for LLM streaming)
// ============================================

export type StreamChunkKind = 'text' | 'reasoning' | 'error' | 'metadata'

export type StreamChunk = {
  kind: StreamChunkKind
  delta?: string
  content?: string
  seq: number
  lane?: string | null
  step?: {
    id?: string | null
    attempt?: number | null
    title?: string | null
    index?: number | null
    total?: number | null
  } | null
}

// ============================================
// SSE Event
// ============================================

export type SSEEvent = {
  id: string
  type: TaskSSEEventType
  taskId: string
  projectId: string
  userId: string
  ts: string
  taskType?: string | null
  targetType?: string | null
  targetId?: string | null
  episodeId?: string | null
  payload?: (Record<string, unknown> & {
    lifecycleType?: TaskLifecycleEventType
    progress?: number | null
    stage?: string | null
    stageLabel?: string | null
    message?: string
    stream?: StreamChunk
    done?: boolean
  }) | null
}

// ============================================
// Task Job Data (for Worker)
// ============================================

export type TaskJobData = {
  taskId: string
  type: TaskType
  projectId: string
  episodeId?: string | null
  targetType: string
  targetId: string
  payload?: Record<string, unknown> | null
  userId: string
  trace?: {
    requestId?: string | null
  } | null
}

// ============================================
// Task Billing Info
// ============================================

export type TaskBillingInfo =
  | {
      billable: false
      source?: 'task'
      status?: 'skipped'
    }
  | {
      billable: true
      source: 'task'
      taskType: TaskType
      apiType: 'text' | 'image' | 'video' | 'voice'
      model: string
      quantity: number
      unit: 'token' | 'image' | 'video' | 'second' | 'call'
      maxFrozenCost: number
      pricingVersion?: string
      action: string
      metadata?: Record<string, unknown>
      billingKey?: string
      freezeId?: string | null
      modeSnapshot?: 'OFF' | 'SHADOW' | 'ENFORCE' | null
      status?: 'skipped' | 'quoted' | 'frozen' | 'settled' | 'rolled_back' | 'failed'
      chargedCost?: number
    }

// ============================================
// Create Task Input
// ============================================

export type CreateTaskInput = {
  userId: string
  projectId: string
  episodeId?: string | null
  type: TaskType
  targetType: string
  targetId: string
  payload?: Record<string, unknown> | null
  dedupeKey?: string | null
  priority?: number
  billingInfo?: TaskBillingInfo | null
}
