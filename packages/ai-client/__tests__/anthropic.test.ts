/**
 * Anthropic Client 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { AnthropicClient } from '../src/clients/anthropic.client'
import type { AIModelConfig, TextGenerateParams } from '../src/types'

describe('AnthropicClient', () => {
  let client: AnthropicClient
  let mockFetch: ReturnType<typeof vi.spyOn>

  const defaultConfig: AIModelConfig = {
    provider: 'anthropic',
    modelId: 'claude-3-5-sonnet-20241022',
    apiKey: 'test-anthropic-key',
    baseURL: 'https://api.anthropic.com',
    timeout: 5000,
  }

  beforeEach(() => {
    client = new AnthropicClient(defaultConfig)
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
      const clientWithDefaults = new AnthropicClient({
        provider: 'anthropic',
        modelId: 'claude-3-5-sonnet-20241022',
        apiKey: 'test-key',
      })
      expect(clientWithDefaults).toBeDefined()
    })

    it('应该使用自定义 baseURL 初始化', () => {
      const customBaseURL = 'https://custom.anthropic.api'
      const clientWithCustomURL = new AnthropicClient({
        provider: 'anthropic',
        modelId: 'claude-3-5-sonnet-20241022',
        apiKey: 'test-key',
        baseURL: customBaseURL,
      })
      expect(clientWithCustomURL).toBeDefined()
    })

    it('应该使用自定义 API 版本初始化', () => {
      const clientWithCustomVersion = new AnthropicClient(
        {
          provider: 'anthropic',
          modelId: 'claude-3-5-sonnet-20241022',
          apiKey: 'test-key',
        },
        '2023-01-01'
      )
      expect(clientWithCustomVersion).toBeDefined()
    })

    it('应该正确设置 provider', () => {
      expect(client.provider).toBe('anthropic')
    })
  })

  describe('generateText', () => {
    it('应该成功生成文本', async () => {
      const mockResponse = {
        id: 'test-request-id',
        content: [
          {
            type: 'text',
            text: '这是生成的文本',
          },
        ],
        usage: {
          input_tokens: 10,
          output_tokens: 20,
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

    it('应该处理 system 消息', async () => {
      const mockResponse = {
        id: 'test-request-id',
        content: [{ type: 'text', text: 'Response' }],
        usage: { input_tokens: 10, output_tokens: 5 },
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
      expect(body.system).toBe('You are helpful')
    })

    it('应该处理流式输出', async () => {
      const mockChunks = [
        'data: {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "Hello"}}\n',
        'data: {"type": "content_block_delta", "delta": {"type": "text_delta", "text": " World"}}\n',
        'data: {"type": "message_delta", "usage": {"output_tokens": 10}}\n',
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
      expect(result.usage?.completionTokens).toBe(10)
      expect(onStream).toHaveBeenCalled()
    })

    it('应该处理空响应', async () => {
      // Mock 返回空响应（因为重试逻辑，会重试 3 次）
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ content: [] }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await expect(
        client.generateText({
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('Anthropic 未返回任何内容')
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
    it('应该返回不支持的错误', async () => {
      const result = await client.generateImage({
        prompt: 'A beautiful sunset',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Anthropic 不支持图像生成')
    })
  })

  describe('generateVideo', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateVideo({
        imageUrl: 'https://example.com/image.jpg',
        prompt: 'A cat walking',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Anthropic 不支持视频生成')
    })
  })

  describe('generateAudio', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateAudio({
        text: 'Hello world',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Anthropic 不支持语音生成')
    })
  })
})
