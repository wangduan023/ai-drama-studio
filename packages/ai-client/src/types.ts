/**
 * AI Client - 类型定义
 *
 * 基于 waoowaoo 项目架构，提供统一的 AI 模型调用抽象层
 */

// ============================================================
// 通用类型
// ============================================================

/** AI 提供商 */
export type AIProvider =
  // 国际厂商
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'mistral'        // Mistral AI
  | 'cohere'         // Cohere
  | 'groq'           // Groq
  | 'stability'      // Stability AI
  | 'fal'            // Fal.ai
  | 'runway'         // Runway ML
  | 'elevenlabs'     // ElevenLabs
  | 'luma'           // Luma AI
  | 'huggingface'    // Hugging Face
  | 'openai-compatible'
  // 本地部署
  | 'ollama'
  | 'comfyui'
  // 国内厂商 - 文本/多模态
  | 'doubao'        // 字节豆包
  | 'deepseek'      // 深度求索
  | 'qwen'          // 阿里通义
  | 'baidu'         // 百度文心一言
  | 'tencent'       // 腾讯混元
  | 'iflytek'       // 科大讯飞星火
  | 'zhipu'         // 智谱 AI/GLM
  | 'moonshot'      // 月之暗面/Kimi
  | 'minimax'       // MiniMax/海螺 AI
  | 'lingyi'        // 零一万物/Yi
  | 'kling'         // 生数科技/可灵
  | 'stepfun'       // 阶跃星辰/跃问
  // 国内厂商 - 新增
  | 'baichuan'      // 百川智能
  | 'sensetime'     // 商汤科技
  // 图像生成专用
  | 'wanxiang'      // 阿里通义万相
  | 'hunyuan-image' // 腾讯混元图像
  | 'gewang'        // 百度文心一格

/** 代理配置 */
export interface ProxyConfig {
  /** 代理服务器地址 (如：http://proxy.example.com) */
  host: string
  /** 代理端口 */
  port: number
  /** 代理用户名 (可选) */
  username?: string
  /** 代理密码 (可选) */
  password?: string
}

/** 模型配置 */
export interface AIModelConfig {
  /** 提供商 */
  provider: AIProvider
  /** 模型 ID */
  modelId: string
  /** API Key */
  apiKey: string
  /** Base URL (可选，用于兼容自定义端点) */
  baseURL?: string
  /** 超时时间 (毫秒) */
  timeout?: number
  /** HTTP 代理配置 (用于国内访问国外 API) */
  proxy?: ProxyConfig
  /** 额外配置 */
  extra?: Record<string, unknown>
}

/** 通用生成选项 */
export interface GenerateOptions {
  /** 温度 */
  temperature?: number
  /** 最大输出 token 数 */
  maxTokens?: number
  /** Top P */
  topP?: number
  /** 频率惩罚 */
  frequencyPenalty?: number
  /** 存在惩罚 */
  presencePenalty?: number
  /** 停止序列 */
  stop?: string[]
  /** 流式输出 */
  stream?: boolean
  /** 随机种子 */
  seed?: number
  /** 其他厂商特定参数 */
  [key: string]: unknown
}

// ============================================================
// 文本生成类型
// ============================================================

/** 聊天消息角色 */
export type ChatMessageRole = 'system' | 'user' | 'assistant'

/** 聊天消息内容类型 */
export type MessageContent =
  | string
  | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>

/** 聊天消息 */
export interface ChatMessage {
  role: ChatMessageRole
  content: MessageContent
  name?: string
}

/** 文本生成参数 */
export interface TextGenerateParams extends GenerateOptions {
  /** 消息历史 */
  messages: ChatMessage[]
  /** 用户 ID */
  userId?: string
  /** 项目 ID */
  projectId?: string
  /** 操作类型 */
  action?: string
  /** 元数据 (用于流式输出追踪) */
  meta?: {
    stepId?: string
    stepAttempt?: number
    stepTitle?: string
    stepIndex?: number
    stepTotal?: number
  }
}

/** Token 使用统计 */
export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/** 文本生成结果 */
export interface TextGenerateResult {
  /** 生成的文本 */
  text: string
  /** 推理过程 (如有) */
  reasoning?: string
  /** Token 使用统计 */
  usage: TokenUsage
  /** 原始响应 */
  rawResponse?: unknown
  /** 请求 ID */
  requestId?: string
}

// ============================================================
// 图像生成类型
// ============================================================

/** 图像生成参数 */
export interface ImageGenerateParams extends GenerateOptions {
  /** 提示词 */
  prompt: string
  /** 负向提示词 */
  negativePrompt?: string
  /** 参考图片 URLs */
  referenceImages?: string[]
  /** 宽高比 */
  aspectRatio?: string
  /** 分辨率 */
  resolution?: string
  /** 输出格式 */
  outputFormat?: string
  /** 生成图片数量 */
  n?: number
  /** 用户 ID */
  userId?: string
}

