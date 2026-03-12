/**
 * AI Client - 统一导出
 *
 * @packageDocumentation
 */

// ============================================================
// 类型导出
// ============================================================

export type {
  // 基础类型
  AIProvider,
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
} from './types'

export {
  DEFAULT_RETRY_CONFIG,
} from './types'

// ============================================================
// 增强类型导出（新的统一接口）
// ============================================================

export type {
  // 统一 AI 服务接口
  AIProvider as AIProviderInterface,
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
} from './types/enhanced'

// ============================================================
// 错误处理导出
// ============================================================

export {
  toAIError,
  createAIError,
  isRetryableError,
  throwAIError,
} from './errors'

// ============================================================
// 基类导出
// ============================================================

export {
  BaseAIClient,
} from './base'

// ============================================================
// 客户端导出（原有实现）
// ============================================================

export {
  OpenAIClient,
} from './clients/openai.client'

export {
  AnthropicClient,
} from './clients/anthropic.client'

export {
  GeminiClient,
} from './clients/gemini.client'

export {
  DoubaoClient,
} from './clients/doubao.client'

export {
  DeepSeekClient,
} from './clients/deepseek.client'

export {
  QwenClient,
} from './clients/qwen.client'

export {
  OllamaClient,
} from './clients/ollama.client'

export {
  ComfyUIClient,
} from './clients/comfyui.client'

// 国内 AI 厂商客户端
export {
  BaiduClient,
} from './clients/baidu.client'

export {
  TencentClient,
} from './clients/tencent.client'

export {
  IflytekClient,
} from './clients/iflytek.client'

export {
  ZhipuClient,
} from './clients/zhipu.client'

export {
  MoonshotClient,
} from './clients/moonshot.client'

export {
  MiniMaxClient,
} from './clients/minimax.client'

export {
  LingyiClient,
  KlingClient,
  StepfunClient,
} from './clients/lingyi.client'

export {
  BaichuanClient,
} from './clients/baichuan.client'

export {
  SenseTimeClient,
} from './clients/sensetime.client'

// 国际 AI 厂商客户端
export {
  MistralClient,
} from './clients/mistral.client'

export {
  CohereClient,
} from './clients/cohere.client'

export {
  GroqClient,
} from './clients/groq.client'

export {
  StabilityClient,
} from './clients/stability.client'

export {
  FalClient,
} from './clients/fal.client'

export {
  RunwayClient,
} from './clients/runway.client'

export {
  ElevenLabsClient,
} from './clients/elevenlabs.client'

export {
  LumaClient,
} from './clients/luma.client'

export {
  HuggingFaceClient,
} from './clients/huggingface.client'

// ============================================================
// 新的提供商实现导出（统一接口）
// ============================================================

export {
  OpenAIProvider,
  createOpenAIProvider,
  type OpenAIProviderOptions,
} from './providers/openai'

export {
  AnthropicProvider,
  createAnthropicProvider,
  type AnthropicProviderOptions,
} from './providers/anthropic'

export {
  GoogleProvider,
  GeminiProvider,
  createGoogleProvider,
  createGeminiProvider,
  type GoogleProviderOptions,
} from './providers/google'

export {
  QwenProvider,
  createQwenProvider,
  type QwenProviderOptions,
} from './providers/qwen'

// 提供商工厂
export {
  createProvider,
  createProviders,
  type ProviderType,
  type ProviderOptions,
} from './providers'

// ============================================================
// 工厂导出
// ============================================================

export type {
  ClientFactoryOptions,
  AIClientType,
  ClientPool,
} from './factory'

export {
  createAIClient,
  createAIClients,
  createClientPool,
} from './factory'

// ============================================================
// 代理工具导出
// ============================================================

export type {
  ProxyConfig,
} from './types'

export {
  createProxyFromEnv,
  isValidProxyConfig,
  getProxyUrl,
} from './proxy'

// ============================================================
// 负载均衡器导出
// ============================================================

export type {
  LoadBalanceStrategy,
  LoadBalancerConfig,
} from './load-balancer'

export {
  LoadBalancer,
  createLoadBalancer,
} from './load-balancer'

// 增强型负载均衡器
export {
  AILoadBalancer,
  createAILoadBalancer,
  type AILoadBalancerConfig,
} from './loadbalancer-enhanced'

// ============================================================
// 多账号负载均衡器导出
// ============================================================

export type {
  AccountConfig,
  MultiAccountBalancerConfig,
} from './multi-account-balancer'

export {
  MultiAccountBalancer,
  createMultiAccountBalancer,
} from './multi-account-balancer'

// ============================================================
// 配置管理器导出
// ============================================================

export {
  ConfigManager,
  createConfigManager,
  loadConfig,
  type ConfigManagerOptions,
} from './config'

// ============================================================
// 成本计算工具导出
// ============================================================

export {
  calculateTextCost,
  calculateImageCost,
  calculateVideoCost,
  DefaultCostCalculator,
  getModelCost,
  convertCurrency,
  formatCost,
  OPENAI_COSTS,
  ANTHROPIC_COSTS,
  GOOGLE_COSTS,
  QWEN_COSTS,
  DALLE_COSTS,
} from './utils/cost-calculator'

// ============================================================
// 日志器导出
// ============================================================

export type {
  Logger,
  LogLevel,
} from './logger'

export {
  setGlobalLogger,
  getLogger,
  resetLogger,
  defaultLogger,
} from './logger'

// ============================================================
// Unified AI Client 导出
// ============================================================

export type {
  UnifiedClientConfig,
  KeySelectionResult,
  UnifiedGenerateOptions,
} from './unified-client'

export {
  UnifiedAIClient,
  createUnifiedAIClient,
} from './unified-client'

// ============================================================
// 验证模块导出
// ============================================================

export type {
  ValidationError,
} from './validation'

export {
  validateModelConfig,
  validateApiKey,
  validateBaseURL,
  validateProxyConfig,
  validateModelId,
  validateProvider,
  SUPPORTED_PROVIDERS,
} from './validation'

// ============================================================
// 默认导出
// ============================================================

import { createAIClient, createAIClients } from './factory'
import { createLoadBalancer } from './load-balancer'
import { createMultiAccountBalancer } from './multi-account-balancer'
import { createAILoadBalancer } from './loadbalancer-enhanced'
import { createProvider, createProviders } from './providers'
import { createConfigManager, loadConfig } from './config'

export default {
  createAIClient,
  createAIClients,
  createLoadBalancer,
  createMultiAccountBalancer,
  createAILoadBalancer,
  createProvider,
  createProviders,
  createConfigManager,
  loadConfig,
}
