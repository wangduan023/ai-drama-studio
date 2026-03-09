/**
 * Fal.ai Client 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FalClient } from '../src/clients/fal.client'
import type { AIModelConfig, ImageGenerateParams, VideoGenerateParams } from '../src/types'

describe('FalClient', () => {
  let client: FalClient
  let mockFetch: ReturnType<typeof vi.spyOn>

  const defaultConfig: AIModelConfig = {
    provider: 'fal',
    modelId: 'fal-ai/fast-sd',
    apiKey: 'test-fal-key',
    baseURL: 'https://api.fal.ai/v1',
    timeout: 5000,
  }

  beforeEach(() => {
    client = new FalClient(defaultConfig)
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
      const clientWithDefaults = new FalClient({
        provider: 'fal',
        modelId: 'fal-ai/fast-sd',
        apiKey: 'test-key',
      })
      expect(clientWithDefaults).toBeDefined()
    })

    it('应该使用自定义 baseURL 初始化', () => {
      const customBaseURL = 'https://custom.fal.api'
      const clientWithCustomURL = new FalClient({
        provider: 'fal',
        modelId: 'fal-ai/fast-sd',
        apiKey: 'test-key',
        baseURL: customBaseURL,
      })
      expect(clientWithCustomURL).toBeDefined()
    })

    it('应该正确设置 provider', () => {
      expect(client.provider).toBe('fal')
    })
  })

  describe('generateText', () => {
    it('应该抛出不支持的错误', async () => {
      await expect(
        client.generateText({
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('Fal.ai 不支持文本生成')
    })
  })

  describe('generateImage', () => {
    it('应该成功生成图像（同步响应）', async () => {
      // 同步响应不包含 request_id
      const mockResponse = {
        images: [
          {
            url: 'https://example.com/image.png',
            width: 1024,
            height: 1024,
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
    })

    it('应该成功生成图像（异步任务响应）', async () => {
      const mockResponse = {
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
        aspectRatio: '1:1',
      }

      const result = await client.generateImage(params)

      expect(result.success).toBe(true)
      expect(result.async).toBe(true)
      expect(result.externalId).toBe('test-request-id')
    })

    it('应该处理 output 格式响应', async () => {
      // 同步响应不包含 request_id
      const mockResponse = {
        output: {
          images: [
            {
              url: 'https://example.com/image.png',
            },
          ],
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
      }

      const result = await client.generateImage(params)

      expect(result.success).toBe(true)
      expect(result.imageUrl).toBe('https://example.com/image.png')
    })

    it('应该处理空响应', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({}),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      const result = await client.generateImage({
        prompt: 'Test',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Fal.ai 未返回图像')
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
        client.generateImage({
          prompt: 'Test',
        })
      ).rejects.toThrow()
    })
  })

  describe('pollForResult', () => {
    it('应该成功轮询图像结果', async () => {
      // 第一次调用返回 COMPLETED 状态
      const mockResponse = {
        status: 'COMPLETED',
        response: {
          images: [
            {
              url: 'https://example.com/image.png',
            },
          ],
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

      const result = await client.pollForResult('test-request-id')

      expect(result.success).toBe(true)
      expect(result.imageUrl).toBe('https://example.com/image.png')
      expect(result.requestId).toBe('test-request-id')
    })

    it('应该处理 FAILED 状态', async () => {
      const mockResponse = {
        status: 'FAILED',
        error: 'Generation failed',
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

      const result = await client.pollForResult('test-request-id')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Generation failed')
    })

    it('应该轮询直到完成', async () => {
      let callCount = 0

      mockFetch.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // 第一次返回 QUEUED
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ status: 'QUEUED' }),
            text: async () => '',
            headers: new Headers(),
          } as Response)
        } else {
          // 第二次返回 COMPLETED
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              status: 'COMPLETED',
              response: {
                images: [{ url: 'https://example.com/image.png' }],
              },
            }),
            text: async () => '',
            headers: new Headers(),
          } as Response)
        }
      })

      const result = await client.pollForResult('test-request-id')

      expect(result.success).toBe(true)
      expect(result.imageUrl).toBe('https://example.com/image.png')
    })

    it('应该处理轮询超时', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: 'QUEUED' }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      // 使用较短的超时时间进行测试
      const result = await client.pollForResult('test-request-id', 100)

      expect(result.success).toBe(false)
      expect(result.error).toBe('轮询超时')
    })
  })

  describe('generateVideo', () => {
    it('应该成功生成视频（同步响应）', async () => {
      // 同步响应不包含 request_id
      const mockResponse = {
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

      const params: VideoGenerateParams = {
        imageUrl: 'https://example.com/image.jpg',
        prompt: 'A cat walking',
      }

      const result = await client.generateVideo(params)

      expect(result.success).toBe(true)
      expect(result.videoUrl).toBe('https://example.com/video.mp4')
    })

    it('应该成功生成视频（异步任务响应）', async () => {
      const mockResponse = {
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

      const params: VideoGenerateParams = {
        imageUrl: 'https://example.com/image.jpg',
        prompt: 'A cat walking',
      }

      const result = await client.generateVideo(params)

      expect(result.success).toBe(true)
      expect(result.async).toBe(true)
      expect(result.externalId).toBe('test-request-id')
    })

    it('应该处理空响应', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({}),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      const result = await client.generateVideo({
        imageUrl: 'https://example.com/image.jpg',
        prompt: 'Test',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Fal.ai 未返回视频结果')
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
        client.generateVideo({
          imageUrl: 'https://example.com/image.jpg',
          prompt: 'Test',
        })
      ).rejects.toThrow()
    })
  })

  describe('generateAudio', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateAudio({
        text: 'Hello world',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Fal.ai 不支持语音生成')
    })
  })
})
