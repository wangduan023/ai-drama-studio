/**
 * Video Worker - 视频生成处理器
 *
 * 处理以下任务类型：
 * - 视频生成 (video:generate)
 * - 视频合成 (video:compose)
 * - 图生视频（分镜视频生成）
 * - 视频变体
 * - 口型同步（Lip Sync）
 */

import { Worker, type Job } from 'bullmq'
import { QUEUE_NAME, queueRedis, TASK_TYPE, getProcessorConfig } from '@ai-drama-studio/queue'
import type { TaskJobData } from '@ai-drama-studio/queue'
import { withTaskLifecycle, reportTaskProgress, assertTaskActive } from '@ai-drama-studio/queue'
import { handleVideoGenerate, handleVideoComposition } from '../src/handlers'

/**
 * 处理分镜视频生成任务
 */
async function handleVideoPanelTask(job: Job<TaskJobData>): Promise<Record<string, unknown>> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const panelId = typeof payload.panelId === 'string' ? payload.panelId : job.data.targetId
  const storyboardId = typeof payload.storyboardId === 'string' ? payload.storyboardId : null
  const videoModel = typeof payload.videoModel === 'string' ? payload.videoModel : null

  await reportTaskProgress(job, 10, {
    stage: 'generate_panel_video',
    panelId,
    storyboardId,
  })

  await assertTaskActive(job, 'panel_video_generate')

  // TODO: 实现分镜视频生成逻辑
  // 1. 获取分镜图片和提示词
  // 2. 调用 AI 视频生成服务（如 Runway, Pika, 可灵等）
  // 3. 轮询视频生成状态
  // 4. 下载并保存视频到存储
  // 5. 更新数据库

  await reportTaskProgress(job, 90, {
    stage: 'generate_panel_video_complete',
    panelId,
  })

  return {
    panelId,
    storyboardId,
    videoModel,
    status: 'completed',
  }
}

/**
 * 处理口型同步任务
 */
async function handleLipSyncTask(job: Job<TaskJobData>): Promise<Record<string, unknown>> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const panelId = typeof payload.panelId === 'string' ? payload.panelId : job.data.targetId
  const voiceLineId = typeof payload.voiceLineId === 'string' ? payload.voiceLineId : null
  const lipSyncModel = typeof payload.lipSyncModel === 'string' ? payload.lipSyncModel : null

  await reportTaskProgress(job, 10, {
    stage: 'submit_lip_sync',
    panelId,
    voiceLineId,
  })

  await assertTaskActive(job, 'lip_sync_submit')

  // TODO: 实现口型同步逻辑
  // 1. 获取分镜视频和语音文件
  // 2. 调用 AI 口型同步服务（如 Wav2Lip, D-ID 等）
  // 3. 轮询处理状态
  // 4. 下载并保存同步后的视频
  // 5. 更新数据库

  await reportTaskProgress(job, 90, {
    stage: 'persist_lip_sync',
    panelId,
    voiceLineId,
  })

  return {
    panelId,
    voiceLineId,
    lipSyncModel,
    status: 'completed',
  }
}

/**
 * 处理视频变体生成任务
 */
async function handleVideoVariantTask(job: Job<TaskJobData>): Promise<Record<string, unknown>> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const sourcePanelId = typeof payload.sourcePanelId === 'string' ? payload.sourcePanelId : job.data.targetId
  const variantCount = typeof payload.variantCount === 'number' ? payload.variantCount : 1

  await reportTaskProgress(job, 10, {
    stage: 'video_variant_generate',
    sourcePanelId,
    variantCount,
  })

  await assertTaskActive(job, 'video_variant_generate')

  // TODO: 实现视频变体生成逻辑
  // 1. 获取原视频信息
  // 2. 生成多个变体提示词
  // 3. 调用 AI 视频生成服务
  // 4. 保存所有变体到数据库

  await reportTaskProgress(job, 90, {
    stage: 'video_variant_complete',
    sourcePanelId,
  })

  return {
    sourcePanelId,
    variantCount,
    status: 'completed',
  }
}

// ===== 主处理函数 =====

/**
 * 处理视频任务
 */
async function processVideoTask(job: Job<TaskJobData>): Promise<Record<string, unknown> | void> {
  await reportTaskProgress(job, 5, { stage: 'received' })

  await assertTaskActive(job, 'video_task_dispatch')

  switch (job.data.type) {
    // AI 视频生成任务
    case TASK_TYPE.VIDEO_GENERATE:
      return await handleVideoGenerate(job)

    case TASK_TYPE.VIDEO_COMPOSE:
      return await handleVideoComposition(job)

    case TASK_TYPE.VIDEO_PANEL:
      return await handleVideoPanelTask(job)

    case TASK_TYPE.LIP_SYNC:
      return await handleLipSyncTask(job)

    // 如果有视频变体任务类型，可以添加到这里
    // case TASK_TYPE.VIDEO_VARIANT:
    //   return await handleVideoVariantTask(job)

    default:
      throw new Error(`Unsupported video task type: ${job.data.type}`)
  }
}

// ===== Worker 创建函数 =====

/**
 * 视频任务处理函数（供 workers/index.ts 使用）
 */
export async function handleVideoTask(job: Job<TaskJobData>): Promise<Record<string, unknown> | void> {
  return await processVideoTask(job)
}

/**
 * 创建视频 Worker 实例
 *
 * 视频生成通常耗时较长，并发度设置较低
 */
export function createVideoWorker(): Worker<TaskJobData> {
  const config = getProcessorConfig('video')

  // 视频生成耗时较长，默认并发度较低
  const defaultConcurrency = Number.parseInt(process.env.QUEUE_CONCURRENCY_VIDEO || '2', 10) || 2

  const worker = new Worker<TaskJobData>(
    QUEUE_NAME.VIDEO,
    async (job) => await withTaskLifecycle(job, processVideoTask),
    {
      connection: queueRedis,
      concurrency: config.concurrency || defaultConcurrency,
      limiter: config.limiter,
      // 视频任务超时时间更长
      defaultJobOptions: {
        timeout: 600000, // 10 分钟
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    },
  )

  console.log(`[Video Worker] Created with concurrency: ${config.concurrency || defaultConcurrency}`)

  return worker
}
