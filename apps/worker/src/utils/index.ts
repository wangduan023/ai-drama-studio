/**
 * Worker 工具函数索引
 *
 * 导出所有 Worker 相关的工具函数
 */

// 进度报告工具
export {
  reportProgress,
  reportStage,
  createStagedProgress,
  reportSuccess,
  reportFailure,
  isTaskCancelled,
  assertTaskActive,
  type ProgressOptions,
} from './progress'

// 重试和错误处理工具
export {
  withRetry,
  withRetryHandler,
  recordFailure,
  categorizeError,
  isRetryableError,
  calculateBackoffDelay,
  ErrorCategory,
  DEFAULT_RETRY_CONFIG,
  type RetryConfig,
} from './retry'
