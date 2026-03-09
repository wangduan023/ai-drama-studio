/**
 * Image Worker - 图片生成处理器
 *
 * 处理以下任务类型：
 * - 角色图片生成
 * - 场景图片生成
 * - 分镜图生成
 * - 图片修改/变体
 */

import { Worker, type Job } from 'bullmq'
import { QUEUE_NAME, queueRedis, TASK_TYPE, getProcessorConfig } from '@ai-drama-studio/queue'
import type { TaskJobData } from '@ai-drama-studio/queue'
import { withTaskLifecycle, reportTaskProgress, assertTaskActive } from '@ai-drama-studio/queue'

/**
 * 处理角色图片生成任务
 */
async function handleCharacterImageTask(job: Job<TaskJobData>): Promise<Record<string, unknown>> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const characterId = typeof payload.characterId === 'string' ? payload.characterId : job.data.targetId
  const appearanceId = typeof payload.appearanceId === 'string' ? payload.appearanceId : null

  await reportTaskProgress(job, 10, {
    stage: 'generate_character_image',
    characterId,
  })

  await assertTaskActive(job, 'character_image_generate')

  // TODO: 实现角色图片生成逻辑
  // 1. 获取角色描述和外观信息
  // 2. 构建图片生成提示词
  // 3. 调用 AI 图像生成服务
  // 4. 保存图片 URL 到数据库

  await reportTaskProgress(job, 90, {
    stage: 'generate_character_image_complete',
    characterId,
  })

  return {
    characterId,
    appearanceId,
    status: 'completed',
  }
}

/**
 * 处理场景图片生成任务
 */
async function handleLocationImageTask(job: Job<TaskJobData>): Promise<Record<string, unknown>> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const locationId = typeof payload.locationId === 'string' ? payload.locationId : job.data.targetId

  await reportTaskProgress(job, 10, {
    stage: 'generate_location_image',
    locationId,
  })

  await assertTaskActive(job, 'location_image_generate')

  // TODO: 实现场景图片生成逻辑
  // 1. 获取场景描述
  // 2. 构建图片生成提示词
  // 3. 调用 AI 图像生成服务
  // 4. 保存图片 URL 到数据库

  await reportTaskProgress(job, 90, {
    stage: 'generate_location_image_complete',
    locationId,
  })

  return {
    locationId,
    status: 'completed',
  }
}

/**
 * 处理分镜图片生成任务
 */
async function handlePanelImageTask(job: Job<TaskJobData>): Promise<Record<string, unknown>> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const panelId = typeof payload.panelId === 'string' ? payload.panelId : job.data.targetId
  const storyboardId = typeof payload.storyboardId === 'string' ? payload.storyboardId : null

  await reportTaskProgress(job, 10, {
    stage: 'generate_panel_candidate',
    panelId,
    storyboardId,
  })

  await assertTaskActive(job, 'panel_image_generate')

  // TODO: 实现分镜图片生成逻辑
  // 1. 获取分镜描述和运镜规划
  // 2. 构建图片生成提示词（包含角色一致性）
  // 3. 调用 AI 图像生成服务
  // 4. 保存图片 URL 到数据库

  await reportTaskProgress(job, 90, {
    stage: 'generate_panel_image_complete',
    panelId,
  })

  return {
    panelId,
    storyboardId,
    status: 'completed',
  }
}

/**
 * 处理图片修改任务
 */
async function handleModifyAssetImageTask(job: Job<TaskJobData>): Promise<Record<string, unknown>> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const assetId = typeof payload.assetId === 'string' ? payload.assetId : job.data.targetId
  const modificationType = typeof payload.modificationType === 'string' ? payload.modificationType : 'general'

  await reportTaskProgress(job, 10, {
    stage: 'modify_asset_image',
    assetId,
    modificationType,
  })

  await assertTaskActive(job, 'asset_image_modify')

  // TODO: 实现图片修改逻辑
  // 1. 获取原图和修改指令
  // 2. 调用 AI 图片编辑服务
  // 3. 保存新图片 URL 到数据库

  await reportTaskProgress(job, 90, {
    stage: 'modify_asset_image_complete',
    assetId,
  })

  return {
    assetId,
    modificationType,
    status: 'completed',
  }
}

/**
 * 处理资产中心图片生成任务
 */
async function handleAssetHubImageTask(job: Job<TaskJobData>): Promise<Record<string, unknown>> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const assetHubId = typeof payload.assetHubId === 'string' ? payload.assetHubId : job.data.targetId

  await reportTaskProgress(job, 10, {
    stage: 'asset_hub_image_generate',
    assetHubId,
  })

  await assertTaskActive(job, 'asset_hub_image_generate')

  // TODO: 实现资产中心图片生成逻辑

  await reportTaskProgress(job, 90, {
    stage: 'asset_hub_image_complete',
    assetHubId,
  })

  return {
    assetHubId,
    status: 'completed',
  }
}

