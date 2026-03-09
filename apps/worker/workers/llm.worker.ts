/**
 * LLM Worker - 文本/LLM 任务处理器
 *
 * 处理以下任务类型：
 * - 剧本生成 (story_to_script_run)
 * - 分镜生成 (script_to_storyboard_run)
 * - 运镜规划
 * - 小说分析
 * - 角色/场景分析
 * - 语音分析
 * - 其他文本处理任务
 */

import { Worker, type Job } from 'bullmq'
import { QUEUE_NAME, queueRedis, TASK_TYPE, getProcessorConfig } from '@ai-drama-studio/queue'
import type { TaskJobData } from '@ai-drama-studio/queue'
import { withTaskLifecycle, reportTaskProgress, assertTaskActive } from '@ai-drama-studio/queue'

// ===== 任务处理函数声明 =====

/**
 * 处理小说分析任务
 */
async function handleAnalyzeNovelTask(job: Job<TaskJobData>): Promise<Record<string, unknown>> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const novelId = typeof payload.novelId === 'string' ? payload.novelId : job.data.targetId

  await reportTaskProgress(job, 10, { stage: 'analyze_novel_prepare' })

  // TODO: 实现小说分析逻辑
  // 1. 读取小说内容
  // 2. 调用 LLM 进行分析
  // 3. 提取角色、场景、情节等元素
  // 4. 保存到数据库

  await reportTaskProgress(job, 90, { stage: 'analyze_novel_complete' })

  return {
    novelId,
    status: 'completed',
  }
}

/**
 * 处理小说转剧本任务
 */
async function handleStoryToScriptTask(job: Job<TaskJobData>): Promise<Record<string, unknown>> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const novelId = typeof payload.novelId === 'string' ? payload.novelId : job.data.targetId

  await reportTaskProgress(job, 10, { stage: 'story_to_script_prepare' })

  // TODO: 实现小说转剧本逻辑
  // 1. 读取小说内容和分析结果
  // 2. 分章节转换为剧本格式
  // 3. 提取对话和场景描述
  // 4. 保存到数据库

  await reportTaskProgress(job, 90, { stage: 'story_to_script_complete' })

  return {
    novelId,
    status: 'completed',
  }
}

/**
 * 处理剧本转分镜任务
 */
async function handleScriptToStoryboardTask(job: Job<TaskJobData>): Promise<Record<string, unknown>> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const scriptId = typeof payload.scriptId === 'string' ? payload.scriptId : job.data.targetId

  await reportTaskProgress(job, 10, { stage: 'script_to_storyboard_prepare' })

  // TODO: 实现剧本转分镜逻辑
  // 1. 读取剧本内容
  // 2. 分析每个场景的镜头需求
  // 3. 生成分镜描述和运镜规划
  // 4. 保存到数据库

  await reportTaskProgress(job, 90, { stage: 'script_to_storyboard_complete' })

  return {
    scriptId,
    status: 'completed',
  }
}

/**
 * 处理片段构建任务
 */
async function handleClipsBuildTask(job: Job<TaskJobData>): Promise<Record<string, unknown>> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const episodeId = job.data.episodeId || job.data.targetId

  await reportTaskProgress(job, 10, { stage: 'clips_build_prepare' })

  // TODO: 实现片段构建逻辑
  // 1. 读取分镜数据
  // 2. 构建视频片段结构
  // 3. 保存到数据库

  await reportTaskProgress(job, 90, { stage: 'clips_build_complete' })

  return {
    episodeId,
    status: 'completed',
  }
}

/**
 * 处理剧本转换任务
 */
async function handleScreenplayConvertTask(job: Job<TaskJobData>): Promise<Record<string, unknown>> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const sourceId = typeof payload.sourceId === 'string' ? payload.sourceId : job.data.targetId

  await reportTaskProgress(job, 10, { stage: 'screenplay_convert_prepare' })

  // TODO: 实现剧本转换逻辑

  await reportTaskProgress(job, 90, { stage: 'screenplay_convert_complete' })

  return {
    sourceId,
    status: 'completed',
  }
}

/**
 * 处理语音分析任务
 */
async function handleVoiceAnalyzeTask(job: Job<TaskJobData>): Promise<Record<string, unknown>> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const voiceLineId = typeof payload.voiceLineId === 'string' ? payload.voiceLineId : job.data.targetId

  await reportTaskProgress(job, 10, { stage: 'voice_analyze_prepare' })

  // TODO: 实现语音分析逻辑
  // 1. 分析语音文件
  // 2. 提取时间戳和情感信息
  // 3. 保存到数据库

  await reportTaskProgress(job, 90, { stage: 'voice_analyze_complete' })

  return {
    voiceLineId,
    status: 'completed',
  }
}

/**
 * 处理全局分析任务
 */
