/**
 * AI Drama Studio - Worker 入口
 *
 * 启动所有任务队列处理器：
 * - LLM 文本生成
 * - 图片生成
 * - 视频生成
 * - 语音生成
 */

import { Queue, Worker } from 'bullmq'
import Redis from 'ioredis'
import { QUEUE_NAME, TASK_TYPE, withTaskLifecycle } from '@ai-drama-studio/queue'
import type { TaskJobData } from '@ai-drama-studio/queue'

// Redis 连接
const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
})

// 创建队列
const queues = {
  llm: new Queue<TaskJobData>(QUEUE_NAME.LLM, { connection: redisConnection }),
  image: new Queue<TaskJobData>(QUEUE_NAME.IMAGE, { connection: redisConnection }),
  video: new Queue<TaskJobData>(QUEUE_NAME.VIDEO, { connection: redisConnection }),
  voice: new Queue<TaskJobData>(QUEUE_NAME.VOICE, { connection: redisConnection }),
}

// 导入处理器
import { handleLlmTask } from './llm.worker'
import { handleImageTask } from './image.worker'
import { handleVideoTask } from './video.worker'
import { handleVoiceTask } from './voice.worker'

// 创建 Worker（使用 withTaskLifecycle 包装）
const workers = {
  llm: new Worker<TaskJobData>(
    QUEUE_NAME.LLM,
    (job) => withTaskLifecycle(job, handleLlmTask),
    {
      connection: redisConnection,
      concurrency: parseInt(process.env.QUEUE_CONCURRENCY_LLM || '50'),
    }
  ),
  image: new Worker<TaskJobData>(
    QUEUE_NAME.IMAGE,
    (job) => withTaskLifecycle(job, handleImageTask),
    {
      connection: redisConnection,
      concurrency: parseInt(process.env.QUEUE_CONCURRENCY_IMAGE || '50'),
    }
  ),
  video: new Worker<TaskJobData>(
    QUEUE_NAME.VIDEO,
    (job) => withTaskLifecycle(job, handleVideoTask),
    {
      connection: redisConnection,
      concurrency: parseInt(process.env.QUEUE_CONCURRENCY_VIDEO || '5'),
    }
  ),
  voice: new Worker<TaskJobData>(
    QUEUE_NAME.VOICE,
    (job) => withTaskLifecycle(job, handleVoiceTask),
    {
      connection: redisConnection,
      concurrency: parseInt(process.env.QUEUE_CONCURRENCY_VOICE || '20'),
    }
  ),
}

// 错误和完成事件处理
Object.entries(workers).forEach(([name, worker]) => {
  worker.on('error', (err) => {
    console.error(`[Worker] ${name} error:`, err)
  })

  worker.on('completed', (job) => {
    console.log(`[Worker] ${job?.queueName} task ${job?.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[Worker] ${job?.queueName} task ${job?.id} failed:`, err)
  })
})

// 启动日志
console.log('[Worker] AI Drama Studio Worker started...')
console.log(`[Worker] Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`)
console.log(`[Worker] Queues: ${Object.keys(queues).join(', ')}`)
console.log(`[Worker] Concurrency: llm=${process.env.QUEUE_CONCURRENCY_TEXT || 50}, image=${process.env.QUEUE_CONCURRENCY_IMAGE || 50}, video=${process.env.QUEUE_CONCURRENCY_VIDEO || 50}, voice=${process.env.QUEUE_CONCURRENCY_VOICE || 20}`)

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('[Worker] Shutting down...')
  await Promise.all(Object.values(workers).map((w) => w.close()))
  await Promise.all(Object.values(queues).map((q) => q.close()))
  await redisConnection.quit()
  process.exit(0)
})

export { queues, workers }
