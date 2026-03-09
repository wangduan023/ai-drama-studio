/**
 * Zod Schemas for JSON field validation
 * 用于验证 Prisma JSON 字段的运行时类型
 */
import { z } from 'zod'

// ============================================
// Character Profile Schemas
// ============================================

/**
 * 角色外观形态 Schema
 */
export const CharacterAppearanceSchema = z.object({
  id: z.string().uuid(),
  change_reason: z.string(),
  descriptions: z.array(z.string()).optional(),
})

/**
 * 角色外观形态创建 Schema
 */
export const CreateCharacterAppearanceSchema = z.object({
  change_reason: z.string().min(1, '变化原因不能为空'),
  descriptions: z.array(z.string()).optional(),
})

/**
 * 角色预期外观 Schema
 */
export const ExpectedAppearanceSchema = z.object({
  id: z.string().uuid().optional(),
  change_reason: z.string(),
  descriptions: z.array(z.string()).min(1, '描述不能为空'),
  imageUrls: z.array(z.string().url()).optional(),
  previousImageUrls: z.array(z.string().url()).optional(),
})

/**
 * 角色档案 JSON 字段验证
 */
export const CharacterProfileJsonSchema = z.object({
  aliases: z.array(z.string()).optional(),
  personalityTags: z.array(z.string()).optional(),
  suggestedColors: z.array(z.string()).optional(),
  visualKeywords: z.array(z.string()).optional(),
  expectedAppearances: z.array(ExpectedAppearanceSchema).optional(),
})

// ============================================
// Location Profile Schemas
// ============================================

/**
 * 场景档案 JSON 字段验证
 */
export const LocationProfileJsonSchema = z.object({
  keyElements: z.array(z.string()).optional(),
})

// ============================================
// Episode Schemas
// ============================================

/**
 * 角色外观映射 Schema
 * 格式：{ characterId: appearanceId }
 */
export const CharacterAppearanceMapSchema = z.record(z.string(), z.string())

/**
 * 剧本内容 Schema
 */
export const ScriptContentSchema = z.object({
  scenes: z.array(z.object({
    number: z.number(),
    location: z.string(),
    description: z.string(),
    characters: z.array(z.string()),
    dialogue: z.array(z.object({
      character: z.string(),
      content: z.string(),
    })).optional(),
    action: z.string().optional(),
  })),
})

// ============================================
// Asset Metadata Schema
// ============================================

/**
 * 资产元数据 Schema
 */
export const AssetMetadataSchema = z.object({
  // 生成信息
  provider: z.string().optional(),
  model: z.string().optional(),
  prompt: z.string().optional(),
  negativePrompt: z.string().optional(),

  // 生成参数
  seed: z.number().optional(),
  steps: z.number().optional(),
  guidance: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),

  // 成本信息
  cost: z.number().optional(),
  currency: z.string().optional(),

  // 其他
  extra: z.record(z.unknown()).optional(),
})

// ============================================
// Task Payload Schema
// ============================================

/**
 * 任务负载基础 Schema
 */
export const TaskPayloadBaseSchema = z.object({
  prompt: z.string().optional(),
  modelId: z.string().optional(),
  providerId: z.string().optional(),
  params: z.record(z.unknown()).optional(),
})

/**
 * 文本生成任务 Payload
 */
export const TextGenerationPayloadSchema = TaskPayloadBaseSchema.extend({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })),
  maxTokens: z.number().optional(),
  temperature: z.number().min(0).max(2).optional(),
})

/**
 * 图像生成任务 Payload
 */
export const ImageGenerationPayloadSchema = TaskPayloadBaseSchema.extend({
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).optional(),
  resolution: z.enum(['512x512', '1024x1024', '1920x1080']).optional(),
  n: z.number().min(1).max(10).optional(),
})

/**
 * 视频生成任务 Payload
 */
export const VideoGenerationPayloadSchema = TaskPayloadBaseSchema.extend({
  imageUrl: z.string().url().optional(),
  duration: z.number().min(1).max(60).optional(),
  resolution: z.enum(['720p', '1080p']).optional(),
})

/**
 * 任务 Payload Union Schema
 */
export const TaskPayloadSchema = z.union([
  TextGenerationPayloadSchema,
  ImageGenerationPayloadSchema,
  VideoGenerationPayloadSchema,
  TaskPayloadBaseSchema,
])

// ============================================
// Type helpers
// ============================================

export type CharacterAppearance = z.infer<typeof CharacterAppearanceSchema>
export type ExpectedAppearance = z.infer<typeof ExpectedAppearanceSchema>
export type CharacterAppearanceMap = z.infer<typeof CharacterAppearanceMapSchema>
export type ScriptContent = z.infer<typeof ScriptContentSchema>
export type AssetMetadata = z.infer<typeof AssetMetadataSchema>
export type TaskPayload = z.infer<typeof TaskPayloadSchema>
