/**
 * DeepSeek Client 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DeepSeekClient } from '../src/clients/deepseek.client'
import type { AIModelConfig, TextGenerateParams } from '../src/types'

describe('DeepSeekClient', () => {
  let client: DeepSeekClient
  let mockFetch: ReturnType<typeof vi.spyOn>

  const defaultConfig: AIModelConfig = {
    provider: 'deepseek',
    modelId: 'deepseek-v3',
    apiKey: 'test-deepseek-key',
    baseURL: 'https://api.deepseek.com/v1',
    timeout: 5000,
  }

  beforeEach(() => {
    client = new DeepSeekClient(defaultConfig)
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
      const clientWithDefaults = new DeepSeekClient({
        provider: 'deepseek',
        modelId: 'deepseek-v3',
        apiKey: 'test-key',
      })
      expect(clientWithDefaults).toBeDefined()
    })

    it('应该使用自定义 baseURL 初始化', () => {
      const customBaseURL = 'https://custom.deepseek.api'
      const clientWithCustomURL = new DeepSeekClient({
        provider: 'deepseek',
        modelId: 'deepseek-v3',
        apiKey: 'test-key',
        baseURL: customBaseURL,
      })
      expect(clientWithCustomURL).toBeDefined()
    })

    it('应该正确设置 provider', () => {
      expect(client.provider).toBe('deepseek')
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

    it('应该处理 R1 模型的推理输出', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: '这是最终答案',
              reasoning_content: '这是推理过程',
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

      const r1Client = new DeepSeekClient({
        provider: 'deepseek',
        modelId: 'deepseek-r1',
        apiKey: 'test-key',
      })

      const result = await r1Client.generateText({
        messages: [{ role: 'user', content: 'Hello' }],
      })

      expect(result.text).toBe('这是最终答案')
      expect(result.reasoning).toBe('这是推理过程')
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

    it('应该处理 R1 模型的流式推理输出', async () => {
      const mockChunks = [
        'data: {"choices": [{"delta": {"reasoning_content": "Let me think..."}}]}\n',
        'data: {"choices": [{"delta": {"content": "Hello"}}]}\n',
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
      const r1Client = new DeepSeekClient({
        provider: 'deepseek',
        modelId: 'deepseek-r1',
        apiKey: 'test-key',
      })

      const result = await r1Client.generateText(
        {
          messages: [{ role: 'user', content: 'Hello' }],
          stream: true,
        },
        onStream
      )

      expect(result.text).toBe('Hello')
      expect(result.reasoning).toBe('Let me think...')
      expect(onStream).toHaveBeenCalledWith({ type: 'reasoning', content: 'Let me think...' })
    })

    it('应该处理空响应', async () => {
      mockFetch.mockImplementationOnce(() =>
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
      ).rejects.toThrow('DeepSeek 未返回任何内容')
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
    it('应该返回不支持的错误', async () => {
      const result = await client.generateImage({
        prompt: 'A beautiful sunset',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('DeepSeek 不支持图像生成')
    })
  })

  describe('generateVideo', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateVideo({
        imageUrl: 'https://example.com/image.jpg',
        prompt: 'A cat walking',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('DeepSeek 不支持视频生成')
    })
  })

  describe('generateAudio', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateAudio({
        text: 'Hello world',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('DeepSeek 不支持语音生成')
    })
  })
})
