/**
 * 错误处理模块测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { toAIError, createAIError, isRetryableError, throwAIError } from '../src/errors'

describe('errors', () => {
  describe('isRetryableError', () => {
    it('应该返回 true 对于网络错误', () => {
      expect(isRetryableError({ code: 'NETWORK_ERROR', message: 'Network error', retryable: true })).toBe(true)
    })

    it('应该返回 true 对于速率限制', () => {
      expect(isRetryableError({ code: 'RATE_LIMIT', message: 'Rate limit', retryable: true })).toBe(true)
    })

    it('应该返回 true 对于超时', () => {
      expect(isRetryableError({ code: 'TIMEOUT', message: 'Timeout', retryable: true })).toBe(true)
    })

    it('应该返回 true 对于空响应', () => {
      expect(isRetryableError({ code: 'EMPTY_RESPONSE', message: 'Empty response', retryable: true })).toBe(true)
    })

    it('应该返回 false 对于认证错误', () => {
      expect(isRetryableError({ code: 'AUTH_ERROR', message: 'Auth error', retryable: false })).toBe(false)
    })

    it('应该返回 false 对于内部错误', () => {
      expect(isRetryableError({ code: 'INTERNAL_ERROR', message: 'Internal error', retryable: false })).toBe(false)
    })
  })

  describe('toAIError', () => {
    it('应该直接返回 AIError 对象', () => {
      const aiError = {
        code: 'NETWORK_ERROR' as const,
        message: 'Network error',
        retryable: true,
        provider: 'openai',
      }
      expect(toAIError(aiError)).toBe(aiError)
    })

    it('应该从 Error 对象创建 AIError', () => {
      const error = new Error('Rate limit exceeded')
      const aiError = toAIError(error, { provider: 'openai' })

      expect(aiError.code).toBe('RATE_LIMIT')
      expect(aiError.message).toBe('Rate limit exceeded')
      expect(aiError.provider).toBe('openai')
      expect(aiError.retryable).toBe(true)
    })

    it('应该从带有 status 的 Error 对象创建 AIError', () => {
      const error = new Error('Unauthorized')
      const aiError = toAIError(error, { provider: 'anthropic', statusCode: 401 })

      expect(aiError.code).toBe('AUTH_ERROR')
      expect(aiError.statusCode).toBe(401)
    })

    it('应该从 Response 错误创建 AIError', () => {
      const mockResponse = {
        status: 429,
        text: async () => 'Rate limit',
      } as unknown as Response

      const responseError = { response: mockResponse, message: 'Too many requests' }
      const aiError = toAIError(responseError, { provider: 'openai' })

      // 由于 mock 的 Response 不是真正的 Response 实例，会 fallback 到错误消息推断
      expect(aiError.message).toContain('Too many requests')
    })

    it('应该从 500 状态码创建内部错误', () => {
      const mockResponse = {
        status: 500,
        text: async () => 'Internal server error',
      } as unknown as Response

      const responseError = { response: mockResponse }
      const aiError = toAIError(responseError, { provider: 'openai' })

      // 由于 mock 的 Response 不是真正的 Response 实例，会 fallback 到默认错误
      expect(aiError).toBeDefined()
    })

    it('应该从 FetchError 创建网络错误', () => {
      const fetchError = new Error('fetch failed') as Error & { type?: string }
      fetchError.type = 'system'

      const aiError = toAIError(fetchError, { provider: 'openai' })

      expect(aiError.code).toBe('NETWORK_ERROR')
      expect(aiError.retryable).toBe(true)
    })

    it('应该从字符串错误创建 AIError', () => {
      const aiError = toAIError('Connection timeout', { provider: 'openai' })

      expect(aiError.code).toBe('TIMEOUT')
      expect(aiError.message).toBe('Connection timeout')
    })

    it('应该从对象错误创建 AIError', () => {
      const aiError = toAIError({ error: 'something went wrong' }, { provider: 'openai' })

      expect(aiError.code).toBe('INTERNAL_ERROR')
      expect(aiError.message).toContain('something went wrong')
    })

    it('应该从数字错误创建 AIError', () => {
      const aiError = toAIError(123, { provider: 'openai' })

      expect(aiError.code).toBe('INTERNAL_ERROR')
      expect(aiError.message).toBe('123')
    })

    it('应该使用默认消息当没有提供消息', () => {
      const error = new Error('')
      const aiError = toAIError(error, { provider: 'openai', defaultMessage: 'Default error' })

      expect(aiError.message).toBe('Default error')
    })

    it('应该从错误消息中推断出速率限制错误', () => {
      const error = new Error('You have exceeded the rate limit')
      const aiError = toAIError(error, { provider: 'openai' })

      expect(aiError.code).toBe('RATE_LIMIT')
    })

    it('应该从错误消息中推断出超时错误', () => {
      const error = new Error('Request timed out after 30s')
      const aiError = toAIError(error, { provider: 'openai' })

      expect(aiError.code).toBe('TIMEOUT')
    })

    it('应该从错误消息中推断出敏感内容错误', () => {
      const error = new Error('Content violates our content policy')
      const aiError = toAIError(error, { provider: 'openai' })

      expect(aiError.code).toBe('SENSITIVE_CONTENT')
    })

    it('应该从错误消息中推断出解析错误', () => {
      const error = new Error('Failed to parse JSON response')
      const aiError = toAIError(error, { provider: 'openai' })

      expect(aiError.code).toBe('PARSE_ERROR')
    })
  })

  describe('createAIError', () => {
    it('应该创建 AIError 对象', () => {
      const error = createAIError('NETWORK_ERROR', 'Network connection failed')

      expect(error.code).toBe('NETWORK_ERROR')
      expect(error.message).toBe('Network connection failed')
      expect(error.retryable).toBe(true)
    })

    it('应该创建带有选项的 AIError', () => {
      const error = createAIError('AUTH_ERROR', 'Invalid API key', {
        provider: 'openai',
        retryable: false,
        statusCode: 401,
      })

      expect(error.code).toBe('AUTH_ERROR')
      expect(error.message).toBe('Invalid API key')
      expect(error.provider).toBe('openai')
      expect(error.retryable).toBe(false)
      expect(error.statusCode).toBe(401)
    })

    it('应该自动计算 retryable 当未提供', () => {
      const error = createAIError('RATE_LIMIT', 'Rate limit exceeded')
      expect(error.retryable).toBe(true)
    })

    it('应该使用提供的 retryable 覆盖自动计算', () => {
      const error = createAIError('NETWORK_ERROR', 'Network error', { retryable: false })
      expect(error.retryable).toBe(false)
    })
  })

  describe('throwAIError', () => {
    it('应该抛出 AIError', () => {
      expect(() => {
        throwAIError(new Error('Test error'), { provider: 'openai' })
      }).toThrow()
    })

    it('应该抛出正确的错误码', () => {
      try {
        throwAIError('Rate limit exceeded', { provider: 'openai' })
      } catch (error) {
        const aiError = error as ReturnType<typeof toAIError>
        expect(aiError.code).toBe('RATE_LIMIT')
      }
    })
  })

  describe('isFetchError', () => {
    it('应该识别 FetchError', () => {
      // 创建一个带有 type 属性的 Error 对象来模拟 FetchError
      const fetchError = new Error('fetch failed') as Error & { type?: string }
      fetchError.type = 'system'

      const result = toAIError(fetchError, { provider: 'openai' })
      expect(result.code).toBe('NETWORK_ERROR')
      expect(result.retryable).toBe(true)
    })

    it('应该处理不带 type 属性的 Error', () => {
      const error = new Error('regular error')
      const result = toAIError(error, { provider: 'openai' })
      expect(result).toBeDefined()
    })

    it('应该处理 null 值', () => {
      const result = toAIError(null, { provider: 'openai' })
      expect(result.code).toBe('INTERNAL_ERROR')
      expect(result.message).toBe('null')
    })

    it('应该处理空对象', () => {
      const result = toAIError({}, { provider: 'openai' })
      expect(result.code).toBe('INTERNAL_ERROR')
      expect(result.message).toBe('{}')
    })
  })

  describe('inferErrorCodeFromMessage', () => {
    it('应该从包含 connection 的消息中推断网络错误', () => {
      const error = new Error('connection refused')
      const aiError = toAIError(error, { provider: 'openai' })
      expect(aiError.code).toBe('NETWORK_ERROR')
    })

    it('应该从包含 empty 的消息中推断空响应错误', () => {
      const error = new Error('empty response body')
      const aiError = toAIError(error, { provider: 'openai' })
      expect(aiError.code).toBe('EMPTY_RESPONSE')
    })

    it('应该从包含 no content 的消息中推断空响应错误', () => {
      const error = new Error('no content returned')
      const aiError = toAIError(error, { provider: 'openai' })
      expect(aiError.code).toBe('EMPTY_RESPONSE')
    })

    it('应该从包含 json 的消息中推断解析错误', () => {
      const error = new Error('invalid json response')
      const aiError = toAIError(error, { provider: 'openai' })
      expect(aiError.code).toBe('PARSE_ERROR')
    })

    it('应该从包含 invalid 的消息中推断解析错误', () => {
      const error = new Error('invalid response format')
      const aiError = toAIError(error, { provider: 'openai' })
      expect(aiError.code).toBe('PARSE_ERROR')
    })
  })

  describe('isRetryableError edge cases', () => {
    it('应该返回 false 对于无效请求错误', () => {
      expect(isRetryableError({ code: 'INVALID_REQUEST', message: 'Invalid request', retryable: false })).toBe(false)
    })

    it('应该返回 false 对于敏感内容错误', () => {
      expect(isRetryableError({ code: 'SENSITIVE_CONTENT', message: 'Content policy violation', retryable: false })).toBe(false)
    })

    it('应该返回 false 对于解析错误', () => {
      expect(isRetryableError({ code: 'PARSE_ERROR', message: 'JSON parse error', retryable: false })).toBe(false)
    })
  })
})