/**
 * 处理资产中心图片修改任务
 */
async function handleAssetHubModifyTask(job: Job<TaskJobData>): Promise<Record<string, unknown>> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const assetHubId = typeof payload.assetHubId === 'string' ? payload.assetHubId : job.data.targetId

  await reportTaskProgress(job, 10, {
    stage: 'asset_hub_image_modify',
    assetHubId,
  })

  await assertTaskActive(job, 'asset_hub_image_modify')

  // TODO: 实现资产中心图片修改逻辑

  await reportTaskProgress(job, 90, {
    stage: 'asset_hub_image_modify_complete',
    assetHubId,
  })

  return {
    assetHubId,
    status: 'completed',
  }
}

/**
 * 处理分镜变体生成任务
 */
async function handlePanelVariantTask(job: Job<TaskJobData>): Promise<Record<string, unknown>> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const sourcePanelId = typeof payload.sourcePanelId === 'string' ? payload.sourcePanelId : job.data.targetId
  const variantCount = typeof payload.variantCount === 'number' ? payload.variantCount : 1

  await reportTaskProgress(job, 10, {
    stage: 'panel_variant_generate',
    sourcePanelId,
    variantCount,
  })

  await assertTaskActive(job, 'panel_variant_generate')

  // TODO: 实现分镜变体生成逻辑
  // 1. 获取原分镜信息
  // 2. 生成多个变体提示词
  // 3. 调用 AI 图像生成服务
  // 4. 保存所有变体到数据库

  await reportTaskProgress(job, 90, {
    stage: 'panel_variant_complete',
    sourcePanelId,
  })

  return {
    sourcePanelId,
    variantCount,
    status: 'completed',
  }
}

/**
 * 处理批量重生成任务
 */
async function handleRegenerateGroupTask(job: Job<TaskJobData>): Promise<Record<string, unknown>> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const groupIds = Array.isArray(payload.groupIds) ? payload.groupIds : []

  await reportTaskProgress(job, 10, {
    stage: 'regenerate_group',
    count: groupIds.length,
  })

  await assertTaskActive(job, 'regenerate_group')

  // TODO: 实现批量重生成逻辑
  // 1. 遍历所有 ID
  // 2. 逐个重新生成
  // 3. 更新进度

  await reportTaskProgress(job, 90, {
    stage: 'regenerate_group_complete',
    count: groupIds.length,
  })

  return {
    groupIds,
    status: 'completed',
  }
}

// ===== 主处理函数 =====

/**
 * 处理图片任务
 */
async function processImageTask(job: Job<TaskJobData>): Promise<Record<string, unknown> | void> {
  await reportTaskProgress(job, 5, { stage: 'received' })

  await assertTaskActive(job, 'image_task_dispatch')

  switch (job.data.type) {
    case TASK_TYPE.IMAGE_CHARACTER:
      return await handleCharacterImageTask(job)

    case TASK_TYPE.IMAGE_LOCATION:
      return await handleLocationImageTask(job)

    case TASK_TYPE.IMAGE_PANEL:
      return await handlePanelImageTask(job)

    case TASK_TYPE.MODIFY_ASSET_IMAGE:
      return await handleModifyAssetImageTask(job)

    case TASK_TYPE.ASSET_HUB_IMAGE:
      return await handleAssetHubImageTask(job)

    case TASK_TYPE.ASSET_HUB_MODIFY:
      return await handleAssetHubModifyTask(job)

    case TASK_TYPE.PANEL_VARIANT:
      return await handlePanelVariantTask(job)

    case TASK_TYPE.REGENERATE_GROUP:
      return await handleRegenerateGroupTask(job)

    default:
      throw new Error(`Unsupported image task type: ${job.data.type}`)
  }
}

// ===== Worker 创建函数 =====

/**
 * 图片任务处理函数（供 workers/index.ts 使用）
 */
export async function handleImageTask(job: Job<TaskJobData>): Promise<Record<string, unknown> | void> {
  return await processImageTask(job)
}

/**
 * 创建图片 Worker 实例
 */
export function createImageWorker(): Worker<TaskJobData> {
  const config = getProcessorConfig('image')

  const worker = new Worker<TaskJobData>(
    QUEUE_NAME.IMAGE,
    async (job) => await withTaskLifecycle(job, processImageTask),
    {
      connection: queueRedis,
      concurrency: config.concurrency,
      limiter: config.limiter,
    },
  )

  console.log(`[Image Worker] Created with concurrency: ${config.concurrency}`)

  return worker
}
