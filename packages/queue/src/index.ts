/**
 * @ai-drama-studio/queue
 *
 * BullMQ 队列和 Worker 系统
 *
 * 提供四个队列：llm, image, video, voice
 * 用于异步处理 AI 短剧生成的各种任务
 */

// ===== 类型导出 =====
export type {
  TaskStatus,
  TaskEventType,
  TaskSSEEventType,
  TaskLifecycleEventType,
  TaskType,
  QueueType,
  BillingMode,
  TaskBillingInfo,
  TaskTrace,
  TaskJobData,
  SSEEvent,
  CreateTaskInput,
  LLMStreamChunk,
} from './types'

// ===== 常量导出 =====
export {
  TASK_STATUS,
  TASK_EVENT_TYPE,
  TASK_SSE_EVENT_TYPE,
  TASK_LIFECYCLE_EVENT_TYPES,
  TASK_TYPE,
} from './types'

// ===== 队列导出 =====
export {
  queueRedisConfig,
  queueRedis,
  QUEUE_NAME,
  llmQueue,
  imageQueue,
  videoQueue,
  voiceQueue,
  getQueueTypeByTaskType,
  getQueueByType,
  addTaskJob,
  removeTaskJob,
  getTaskStatus,
  getQueueStats,
  clearAllQueues,
  closeQueueConnection,
} from './queues'

// ===== 共享工具导出 =====
export {
  reportTaskProgress,
  withTaskLifecycle,
  touchTaskHeartbeat,
  reportLLMStreamChunk,
  assertTaskActive,
  TaskTerminatedError,
  normalizeAnyError,
  type NormalizedError,
} from './shared'

// ===== 处理器导出 =====
export {
  startAllWorkers,
  stopAllWorkers,
  getAllWorkers,
  getProcessorConfig,
  type ProcessorConfig,
} from './processors'
