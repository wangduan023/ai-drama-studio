/**
 * AI Client - 抽象基类
 *
 * 定义所有 AI 客户端的统一接口和通用功能
 */

import type {
  AIModelConfig,
  TextGenerateParams,
  TextGenerateResult,
  ImageGenerateParams,
  ImageGenerateResult,
  VideoGenerateParams,
  VideoGenerateResult,
  AudioGenerateParams,
  AudioGenerateResult,
  StreamCallback,
  StreamController,
  RetryConfig,
  AIError,
  ProxyConfig,
} from './types'
import {
  DEFAULT_RETRY_CONFIG,
} from './types'
import { toAIError, createAIError } from './errors'
import { getLogger } from './logger'

// Node.js 22.x 内置 undici，支持代理
let ProxyAgent: any
let setGlobalDispatcher: any
try {
  const undici = require('undici')
  ProxyAgent = undici.ProxyAgent
  setGlobalDispatcher = undici.setGlobalDispatcher
} catch {
  // 在非 Node.js 环境中，ProxyAgent 不可用
  ProxyAgent = null
  setGlobalDispatcher = null
}

/**
 * 计算指数退避延迟
 */
function calculateBackoffDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffFactor: number
): number {
  const exponentialDelay = initialDelayMs * Math.pow(backoffFactor, attempt - 1)
  const jitter = Math.random() * 0.1 * exponentialDelay // 10% jitter
  return Math.min(exponentialDelay + jitter, maxDelayMs)
}

/**
 * BaseAIClient - AI 客户端抽象基类
 *
 * 提供：
 * - 统一的抽象方法定义
 * - 重试逻辑（指数退避）
 * - 错误处理
 * - 流式输出支持
 * - HTTP 代理支持
 */
export abstract class BaseAIClient {
  /** 提供商名称 */
  public readonly provider: string

  /** 模型 ID */
  public readonly modelId: string

  /** API Key */
  protected readonly apiKey: string

  /** Base URL */
  protected readonly baseURL?: string

  /** 超时时间 */
  protected readonly timeout: number

  /** 代理配置 */
  protected readonly proxy?: ProxyConfig

  /** 额外配置 */
  protected readonly extra?: Record<string, unknown>

  constructor(config: AIModelConfig) {
    this.provider = config.provider
    this.modelId = config.modelId
    this.apiKey = config.apiKey
    this.baseURL = config.baseURL
    this.timeout = config.timeout || 120000 // 默认 2 分钟
    this.proxy = config.proxy
    this.extra = config.extra

    // 如果配置了代理，设置全局 dispatcher
    if (this.proxy && ProxyAgent && setGlobalDispatcher) {
      const proxyUrl = this.buildProxyUrl(this.proxy)
      const proxyAgent = new ProxyAgent(proxyUrl)
      setGlobalDispatcher(proxyAgent)
    }
  }

  /**
   * 构建代理 URL
   */
  private buildProxyUrl(proxy: ProxyConfig): string {
    const { host, port, username, password } = proxy
    const protocol = host.startsWith('http://') || host.startsWith('https://')
      ? ''
      : 'http://'

    if (username && password) {
      return `${protocol}${username}:${password}@${host}:${port}`
    }
    return `${protocol}${host}:${port}`
  }

  // ============================================================
  // 抽象方法 - 子类必须实现
  // ============================================================

  /**
   * 生成文本
   *
   * @param params - 文本生成参数
   * @param onStream - 流式输出回调（可选）
   * @returns 文本生成结果
   */
  abstract generateText(
    params: TextGenerateParams,
    onStream?: StreamCallback
  ): Promise<TextGenerateResult>

  /**
   * 生成图像
   *
   * @param params - 图像生成参数
   * @returns 图像生成结果
   */
  abstract generateImage(params: ImageGenerateParams): Promise<ImageGenerateResult>

  /**
   * 生成视频
   *
   * @param params - 视频生成参数
   * @returns 视频生成结果
   */
  abstract generateVideo(params: VideoGenerateParams): Promise<VideoGenerateResult>

  /**
   * 生成语音
   *
   * @param params - 语音生成参数
   * @returns 语音生成结果
   */
  abstract generateAudio(params: AudioGenerateParams): Promise<AudioGenerateResult>

  // ============================================================
  // 通用方法 - 默认实现
  // ============================================================

