/**
 * Pipeline 工作流引擎类型定义
 */

import type { Locale } from '@ai-drama-studio/prompt-system'

/**
 * 阶段类型枚举
 */
export type StageType =
  | 'rewrite'          // 文案改写
  | 'storyboard'       // 分镜生成
  | 'image'            // 图片生成
  | 'video'            // 视频生成

/**
 * 阶段状态
 */
export type StageStatus =
  | 'pending'      // 等待执行
  | 'running'      // 执行中
  | 'completed'    // 完成
  | 'failed'       // 失败
  | 'retrying'     // 重试中
  | 'skipped'      // 已跳过
  | 'cancelled'    // 已取消

/**
 * 角色外观映射
 */
export interface CharacterAppearanceMap {
  /** 角色 ID */
  characterId: string
  /** 角色名 */
  name: string
  /** 当前外观形态 ID */
  appearanceId?: string | null
  /** 外观变更原因 */
  changeReason?: string | null
  /** 外观描述 */
  description?: string | null
  /** 外观描述数组 */
  descriptions?: string[] | null
  /** 形象图片 URL */
  imageUrl?: string | null
}

/**
 * 场景信息
 */
export interface LocationInfo {
  /** 场景 ID */
  locationId: string
  /** 场景名 */
  name: string
  /** 场景描述 */
  description?: string | null
  /** 场景类型 */
  locationType?: string | null
  /** 场景图片 URL */
  imageUrl?: string | null
}

/**
 * 分镜面板数据
 */
export interface StoryboardPanel {
  /** 分镜编号 */
  panelNumber: number
  /** 画面描述 */
  description: string
  /** 场景位置 */
  location: string
  /** 原文内容 */
  sourceText?: string | null
  /** 出场角色 */
  characters?: string[] | null
  /** 镜头类型 */
  shotType?: string | null
  /** 运镜方式 */
  cameraMove?: string | null
  /** 摄影方案 */
  photographyPlan?: PhotographyPlan | null
  /** 演技指导 */
  actingNotes?: unknown | null
  /** 图片生成提示词 */
  imagePrompt?: string | null
  /** 视频生成提示词 */
  videoPrompt?: string | null
  /** 时长 (秒) */
  duration?: number | null
}

/**
 * 摄影方案
 */
export interface PhotographyPlan {
  /** 构图 */
  composition?: string | null
  /** 灯光 */
  lighting?: string | null
  /** 色调 */
  colorPalette?: string | null
  /** 氛围 */
  atmosphere?: string | null
  /** 技术备注 */
  technicalNotes?: string | null
}

/**
 * 生成的图片
 */
export interface GeneratedImage {
  /** 图片 ID */
  id: string
  /** 图片 URL */
  url: string
  /** 生成提示词 */
  prompt: string
  /** 模型名称 */
  modelName: string
  /** 生成参数 */
  params?: Record<string, unknown> | null
}

/**
 * 生成的视频
 */
export interface GeneratedVideo {
  /** 视频 ID */
  id: string
  /** 视频 URL */
  url: string
  /** 封面图片 URL */
  thumbnailUrl?: string | null
  /** 时长 (秒) */
  duration: number
  /** 宽度 */
  width: number
  /** 高度 */
  height: number
  /** 帧率 */
  fps: number
  /** 生成参数 */
  params?: Record<string, unknown> | null
}

/**
 * Pipeline 上下文 - 携带所有阶段共享数据
 */
export interface PipelineContext {
  /** 项目 ID */
  projectId: string
  /** 剧集 ID (可选) */
  episodeId?: string | null
  /** 用户 ID */
  userId: string
  /** 语言 */
  locale: Locale
  /** 任务 ID (用于追踪) */
  taskId?: string | null

  /** 原始输入内容 */
  input: {
    /** 小说/剧本原文 */
    content: string
    /** 基础角色列表 */
    baseCharacters?: string[] | null
    /** 基础场景列表 */
    baseLocations?: string[] | null
  }

