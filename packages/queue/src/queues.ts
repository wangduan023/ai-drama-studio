/**
 * BullMQ 队列定义
 *
 * 定义四个队列：llm, image, video, voice
 * 每个队列都有独立的限流器和配置
 */

import { Queue, type JobsOptions, type QueueOptions, type ConnectionOptions } from 'bullmq'
import IORedis from 'ioredis'
import type { TaskJobData, TaskType, QueueType } from './types'
import { TASK_TYPE } from './types'

// ===== Redis 连接配置 =====
export const queueRedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number.parseInt(process.env.REDIS_DB || '0', 10),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    if (times > 3) {
      return null
    }
    return Math.min(times * 200, 2000)
  },
}

// ===== Redis 连接实例 =====
export const queueRedis = new IORedis(queueRedisConfig)

// ===== 队列名称 =====
export const QUEUE_NAME = {
  LLM: 'ai-drama-studio-llm',
  IMAGE: 'ai-drama-studio-image',
  VIDEO: 'ai-drama-studio-video',
  VOICE: 'ai-drama-studio-voice',
} as const

// ===== 默认作业配置 =====
const defaultJobOptions: JobsOptions = {
  // 完成/失败后保留的作业数量
  removeOnComplete: 100,
  removeOnFail: 1000,
  // 重试配置
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
}

// ===== 队列限流器配置 =====
const rateLimiter = {
  max: 10, // 每 duration 毫秒内最多处理 max 个作业
  duration: 1000, // 1 秒
}

// ===== 队列选项 =====
const queueOptions: QueueOptions = {
  connection: queueRedis as unknown as ConnectionOptions,
  defaultJobOptions,
  rateLimiter,
}

// ===== 队列实例 =====
export const llmQueue = new Queue<TaskJobData>(QUEUE_NAME.LLM, queueOptions)
export const imageQueue = new Queue<TaskJobData>(QUEUE_NAME.IMAGE, queueOptions)
export const videoQueue = new Queue<TaskJobData>(QUEUE_NAME.VIDEO, queueOptions)
export const voiceQueue = new Queue<TaskJobData>(QUEUE_NAME.VOICE, queueOptions)

// ===== 所有队列集合 =====
const ALL_QUEUES = [llmQueue, imageQueue, videoQueue, voiceQueue] as const

// ===== 任务类型到队列类型的映射 =====
const LLM_TYPES = new Set<TaskType>([
  // AI 生成任务
  TASK_TYPE.SCRIPT_GENERATE,
  TASK_TYPE.CHARACTER_GENERATE,
  TASK_TYPE.CHARACTER_GENERATE_BATCH,
  TASK_TYPE.SCENE_GENERATE,

  // 原有 LLM 任务
  TASK_TYPE.ANALYZE_NOVEL,
  TASK_TYPE.STORY_TO_SCRIPT_RUN,
  TASK_TYPE.SCRIPT_TO_STORYBOARD_RUN,
  TASK_TYPE.CLIPS_BUILD,
  TASK_TYPE.SCREENPLAY_CONVERT,
  TASK_TYPE.VOICE_ANALYZE,
  TASK_TYPE.ANALYZE_GLOBAL,
  TASK_TYPE.AI_MODIFY_APPEARANCE,
  TASK_TYPE.AI_MODIFY_LOCATION,
  TASK_TYPE.AI_MODIFY_SHOT_PROMPT,
  TASK_TYPE.ANALYZE_SHOT_VARIANTS,
  TASK_TYPE.AI_CREATE_CHARACTER,
  TASK_TYPE.AI_CREATE_LOCATION,
  TASK_TYPE.REFERENCE_TO_CHARACTER,
  TASK_TYPE.CHARACTER_PROFILE_CONFIRM,
  TASK_TYPE.CHARACTER_PROFILE_BATCH_CONFIRM,
  TASK_TYPE.EPISODE_SPLIT_LLM,
  TASK_TYPE.ASSET_HUB_AI_DESIGN_CHARACTER,
  TASK_TYPE.ASSET_HUB_AI_DESIGN_LOCATION,
  TASK_TYPE.ASSET_HUB_AI_MODIFY_CHARACTER,
  TASK_TYPE.ASSET_HUB_AI_MODIFY_LOCATION,
  TASK_TYPE.ASSET_HUB_REFERENCE_TO_CHARACTER,
  TASK_TYPE.REGENERATE_STORYBOARD_TEXT,
  TASK_TYPE.INSERT_PANEL,
])

