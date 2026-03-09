/**
 * BaseAIClient 测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { BaseAIClient } from '../src/base'
import type { AIModelConfig, TextGenerateParams, TextGenerateResult, ImageGenerateParams, ImageGenerateResult, VideoGenerateParams, VideoGenerateResult, AudioGenerateParams, AudioGenerateResult } from '../src/types'

// 创建测试用的具体实现
class TestAIClient extends BaseAIClient {
  constructor(config: AIModelConfig) {
    super(config)
  }

  async generateText(_params: TextGenerateParams): Promise<TextGenerateResult> {
    return { text: 'test', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } }
  }

  async generateImage(_params: ImageGenerateParams): Promise<ImageGenerateResult> {
    return { success: true, imageUrl: 'test.png' }
  }

  async generateVideo(_params: VideoGenerateParams): Promise<VideoGenerateResult> {
    return { success: true, videoUrl: 'test.mp4' }
  }

  async generateAudio(_params: AudioGenerateParams): Promise<AudioGenerateResult> {
    return { success: true, audioUrl: 'test.mp3' }
  }

  // 暴露 protected 方法用于测试
  public testWithRetry<T>(fn: (attempt: number) => Promise<T>) {
    return this.withRetry(fn)
  }

  public testCreateAbortController(timeoutMs?: number) {
    return this.createAbortController(timeoutMs)
  }

  public testGetAbsoluteURL(path: string) {
    return this.getAbsoluteURL(path)
  }

  public testGetHeaders(customHeaders?: Record<string, string>) {
    return this.getHeaders(customHeaders)
  }
}

describe('BaseAIClient', () => {
  let client: TestAIClient

  beforeEach(() => {
    client = new TestAIClient({
      provider: 'test',
      modelId: 'test-model',
      apiKey: 'test-key',
      baseURL: 'https://api.test.com/v1',
      timeout: 5000,
    })
  })

  describe('constructor', () => {
    it('应该正确初始化配置', () => {
      expect(client.provider).toBe('test')
      expect(client.modelId).toBe('test-model')
      expect((client as unknown as { apiKey: string }).apiKey).toBe('test-key')
      expect((client as unknown as { baseURL: string }).baseURL).toBe('https://api.test.com/v1')
      expect((client as unknown as { timeout: number }).timeout).toBe(5000)
    })

    it('应该使用默认超时当未提供', () => {
      const defaultClient = new TestAIClient({
        provider: 'test',
        modelId: 'test-model',
        apiKey: 'test-key',
      })
      expect((defaultClient as unknown as { timeout: number }).timeout).toBe(120000)
    })
  })

  describe('withRetry', () => {
    it('应该在第一次成功时直接返回', async () => {
      const result = await client.testWithRetry(async () => 'success')
      expect(result).toBe('success')
    })

    it('应该在失败后重试', async () => {
      let attempts = 0
      const result = await client.testWithRetry(async (attempt) => {
        attempts++
        if (attempt < 3) {
          throw new Error('NETWORK_ERROR')
        }
        return 'success after retry'
      })
      expect(result).toBe('success after retry')
      expect(attempts).toBe(3)
    })

    it('应该在达到最大重试次数后抛出错误', async () => {
      await expect(client.testWithRetry(async () => {
        throw new Error('NETWORK_ERROR')
      })).rejects.toThrow()
    }, 15000)

    it('应该在遇到不可重试错误时直接抛出', async () => {
      await expect(client.testWithRetry(async () => {
        const error = new Error('Invalid API key')
        // 模拟认证错误
        throw { code: 'AUTH_ERROR', message: error.message, retryable: false }
      })).rejects.toThrow()
    })
  })

  describe('sleep', () => {
    it('应该等待指定时间', async () => {
      const start = Date.now()
      await client.sleep(100)
      const elapsed = Date.now() - start
      expect(elapsed).toBeGreaterThanOrEqual(90) // 允许 10% 误差
    })
  })

  describe('createAbortController', () => {
    it('应该创建带超时的 AbortController', () => {
      const { controller, timeoutId } = client.testCreateAbortController(1000)
      expect(controller).toBeDefined()
      expect(timeoutId).toBeDefined()
    })

    it('应该创建不带超时的 AbortController', () => {
      const { controller, timeoutId } = client.testCreateAbortController(0)
      expect(controller).toBeDefined()
      expect(timeoutId).toBeUndefined()
    })

    it('应该使用默认超时当未提供', () => {
      const { timeoutId } = client.testCreateAbortController()
      expect(timeoutId).toBeDefined()
    })
  })

  describe('getHeaders', () => {
    it('应该返回默认头', () => {
      const headers = client.testGetHeaders()
      expect(headers['Content-Type']).toBe('application/json')
    })

    it('应该合并自定义头', () => {
      const headers = client.testGetHeaders({
        'Authorization': 'Bearer token',
        'X-Custom': 'value',
      })
      expect(headers['Content-Type']).toBe('application/json')
      expect(headers['Authorization']).toBe('Bearer token')
      expect(headers['X-Custom']).toBe('value')
    })
  })

  describe('getAbsoluteURL', () => {
    it('应该返回带 baseURL 的绝对 URL', () => {
      const url = client.testGetAbsoluteURL('/chat/completions')
      expect(url).toBe('https://api.test.com/v1/chat/completions')
    })

    it('应该处理不带前导斜杠的路径', () => {
      const url = client.testGetAbsoluteURL('chat/completions')
      expect(url).toBe('https://api.test.com/v1/chat/completions')
    })

    it('应该处理带结尾斜杠的 baseURL', () => {
      const clientWithSlash = new TestAIClient({
        provider: 'test',
        modelId: 'test-model',
        apiKey: 'test-key',
        baseURL: 'https://api.test.com/v1/',
      })
      const url = clientWithSlash.testGetAbsoluteURL('/chat/completions')
      expect(url).toBe('https://api.test.com/v1/chat/completions')
    })

    it('应该返回原路径当没有 baseURL', () => {
      const clientWithoutBaseURL = new TestAIClient({
        provider: 'test',
        modelId: 'test-model',
        apiKey: 'test-key',
      })
      const url = clientWithoutBaseURL.testGetAbsoluteURL('/path')
      expect(url).toBe('/path')
    })
  })

  describe('handleStreamResponse', () => {
    it('应该在没有响应体时抛出错误', async () => {
      const mockResponse = {} as Response
      await expect(client.handleStreamResponse(
        mockResponse,
        () => {},
        undefined
      )).rejects.toThrow('响应体为空')
    })
  })

  describe('parseSSELine', () => {
    it('应该解析 event 行', () => {
      const result = client.parseSSELine('event: message')
      expect(result).toEqual({ event: 'message' })
    })

    it('应该解析 data 行', () => {
      const result = client.parseSSELine('data: {"text": "hello"}')
      expect(result).toEqual({ data: '{"text": "hello"}' })
    })

    it('应该返回 null 对于非 SSE 行', () => {
      const result = client.parseSSELine('regular text')
      expect(result).toBeNull()
    })
  })

  describe('parseSSEData', () => {
    it('应该返回 null 对于 [DONE]', () => {
      expect(client.parseSSEData('[DONE]')).toBeNull()
    })

    it('应该解析 JSON 数据', () => {
      const result = client.parseSSEData('{"text": "hello"}')
      expect(result).toEqual({ text: 'hello' })
    })

    it('应该返回原始数据对于非 JSON', () => {
      const result = client.parseSSEData('plain text')
      expect(result).toEqual({ text: 'plain text' })
    })
  })

  describe('validateResponse', () => {
    it('应该通过 ok 响应', async () => {
      const mockResponse = {
        ok: true,
      } as Response
      await expect(client.validateResponse(mockResponse)).resolves.toBeUndefined()
    })

    it('应该为非 ok 响应抛出错误', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      } as Response
      await expect(client.validateResponse(mockResponse)).rejects.toThrow()
    })
  })
})
