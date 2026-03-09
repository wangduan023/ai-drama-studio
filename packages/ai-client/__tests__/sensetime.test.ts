/**
 * 商汤科技 (SenseTime) Client 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SenseTimeClient } from '../src/clients/sensetime.client'
import type { AIModelConfig, TextGenerateParams, ImageGenerateParams } from '../src/types'

describe('SenseTimeClient', () => {
  let client: SenseTimeClient
  let mockFetch: ReturnType<typeof vi.spyOn>

  const defaultConfig: AIModelConfig = {
    provider: 'sensetime',
    modelId: 'sensechat-5',
    apiKey: 'test-api-key:test-secret-key',
    baseURL: 'https://api.sensetime.com',
    timeout: 5000,
  }

  beforeEach(() => {
    client = new SenseTimeClient(defaultConfig)
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
      const clientWithDefaults = new SenseTimeClient({
        provider: 'sensetime',
        modelId: 'sensechat-5',
        apiKey: 'test-api-key:test-secret-key',
      })
      expect(clientWithDefaults).toBeDefined()
    })

    it('应该使用自定义 baseURL 初始化', () => {
      const customBaseURL = 'https://custom.sensetime.api'
      const clientWithCustomURL = new SenseTimeClient({
        provider: 'sensetime',
        modelId: 'sensechat-5',
        apiKey: 'test-api-key:test-secret-key',
        baseURL: customBaseURL,
      })
      expect(clientWithCustomURL).toBeDefined()
    })

    it('应该正确设置 provider', () => {
      expect(client.provider).toBe('sensetime')
    })
  })

  describe('generateText', () => {
    beforeEach(() => {
      vi.spyOn(client as any, 'getAccessToken').mockResolvedValue('mock-access-token')
    })

    it('应该成功生成文本', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '这是生成的文本',
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
        id: 'test-request-id',
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
      expect(result.requestId).toBe('test-request-id')
    })

    it('应该处理流式输出', async () => {
      const mockChunks = [
        'data: {"choices": [{"delta": {"content": "Hello"}}]}\n',
        'data: {"choices": [{"delta": {"content": " World"}}]}\n',
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
          json: async () => ({ choices: [] }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await expect(
        client.generateText({
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('商汤日日新未返回任何内容')
    }, 15000)

    it('应该在 API Key 格式错误时抛出错误', async () => {
      const invalidClient = new SenseTimeClient({
        provider: 'sensetime',
        modelId: 'sensechat-5',
        apiKey: 'invalid-api-key',
      })

      await expect(
        invalidClient.generateText({
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('商汤 API Key 格式错误')
    })
  })

  describe('generateImage', () => {
    beforeEach(() => {
      vi.spyOn(client as any, 'getAccessToken').mockResolvedValue('mock-access-token')
    })

    it('应该成功生成图像', async () => {
      const mockResponse = {
        images: [
          {
            url: 'https://example.com/image.png',
            image_base64: 'base64-data',
          },
        ],
        request_id: 'test-request-id',
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
        resolution: 'HD',
      }

      const result = await client.generateImage(params)

      expect(result.success).toBe(true)
      expect(result.imageUrl).toBe('https://example.com/image.png')
      expect(result.imageBase64).toBe('base64-data')
    })

    it('应该处理空响应', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ images: [] }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      const result = await client.generateImage({
        prompt: 'Test',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('商汤日日新未返回任何图片')
    })

    it('应该解析 16:9 分辨率', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ images: [{ url: 'https://example.com/image.png' }] }),
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
      expect(body.width).toBe(1024)
      expect(body.height).toBe(576)
    })
  })

  describe('generateVideo', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateVideo({
        imageUrl: 'https://example.com/image.jpg',
        prompt: 'A cat walking',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('商汤日日新视频生成请使用 SenseVideo API')
    })
  })

  describe('generateAudio', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateAudio({
        text: 'Hello world',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('商汤日日新不支持语音生成')
    })
  })
})