/** 图像生成结果 */
export interface ImageGenerateResult {
  /** 是否成功 */
  success: boolean
  /** 图片 URL */
  imageUrl?: string
  /** 图片 Base64 */
  imageBase64?: string
  /** 错误信息 */
  error?: string
  /** 请求 ID */
  requestId?: string
  /** 是否为异步任务 */
  async?: boolean
  /** 异步任务端点 */
  endpoint?: string
  /** 外部任务 ID (标准格式) */
  externalId?: string
}

// ============================================================
// 视频生成类型
// ============================================================

/** 视频生成参数 */
export interface VideoGenerateParams extends GenerateOptions {
  /** 起始图片 URL */
  imageUrl: string
  /** 提示词 */
  prompt?: string
  /** 时长 (秒) */
  duration?: number
  /** 帧率 */
  fps?: number
  /** 分辨率 */
  resolution?: string
  /** 宽高比 */
  aspectRatio?: string
  /** 是否生成音频 */
  generateAudio?: boolean
  /** 尾帧图片 URL (首尾帧模式) */
  lastFrameImageUrl?: string
  /** 用户 ID */
  userId?: string
}

/** 视频生成结果 */
export interface VideoGenerateResult {
  /** 是否成功 */
  success: boolean
  /** 视频 URL */
  videoUrl?: string
  /** 音频 URL */
  audioUrl?: string
  /** 错误信息 */
  error?: string
  /** 请求 ID */
  requestId?: string
  /** 是否为异步任务 */
  async?: boolean
  /** 异步任务端点 */
  endpoint?: string
  /** 外部任务 ID (标准格式) */
  externalId?: string
}

// ============================================================
// 语音生成类型
// ============================================================

/** 语音生成参数 */
export interface AudioGenerateParams extends GenerateOptions {
  /** 文本内容 */
  text: string
  /** 音色 ID */
  voice?: string
  /** 语速 */
  rate?: number
  /** 输出格式 */
  outputFormat?: string
  /** 用户 ID */
  userId?: string
}

/** 语音生成结果 */
export interface AudioGenerateResult {
  /** 是否成功 */
  success: boolean
  /** 音频 URL */
  audioUrl?: string
  /** 音频 Base64 */
  audioBase64?: string
  /** 错误信息 */
  error?: string
  /** 请求 ID */
  requestId?: string
  /** 是否为异步任务 */
  async?: boolean
  /** 外部任务 ID (标准格式) */
  externalId?: string
}

// ============================================================
// 统一响应类型
// ============================================================

/** AI 响应 (泛型) */
export interface AIResponse<T> {
  /** 数据 */
  data?: T
  /** 错误 */
  error?: AIError
  /** 是否成功 */
  success: boolean
}

// ============================================================
// 错误类型
// ============================================================

/** AI 运行时错误码 */
export type AIRuntimeErrorCode =
  | 'NETWORK_ERROR'
  | 'RATE_LIMIT'
  | 'EMPTY_RESPONSE'
  | 'PARSE_ERROR'
  | 'TIMEOUT'
  | 'SENSITIVE_CONTENT'
  | 'INTERNAL_ERROR'
  | 'AUTH_ERROR'
  | 'INVALID_REQUEST'

/** AI 错误 */
export interface AIError {
  /** 错误码 */
  code: AIRuntimeErrorCode
  /** 错误消息 */
  message: string
  /** 是否可重试 */
  retryable: boolean
  /** 提供商 */
  provider?: string
  /** 原始错误 */
  cause?: unknown
  /** HTTP 状态码 */
  statusCode?: number
}

// ============================================================
// 流式输出类型
// ============================================================

/** 流式输出事件 */
export interface StreamEvent {
  /** 事件类型 */
  type: 'text' | 'reasoning' | 'done' | 'error'
  /** 内容 */
  content?: string
  /** 错误 */
  error?: AIError
  /** Token 使用统计 (仅在 done 事件中提供) */
  usage?: TokenUsage
}

/** 流式输出回调 */
export type StreamCallback = (event: StreamEvent) => void | Promise<void>

/** 流式输出控制器 */
export interface StreamController {
  /** 中止信号 */
  signal: AbortSignal
  /** 中止流式输出 */
  abort: () => void
}

// ============================================================
// 重试配置
// ============================================================

/** 重试配置 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxRetries?: number
  /** 初始延迟 (毫秒) */
  initialDelayMs?: number
  /** 最大延迟 (毫秒) */
  maxDelayMs?: number
  /** 退避因子 */
  backoffFactor?: number
  /** 可重试的错误码 */
  retryableCodes?: AIRuntimeErrorCode[]
}

/** 默认重试配置 */
export const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffFactor: 2,
  retryableCodes: ['NETWORK_ERROR', 'RATE_LIMIT', 'TIMEOUT', 'EMPTY_RESPONSE'],
}
