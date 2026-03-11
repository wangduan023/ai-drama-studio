/**
 * AI Client - 类型定义统一导出
 *
 * @packageDocumentation
 */

// ============================================================
// 基础类型（从原 types.ts 重新导出）
// ============================================================

export type {
  // 基础类型
  AIProvider as AIProviderType,
  AIModelConfig,
  GenerateOptions,

  // 文本生成类型
  ChatMessageRole,
  MessageContent,
  ChatMessage,
  TextGenerateParams,
  TokenUsage,
  TextGenerateResult,

  // 图像生成类型
  ImageGenerateParams,
  ImageGenerateResult,

  // 视频生成类型
  VideoGenerateParams,
  VideoGenerateResult,

  // 语音生成类型
  AudioGenerateParams,
  AudioGenerateResult,

  // 响应类型
  AIResponse,

  // 错误类型
  AIError,
  AIRuntimeErrorCode,

  // 流式输出类型
  StreamEvent,
  StreamCallback,
  StreamController,

  // 重试配置
  RetryConfig,
} from '../types'

export {
  DEFAULT_RETRY_CONFIG,
} from '../types'

// ============================================================
// 增强类型（新增的统一接口）
// ============================================================

export type {
  // 统一 AI 服务接口
  AIProvider,
  TextGenerationOptions,
  TextGenerationResult as EnhancedTextGenerationResult,
  ImageGenerationOptions,
  ImageGenerationResult as EnhancedImageGenerationResult,
  VideoGenerationOptions,
  VideoGenerationResult as EnhancedVideoGenerationResult,

  // 配置类型
  ProviderConfig,
  ModelConfig,

  // 健康状态
  ProviderHealthStatus,
  HealthStatus,

  // 成本计算
  CostCalculation,
  CostCalculator,

  // 速率限制
  RateLimitStatus,
  RateLimiter,
} from './enhanced'
