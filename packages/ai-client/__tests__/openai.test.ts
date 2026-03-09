/**
 * OpenAI Client 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OpenAIClient } from '../src/clients/openai.client'
import type { AIModelConfig, TextGenerateParams, ImageGenerateParams, AudioGenerateParams } from '../src/types'

describe('OpenAIClient', () => {
  let client: OpenAIClient
  let mockFetch: ReturnType<typeof vi.spyOn>

  const defaultConfig: AIModelConfig = {
    provider: 'openai',
    modelId: 'gpt-4-turbo',
    apiKey: 'test-openai-key',
    baseURL: 'https://api.openai.com/v1',
    timeout: 5000,
  }

  beforeEach(() => {
    client = new OpenAIClient(defaultConfig)
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
      const clientWithDefaults = new OpenAIClient({
        provider: 'openai',
        modelId: 'gpt-4-turbo',
        apiKey: 'test-key',
      })
      expect(clientWithDefaults).toBeDefined()
    })

    it('应该使用自定义 baseURL 初始化', () => {
      const customBaseURL = 'https://custom.openai.api'
      const clientWithCustomURL = new OpenAIClient({
        provider: 'openai',
        modelId: 'gpt-4-turbo',
        apiKey: 'test-key',
        baseURL: customBaseURL,
      })
      expect(clientWithCustomURL).toBeDefined()
    })

    it('应该正确设置 provider', () => {
      expect(client.provider).toBe('openai')
    })
  })

  describe('generateText', () => {
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
      ).rejects.toThrow('OpenAI 未返回任何选择')
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
        data: [
          {
            url: 'https://example.com/image.png',
            b64_json: 'base64-data',
          },
        ],
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
      ).rejects.toThrow('OpenAI 未返回图像')
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

  describe('generateAudio', () => {
    it('应该成功生成音频', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob(['audio-data'], { type: 'audio/mpeg' }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      const params: AudioGenerateParams = {
        text: 'Hello world',
        voice: 'alloy',
      }

      const result = await client.generateAudio(params)

      expect(result.success).toBe(true)
      expect(result.audioUrl).toBeDefined()
    })

    it('应该处理语速参数', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob(['audio-data'], { type: 'audio/mpeg' }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await client.generateAudio({
        text: 'Hello world',
        rate: 1.5,
      })

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.speed).toBe(1.5)
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
        client.generateAudio({
          text: 'Hello world',
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
      expect(result.error).toBe('OpenAI 不支持视频生成')
    })
  })
})
