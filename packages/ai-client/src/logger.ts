/**
 * 日志接口 - 可配置的日志系统
 *
 * 默认使用 console，但支持自定义日志器
 */

/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * 日志器接口
 */
export interface Logger {
  debug: (message: string, ...args: unknown[]) => void
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
}

/**
 * 默认日志器（使用 console）
 */
export const defaultLogger: Logger = {
  debug: (message: string, ...args: unknown[]) => {
    if (process.env.AI_CLIENT_DEBUG) {
      console.debug(`[AIClient] ${message}`, ...args)
    }
  },
  info: (message: string, ...args: unknown[]) => {
    console.info(`[AIClient] ${message}`, ...args)
  },
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[AIClient] ${message}`, ...args)
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[AIClient] ${message}`, ...args)
  },
}

/**
 * 全局日志器实例
 */
let globalLogger: Logger = defaultLogger

/**
 * 设置全局日志器
 *
 * @param logger - 自定义日志器
 *
 * @example
 * ```typescript
 * import { setGlobalLogger } from '@ai-drama-studio/ai-client/logger'
 * import { pino } from 'pino'
 *
 * const logger = pino()
 * setGlobalLogger(logger)
 * ```
 */
export function setGlobalLogger(logger: Logger): void {
  globalLogger = logger
}

/**
 * 获取当前日志器
 */
export function getLogger(): Logger {
  return globalLogger
}

/**
 * 重置为默认日志器
 */
export function resetLogger(): void {
  globalLogger = defaultLogger
}
