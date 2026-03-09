/**
 * Google Gemini Client 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GeminiClient } from '../src/clients/gemini.client'
import type { AIModelConfig, TextGenerateParams, ImageGenerateParams } from '../src/types'

describe('GeminiClient', () => {
  let client: GeminiClient
  let mockFetch: ReturnType<typeof vi.spyOn>

  const defaultConfig: AIModelConfig = {
    provider: 'gemini',
    modelId: 'gemini-2.0-flash',
    apiKey: 'test-gemini-key',
    baseURL: 'https://generativelanguage.googleapis.com',
    timeout: 5000,
  }

  beforeEach(() => {
    client = new GeminiClient(defaultConfig)
    mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({}),
        text: async () => '',
        headers: new Headers(),
      } as Response)
    )
  })

  afterEach(() => {
    mockFetch.mockRestore()
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('应该使用默认 baseURL 初始化', () => {
      const clientWithDefaults = new GeminiClient({
        provider: 'gemini',
        modelId: 'gemini-2.0-flash',
        apiKey: 'test-key',
      })
      expect(clientWithDefaults).toBeDefined()
    })

    it('应该使用自定义 baseURL 初始化', () => {
      const customBaseURL = 'https://custom.gemini.api'
      const clientWithCustomURL = new GeminiClient({
        provider: 'gemini',
        modelId: 'gemini-2.0-flash',
        apiKey: 'test-key',
        baseURL: customBaseURL,
      })
      expect(clientWithCustomURL).toBeDefined()
    })

    it('应该正确设置 provider', () => {
      expect(client.provider).toBe('gemini')
    })
  })

  describe('generateText', () => {
    it('应该成功生成文本', async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [{ text: '这是生成的文本' }],
              role: 'model',
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
          totalTokenCount: 30,
        },
      }

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockResponse,
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      const params: TextGenerateParams = {
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
        maxTokens: 100,
      }

      const result = await client.generateText(params)

      expect(result.text).toBe('这是生成的文本')
      expect(result.usage?.totalTokens).toBe(30)
    })

    it('应该处理 system 指令', async () => {
      const mockResponse = {
        candidates: [{ content: { parts: [{ text: 'Response' }], role: 'model' } }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
      }

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockResponse,
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await client.generateText({
        messages: [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Hello' },
        ],
      })

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.systemInstruction).toBeDefined()
    })

    it('应该处理流式输出', async () => {
      const mockChunks = [
        'data: {"candidates": [{"content": {"parts": [{"text": "Hello"}]}}]}\n',
        'data: {"candidates": [{"content": {"parts": [{"text": " World"}]}}]}\n',
        'data: {"usageMetadata": {"promptTokenCount": 10, "candidatesTokenCount": 20, "totalTokenCount": 30}}\n',
        'data: [DONE]\n',
      ]
      let chunkIndex = 0

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          body: {
            getReader: () => ({
              read: async () => {
                if (chunkIndex < mockChunks.length) {
                  return { value: new TextEncoder().encode(mockChunks[chunkIndex++]), done: false }
                }
                return { done: true }
              },
              releaseLock: () => {},
            }),
          },
          text: async () => '',
          headers: new Headers(),
        } as unknown as Response)
      )

      const onStream = vi.fn()
      const result = await client.generateText(
        {
          messages: [{ role: 'user', content: 'Hello' }],
          stream: true,
        },
        onStream
      )

      expect(result.text).toBe('Hello World')
      expect(onStream).toHaveBeenCalled()
    })

    it('应该处理空响应', async () => {
      // Mock 返回空响应（因为重试逻辑，会重试 3 次）
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ candidates: [] }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await expect(
        client.generateText({
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('Gemini 未返回任何内容')
    }, 20000)

    it('应该在 API 错误时抛出错误', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          text: async () => 'Unauthorized',
        } as Response)
      )

      await expect(
        client.generateText({
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow()
    })
  })

  describe('generateImage', () => {
    it('应该成功生成图像', async () => {
      const mockResponse = {
        predictions: [
          {
            bytesBase64Encoded: 'base64-image-data',
          },
        ],
      }

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockResponse,
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      const params: ImageGenerateParams = {
        prompt: 'A beautiful sunset',
        aspectRatio: '1:1',
      }

      const result = await client.generateImage(params)

      expect(result.success).toBe(true)
      expect(result.imageBase64).toBe('base64-image-data')
    })

    it('应该处理 16:9 宽高比', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ predictions: [{ bytesBase64Encoded: 'data' }] }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await client.generateImage({
        prompt: 'Test',
        aspectRatio: '16:9',
      })

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.parameters.aspectRatio).toBe('16_9')
    })

    it('应该处理空响应', async () => {
      // Mock 返回空响应（因为重试逻辑，会重试 3 次）
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ predictions: [] }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await expect(
        client.generateImage({
          prompt: 'Test',
        })
      ).rejects.toThrow('Imagen 未返回图像')
    }, 20000)

    it('应该在 API 错误时抛出错误', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          text: async () => 'Internal error',
        } as Response)
      )

      await expect(
        client.generateImage({
          prompt: 'Test',
        })
      ).rejects.toThrow()
    })
  })

  describe('generateVideo', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateVideo({
        imageUrl: 'https://example.com/image.jpg',
        prompt: 'A cat walking',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Gemini 不直接支持视频生成')
    })
  })

  describe('generateAudio', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateAudio({
        text: 'Hello world',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Gemini 不支持语音生成')
    })
  })
})
