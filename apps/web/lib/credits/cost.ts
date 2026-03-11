/**
 * AI 操作成本计算模块
 * 计算不同 AI 操作消耗的积分
 */

import { prisma } from '@/lib/db'

/**
 * 成本配置
 * 基础积分成本配置（每单位）
 */
export const COST_CONFIG = {
  // 文本生成（每 1000 tokens）
  script: {
    baseCost: 1,           // 基础成本
    tokenMultiplier: 0.1,  // 每 1000 tokens 的成本
  },
  
  // 图片生成（每张）
  image: {
    low: 2,      // 低分辨率
    medium: 4,   // 中等分辨率
    high: 8,     // 高分辨率
    ultra: 16,   // 超高分辨率
  },
  
  // 视频生成（每秒）
  video: {
    sd: 5,       // 标清 (480p)
    hd: 10,      // 高清 (720p)
    fhd: 20,     // 全高清 (1080p)
    '4k': 50,    // 4K
  },
  
  // 语音合成（每 100 字符）
  audio: {
    baseCost: 0.5,         // 基础成本
    charMultiplier: 0.1,   // 每 100 字符的成本
  },
  
  // 分析类任务（固定成本）
  analysis: {
    novelAnalyze: 5,
    characterProfile: 3,
    locationAnalyze: 3,
  },
}

/**
 * 分辨率映射
 */
const RESOLUTION_MAP: Record<string, keyof typeof COST_CONFIG.image> = {
  '256x256': 'low',
  '512x512': 'medium',
  '1024x1024': 'high',
  '2048x2048': 'ultra',
  'low': 'low',
  'medium': 'medium',
  'high': 'high',
  'ultra': 'ultra',
}

/**
 * 视频分辨率映射
 */
const VIDEO_RESOLUTION_MAP: Record<string, keyof typeof COST_CONFIG.video> = {
  '480p': 'sd',
  '720p': 'hd',
  '1080p': 'fhd',
  '4k': '4k',
  'sd': 'sd',
  'hd': 'hd',
  'fhd': 'fhd',
}

/**
 * 计算剧本生成成本
 * @param tokens - token 数量
 * @returns 积分成本
 */
export function calculateScriptCost(tokens: number): number {
  const { baseCost, tokenMultiplier } = COST_CONFIG.script
  const tokenCost = Math.ceil(tokens / 1000) * tokenMultiplier
  return Math.max(baseCost, Math.ceil(baseCost + tokenCost))
}

/**
 * 计算图片生成成本
 * @param resolution - 分辨率（支持多种格式）
 * @returns 积分成本
 */
export function calculateImageCost(resolution: string): number {
  const mappedResolution = RESOLUTION_MAP[resolution] || 'medium'
  return COST_CONFIG.image[mappedResolution]
}

/**
 * 计算视频生成成本
 * @param duration - 视频时长（秒）
 * @param resolution - 分辨率
 * @returns 积分成本
 */
export function calculateVideoCost(duration: number, resolution: string): number {
  const mappedResolution = VIDEO_RESOLUTION_MAP[resolution] || 'hd'
  const costPerSecond = COST_CONFIG.video[mappedResolution]
  return Math.ceil(duration * costPerSecond)
}

/**
 * 计算语音合成成本
 * @param characters - 字符数量
 * @returns 积分成本
 */
export function calculateAudioCost(characters: number): number {
  const { baseCost, charMultiplier } = COST_CONFIG.audio
  const charCost = Math.ceil(characters / 100) * charMultiplier
  return Math.max(baseCost, Math.ceil(baseCost + charCost))
}

/**
 * 计算小说分析成本
 * @returns 积分成本
 */
export function calculateNovelAnalyzeCost(): number {
  return COST_CONFIG.analysis.novelAnalyze
}

/**
 * 计算角色档案成本
 * @returns 积分成本
 */
export function calculateCharacterProfileCost(): number {
  return COST_CONFIG.analysis.characterProfile
}

/**
 * 计算场景分析成本
 * @returns 积分成本
 */
export function calculateLocationAnalyzeCost(): number {
  return COST_CONFIG.analysis.locationAnalyze
}

/**
 * 从 AiModel 配置读取成本
 * @param modelId - 模型ID
 * @returns 输入和输出成本
 */