const IMAGE_TYPES = new Set<TaskType>([
  // AI 图像生成任务
  TASK_TYPE.IMAGE_GENERATE,
  TASK_TYPE.IMAGE_GENERATE_BATCH,

  // 原有图像任务
  TASK_TYPE.IMAGE_PANEL,
  TASK_TYPE.IMAGE_CHARACTER,
  TASK_TYPE.IMAGE_LOCATION,
  TASK_TYPE.PANEL_VARIANT,
  TASK_TYPE.MODIFY_ASSET_IMAGE,
  TASK_TYPE.REGENERATE_GROUP,
  TASK_TYPE.ASSET_HUB_IMAGE,
  TASK_TYPE.ASSET_HUB_MODIFY,
])

const VIDEO_TYPES = new Set<TaskType>([
  // AI 视频生成任务
  TASK_TYPE.VIDEO_GENERATE,
  TASK_TYPE.VIDEO_COMPOSE,

  // 原有视频任务
  TASK_TYPE.VIDEO_PANEL,
  TASK_TYPE.LIP_SYNC,
])

const VOICE_TYPES = new Set<TaskType>([
  // AI 音频生成任务
  TASK_TYPE.AUDIO_GENERATE,

  // 原有语音任务
  TASK_TYPE.VOICE_LINE,
  TASK_TYPE.VOICE_DESIGN,
  TASK_TYPE.ASSET_HUB_VOICE_DESIGN,
])

// ===== 工具函数 =====

/**
 * 根据任务类型获取队列类型
 */
export function getQueueTypeByTaskType(type: TaskType): QueueType {
  if (LLM_TYPES.has(type)) return 'llm'
  if (IMAGE_TYPES.has(type)) return 'image'
  if (VIDEO_TYPES.has(type)) return 'video'
  if (VOICE_TYPES.has(type)) return 'voice'
  return 'llm' // 默认
}

/**
 * 根据队列类型获取队列实例
 */
export function getQueueByType(type: QueueType) {
  switch (type) {
    case 'image':
      return imageQueue
    case 'video':
      return videoQueue
    case 'voice':
      return voiceQueue
    case 'llm':
    default:
      return llmQueue
  }
}

/**
 * 添加任务到队列
 */
export async function addTaskJob(data: TaskJobData, opts?: JobsOptions) {
  const queueType = getQueueTypeByTaskType(data.type)
  const queue = getQueueByType(queueType)
  const priority = typeof opts?.priority === 'number' ? opts.priority : 0

  return await queue.add(data.type, data, {
    jobId: data.taskId,
    priority,
    ...(opts || {}),
  })
}

/**
 * 从所有队列中移除任务
 */
export async function removeTaskJob(taskId: string): Promise<boolean> {
  for (const queue of ALL_QUEUES) {
    const job = await queue.getJob(taskId)
    if (!job) continue
    await job.remove()
    return true
  }
  return false
}

/**
 * 获取任务状态
 */
export async function getTaskStatus(taskId: string): Promise<{ queue: QueueType; status: string } | null> {
  for (const [index, queue] of ALL_QUEUES.entries()) {
    const job = await queue.getJob(taskId)
    if (job) {
      const state = await job.getState()
      const queueTypes: QueueType[] = ['llm', 'image', 'video', 'voice']
      return { queue: queueTypes[index], status: state }
    }
  }
  return null
}

/**
 * 获取队列统计信息
 */
export async function getQueueStats() {
  const [llm, image, video, voice] = await Promise.all([
    getQueueStatsForQueue(llmQueue),
    getQueueStatsForQueue(imageQueue),
    getQueueStatsForQueue(videoQueue),
    getQueueStatsForQueue(voiceQueue),
  ])

  return {
    [QUEUE_NAME.LLM]: llm,
    [QUEUE_NAME.IMAGE]: image,
    [QUEUE_NAME.VIDEO]: video,
    [QUEUE_NAME.VOICE]: voice,
  }
}

async function getQueueStatsForQueue(queue: Queue<TaskJobData>) {
  const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.getPausedCount(),
  ])

  return { waiting, active, completed, failed, delayed, paused }
}

/**
 * 清空队列（开发/测试用）
 */
export async function clearAllQueues(): Promise<void> {
  await Promise.all(ALL_QUEUES.map((queue) => queue.obliterate({ force: true })))
}

/**
 * 关闭 Redis 连接
 */
export async function closeQueueConnection(): Promise<void> {
  await Promise.all(ALL_QUEUES.map((queue) => queue.close()))
  await queueRedis.quit()
}
