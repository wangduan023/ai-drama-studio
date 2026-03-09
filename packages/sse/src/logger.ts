/**
 * Simple Logger for SSE Module
 */

const LOG_PREFIX = '[SSE]'
const isDevelopment = process.env.NODE_ENV !== 'production'

/**
 * Log an info message
 */
export function logInfo(message: string, details?: Record<string, unknown>): void {
  if (isDevelopment) {
    console.log(`${LOG_PREFIX} [INFO] ${message}`, details ? JSON.stringify(details, null, 2) : '')
  }
}

/**
 * Log a warning message
 */
export function logWarn(message: string, details?: Record<string, unknown>): void {
  console.warn(`${LOG_PREFIX} [WARN] ${message}`, details ? JSON.stringify(details, null, 2) : '')
}

/**
 * Log an error message
 */
export function logError(message: string, details?: Record<string, unknown>): void {
  console.error(`${LOG_PREFIX} [ERROR] ${message}`, details ? JSON.stringify(details, null, 2) : '')
}

/**
 * Log a debug message (development only)
 */
export function logDebug(message: string, details?: Record<string, unknown>): void {
  if (isDevelopment) {
    console.debug(`${LOG_PREFIX} [DEBUG] ${message}`, details ? JSON.stringify(details, null, 2) : '')
  }
}

/**
 * Create a scoped logger with context
 */
export function createScopedLogger(context: {
  module?: string
  action?: string
  requestId?: string
  projectId?: string
  taskId?: string
}) {
  const baseContext = {
    module: context.module || 'sse',
    action: context.action,
    requestId: context.requestId,
    projectId: context.projectId,
    taskId: context.taskId,
  }

  return {
    info: (data: { action: string; message: string; details?: Record<string, unknown> }) => {
      logInfo(`${data.action}: ${data.message}`, { ...baseContext, details: data.details })
    },
    warn: (data: { action: string; message: string; details?: Record<string, unknown> }) => {
      logWarn(`${data.action}: ${data.message}`, { ...baseContext, details: data.details })
    },
    error: (data: { action: string; message: string; details?: Record<string, unknown> }) => {
      logError(`${data.action}: ${data.message}`, { ...baseContext, details: data.details })
    },
    debug: (data: { action: string; message: string; details?: Record<string, unknown> }) => {
      logDebug(`${data.action}: ${data.message}`, { ...baseContext, details: data.details })
    },
  }
}
