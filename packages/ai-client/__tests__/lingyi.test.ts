/**
 * 零一万物 Yi (Lingyi) Client 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { LingyiClient, KlingClient, StepfunClient } from '../src/clients/lingyi.client'
import type { AIModelConfig, TextGenerateParams, ImageGenerateParams, VideoGenerateParams } from '../src/types'

describe('LingyiClient', () => {
  let client: LingyiClient
  let mockFetch: ReturnType<typeof vi.spyOn>

  const defaultConfig: AIModelConfig = {
    provider: 'lingyi',
    modelId: 'yi-large',
    apiKey: 'test-lingyi-key',
    baseURL: 'https://api.lingyiwanwu.com/v1',
    timeout: 5000,
  }

  beforeEach(() => {
    client = new LingyiClient(defaultConfig)
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
      const clientWithDefaults = new LingyiClient({
        provider: 'lingyi',
        modelId: 'yi-large',
        apiKey: 'test-key',
      })
      expect(clientWithDefaults).toBeDefined()
    })

    it('应该正确设置 provider', () => {
      expect(client.provider).toBe('lingyi')
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
      }

      const result = await client.generateText(params)

      expect(result.text).toBe('这是生成的文本')
      expect(result.usage?.totalTokens).toBe(30)
    })

    it('应该处理流式输出', async () => {
      const mockChunks = [
        'data: {"choices": [{"delta": {"content": "Hello"}}]}\n',
        'data: {"choices": [{"delta": {"content": " World"}}]}\n',
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
        client.generateText({ messages: [{ role: 'user', content: 'Hello' }] })
      ).rejects.toThrow('零一万物未返回任何内容')
    }, 20000)
  })

  describe('generateImage', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateImage({ prompt: 'A beautiful sunset' })
      expect(result.success).toBe(false)
      expect(result.error).toBe('零一万物不支持图像生成')
    })
  })

  describe('generateVideo', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateVideo({
        imageUrl: 'https://example.com/image.jpg',
        prompt: 'A cat walking',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('零一万物不支持视频生成')
    })
  })

  describe('generateAudio', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateAudio({ text: 'Hello world' })
      expect(result.success).toBe(false)
      expect(result.error).toBe('零一万物不支持语音生成')
    })
  })
})

describe('KlingClient', () => {
  let client: KlingClient
  let mockFetch: ReturnType<typeof vi.spyOn>

  const defaultConfig: AIModelConfig = {
    provider: 'kling',
    modelId: 'kling-v1',
    apiKey: 'test-kling-key',
    baseURL: 'https://api.kuaishou.com/ai/aigc',
    timeout: 5000,
  }

  beforeEach(() => {
    client = new KlingClient(defaultConfig)
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

  describe('generateImage', () => {
    it('应该成功生成图像', async () => {
      const mockResponse = {
        image_url: 'https://example.com/image.png',
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

      const result = await client.generateImage({ prompt: 'A beautiful sunset' })

      expect(result.success).toBe(true)
      expect(result.imageUrl).toBe('https://example.com/image.png')
    })
  })

  describe('generateVideo', () => {
    it('应该成功生成视频', async () => {
      const mockResponse = {
        video_url: 'https://example.com/video.mp4',
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

      const result = await client.generateVideo({
        imageUrl: 'https://example.com/image.jpg',
        prompt: 'A cat walking',
      })

      expect(result.success).toBe(true)
      expect(result.videoUrl).toBe('https://example.com/video.mp4')
    })
  })

  describe('generateText', () => {
    it('应该返回空结果', async () => {
      const result = await client.generateText({ messages: [{ role: 'user', content: 'Hello' }] })
      expect(result.text).toBe('')
    })
  })

  describe('generateAudio', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateAudio({ text: 'Hello world' })
      expect(result.success).toBe(false)
      expect(result.error).toBe('可灵不支持语音生成')
    })
  })
})

describe('StepfunClient', () => {
  let client: StepfunClient
  let mockFetch: ReturnType<typeof vi.spyOn>

  const defaultConfig: AIModelConfig = {
    provider: 'stepfun',
    modelId: 'step-1v-8k',
    apiKey: 'test-stepfun-key',
    baseURL: 'https://api.stepfun.com/v1',
    timeout: 5000,
  }

  beforeEach(() => {
    client = new StepfunClient(defaultConfig)
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

  describe('generateText', () => {
    it('应该成功生成文本', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: '这是生成的文本' },
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

      const result = await client.generateText({ messages: [{ role: 'user', content: 'Hello' }] })

      expect(result.text).toBe('这是生成的文本')
      expect(result.usage?.totalTokens).toBe(30)
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
        client.generateText({ messages: [{ role: 'user', content: 'Hello' }] })
      ).rejects.toThrow('阶跃星辰未返回任何内容')
    }, 20000)
  })

  describe('generateImage', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateImage({ prompt: 'A beautiful sunset' })
      expect(result.success).toBe(false)
      expect(result.error).toBe('阶跃星辰不支持图像生成')
    })
  })

  describe('generateVideo', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateVideo({
        imageUrl: 'https://example.com/image.jpg',
        prompt: 'A cat walking',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('阶跃星辰不支持视频生成')
    })
  })

  describe('generateAudio', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateAudio({ text: 'Hello world' })
      expect(result.success).toBe(false)
      expect(result.error).toBe('阶跃星辰不支持语音生成')
    })
  })
})
