/**
 * AI Drama Studio Worker 应用入口
 *
 * 启动所有 BullMQ Worker 处理器
 * 支持优雅关闭和信号处理
 */

import { startAllWorkers, stopAllWorkers, closeQueueConnection } from '@ai-drama-studio/queue'

// ===== 全局状态 =====
let isShuttingDown = false
let shutdownPromise: Promise<void> | null = null

/**
 * 优雅关闭处理
 */
async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    console.log(`[Worker] Already shutting down, ignoring signal: ${signal}`)
    return
  }

  if (shutdownPromise) {
    return shutdownPromise
  }

  isShuttingDown = true

  console.log(`[Worker] Received ${signal}, initiating graceful shutdown...`)

  shutdownPromise = (async () => {
    try {
      // 停止所有 Worker
      await stopAllWorkers()

      // 关闭 Redis 连接
      await closeQueueConnection()

      console.log('[Worker] Graceful shutdown completed')

      // 退出进程
      process.exit(0)
    } catch (error) {
      console.error('[Worker] Graceful shutdown failed:', error)
      process.exit(1)
    }
  })()

  return shutdownPromise
}

/**
 * 注册信号处理器
 */
function registerSignalHandlers(): void {
  // 优雅关闭信号
  process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'))
  process.on('SIGINT', () => void gracefulShutdown('SIGINT'))

  // 未捕获异常处理
  process.on('uncaughtException', (error) => {
    console.error('[Worker] Uncaught exception:', error)
    void gracefulShutdown('uncaughtException')
  })

  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Worker] Unhandled rejection at:', promise, 'reason:', reason)
  })
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  console.log('[Worker] Starting AI Drama Studio Worker...')
  console.log('[Worker] Environment:', process.env.NODE_ENV || 'development')
  console.log('[Worker] Redis:', process.env.REDIS_HOST || 'localhost', ':', process.env.REDIS_PORT || '6379')

  // 注册信号处理器
  registerSignalHandlers()

  // 启动所有 Worker
  startAllWorkers()

  console.log('[Worker] Worker is ready and waiting for jobs...')
  console.log('[Worker] Press Ctrl+C to stop')
}

// 启动应用
main().catch((error) => {
  console.error('[Worker] Failed to start:', error)
  process.exit(1)
})

// 导出用于测试
export { gracefulShutdown, main }