async function handleAnalyzeGlobalTask(job: Job<TaskJobData>): Promise<Record<string, unknown>> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const projectId = job.data.projectId

  await reportTaskProgress(job, 10, { stage: 'analyze_global_prepare' })

  // TODO: 实现全局分析逻辑
  // 1. 分析整个项目的角色、场景、情节
  // 2. 生成一致性报告
  // 3. 保存到数据库

  await reportTaskProgress(job, 90, { stage: 'analyze_global_complete' })

  return {
    projectId,
    status: 'completed',
  }
}

/**
 * 处理 LLM 代理任务（通用）
 */
async function handleLLMProxyTask(job: Job<TaskJobData>): Promise<Record<string, unknown>> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const action = typeof payload.action === 'string' ? payload.action : 'unknown'

  await reportTaskProgress(job, 10, { stage: 'llm_proxy_submit', action })

  // TODO: 实现通用 LLM 代理逻辑
  // 1. 根据 action 选择提示词
  // 2. 调用 AI 客户端
  // 3. 解析响应
  // 4. 保存结果

  await reportTaskProgress(job, 90, { stage: 'llm_proxy_complete', action })

  return {
    action,
    status: 'completed',
  }
}

// ===== 主处理函数 =====

/**
 * 处理 LLM 任务
 */
async function processLLMTask(job: Job<TaskJobData>): Promise<Record<string, unknown> | void> {
  await reportTaskProgress(job, 5, { stage: 'received' })

  await assertTaskActive(job, 'llm_task_dispatch')

  switch (job.data.type) {
    case TASK_TYPE.ANALYZE_NOVEL:
      return await handleAnalyzeNovelTask(job)

    case TASK_TYPE.STORY_TO_SCRIPT_RUN:
      return await handleStoryToScriptTask(job)

    case TASK_TYPE.SCRIPT_TO_STORYBOARD_RUN:
      return await handleScriptToStoryboardTask(job)

    case TASK_TYPE.CLIPS_BUILD:
      return await handleClipsBuildTask(job)

    case TASK_TYPE.SCREENPLAY_CONVERT:
      return await handleScreenplayConvertTask(job)

    case TASK_TYPE.VOICE_ANALYZE:
      return await handleVoiceAnalyzeTask(job)

    case TASK_TYPE.ANALYZE_GLOBAL:
      return await handleAnalyzeGlobalTask(job)

    // AI 修改任务
    case TASK_TYPE.AI_MODIFY_APPEARANCE:
    case TASK_TYPE.AI_MODIFY_LOCATION:
    case TASK_TYPE.AI_MODIFY_SHOT_PROMPT:
    case TASK_TYPE.ANALYZE_SHOT_VARIANTS:
      return await handleLLMProxyTask(job)

    // AI 创建任务
    case TASK_TYPE.AI_CREATE_CHARACTER:
    case TASK_TYPE.AI_CREATE_LOCATION:
      return await handleLLMProxyTask(job)

    // 角色相关任务
    case TASK_TYPE.REFERENCE_TO_CHARACTER:
    case TASK_TYPE.CHARACTER_PROFILE_CONFIRM:
    case TASK_TYPE.CHARACTER_PROFILE_BATCH_CONFIRM:
      return await handleLLMProxyTask(job)

    // 分集任务
    case TASK_TYPE.EPISODE_SPLIT_LLM:
      return await handleLLMProxyTask(job)

    // 资产中心 AI 设计任务
    case TASK_TYPE.ASSET_HUB_AI_DESIGN_CHARACTER:
    case TASK_TYPE.ASSET_HUB_AI_DESIGN_LOCATION:
    case TASK_TYPE.ASSET_HUB_AI_MODIFY_CHARACTER:
    case TASK_TYPE.ASSET_HUB_AI_MODIFY_LOCATION:
    case TASK_TYPE.ASSET_HUB_REFERENCE_TO_CHARACTER:
      return await handleLLMProxyTask(job)

    // 分镜相关任务
    case TASK_TYPE.REGENERATE_STORYBOARD_TEXT:
    case TASK_TYPE.INSERT_PANEL:
      return await handleLLMProxyTask(job)

    default:
      throw new Error(`Unsupported LLM task type: ${job.data.type}`)
  }
}

// ===== Worker 创建函数 =====

/**
 * LLM 任务处理函数（供 workers/index.ts 使用）
 */
export async function handleLlmTask(job: Job<TaskJobData>): Promise<Record<string, unknown> | void> {
  return await processLLMTask(job)
}

/**
 * 创建 LLM Worker 实例
 */
export function createLLMWorker(): Worker<TaskJobData> {
  const config = getProcessorConfig('llm')

  const worker = new Worker<TaskJobData>(
    QUEUE_NAME.LLM,
    async (job) => await withTaskLifecycle(job, processLLMTask),
    {
      connection: queueRedis,
      concurrency: config.concurrency,
      limiter: config.limiter,
    },
  )

  console.log(`[LLM Worker] Created with concurrency: ${config.concurrency}`)

  return worker
}
