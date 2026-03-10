/**
 * 百度文心一言 (ERNIE Bot) Client 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BaiduClient } from '../src/clients/baidu.client'
import type { AIModelConfig, TextGenerateParams, ImageGenerateParams } from '../src/types'

describe('BaiduClient', () => {
  let client: BaiduClient
  let mockFetch: ReturnType<typeof vi.spyOn>

  const defaultConfig: AIModelConfig = {
    provider: 'baidu',
    modelId: 'ernie-4.0-turbo-8k',
    apiKey: 'test-api-key:test-secret-key',
    baseURL: 'https://qianfan.baidubce.com',
    timeout: 5000,
  }

  beforeEach(() => {
    client = new BaiduClient(defaultConfig)
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
      const clientWithDefaults = new BaiduClient({
        provider: 'baidu',
        modelId: 'ernie-4.0-turbo-8k',
        apiKey: 'test-api-key:test-secret-key',
      }, 15000)
      expect(clientWithDefaults).toBeDefined()
    }, 15000)

    it('应该使用自定义 baseURL 初始化', () => {
      const customBaseURL = 'https://custom.baidu.api'
      const clientWithCustomURL = new BaiduClient({
        provider: 'baidu',
        modelId: 'ernie-4.0-turbo-8k',
        apiKey: 'test-api-key:test-secret-key',
        baseURL: customBaseURL,
      }, 15000)
      expect(clientWithCustomURL).toBeDefined()
    }, 15000)

    it('应该正确设置 provider', () => {
      expect(client.provider).toBe('baidu')
    }, 15000)
  })

  describe('generateText', () => {
    beforeEach(() => {
      // Mock getAccessToken
      vi.spyOn(client as any, 'getAccessToken').mockResolvedValue('mock-access-token')
    }, 15000)

    it('应该成功生成文本', async () => {
      const mockResponse = {
        result: '这是生成的文本',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
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
      expect(result.usage).toBeDefined()
      expect(result.usage?.totalTokens).toBe(30)
    }, 15000)

    it('应该处理流式输出', async () => {
      const mockChunks = [
        'data: {"result": "Hello", "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15}}\n',
        'data: {"result": " World"}\n',
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
          json: async () => ({ result: '' }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await expect(
        client.generateText({
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('文心一言未返回任何内容')
    }, 20000)

    it('应该在 API Key 格式错误时抛出错误', async () => {
      const invalidClient = new BaiduClient({
        provider: 'baidu',
        modelId: 'ernie-4.0-turbo-8k',
        apiKey: 'invalid-api-key',
      }, 15000)

      await expect(
        invalidClient.generateText({
          messages: [{ role: 'user', content: 'Hello' }],
        }, 15000)
      ).rejects.toThrow('百度 API Key 格式错误')
    }, 15000)

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
        }, 15000)
      ).rejects.toThrow()
    }, 15000)
  })

  describe('generateImage', () => {
    beforeEach(() => {
      vi.spyOn(client as any, 'getAccessToken').mockResolvedValue('mock-access-token')
    }, 15000)

    it('应该成功生成图像', async () => {
      const mockResponse = {
        data: {
          imgUrls: ['https://example.com/image.png'],
        },
        log_id: 'test-log-id',
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
    }, 15000)

    it('应该处理 16:9 宽高比', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: { imgUrls: ['https://example.com/image.png'] } }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await client.generateImage({
        prompt: 'Test',
        aspectRatio: '16:9',
        resolution: '2K',
      }, 15000)

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.width).toBe(1920)
      expect(body.height).toBe(1080)
    }, 15000)

    it('应该处理 1:1 宽高比', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: { imgUrls: ['https://example.com/image.png'] } }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await client.generateImage({
        prompt: 'Test',
        aspectRatio: '1:1',
      }, 15000)

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.width).toBe(512)
      expect(body.height).toBe(512)
    }, 15000)

    it('应该处理 9:16 宽高比', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: { imgUrls: ['https://example.com/image.png'] } }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await client.generateImage({
        prompt: 'Test',
        aspectRatio: '9:16',
      }, 15000)

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.width).toBe(720)
      expect(body.height).toBe(1280)
    }, 15000)

    it('应该处理 4:3 宽高比', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: { imgUrls: ['https://example.com/image.png'] } }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await client.generateImage({
        prompt: 'Test',
        aspectRatio: '4:3',
      }, 15000)

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.width).toBe(1024)
      expect(body.height).toBe(768)
    }, 15000)

    it('应该处理 3:4 宽高比', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: { imgUrls: ['https://example.com/image.png'] } }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await client.generateImage({
        prompt: 'Test',
        aspectRatio: '3:4',
      }, 15000)

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.width).toBe(768)
      expect(body.height).toBe(1024)
    }, 15000)

    it('应该处理 2K 分辨率', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: { imgUrls: ['https://example.com/image.png'] } }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await client.generateImage({
        prompt: 'Test',
        aspectRatio: '16:9',
        resolution: '2K',
      }, 15000)

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.width).toBe(1920)
      expect(body.height).toBe(1080)
    }, 15000)

    it('应该处理 negativePrompt 参数', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: { imgUrls: ['https://example.com/image.png'] } }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await client.generateImage({
        prompt: 'Test',
        negativePrompt: 'blurry',
      }, 15000)

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.negative_prompt).toBe('blurry')
    }, 15000)

    it('应该处理 n 参数', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: { imgUrls: ['https://example.com/image.png'] } }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await client.generateImage({
        prompt: 'Test',
        n: 2,
      }, 15000)

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.n).toBe(2)
    }, 15000)

    it('应该处理空响应', async () => {
      // Mock 返回空响应（因为重试逻辑，会重试 3 次）
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: {} }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      const result = await client.generateImage({
        prompt: 'Test',
      }, 15000)

      expect(result.success).toBe(false)
      expect(result.error).toBe('百度文心一格未返回任何图片')
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
        }, 15000)
      ).rejects.toThrow()
    }, 15000)

    it('应该处理 base64 响应', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: { imgUrls: ['https://example.com/image.png'] } }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      const result = await client.generateImage({
        prompt: 'Test',
      }, 15000)

      expect(result.success).toBe(true)
      expect(result.imageUrl).toBe('https://example.com/image.png')
    }, 15000)
  })

  describe('generateVideo', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateVideo({
        imageUrl: 'https://example.com/image.jpg',
        prompt: 'A cat walking',
      }, 15000)
      expect(result.success).toBe(false)
      expect(result.error).toBe('文心一言不支持视频生成')
    }, 15000)
  })

  describe('generateAudio', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateAudio({
        text: 'Hello world',
      }, 15000)
      expect(result.success).toBe(false)
      expect(result.error).toBe('文心一言不支持语音生成')
    }, 15000)
  })
})