  /**
   * 带重试的执行（指数退避）
   *
   * @param fn - 要执行的异步函数
   * @param config - 重试配置
   * @returns 执行结果
   */
  protected async withRetry<T>(
    fn: (attempt: number) => Promise<T>,
    config: RetryConfig = {}
  ): Promise<T> {
    const {
      maxRetries = DEFAULT_RETRY_CONFIG.maxRetries,
      initialDelayMs = DEFAULT_RETRY_CONFIG.initialDelayMs,
      maxDelayMs = DEFAULT_RETRY_CONFIG.maxDelayMs,
      backoffFactor = DEFAULT_RETRY_CONFIG.backoffFactor,
      retryableCodes = DEFAULT_RETRY_CONFIG.retryableCodes,
    } = config

    let lastError: AIError | null = null

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        return await fn(attempt)
      } catch (error) {
        const aiError = toAIError(error, { provider: this.provider })
        lastError = aiError

        // 检查是否可重试
        const isRetryable = aiError.retryable && retryableCodes.includes(aiError.code)

        // 如果是最后一次尝试，或不可重试，直接抛出
        if (attempt === maxRetries + 1 || !isRetryable) {
          throw aiError
        }

        // 计算延迟并等待
        const delay = calculateBackoffDelay(
          attempt,
          initialDelayMs,
          maxDelayMs,
          backoffFactor
        )

        // 记录重试日志
        getLogger().warn(
          `[${this.provider}] 尝试 ${attempt}/${maxRetries} 失败：${aiError.message}，` +
          `${delay.toFixed(0)}ms 后重试...`
        )

        await this.sleep(delay)
      }
    }

    // 理论上不会到达这里
    throw lastError || createAIError('INTERNAL_ERROR', '未知错误')
  }

  /**
   * 睡眠指定时间
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 创建 AbortController（带超时）
   */
  protected createAbortController(timeoutMs?: number): {
    controller: AbortController
    timeoutId?: NodeJS.Timeout
    signal: AbortSignal
  } {
    const controller = new AbortController()
    const effectiveTimeout = timeoutMs ?? this.timeout

    if (effectiveTimeout > 0) {
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, effectiveTimeout)

      return { controller, timeoutId, signal: controller.signal }
    }

    return { controller, signal: controller.signal }
  }

  /**
   * 清理超时定时器
   */
  protected clearAbortTimeout(timeoutId?: NodeJS.Timeout): void {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  }

  /**
   * 获取请求头
   */
  protected getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    }

    // 子类根据需要添加 Authorization 头
    return headers
  }

  /**
   * 创建流式控制器
   */
  protected createStreamController(): StreamController {
    const controller = new AbortController()
    return {
      signal: controller.signal,
      abort: () => controller.abort(),
    }
  }

  /**
   * 处理流式响应
   */
  protected async handleStreamResponse(
    response: Response,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    if (!response.body) {
      throw createAIError('EMPTY_RESPONSE', '响应体为空', { provider: this.provider })
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')

    try {
      while (true) {
        // 检查是否已中止
        if (signal?.aborted) {
          break
        }

        const { done, value } = await reader.read()

        if (done) {
          break
        }

        const chunk = decoder.decode(value, { stream: true })
        await onChunk(chunk)
      }
    } catch (error) {
      if (signal?.aborted) {
        // 用户主动中止，不视为错误
        return
      }
      throw error
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * 解析 SSE 行
   */
  protected parseSSELine(line: string): { event?: string; data?: string } | null {
    if (line.startsWith('event:')) {
      return { event: line.slice(6).trim() }
    }
    if (line.startsWith('data:')) {
      return { data: line.slice(5).trim() }
    }
    return null
  }

  /**
   * 解析 SSE 数据
   */
  protected parseSSEData(data: string): unknown {
    if (data === '[DONE]') {
      return null
    }

    try {
      return JSON.parse(data)
    } catch {
      return { text: data }
    }
  }

  /**
   * 获取绝对 URL
   */
  protected getAbsoluteURL(path: string): string {
    if (this.baseURL) {
      // 移除 path 开头的斜杠（如果有）
      const normalizedPath = path.startsWith('/') ? path.slice(1) : path
      // 确保 baseURL 没有结尾斜杠
      const normalizedBaseURL = this.baseURL.endsWith('/')
        ? this.baseURL.slice(0, -1)
        : this.baseURL
      return `${normalizedBaseURL}/${normalizedPath}`
    }
    return path
  }

  /**
   * 验证响应
   */
  protected async validateResponse(response: Response): Promise<void> {
    if (!response.ok) {
      let errorText: string
      try {
        errorText = await response.text()
      } catch {
        errorText = `HTTP ${response.status}`
      }

      throw toAIError(new Error(errorText), {
        provider: this.provider,
        statusCode: response.status,
      })
    }
  }
}
