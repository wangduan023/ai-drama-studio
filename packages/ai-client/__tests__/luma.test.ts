/**
 * Luma AI Client 测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { LumaClient } from '../src/clients/luma.client'
import type { AIModelConfig, VideoGenerateParams } from '../src/types'

describe('LumaClient', () => {
  let client: LumaClient
  let mockFetch: ReturnType<typeof vi.spyOn>

  const defaultConfig: AIModelConfig = {
    provider: 'luma',
    modelId: 'dream-machine',
    apiKey: 'test-luma-key',
    baseURL: 'https://api.lumalabs.ai/dream-machine/v1',
    timeout: 5000,
  }

  beforeEach(() => {
    client = new LumaClient(defaultConfig)
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
      const clientWithDefaults = new LumaClient({
        provider: 'luma',
        modelId: 'dream-machine',
        apiKey: 'test-key',
      })
      expect(clientWithDefaults).toBeDefined()
    })

    it('应该使用自定义 baseURL 初始化', () => {
      const customBaseURL = 'https://custom.luma.api/v1'
      const clientWithCustomURL = new LumaClient({
        provider: 'luma',
        modelId: 'dream-machine',
        apiKey: 'test-key',
        baseURL: customBaseURL,
      })
      expect(clientWithCustomURL).toBeDefined()
    })

    it('应该正确设置 provider 和 modelId', () => {
      expect(client.provider).toBe('luma')
      expect(client.modelId).toBe('dream-machine')
    })
  })

  describe('generateText', () => {
    it('应该抛出错误', async () => {
      await expect(
        client.generateText({
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('不支持文本生成')
    })
  })

  describe('generateImage', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateImage({
        prompt: 'A beautiful sunset',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Luma AI 不支持图像生成')
    })
  })

  describe('generateVideo', () => {
    it('应该成功发起视频生成请求', async () => {
      const mockResponse = {
        id: 'test-video-id',
        state: 'pending',
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

      const params: VideoGenerateParams = {
        imageUrl: 'https://example.com/image.jpg',
        prompt: 'A cat walking',
        duration: 5,
      }

      const result = await client.generateVideo(params)

      expect(result.success).toBe(true)
      expect(result.async).toBe(true)
      expect(result.externalId).toBe('test-video-id')
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.lumalabs.ai/dream-machine/v1/generations',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-luma-key',
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('应该处理不带 imageUrl 的请求', async () => {
      const mockResponse = {
        id: 'test-video-id-2',
        state: 'pending',
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
        prompt: 'A cat walking',
      } as VideoGenerateParams)

      expect(result.success).toBe(true)
      expect(result.externalId).toBe('test-video-id-2')

      // 验证请求体不包含 image 字段
      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.image).toBeUndefined()
    })

    it('应该处理已完成的视频响应', async () => {
      const mockResponse = {
        id: 'test-video-id-3',
        state: 'completed',
        video: {
          url: 'https://example.com/video.mp4',
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

      const result = await client.generateVideo({
        prompt: 'A cat walking',
      } as VideoGenerateParams)

      expect(result.success).toBe(true)
      expect(result.async).toBeUndefined()
      expect(result.videoUrl).toBe('https://example.com/video.mp4')
    })

    it('应该处理失败的视频响应', async () => {
      const mockResponse = {
        id: 'test-video-id-4',
        state: 'failed',
        failure_reason: 'Invalid prompt',
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
        prompt: 'Invalid prompt',
      } as VideoGenerateParams)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid prompt')
    })

    it('应该处理没有返回 ID 的响应', async () => {
      const mockResponse = {
        state: 'pending',
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
        prompt: 'A cat walking',
      } as VideoGenerateParams)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Luma AI 未返回任务 ID')
    })

    it('应该处理超过 5 秒的 duration', async () => {
      const mockResponse = {
        id: 'test-video-id-5',
        state: 'pending',
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

      await client.generateVideo({
        prompt: 'A cat walking',
        duration: 10,
      } as VideoGenerateParams)

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.extend).toBe(true)
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
        client.generateVideo({
          prompt: 'A cat walking',
        } as VideoGenerateParams)
      ).rejects.toThrow()
    })
  })

  describe('generateAudio', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateAudio({
        text: 'Hello world',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Luma AI 不支持语音生成')
    })
  })

  describe('pollForResult', () => {
    it('应该轮询直到视频完成', async () => {
      // 第一次返回 pending
      mockFetch
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ id: 'test-id', state: 'pending' }),
            text: async () => '',
            headers: new Headers(),
          } as Response)
        )
        // 第二次返回 completed
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              id: 'test-id',
              state: 'completed',
              video: { url: 'https://example.com/video.mp4' },
            }),
            text: async () => '',
            headers: new Headers(),
          } as Response)
        )

      // 使用真实计时器，但缩短超时时间
      const result = await client.pollForResult('test-id', 10000)

      expect(result.success).toBe(true)
      expect(result.videoUrl).toBe('https://example.com/video.mp4')
    })

    it('应该处理轮询失败', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            id: 'test-id',
            state: 'failed',
            failure_reason: 'Generation failed',
          }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      const result = await client.pollForResult('test-id', 10000)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Generation failed')
    })

    it('应该处理轮询取消', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            id: 'test-id',
            state: 'cancelled',
          }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      const result = await client.pollForResult('test-id', 10000)

      expect(result.success).toBe(false)
      expect(result.error).toBe('视频生成已取消')
    })

    it('应该在超时时返回错误', async () => {
      // 始终保持 pending 状态
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ id: 'test-id', state: 'pending' }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      // 使用很短的超时时间
      const result = await client.pollForResult('test-id', 100)

      expect(result.success).toBe(false)
      expect(result.error).toBe('轮询超时')
    })
  })
})
