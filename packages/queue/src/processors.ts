/**
 * 处理器注册
 *
 * 注册所有 Worker 处理器到对应的队列
 */

import { Worker } from 'bullmq'
import { queueRedis } from './queues'
import { QUEUE_NAME } from './queues'
import type { TaskJobData } from './types'

// 注意：Worker 实现在 @ai-drama-studio/worker 包中
// 这里只提供配置和工具函数

// 缓存 Worker 实例（当在本包中启动时使用）
let llmWorker: Worker<TaskJobData> | null = null
let imageWorker: Worker<TaskJobData> | null = null
let videoWorker: Worker<TaskJobData> | null = null
let voiceWorker: Worker<TaskJobData> | null = null

/**
 * 启动所有 Worker
 *
 * 注意：实际 Worker 实现在 @ai-drama-studio/worker 包中
 * 使用 startAllWorkers() 前需要确保已安装 @ai-drama-studio/worker
 */
export function startAllWorkers(): void {
  console.log('[Worker] Starting all workers...')
  console.log('[Worker] Note: Worker implementations are in @ai-drama-studio/worker package')

  // 实际 Worker 启动逻辑在 @ai-drama-studio/worker 包中
  // 这里只是占位函数

  console.log('[Worker] All workers started')
}

/**
 * 停止所有 Worker
 */
export async function stopAllWorkers(): Promise<void> {
  console.log('[Worker] Stopping all workers...')

  const closers: Array<Promise<void>> = []

  if (llmWorker) {
    closers.push(llmWorker.close())
    llmWorker = null
  }
  if (imageWorker) {
    closers.push(imageWorker.close())
    imageWorker = null
  }
  if (videoWorker) {
    closers.push(videoWorker.close())
    videoWorker = null
  }
  if (voiceWorker) {
    closers.push(voiceWorker.close())
    voiceWorker = null
  }

  await Promise.all(closers)
  console.log('[Worker] All workers stopped')
}

/**
 * 获取所有 Worker 实例
 */
export function getAllWorkers(): {
  llm: Worker<TaskJobData> | null
  image: Worker<TaskJobData> | null
  video: Worker<TaskJobData> | null
  voice: Worker<TaskJobData> | null
} {
  return {
    llm: llmWorker,
    image: imageWorker,
    video: videoWorker,
    voice: voiceWorker,
  }
}

/**
 * 处理器配置
 */
export interface ProcessorConfig {
  concurrency: number
  limiter?: {
    max: number
    duration: number
  }
}

/**
 * 从环境变量读取处理器配置
 */
export function getProcessorConfig(type: 'llm' | 'image' | 'video' | 'voice'): ProcessorConfig {
  const envMap = {
    llm: 'QUEUE_CONCURRENCY_LLM',
    image: 'QUEUE_CONCURRENCY_IMAGE',
    video: 'QUEUE_CONCURRENCY_VIDEO',
    voice: 'QUEUE_CONCURRENCY_VOICE',
  }

  const concurrency = Number.parseInt(process.env[envMap[type]] || '4', 10) || 4

  return {
    concurrency,
  }
}
