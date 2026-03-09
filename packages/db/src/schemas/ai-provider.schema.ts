/**
 * AI Provider & Model Schemas
 * 用于验证 AI 渠道配置的 Zod schemas
 */
import { z } from 'zod'

// ============================================
// AI Provider Schemas
// ============================================

/**
 * 支持的 AI 渠道商
 */
export const AiProviderNameSchema = z.enum([
  'openai',
  'anthropic',
  'google',
  'doubao',
  'deepseek',
  'qwen',
  'ollama',
  'comfyui',
  'kling',
  'vidu',
  'baidu',
  'tencent',
  'zhipu',
  'iflytek',
  'moonshot',
  'minimax',
  'lingyi',
])

/**
 * AI 渠道商元数据 Schema
 */
export const AiProviderMetadataSchema = z.object({
  // API 版本
  apiVersion: z.string().optional(),

  // 特性标记
  features: z.object({
    streaming: z.boolean().optional(),
    batchSupport: z.boolean().optional(),
    visionInput: z.boolean().optional(),
    functionCalling: z.boolean().optional(),
  }).optional(),

  // 速率限制详情
  rateLimitDetails: z.object({
    requestsPerMinute: z.number().optional(),
    tokensPerMinute: z.number().optional(),
    imagesPerMinute: z.number().optional(),
    videosPerMinute: z.number().optional(),
  }).optional(),

  // 区域信息
  regions: z.array(z.string()).optional(),

  // 文档链接
  documentationUrl: z.string().url().optional(),
})

/**
 * 创建 AI 渠道商 Schema
 */
export const CreateAiProviderSchema = z.object({
  name: AiProviderNameSchema,
  baseUrl: z.string().url('必须是有效的 URL'),
  apiKey: z.string().min(1, 'API Key 不能为空'),
  isActive: z.boolean().default(true),
  priority: z.number().int().default(0),
  weight: z.number().int().positive().default(1),
  rateLimit: z.number().int().positive().optional(),
  quotaDaily: z.number().int().positive().optional(),
  metadata: AiProviderMetadataSchema.optional(),
  description: z.string().max(500).optional(),
})

/**
 * 更新 AI 渠道商 Schema
 */
export const UpdateAiProviderSchema = CreateAiProviderSchema.partial()

// ============================================
// AI Model Schemas
// ============================================

/**
 * AI 模型类型
 */
export const AiModelTypeSchema = z.enum(['TEXT', 'IMAGE', 'VIDEO', 'VOICE', 'EMBEDDING'])

/**
 * AI 模型元数据 Schema
 */
export const AiModelMetadataSchema = z.object({
  // 支持的参数
  supportedParams: z.array(z.string()).optional(),

  // 模型能力
  capabilities: z.object({
    textGeneration: z.boolean().optional(),
    imageGeneration: z.boolean().optional(),
    videoGeneration: z.boolean().optional(),
    voiceGeneration: z.boolean().optional(),
    functionCalling: z.boolean().optional(),
    visionInput: z.boolean().optional(),
    jsonOutput: z.boolean().optional(),
  }).optional(),

  // 版本信息
  version: z.string().optional(),
  releaseDate: z.string().optional(),
  deprecationDate: z.string().optional(),

  // 训练数据截止
  trainingCutoff: z.string().optional(),

  // 上下文窗口详情
  contextWindowDetails: z.object({
    inputTokens: z.number().optional(),
    outputTokens: z.number().optional(),
  }).optional(),
})

/**
 * 创建 AI 模型 Schema
 */
export const CreateAiModelSchema = z.object({
  providerId: z.string().uuid(),
  modelId: z.string().min(1, '模型 ID 不能为空'),
  name: z.string().min(1, '模型名称不能为空'),
  type: AiModelTypeSchema,
  isEnabled: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  maxTokens: z.number().int().positive().optional(),
  contextWindow: z.number().int().positive().optional(),
  inputCost: z.number().nonnegative().optional(),
  outputCost: z.number().nonnegative().optional(),
  imageCost: z.number().nonnegative().optional(),
  videoCost: z.number().nonnegative().optional(),
  currency: z.string().default('USD'),
  rateLimit: z.number().int().positive().optional(),
  rpm: z.number().int().positive().optional(),
  tpm: z.number().int().positive().optional(),
  metadata: AiModelMetadataSchema.optional(),
  description: z.string().max(500).optional(),
})

/**
 * 更新 AI 模型 Schema
 */
export const UpdateAiModelSchema = CreateAiModelSchema.partial()

// ============================================
// AI Usage Log Schemas
// ============================================

/**
 * AI 使用状态
 */
export const AiUsageStatusSchema = z.enum(['SUCCESS', 'FAILED', 'RATE_LIMITED', 'TIMEOUT', 'CANCELLED'])

/**
 * 创建 AI 使用记录 Schema
 */
export const CreateAiUsageLogSchema = z.object({
  providerId: z.string().uuid(),
  modelId: z.string().optional(),
  action: z.string().min(1, '操作不能为空'),
  requestId: z.string().optional(),
  externalId: z.string().optional(),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  imageCount: z.number().int().nonnegative().optional(),
  videoCount: z.number().int().nonnegative().optional(),
  duration: z.number().positive().optional(),
  cost: z.number().nonnegative(),
  currency: z.string().default('USD'),
  status: AiUsageStatusSchema.default('SUCCESS'),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  projectId: z.string().uuid().optional(),
  episodeId: z.string().uuid().optional(),
  taskId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  latency: z.number().int().positive().optional(),
})

// ============================================
// Type helpers
// ============================================

export type AiProviderName = z.infer<typeof AiProviderNameSchema>
export type AiProviderMetadata = z.infer<typeof AiProviderMetadataSchema>
export type CreateAiProviderInput = z.infer<typeof CreateAiProviderSchema>
export type UpdateAiProviderInput = z.infer<typeof UpdateAiProviderSchema>

export type AiModelType = z.infer<typeof AiModelTypeSchema>
export type AiModelMetadata = z.infer<typeof AiModelMetadataSchema>
export type CreateAiModelInput = z.infer<typeof CreateAiModelSchema>
export type UpdateAiModelInput = z.infer<typeof UpdateAiModelSchema>

export type AiUsageStatus = z.infer<typeof AiUsageStatusSchema>
export type CreateAiUsageLogInput = z.infer<typeof CreateAiUsageLogSchema>
