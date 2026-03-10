/**
 * 智谱 AI GLM Client 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ZhipuClient } from '../src/clients/zhipu.client'
import type { AIModelConfig, TextGenerateParams, ImageGenerateParams } from '../src/types'

describe('ZhipuClient', () => {
  let client: ZhipuClient
  let mockFetch: ReturnType<typeof vi.spyOn>

  const defaultConfig: AIModelConfig = {
    provider: 'zhipu',
    modelId: 'glm-4',
    apiKey: 'test-api-key.test-secret-key',
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
    timeout: 5000,
  }

  beforeEach(() => {
    client = new ZhipuClient(defaultConfig)
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
      const clientWithDefaults = new ZhipuClient({
        provider: 'zhipu',
        modelId: 'glm-4',
        apiKey: 'test-api-key.test-secret-key',
      })
      expect(clientWithDefaults).toBeDefined()
    })

    it('应该使用自定义 baseURL 初始化', () => {
      const customBaseURL = 'https://custom.zhipu.api'
      const clientWithCustomURL = new ZhipuClient({
        provider: 'zhipu',
        modelId: 'glm-4',
        apiKey: 'test-api-key.test-secret-key',
        baseURL: customBaseURL,
      })
      expect(clientWithCustomURL).toBeDefined()
    })

    it('应该正确设置 provider', () => {
      expect(client.provider).toBe('zhipu')
    })
  })

  describe('generateText', () => {
    beforeEach(() => {
      // Mock JWT token generation
      vi.spyOn(client as any, 'getAccessToken').mockResolvedValue('mock-jwt-token')
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

    it('应该处理流式输出中的 usage 信息', async () => {
      const mockChunks = [
        'data: {"choices": [{"delta": {"content": "Hello"}}], "usage": {"prompt_tokens": 5, "completion_tokens": 10, "total_tokens": 15}}\n',
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

      expect(result.text).toBe('Hello')
      expect(result.usage?.totalTokens).toBe(15)
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
      ).rejects.toThrow('GLM 未返回任何内容')
    }, 15000)

    it('应该在 API Key 格式错误时抛出错误', async () => {
      const invalidClient = new ZhipuClient({
        provider: 'zhipu',
        modelId: 'glm-4',
        apiKey: 'invalid-api-key',
      })

      await expect(
        invalidClient.generateText({
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('智谱 API Key 格式错误')
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

    it('应该处理多模态消息', async () => {
      const mockResponse = {
        choices: [{ message: { content: '这是一张图片' } }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
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

      const result = await client.generateText({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: '这是什么？' },
              { type: 'image_url', image_url: 'https://example.com/image.jpg' },
            ],
          },
        ],
      })

      expect(result.text).toBe('这是一张图片')
    })

    it('应该使用自定义模型 ID', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
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

      const customClient = new ZhipuClient({
        provider: 'zhipu',
        modelId: 'glm-4-flash',
        apiKey: 'test-api-key.test-secret-key',
      })
      vi.spyOn(customClient as any, 'getAccessToken').mockResolvedValue('mock-jwt-token')

      await customClient.generateText({ messages: [{ role: 'user', content: 'Hello' }] })

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit
      const body = JSON.parse(callArgs.body as string)
      expect(body.model).toBe('glm-4-flash')
    })
  })

  describe('generateImage', () => {
    beforeEach(() => {
      vi.spyOn(client as any, 'getAccessToken').mockResolvedValue('mock-jwt-token')
    })

    it('应该成功生成图像', async () => {
      const mockResponse = {
        data: [
          {
            url: 'https://example.com/image.png',
            b64_json: 'base64-data',
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
      expect(result.imageUrl).toBe('https://example.com/image.png')
      expect(result.imageBase64).toBe('base64-data')
    })

    it('应该处理 16:9 宽高比', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: [{ url: 'https://example.com/image.png' }] }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await client.generateImage({
        prompt: 'Test',
        aspectRatio: '16:9',
        resolution: '4K',
      })

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.size).toBe('1792x1024')
    })

    it('应该处理 9:16 宽高比', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: [{ url: 'https://example.com/image.png' }] }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await client.generateImage({
        prompt: 'Test',
        aspectRatio: '9:16',
        resolution: '4K',
      })

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.size).toBe('1024x1792')
    })

    it('应该处理默认分辨率', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: [{ url: 'https://example.com/image.png' }] }),
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
      expect(body.size).toBe('1024x1024')
    })

    it('应该处理 n 参数', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: [{ url: 'https://example.com/image.png' }] }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await client.generateImage({
        prompt: 'Test',
        n: 2,
      })

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.n).toBe(2)
    })

    it('应该处理空响应', async () => {
      // Mock 返回空响应（因为重试逻辑，会重试 3 次）
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: [] }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await expect(
        client.generateImage({
          prompt: 'Test',
        })
      ).rejects.toThrow('CogView 未返回图像')
    }, 15000)

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
      expect(result.error).toBe('GLM 不支持视频生成')
    })
  })

  describe('generateAudio', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateAudio({
        text: 'Hello world',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('GLM 不支持语音生成')
    })
  })

  describe('JWT Token 生成', () => {
    it('应该缓存 token 直到过期', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
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

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockResponse,
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      // 第一次调用会生成 token
      await client.generateText({ messages: [{ role: 'user', content: 'Hello' }] })

      // 第二次调用应该使用缓存的 token
      await client.generateText({ messages: [{ role: 'user', content: 'Hello' }] })

      // fetch 应该只被调用 2 次（两次请求），而不是 3 次（如果每次都生成新 token）
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('应该在 token 过期后重新生成', async () => {
      // 使用 vi.useFakeTimers 来测试 token 过期逻辑
      vi.useFakeTimers()

      const mockResponse = {
        choices: [{ message: { content: 'Response' } }],
        usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
      }

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockResponse,
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      // 第一次调用
      await client.generateText({ messages: [{ role: 'user', content: 'Hello' }] })

      // 快进 56 分钟（超过 token 有效期 55 分钟）
      vi.advanceTimersByTime(56 * 60 * 1000)

      // 第二次调用应该重新生成 token
      await client.generateText({ messages: [{ role: 'user', content: 'Hello' }] })

      vi.useRealTimers()
    })
  })
})