  /** 角色上下文 */
  characters: {
    /** 角色档案列表 */
    profiles: Array<{
      id: string
      name: string
      introduction?: string | null
      gender?: string | null
      ageRange?: string | null
    }>
    /** 外观映射 (角色 ID -> 当前外观) */
    appearanceMap: Record<string, CharacterAppearanceMap>
  }

  /** 场景上下文 */
  locations: {
    /** 场景列表 */
    profiles: LocationInfo[]
  }

  /** 阶段输出数据 (按阶段类型存储) */
  stageData: Partial<Record<StageType, unknown>>

  /** 自定义扩展数据 */
  extensions: Record<string, unknown>
}

/**
 * 阶段执行结果
 */
export interface StageResult<T = unknown> {
  /** 阶段类型 */
  stageType: StageType
  /** 执行状态 */
  status: StageStatus
  /** 输出数据 */
  data?: T | null
  /** 错误信息 */
  error?: string | null
  /** 错误详情 */
  errorDetails?: Record<string, unknown> | null
  /** 重试次数 */
  retryCount: number
  /** 执行耗时 (毫秒) */
  durationMs: number
  /** AI 调用日志 (用于追踪) */
  aiLogs?: Array<{
    action: string
    model?: string | null
    input?: unknown
    output?: unknown
  }> | null
}

/**
 * Pipeline 错误
 */
export class PipelineError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly stageType?: StageType,
    public readonly cause?: unknown,
    public readonly retryable: boolean = true
  ) {
    super(message)
    this.name = 'PipelineError'
  }
}

/**
 * 阶段配置
 */
export interface StageConfig {
  /** 最大重试次数 */
  maxRetries: number
  /** 超时时间 (毫秒) */
  timeoutMs: number
  /** 是否可跳过 */
  skippable: boolean
  /** 失败后是否终止 Pipeline */
  failPipeline: boolean
}

/**
 * 阶段执行选项
 */
export interface StageExecuteOptions {
  /** 当前重试次数 */
  attempt: number
  /** 信号量 (用于取消) */
  signal?: AbortSignal | null
  /** 进度回调 */
  onProgress?: (progress: number, message: string) => void
}

/**
 * Pipeline 执行选项
 */
export interface PipelineExecuteOptions {
  /** 信号量 */
  signal?: AbortSignal | null
  /** 进度回调 */
  onProgress?: (stageType: StageType, progress: number, message: string) => void
  /** 阶段完成回调 */
  onStageComplete?: (stageType: StageType, result: StageResult) => void
}

/**
 * Pipeline 执行结果
 */
export interface PipelineResult {
  /** 执行状态 */
  status: 'completed' | 'failed' | 'cancelled' | 'partial'
  /** 各阶段结果 */
  stageResults: Record<StageType, StageResult | undefined>
  /** 最终输出数据 */
  output: {
    /** 改写后的文案 */
    rewrittenContent?: string | null
    /** 分镜列表 */
    storyboards?: StoryboardPanel[] | null
    /** 生成的图片 */
    images?: GeneratedImage[] | null
    /** 生成的视频 */
    videos?: GeneratedVideo[] | null
  }
  /** 执行耗时 (毫秒) */
  durationMs: number
  /** 错误信息 */
  error?: string | null
}

/**
 * AI 执行器输入
 */
export interface AiExecuteInput {
  /** 用户 ID */
  userId: string
  /** 模型名称 */
  model: string
  /** 消息列表 */
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  /** 是否启用推理模式 */
  reasoning?: boolean
  /** 项目 ID */
  projectId: string
  /** 动作标识 */
  action: string
  /** 元数据 */
  meta?: Record<string, unknown>
}

/**
 * AI 执行器输出
 */
export interface AiExecuteOutput {
  /** 生成文本 */
  text: string
  /** 推理内容 */
  reasoning?: string | null
}

/**
 * AI 执行器函数类型
 */
export type AiExecutor = (input: AiExecuteInput) => Promise<AiExecuteOutput>
