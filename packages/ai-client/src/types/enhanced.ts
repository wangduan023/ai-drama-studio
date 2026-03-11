/**
 * AI Client - 增强类型定义
 *
 * 提供统一的 AI 服务接口，支持从数据库动态配置
 */

import type {
  TextGenerateParams,
  TextGenerateResult,
  ImageGenerateParams,
  ImageGenerateResult,
  VideoGenerateParams,
  VideoGenerateResult,
  AIError,
  TokenUsage,
} from '../types'

// ============================================================
// 统一 AI 服务接口
// ============================================================

/**
 * 统一的 AI 提供商接口
 * 所有 AI 提供商客户端都需要实现此接口
 */
export interface AIProvider {
  /** 提供商名称 */
  name: string

  /**
   * 生成文本
   * @param options - 文本生成选项
   * @returns 文本生成结果（包含成本和用量）
   */
  generateText(options: TextGenerationOptions): Promise<TextGenerationResult>

  /**
   * 生成图像
   * @param options - 图像生成选项
   * @returns 图像生成结果（包含成本）
   */
  generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult>

  /**
   * 生成视频（可选）
   * @param options - 视频生成选项
   * @returns 视频生成结果（包含成本）
   */
  generateVideo?(options: VideoGenerationOptions): Promise<VideoGenerationResult>

  /**
   * 获取提供商状态
   * @returns 提供商健康状态
   */
  getHealth?(): ProviderHealthStatus
}

// ============================================================
// 文本生成选项和结果
// ============================================================

/**
 * 文本生成选项
 */
export interface TextGenerationOptions {
  /** 模型 ID */
  model: string
  /** 用户提示词 */
  prompt: string
  /** 系统提示词（可选） */
  systemPrompt?: string
  /** 温度参数（可选） */
  temperature?: number
  /** 最大 Token 数（可选） */
  maxTokens?: number
  /** Top P（可选） */
  topP?: number
  /** 停止序列（可选） */
  stopSequences?: string[]
  /** 是否流式输出（可选） */
  stream?: boolean
}

/**
 * 扩展的 Token 用量统计
 */
export interface ExtendedTokenUsage extends TokenUsage {
  /** 输入 Token 数（别名，兼容标准接口） */
  inputTokens: number
  /** 输出 Token 数（别名，兼容标准接口） */
  outputTokens: number
}

/**
 * 文本生成结果
 */
export interface TextGenerationResult {
  /** 生成的文本内容 */
  content: string
  /** 推理过程（如有） */
  reasoning?: string
  /** Token 使用统计 */
  usage: {
    inputTokens: number
    outputTokens: number
  }
  /** 成本（USD） */
  cost: number
  /** 原始响应（调试用） */
  rawResponse?: unknown
  /** 请求 ID */
  requestId?: string
}

// ============================================================
// 图像生成选项和结果
// ============================================================

/**
 * 图像生成选项
 */
export interface ImageGenerationOptions {
  /** 模型 ID */
  model: string
  /** 提示词 */
  prompt: string
  /** 负向提示词（可选） */
  negativePrompt?: string
  /** 参考图片 URLs（可选） */
  referenceImages?: string[]
  /** 宽高比（可选） */
  aspectRatio?: string
  /** 分辨率（可选） */
  resolution?: string
  /** 输出格式（可选） */
  outputFormat?: 'url' | 'base64'
  /** 生成数量（可选） */
  n?: number
  /** 用户 ID（用于追踪） */
  userId?: string
}

/**
 * 图像生成结果
 */
export interface ImageGenerationResult {
  /** 是否成功 */
  success: boolean
  /** 图片 URL */
  imageUrl?: string
  /** 图片 Base64 */
  imageBase64?: string
  /** 成本（USD） */
  cost: number
  /** 错误信息 */
  error?: string
  /** 请求 ID */
  requestId?: string
  /** 是否为异步任务 */
  async?: boolean
  /** 异步任务端点 */
  endpoint?: string
}

// ============================================================
// 视频生成选项和结果
// ============================================================

/**
 * 视频生成选项
 */
export interface VideoGenerationOptions {
  /** 模型 ID */
  model: string
  /** 起始图片 URL */
  imageUrl: string
  /** 提示词（可选） */
  prompt?: string
  /** 时长（秒，可选） */
  duration?: number
  /** 帧率（可选） */
  fps?: number
  /** 分辨率（可选） */
  resolution?: string
  /** 宽高比（可选） */
  aspectRatio?: string
  /** 是否生成音频（可选） */
  generateAudio?: boolean
  /** 尾帧图片 URL（首尾帧模式，可选） */
  lastFrameImageUrl?: string
  /** 用户 ID（用于追踪） */
  userId?: string
}

/**
 * 视频生成结果
 */
export interface VideoGenerationResult {
  /** 是否成功 */
  success: boolean
  /** 视频 URL */
  videoUrl?: string
  /** 音频 URL */
  audioUrl?: string
  /** 成本（USD） */
  cost: number
  /** 错误信息 */
  error?: string
  /** 请求 ID */
  requestId?: string
  /** 是否为异步任务 */
  async?: boolean
  /** 异步任务端点 */
  endpoint?: string
}

