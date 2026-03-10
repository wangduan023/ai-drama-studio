/**
 * SSE Real-time Push System
 *
 * Server-Sent Events (SSE) infrastructure for real-time task progress updates.
 *
 * @packageDocumentation
 */

// Types
export * from './types'

// Event Emitter
export {
  taskProgressEmitter,
  emitTaskProgress,
  emitStreamChunk,
  emitTaskComplete,
  emitTaskError,
  onTaskProgress,
  onStreamChunk,
  waitForTaskComplete,
} from './emitter'

// Publisher
export {
  getProjectChannel,
  listTaskLifecycleEvents,
  listEventsAfter,
  listActiveLifecycleSnapshot,
  publishTaskEvent,
  publishTaskLifecycleEvent,
  publishTaskStreamEvent,
} from './publisher'

// Shared Subscriber
export { SharedSubscriber, getSharedSubscriber } from './shared-subscriber'

// Logger
export {
  logInfo,
  logWarn,
  logError,
  logDebug,
  createScopedLogger,
} from './logger'

// Redis
export { createPublisher, createSubscriber, getSharedSubscriber as getRedisSubscriber } from './redis'

// Worker Utilities
export * as workerUtils from './worker'
export {
  reportTaskProgress,
  reportTaskStreamChunk,
  tryUpdateTaskProgress,
  touchTaskHeartbeat,
  getTaskStageLabel,
  buildTaskProgressMessage,
} from './worker/progress-reporter'

// Enhanced Worker Utilities
export {
  reportTaskProgressEnhanced,
  reportTaskStreamChunkEnhanced,
  clearProgressCache,
  getProgressCacheSize,
  type EnhancedProgressReporterOptions,
} from './worker/enhanced-progress-reporter'

// React Hooks
export * from './react'
