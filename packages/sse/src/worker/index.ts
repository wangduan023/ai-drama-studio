/**
 * Worker Utilities for SSE Integration
 */

export {
  reportTaskProgress,
  reportTaskStreamChunk,
  tryUpdateTaskProgress,
  touchTaskHeartbeat,
  getTaskStageLabel,
  buildTaskProgressMessage,
} from './progress-reporter'

export {
  reportTaskProgressEnhanced,
  reportTaskStreamChunkEnhanced,
  clearProgressCache,
  getProgressCacheSize,
  type EnhancedProgressReporterOptions,
} from './enhanced-progress-reporter'

export type {
  TaskJobData,
  StreamChunk,
  TaskType,
} from '../types'
