/**
 * AI Client Factory - AI 客户端工厂
 *
 * 根据配置动态创建客户端实例
 * 支持的厂商：OpenAI, Anthropic, Google Gemini, 豆包 (Doubao), DeepSeek, Qwen, Ollama, ComfyUI,
 *           百度文心一言，腾讯混元，科大讯飞星火，智谱 AI, 月之暗面 Kimi, MiniMax, 零一万物，可灵，阶跃星辰
 */

import type { AIModelConfig, AIProvider } from './types'
import { OpenAIClient } from './clients/openai.client'
import { AnthropicClient } from './clients/anthropic.client'
import { GeminiClient } from './clients/gemini.client'
import { DoubaoClient } from './clients/doubao.client'
import { DeepSeekClient } from './clients/deepseek.client'
import { QwenClient } from './clients/qwen.client'
import { OllamaClient } from './clients/ollama.client'
import { ComfyUIClient } from './clients/comfyui.client'
// 国内 AI 厂商客户端
import { BaiduClient } from './clients/baidu.client'
import { TencentClient } from './clients/tencent.client'
import { IflytekClient } from './clients/iflytek.client'
import { ZhipuClient } from './clients/zhipu.client'
import { MoonshotClient } from './clients/moonshot.client'
import { MiniMaxClient } from './clients/minimax.client'
import { LingyiClient, KlingClient, StepfunClient } from './clients/lingyi.client'
import { BaichuanClient } from './clients/baichuan.client'
import { SenseTimeClient } from './clients/sensetime.client'
import type { BaseAIClient } from './base'

/**
 * 客户端创建选项
 */
export interface ClientFactoryOptions {
  /** 提供商 */
  provider: AIProvider | string
  /** 模型 ID */
  modelId: string
  /** API Key */
  apiKey: string
  /** Base URL (可选) */
  baseURL?: string
  /** 超时时间 (毫秒) */
  timeout?: number
  /** 额外配置 */
  extra?: Record<string, unknown>
}

/**
 * AI 客户端类型
 */
export type AIClientType =
  | OpenAIClient
  | AnthropicClient
  | GeminiClient
  | DoubaoClient
  | DeepSeekClient
  | QwenClient
  | OllamaClient
  | ComfyUIClient
  | BaiduClient
  | TencentClient
  | IflytekClient
  | ZhipuClient
  | MoonshotClient
  | MiniMaxClient
  | LingyiClient
  | KlingClient
  | StepfunClient
  | BaichuanClient
  | SenseTimeClient
  | BaseAIClient

/**
 * 创建 AI 客户端
 *
 * @param options - 客户端创建选项
 * @returns AI 客户端实例
 *
 * @example
 * ```typescript
 * // 创建 OpenAI 客户端
 * const client = createAIClient({
 *   provider: 'openai',
 *   modelId: 'gpt-4o',
 *   apiKey: process.env.OPENAI_API_KEY,
 * })
 *
 * // 创建 Anthropic 客户端
 * const client = createAIClient({
 *   provider: 'anthropic',
 *   modelId: 'claude-3-7-sonnet-20250219',
 *   apiKey: process.env.ANTHROPIC_API_KEY,
 * })
 *
 * // 创建豆包客户端 (ARK API)
 * const client = createAIClient({
 *   provider: 'doubao',
 *   modelId: 'doubao-seedance-1-0-pro-fast-251015',
 *   apiKey: process.env.DOUBAO_API_KEY,
 *   baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
 * })
 * ```
 */
