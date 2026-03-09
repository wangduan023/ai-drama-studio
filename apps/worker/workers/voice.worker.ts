/**
 * Voice Worker - 语音合成处理器
 *
 * 处理以下任务类型：
 * - TTS 生成（文本转语音）
 * - 语音分析
 * - 语音设计（自定义声音）
 */

import { Worker, type Job } from 'bullmq'
import { QUEUE_NAME, queueRedis, TASK_TYPE, getProcessorConfig } from '@ai-drama-studio/queue'
import type { TaskJobData } from '@ai-drama-studio/queue'
import { withTaskLifecycle, reportTaskProgress, assertTaskActive } from '@ai-drama-studio/queue'

/**
 * 处理语音行生成任务（TTS）
 */
async function handleVoiceLineTask(job: Job<TaskJobData>): Promise<Record<string, unknown>> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const voiceLineId = typeof payload.voiceLineId === 'string' ? payload.voiceLineId : job.data.targetId
  const characterId = typeof payload.characterId === 'string' ? payload.characterId : null
  const text = typeof payload.text === 'string' ? payload.text : null
  const voiceModel = typeof payload.voiceModel === 'string' ? payload.voiceModel : null

  await reportTaskProgress(job, 10, {
    stage: 'generate_voice_submit',
    voiceLineId,
    characterId,
  })

  await assertTaskActive(job, 'voice_line_generate')

  // TODO: 实现 TTS 生成逻辑
  // 1. 获取文本和声音配置
  // 2. 调用 TTS 服务（如 Azure TTS, ElevenLabs, 通义晓蜜等）
  // 3. 下载生成的音频文件
  // 4. 保存到存储并更新数据库

  await reportTaskProgress(job, 90, {
    stage: 'generate_voice_persist',
    voiceLineId,
  })

  return {
    voiceLineId,
    characterId,
    voiceModel,
    status: 'completed',
  }
}

/**
 * 处理语音设计任务（自定义声音克隆）
 */
async function handleVoiceDesignTask(job: Job<TaskJobData>): Promise<Record<string, unknown>> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const voiceDesignId = typeof payload.voiceDesignId === 'string' ? payload.voiceDesignId : job.data.targetId
  const voicePrompt = typeof payload.voicePrompt === 'string' ? payload.voicePrompt : null
  const previewText = typeof payload.previewText === 'string' ? payload.previewText : null
  const language = typeof payload.language === 'string' ? payload.language : 'zh'

  await reportTaskProgress(job, 10, {
    stage: 'voice_design_submit',
    voiceDesignId,
  })

  await assertTaskActive(job, 'voice_design_submit')

  // TODO: 实现语音设计逻辑
  // 1. 使用语音提示词创建自定义声音
  // 2. 使用预览文本测试声音
  // 3. 保存声音配置和样本
  // 4. 更新数据库

  await reportTaskProgress(job, 90, {
    stage: 'voice_design_done',
    voiceDesignId,
  })

  return {
    voiceDesignId,
    voicePrompt,
    language,
    status: 'completed',
  }
}

/**
 * 处理资产中心语音设计任务
 */
async function handleAssetHubVoiceDesignTask(job: Job<TaskJobData>): Promise<Record<string, unknown>> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const assetHubId = typeof payload.assetHubId === 'string' ? payload.assetHubId : job.data.targetId

  await reportTaskProgress(job, 10, {
    stage: 'asset_hub_voice_design',
    assetHubId,
  })

  await assertTaskActive(job, 'asset_hub_voice_design')

  // TODO: 实现资产中心语音设计逻辑

  await reportTaskProgress(job, 90, {
    stage: 'asset_hub_voice_design_complete',
    assetHubId,
  })

  return {
    assetHubId,
    status: 'completed',
  }
}

// ===== 主处理函数 =====

/**
 * 处理语音任务
 */
async function processVoiceTask(job: Job<TaskJobData>): Promise<Record<string, unknown> | void> {
  await reportTaskProgress(job, 5, { stage: 'received' })

  await assertTaskActive(job, 'voice_task_dispatch')

  switch (job.data.type) {
    case TASK_TYPE.VOICE_LINE:
      return await handleVoiceLineTask(job)

    case TASK_TYPE.VOICE_DESIGN:
      return await handleVoiceDesignTask(job)

    case TASK_TYPE.ASSET_HUB_VOICE_DESIGN:
      return await handleAssetHubVoiceDesignTask(job)

    default:
      throw new Error(`Unsupported voice task type: ${job.data.type}`)
  }
}

// ===== Worker 创建函数 =====

/**
 * 语音任务处理函数（供 workers/index.ts 使用）
 */
export async function handleVoiceTask(job: Job<TaskJobData>): Promise<Record<string, unknown> | void> {
  return await processVoiceTask(job)
}

/**
 * 创建语音 Worker 实例
 */
export function createVoiceWorker(): Worker<TaskJobData> {
  const config = getProcessorConfig('voice')

  const worker = new Worker<TaskJobData>(
    QUEUE_NAME.VOICE,
    async (job) => await withTaskLifecycle(job, processVoiceTask),
    {
      connection: queueRedis,
      concurrency: config.concurrency,
      limiter: config.limiter,
    },
  )

  console.log(`[Voice Worker] Created with concurrency: ${config.concurrency}`)

  return worker
}
