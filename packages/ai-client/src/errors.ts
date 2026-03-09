/**
 * AI Client - 错误处理
 *
 * 统一的错误转换和处理逻辑
 */

import type {
  AIError,
  AIRuntimeErrorCode,
} from './types'

/**
 * 错误码映射
 */
const ERROR_CODE_MAP: Record<string, AIRuntimeErrorCode> = {
  // 网络错误
  'ECONNREFUSED': 'NETWORK_ERROR',
  'ENOTFOUND': 'NETWORK_ERROR',
  'ETIMEDOUT': 'TIMEOUT',
  'ECONNRESET': 'NETWORK_ERROR',
  'EAI_AGAIN': 'NETWORK_ERROR',

  // HTTP 状态码映射
  '401': 'AUTH_ERROR',
  '403': 'AUTH_ERROR',
  '429': 'RATE_LIMIT',
  '500': 'INTERNAL_ERROR',
  '502': 'NETWORK_ERROR',
  '503': 'NETWORK_ERROR',
  '504': 'TIMEOUT',
}

/**
 * 判断错误是否为可重试错误
 */
export function isRetryableError(error: AIError): boolean {
  const retryableCodes: AIRuntimeErrorCode[] = [
    'NETWORK_ERROR',
    'RATE_LIMIT',
    'TIMEOUT',
    'EMPTY_RESPONSE',
  ]
  return retryableCodes.includes(error.code)
}

/**
 * 从 HTTP 状态码推断错误码
 */
function inferErrorCodeFromStatus(status?: number): AIRuntimeErrorCode {
  if (!status) return 'NETWORK_ERROR'
  if (status >= 500) return 'INTERNAL_ERROR'
  if (status === 429) return 'RATE_LIMIT'
  if (status === 401 || status === 403) return 'AUTH_ERROR'
  if (status === 400) return 'INVALID_REQUEST'
  if (status === 408) return 'TIMEOUT'
  return 'NETWORK_ERROR'
}

/**
 * 从错误消息推断错误码
 */
function inferErrorCodeFromMessage(message: string): AIRuntimeErrorCode {
  const lowerMessage = message.toLowerCase()

  // 速率限制
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
    return 'RATE_LIMIT'
  }

  // 超时
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return 'TIMEOUT'
  }

  // 网络错误
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection')) {
    return 'NETWORK_ERROR'
  }

  // 敏感内容
  if (lowerMessage.includes('sensitive') || lowerMessage.includes('content policy')) {
    return 'SENSITIVE_CONTENT'
  }

  // 空响应
  if (lowerMessage.includes('empty') || lowerMessage.includes('no content')) {
    return 'EMPTY_RESPONSE'
  }

  // 解析错误
  if (lowerMessage.includes('parse') || lowerMessage.includes('json') || lowerMessage.includes('invalid')) {
    return 'PARSE_ERROR'
  }

  // 认证错误
  if (lowerMessage.includes('auth') || lowerMessage.includes('unauthorized') || lowerMessage.includes('api key')) {
    return 'AUTH_ERROR'
  }

  return 'INTERNAL_ERROR'
}

/**
 * 从任意错误转换为 AIError
 */
export function toAIError(
  input: unknown,
  options?: {
    provider?: string
    statusCode?: number
    defaultMessage?: string
  }
): AIError {
  const {
    provider,
    statusCode,
    defaultMessage = 'AI request failed',
  } = options || {}

  // 如果已经是 AIError，直接返回
  if (isAIError(input)) {
    return input
  }

  // 处理 Error 对象
  if (input instanceof Error) {
    const message = input.message || defaultMessage
    const code = inferErrorCodeFromMessage(message)

    return {
      code,
      message,
      retryable: isRetryableError({ code, message, retryable: false, provider }),
      provider,
      cause: input,
      statusCode,
    }
  }

  // 处理 HTTP 响应错误
  if (isResponseError(input)) {
    const status = input.response.status
    const code = inferErrorCodeFromStatus(status)

    return {
      code,
      message: `HTTP ${status}: ${input.message || defaultMessage}`,
      retryable: isRetryableError({ code, message: '', retryable: false, provider }),
      provider,
      cause: input,
      statusCode: status,
    }
  }

  // 处理 FetchError
  if (isFetchError(input)) {
    return {
      code: 'NETWORK_ERROR',
      message: input.message || defaultMessage,
      retryable: true,
      provider,
      cause: input,
    }
  }

  // 处理字符串错误
  if (typeof input === 'string') {
    const code = inferErrorCodeFromMessage(input)
    return {
      code,
      message: input,
      retryable: isRetryableError({ code, message: input, retryable: false, provider }),
      provider,
    }
  }

  // 默认错误
  return {
    code: 'INTERNAL_ERROR',
    message: typeof input === 'object' && input !== null
      ? JSON.stringify(input)
      : String(input),
    retryable: false,
    provider,
    cause: input,
  }
}

/**
 * 创建 AIError
 */
export function createAIError(
  code: AIRuntimeErrorCode,
  message: string,
  options?: {
    provider?: string
    retryable?: boolean
    statusCode?: number
    cause?: unknown
  }
): AIError {
  const { provider, retryable, statusCode, cause } = options || {}

  return {
    code,
    message,
    retryable: retryable ?? isRetryableError({ code, message, retryable: false, provider }),
    provider,
    statusCode,
    cause,
  }
}

/**
 * 判断是否为 AIError
 */
function isAIError(value: unknown): value is AIError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    'retryable' in value
  )
}

/**
 * 判断是否为 ResponseError
 */
function isResponseError(value: unknown): value is { response: Response; message?: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'response' in value &&
    value.response instanceof Response
  )
}

/**
 * 判断是否为 FetchError
 */
function isFetchError(value: unknown): value is Error & { type?: string } {
  return (
    value instanceof Error &&
    typeof value === 'object' &&
    value !== null &&
    'type' in value
  )
}

/**
 * 抛出 AIError
 */
export function throwAIError(
  input: unknown,
  options?: {
    provider?: string
    statusCode?: number
    defaultMessage?: string
  }
): never {
  throw toAIError(input, options)
}