export function createAIClient(options: ClientFactoryOptions): AIClientType {
  const config: AIModelConfig = {
    provider: normalizeProvider(options.provider),
    modelId: options.modelId,
    apiKey: options.apiKey,
    baseURL: options.baseURL,
    timeout: options.timeout,
    extra: options.extra,
  }

  switch (config.provider) {
    case 'openai':
      return new OpenAIClient(config)

    case 'anthropic':
      return new AnthropicClient(config)

    case 'google':
      return new GeminiClient(config)

    case 'doubao':
      return new DoubaoClient(config, 'ark')

    case 'deepseek':
      return new DeepSeekClient(config)

    case 'qwen':
      return new QwenClient(config)

    case 'ollama':
      return new OllamaClient(config)

    case 'comfyui':
      return new ComfyUIClient(config)

    // 国内 AI 厂商
    case 'baidu':
      return new BaiduClient(config)

    case 'tencent':
      return new TencentClient(config)

    case 'iflytek':
      return new IflytekClient(config)

    case 'zhipu':
      return new ZhipuClient(config)

    case 'moonshot':
      return new MoonshotClient(config)

    case 'minimax':
      return new MiniMaxClient(config)

    case 'lingyi':
      return new LingyiClient(config)

    case 'kling':
      return new KlingClient(config)

    case 'stepfun':
      return new StepfunClient(config)

    case 'baichuan':
      return new BaichuanClient(config)

    case 'sensetime':
      return new SenseTimeClient(config)

    // 图像生成专用
    case 'wanxiang':
      // 通义万相使用 QwenClient (阿里云 DashScope)
      return new QwenClient(config)

    case 'hunyuan-image':
      // 腾讯混元图像使用 TencentClient
      return new TencentClient(config)

    case 'gewang':
      // 百度文心一格使用 BaiduClient
      return new BaiduClient(config)

    case 'openai-compatible':
      // OpenAI 兼容格式的自定义端点
      return new OpenAIClient({
        ...config,
        baseURL: config.baseURL || 'https://api.openai.com/v1',
      })

    default:
      throw new Error(`Unknown provider: ${config.provider}`)
  }
}

/**
 * 规范化提供商名称
 */
function normalizeProvider(provider: string): AIProvider {
  const normalized = provider.toLowerCase()

  // 直接匹配
  if (['openai', 'anthropic', 'google', 'doubao', 'deepseek', 'qwen', 'ollama', 'comfyui', 'baidu', 'tencent', 'iflytek', 'zhipu', 'moonshot', 'minimax', 'lingyi', 'kling', 'stepfun', 'baichuan', 'sensetime', 'wanxiang', 'hunyuan-image', 'gewang'].includes(normalized)) {
    return normalized as AIProvider
  }

  // OpenAI 兼容格式
  if (
    normalized.includes('openai-compatible') ||
    normalized.includes('openai_compatible') ||
    normalized.startsWith('azure') ||
    normalized.startsWith('together') ||
    normalized.startsWith('groq')
  ) {
    return 'openai-compatible'
  }

  // 豆包别名
  if (
    normalized.includes('doubao') ||
    normalized.includes('seedance') ||
    normalized.includes('seedream') ||
    normalized.includes('volc') ||
    normalized.includes('volces') ||
    normalized.includes('bytedance')
  ) {
    return 'doubao'
  }

  // Google 别名
  if (
    normalized.includes('google') ||
    normalized.includes('gemini') ||
    normalized.includes('imagen') ||
    normalized.includes('vertex')
  ) {
    return 'google'
  }

  // Anthropic 别名
  if (normalized.includes('anthropic') || normalized.includes('claude')) {
    return 'anthropic'
  }

  // DeepSeek 别名
  if (normalized.includes('deepseek')) {
    return 'deepseek'
  }

  // Qwen 别名
  if (
    normalized.includes('qwen') ||
    normalized.includes('aliyun') ||
    normalized.includes('ali') ||
    normalized.includes('dashscope')
  ) {
    return 'qwen'
  }

  // Ollama 别名
  if (normalized.includes('ollama')) {
    return 'ollama'
  }

  // ComfyUI 别名
  if (normalized.includes('comfy') || normalized.includes('comfyui')) {
    return 'comfyui'
  }

  // 百度文心一言别名
  if (
    normalized.includes('baidu') ||
    normalized.includes('ernie') ||
    normalized.includes('wenxin') ||
    normalized.includes('qianfan')
  ) {
    return 'baidu'
  }

  // 腾讯混元别名
  if (
    normalized.includes('tencent') ||
    normalized.includes('hunyuan') ||
    normalized.includes('yun')
  ) {
    return 'tencent'
  }

  // 科大讯飞别名
  if (
    normalized.includes('iflytek') ||
    normalized.includes('spark') ||
    normalized.includes('xunfei')
  ) {
    return 'iflytek'
  }

  // 智谱 AI 别名
  if (
    normalized.includes('zhipu') ||
    normalized.includes('glm') ||
    normalized.includes('bigmodel')
  ) {
    return 'zhipu'
  }

  // 月之暗面/Kimi 别名
  if (
    normalized.includes('moonshot') ||
    normalized.includes('kimi')
  ) {
    return 'moonshot'
  }

  // MiniMax 别名
  if (
    normalized.includes('minimax') ||
    normalized.includes('hailuo') ||
    normalized.includes('haiuo')
  ) {
    return 'minimax'
  }

  // 零一万物别名
  if (
    normalized.includes('lingyi') ||
    normalized.includes('yi') ||
    normalized.includes('lingyiwanwu')
  ) {
    return 'lingyi'
  }

  // 可灵别名
  if (
    normalized.includes('kling') ||
    normalized.includes('kuaishou') ||
    normalized.includes('kesou')
  ) {
    return 'kling'
  }

  // 阶跃星辰别名
  if (
    normalized.includes('stepfun') ||
    normalized.includes('step') ||
    normalized.includes('yuewen')
  ) {
    return 'stepfun'
  }

  // 百川智能别名
  if (
    normalized.includes('baichuan') ||
    normalized.includes('baichuan-ai')
  ) {
    return 'baichuan'
  }

  // 商汤科技别名
  if (
    normalized.includes('sensetime') ||
    normalized.includes('sensenova') ||
    normalized.includes('日日新')
  ) {
    return 'sensetime'
  }

  // 通义万相别名
  if (
    normalized.includes('wanxiang') ||
    normalized.includes('通义万相') ||
    normalized.includes('aliyun-wanxiang')
  ) {
    return 'wanxiang'
  }

  // 腾讯混元图像别名
  if (
    normalized.includes('hunyuan-image') ||
    normalized.includes('hunyuan_image') ||
    normalized.includes('混元图像') ||
    normalized.includes('hunyuan-tuxiang')
  ) {
    return 'hunyuan-image'
  }

  // 百度文心一格别名
  if (
    normalized.includes('gewang') ||
    normalized.includes('文心一格') ||
    normalized.includes('wenxin-yige') ||
    normalized.includes('yige')
  ) {
    return 'gewang'
  }

  // 默认使用 OpenAI 兼容格式
  return 'openai-compatible'
}