export async function getModelCost(modelId: string): Promise<{
  inputCost: number
  outputCost: number
  imageCost?: number
  videoCost?: number
}> {
  const model = await prisma.aiModel.findFirst({
    where: { modelId },
  })

  if (!model) {
    // 返回默认成本
    return {
      inputCost: 0.01,
      outputCost: 0.02,
    }
  }

  return {
    inputCost: model.inputCost || 0.01,
    outputCost: model.outputCost || 0.02,
    imageCost: model.imageCost || undefined,
    videoCost: model.videoCost || undefined,
  }
}

/**
 * 根据任务类型计算成本
 * @param taskType - 任务类型
 * @param params - 任务参数
 * @returns 积分成本
 */
export function calculateTaskCost(
  taskType: string,
  params?: {
    tokens?: number
    resolution?: string
    duration?: number
    characters?: number
    count?: number
  }
): number {
  const count = params?.count || 1

  switch (taskType) {
    // 剧本相关
    case 'SCRIPT_GENERATE':
    case 'SCRIPT_EDIT':
    case 'SCRIPT_MODIFY':
    case 'SCRIPT_REGENERATE':
      return calculateScriptCost(params?.tokens || 1000) * count

    // 分镜相关
    case 'STORYBOARD_GENERATE':
    case 'STORYBOARD_EDIT':
    case 'STORYBOARD_REGENERATE':
      return calculateImageCost(params?.resolution || 'medium') * count

    // 图片生成
    case 'IMAGE_GENERATE':
    case 'IMAGE_REGENERATE':
    case 'CHARACTER_VISUAL_GENERATE':
    case 'CHARACTER_VISUAL_REGENERATE':
    case 'LOCATION_VISUAL_GENERATE':
    case 'LOCATION_VISUAL_REGENERATE':
      return calculateImageCost(params?.resolution || 'medium') * count

    // 视频生成
    case 'VIDEO_GENERATE':
    case 'VIDEO_REGENERATE':
      return calculateVideoCost(params?.duration || 5, params?.resolution || 'hd') * count

    // 语音生成
    case 'VOICE_GENERATE':
    case 'VOICE_REGENERATE':
      return calculateAudioCost(params?.characters || 100) * count

    // 分析类任务
    case 'NOVEL_ANALYZE':
      return calculateNovelAnalyzeCost()

    case 'CHARACTER_PROFILE_ANALYZE':
      return calculateCharacterProfileCost()

    case 'LOCATION_ANALYZE':
      return calculateLocationAnalyzeCost()

    // 默认成本
    default:
      return 1
  }
}

/**
 * 成本估算结果
 */
export interface CostEstimate {
  taskType: string
  cost: number
  description: string
  params?: Record<string, unknown>
}

/**
 * 批量计算任务成本
 * @param tasks - 任务列表
 * @returns 成本估算列表
 */
export function estimateTaskCosts(tasks: Array<{
  type: string
  params?: Parameters<typeof calculateTaskCost>[1]
}>): CostEstimate[] {
  return tasks.map(task => ({
    taskType: task.type,
    cost: calculateTaskCost(task.type, task.params),
    description: getTaskCostDescription(task.type, task.params),
    params: task.params,
  }))
}

/**
 * 获取任务成本描述
 * @param taskType - 任务类型
 * @param params - 任务参数
 * @returns 描述文本
 */
function getTaskCostDescription(taskType: string, params?: Parameters<typeof calculateTaskCost>[1]): string {
  switch (taskType) {
    case 'SCRIPT_GENERATE':
      return `剧本生成 (${params?.tokens || 1000} tokens)`
    case 'STORYBOARD_GENERATE':
      return `分镜生成 (${params?.count || 1} 张)`
    case 'IMAGE_GENERATE':
      return `图片生成 (${params?.resolution || 'medium'} 分辨率)`
    case 'VIDEO_GENERATE':
      return `视频生成 (${params?.duration || 5}秒 ${params?.resolution || 'hd'})`
    case 'VOICE_GENERATE':
      return `语音合成 (${params?.characters || 100} 字符)`
    case 'NOVEL_ANALYZE':
      return '小说分析'
    default:
      return taskType
  }
}

/**
 * 计算总成本
 * @param estimates - 成本估算列表
 * @returns 总成本
 */
export function calculateTotalCost(estimates: CostEstimate[]): number {
  return estimates.reduce((total, estimate) => total + estimate.cost, 0)
}
