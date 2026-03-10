/**
 * Ollama Client 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { OllamaClient } from '../src/clients/ollama.client'
import type { AIModelConfig, TextGenerateParams } from '../src/types'

describe('OllamaClient', () => {
  let client: OllamaClient
  let mockFetch: ReturnType<typeof vi.spyOn>

  const defaultConfig: AIModelConfig = {
    provider: 'ollama',
    modelId: 'llama3.1',
    apiKey: '', // Ollama 本地部署不需要 API Key
    baseURL: 'http://localhost:11434/api',
    timeout: 5000,
  }

  beforeEach(() => {
    client = new OllamaClient(defaultConfig)
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
      const clientWithDefaults = new OllamaClient({
        provider: 'ollama',
        modelId: 'llama3.1',
        apiKey: '',
      })
      expect(clientWithDefaults).toBeDefined()
    })

    it('应该使用自定义 baseURL 初始化', () => {
      const customBaseURL = 'https://custom.ollama.api'
      const clientWithCustomURL = new OllamaClient({
        provider: 'ollama',
        modelId: 'llama3.1',
        apiKey: '',
        baseURL: customBaseURL,
      })
      expect(clientWithCustomURL).toBeDefined()
    })

    it('应该正确设置 provider', () => {
      expect(client.provider).toBe('ollama')
    })
  })

  describe('generateText', () => {
    it('应该成功生成文本', async () => {
      const mockResponse = {
        message: {
          content: '这是生成的文本',
          role: 'assistant',
        },
        prompt_eval_count: 10,
        eval_count: 20,
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

    it('应该处理流式输出', async () => {
      const mockChunks = [
        '{"message": {"content": "Hello", "role": "assistant"}}\n',
        '{"message": {"content": " World", "role": "assistant"}}\n',
        '{"message": {"content": "", "role": "assistant"}, "done": true, "prompt_eval_count": 10, "eval_count": 20}\n',
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
      expect(result.usage?.totalTokens).toBe(30)
      expect(onStream).toHaveBeenCalledTimes(3) // 2 次 text + 1 次 done
    })

    it('应该处理多轮对话历史', async () => {
      const mockResponse = {
        message: {
          content: 'Response',
          role: 'assistant',
        },
        prompt_eval_count: 20,
        eval_count: 10,
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
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'user', content: 'How are you?' },
        ],
      })

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.messages.length).toBe(3)
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
      ).rejects.toThrow('Ollama 未返回任何内容')
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
      expect(result.error).toBe('Ollama 不支持图像生成')
    })
  })

  describe('generateVideo', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateVideo({
        imageUrl: 'https://example.com/image.jpg',
        prompt: 'A cat walking',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Ollama 不支持视频生成')
    })
  })

  describe('generateAudio', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateAudio({
        text: 'Hello world',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Ollama 不支持语音生成')
    })
  })

  describe('多模态消息处理', () => {
    it('应该处理包含图片的消息', async () => {
      const mockResponse = {
        message: {
          content: '这是一只猫',
          role: 'assistant',
        },
        prompt_eval_count: 50,
        eval_count: 20,
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
              { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,abcd1234' } },
            ],
          },
        ],
      })

      expect(result.text).toBe('这是一只猫')

      // 验证请求体包含图片
      const callArgs = mockFetch.mock.calls[0][1] as RequestInit
      const body = JSON.parse(callArgs.body as string)
      expect(body.messages[0].images).toEqual(['abcd1234'])
    })

    it('应该处理多张图片', async () => {
      const mockResponse = {
        message: { content: '图片内容', role: 'assistant' },
        prompt_eval_count: 100,
        eval_count: 30,
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
          {
            role: 'user',
            content: [
              { type: 'text', text: '比较这两张图片' },
              { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,abc' } },
              { type: 'image_url', image_url: { url: 'data:image/png;base64,xyz' } },
            ],
          },
        ],
      })

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit
      const body = JSON.parse(callArgs.body as string)
      expect(body.messages[0].images).toEqual(['abc', 'xyz'])
    })

    it('应该处理普通文本消息', async () => {
      const mockResponse = {
        message: { content: 'Response', role: 'assistant' },
        prompt_eval_count: 10,
        eval_count: 10,
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
        messages: [{ role: 'user', content: 'Hello' }],
      })

      const callArgs = mockFetch.mock.calls[0][1] as RequestInit
      const body = JSON.parse(callArgs.body as string)
      expect(body.messages[0].content).toBe('Hello')
      expect(body.messages[0].images).toBeUndefined()
    })

    it('应该处理非 base64 的 URL 并记录警告', async () => {
      const mockResponse = {
        message: { content: 'Response', role: 'assistant' },
        prompt_eval_count: 10,
        eval_count: 10,
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

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await client.generateText({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: '这是什么？' },
              { type: 'image_url', image_url: { url: 'https://example.com/image.jpg' } },
            ],
          },
        ],
      })

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Ollama] 普通图片 URL 需要下载后才能使用:',
        'https://example.com/image.jpg'
      )

      consoleWarnSpy.mockRestore()
    })
  })

  describe('流式输出', () => {
    it('应该处理流式输出中的 done 标记', async () => {
      const mockChunks = [
        '{"message": {"content": "Hello", "role": "assistant"}}\n',
        '{"message": {"content": "", "role": "assistant"}, "done": true, "prompt_eval_count": 5, "eval_count": 10}\n',
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
        { messages: [{ role: 'user', content: 'Hello' }], stream: true },
        onStream
      )

      expect(result.text).toBe('Hello')
      expect(result.usage?.promptTokens).toBe(5)
      expect(result.usage?.completionTokens).toBe(10)
    })

    it('应该处理流式输出中的错误响应', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          body: {
            getReader: () => ({
              read: async () => ({ done: true }),
              releaseLock: () => {},
            }),
          },
          text: async () => 'Internal error',
          headers: new Headers(),
        } as unknown as Response)
      )

      const onStream = vi.fn()
      await expect(
        client.generateText(
          { messages: [{ role: 'user', content: 'Hello' }], stream: true },
          onStream
        )
      ).rejects.toThrow()
    })
  })
})