/**
 * 批量创建客户端
 *
 * @param providers - 提供商配置列表
 * @returns 客户端实例映射
 *
 * @example
 * ```typescript
 * const clients = createAIClients([
 *   {
 *     provider: 'openai',
 *     modelId: 'gpt-4o',
 *     apiKey: process.env.OPENAI_API_KEY,
 *   },
 *   {
 *     provider: 'anthropic',
 *     modelId: 'claude-3-7-sonnet-20250219',
 *     apiKey: process.env.ANTHROPIC_API_KEY,
 *   },
 * ])
 *
 * // 使用
 * const openaiClient = clients.openai
 * const anthropicClient = clients.anthropic
 * ```
 */
export function createAIClients(
  providers: Array<ClientFactoryOptions & { name?: string }>
): Record<string, AIClientType> {
  const clients: Record<string, AIClientType> = {}

  for (const provider of providers) {
    const client = createAIClient(provider)
    const name = provider.name || provider.provider
    clients[name] = client
  }

  return clients
}

/**
 * 创建客户端池（用于负载均衡）
 */
export interface ClientPool {
  /** 主客户端 */
  primary: AIClientType
  /** 备用客户端 */
  fallbacks: AIClientType[]
}

/**
 * 创建客户端池
 *
 * @param primary - 主客户端配置
 * @param fallbacks - 备用客户端配置列表
 * @returns 客户端池
 */
export function createClientPool(
  primary: ClientFactoryOptions,
  fallbacks: ClientFactoryOptions[] = []
): ClientPool {
  return {
    primary: createAIClient(primary),
    fallbacks: fallbacks.map((config) => createAIClient(config)),
  }
}
