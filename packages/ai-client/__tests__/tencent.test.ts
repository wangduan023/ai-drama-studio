/**
 * 腾讯混元 (Hunyuan) Client 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TencentClient } from '../src/clients/tencent.client'
import type { AIModelConfig, TextGenerateParams, ImageGenerateParams } from '../src/types'

describe('TencentClient', () => {
  let client: TencentClient
  let mockFetch: ReturnType<typeof vi.spyOn>

  const defaultConfig: AIModelConfig = {
    provider: 'tencent',
    modelId: 'hunyuan-pro',
    apiKey: 'test-secret-id:test-secret-key',
    baseURL: 'https://hunyuan.tencentcloudapi.com',
    timeout: 5000,
  }

  beforeEach(() => {
    client = new TencentClient(defaultConfig)
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
      const clientWithDefaults = new TencentClient({
        provider: 'tencent',
        modelId: 'hunyuan-pro',
        apiKey: 'test-secret-id:test-secret-key',
      })
      expect(clientWithDefaults).toBeDefined()
    })

    it('应该使用自定义 baseURL 初始化', () => {
      const customBaseURL = 'https://custom.tencent.api'
      const clientWithCustomURL = new TencentClient({
        provider: 'tencent',
        modelId: 'hunyuan-pro',
        apiKey: 'test-secret-id:test-secret-key',
        baseURL: customBaseURL,
      })
      expect(clientWithCustomURL).toBeDefined()
    })

    it('应该正确设置 provider', () => {
      expect(client.provider).toBe('tencent')
    })
  })

  describe('generateText', () => {
    it('应该成功生成文本', async () => {
      const mockResponse = {
        Response: {
          Choices: [
            {
              Message: {
                Content: '这是生成的文本',
              },
            },
          ],
          Usage: {
            InputTokens: 10,
            OutputTokens: 20,
            TotalTokens: 30,
          },
          RequestId: 'test-request-id',
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
      expect(result.requestId).toBe('test-request-id')
    })

    it('应该处理流式输出', async () => {
      const mockChunks = [
        'data: {"Choices": [{"Delta": {"Content": "Hello"}}]}\n',
        'data: {"Choices": [{"Delta": {"Content": " World"}}]}\n',
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
          json: async () => ({}),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await expect(
        client.generateText({
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('混元未返回任何内容')
    }, 15000)

    it('应该处理空 Choices', async () => {
      // Mock 返回空 Choices（因为重试逻辑，会重试 3 次）
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ Response: { Choices: [] } }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await expect(
        client.generateText({
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('混元未返回任何选择')
    }, 15000)

    it('应该在 API Key 格式错误时抛出错误', async () => {
      const invalidClient = new TencentClient({
        provider: 'tencent',
        modelId: 'hunyuan-pro',
        apiKey: 'invalid-api-key',
      })

      await expect(
        invalidClient.generateText({
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('腾讯 API Key 格式错误')
    })

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
        Response: {
          Images: [
            {
              ImageUrl: 'https://example.com/image.png',
              ImageBase64: 'base64-data',
            },
          ],
          RequestId: 'test-request-id',
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

      const params: ImageGenerateParams = {
        prompt: 'A beautiful sunset',
        aspectRatio: '16:9',
        resolution: '2K',
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
          json: async () => ({ Response: {} }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      const result = await client.generateImage({
        prompt: 'Test',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('腾讯混元图像未返回任何图片')
    })

    it('应该处理空 Images 数组', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ Response: { Images: [] } }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      const result = await client.generateImage({
        prompt: 'Test',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('腾讯混元图像未返回任何图片')
    })

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
      expect(result.error).toBe('混元不支持视频生成')
    })
  })

  describe('generateAudio', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateAudio({
        text: 'Hello world',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('混元不支持语音生成')
    })
  })
})