// ============================================================
// 提供商配置和健康状态
// ============================================================

/**
 * 提供商配置（从数据库读取）
 */
export interface ProviderConfig {
  /** 提供商 ID */
  id: string
  /** 提供商名称 */
  name: string
  /** API 基础地址 */
  baseUrl: string
  /** API Key（已解密） */
  apiKey?: string
  /** 是否启用 */
  isActive: boolean
  /** 优先级（数字越小优先级越高） */
  priority: number
  /** 权重（用于负载均衡） */
  weight: number
  /** 速率限制（每分钟请求数） */
  rateLimit?: number
  /** 每日配额 */
  quotaDaily?: number
  /** 元数据 */
  metadata?: Record<string, unknown>
  /** 描述 */
  description?: string
  /** 关联的模型列表 */
  models: ModelConfig[]
}

/**
 * 模型配置（从数据库读取）
 */
export interface ModelConfig {
  /** 模型 ID */
  id: string
  /** 模型标识 */
  modelId: string
  /** 显示名称 */
  name: string
  /** 模型类型 */
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'VOICE' | 'EMBEDDING'
  /** 是否启用 */
  isEnabled: boolean
  /** 是否为默认模型 */
  isDefault: boolean
  /** 最大 Token 数 */
  maxTokens?: number
  /** 上下文窗口大小 */
  contextWindow?: number
  /** 输入成本（每 1000 tokens） */
  inputCost?: number
  /** 输出成本（每 1000 tokens） */
  outputCost?: number
  /** 图像成本（每次调用） */
  imageCost?: number
  /** 视频成本（每次调用） */
  videoCost?: number
  /** 货币单位 */
  currency: string
  /** 速率限制 */
  rateLimit?: number
  /** 每分钟请求数 */
  rpm?: number
  /** 每分钟 Token 数 */
  tpm?: number
  /** 元数据 */
  metadata?: Record<string, unknown>
}

/**
 * 提供商健康状态
 */
export interface ProviderHealthStatus {
  /** 提供商名称 */
  name: string
  /** 是否健康 */
  isHealthy: boolean
  /** 当前负载（正在处理的请求数） */
  currentLoad: number
  /** 连续失败次数 */
  consecutiveFailures: number
  /** 最后检查时间 */
  lastChecked: Date
  /** 平均响应时间（毫秒） */
  avgLatency?: number
  /** 错误率（0-1） */
  errorRate?: number
}

/**
 * 整体健康状态
 */
export interface HealthStatus {
  /** 所有提供商的健康状态 */
  providers: ProviderHealthStatus[]
  /** 健康提供商数量 */
  healthyCount: number
  /** 总提供商数量 */
  totalCount: number
  /** 检查时间 */
  checkedAt: Date
}

// ============================================================
// 成本计算相关
// ============================================================

/**
 * 成本计算结果
 */
export interface CostCalculation {
  /** 输入成本 */
  inputCost: number
  /** 输出成本 */
  outputCost: number
  /** 总成本 */
  totalCost: number
  /** 货币单位 */
  currency: string
}

/**
 * 成本计算器接口
 */
export interface CostCalculator {
  /**
   * 计算文本生成成本
   * @param modelConfig - 模型配置
   * @param usage - Token 使用统计
   * @returns 成本计算结果
   */
  calculateTextCost(
    modelConfig: ModelConfig,
    usage: { inputTokens: number; outputTokens: number }
  ): CostCalculation

  /**
   * 计算图像生成成本
   * @param modelConfig - 模型配置
   * @param imageCount - 图像数量
   * @returns 成本计算结果
   */
  calculateImageCost(
    modelConfig: ModelConfig,
    imageCount: number
  ): CostCalculation

  /**
   * 计算视频生成成本
   * @param modelConfig - 模型配置
   * @param videoCount - 视频数量
   * @returns 成本计算结果
   */
  calculateVideoCost(
    modelConfig: ModelConfig,
    videoCount: number
  ): CostCalculation
}

// ============================================================
// 速率限制相关
// ============================================================

/**
 * 速率限制状态
 */
export interface RateLimitStatus {
  /** 是否受限 */
  isLimited: boolean
  /** 剩余请求数 */
  remaining: number
  /** 重置时间 */
  resetAt?: Date
  /** 限制原因 */
  reason?: string
}

/**
 * 速率限制器接口
 */
export interface RateLimiter {
  /**
   * 检查是否允许请求
   * @param providerName - 提供商名称
   * @returns 速率限制状态
   */
  checkLimit(providerName: string): RateLimitStatus

  /**
   * 记录请求
   * @param providerName - 提供商名称
   */
  recordRequest(providerName: string): void

  /**
   * 记录失败
   * @param providerName - 提供商名称
   */
  recordFailure(providerName: string): void
}
