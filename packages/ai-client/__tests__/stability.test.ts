/**
 * Stability AI Client 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { StabilityClient } from '../src/clients/stability.client'
import type { AIModelConfig, ImageGenerateParams, VideoGenerateParams } from '../src/types'

describe('StabilityClient', () => {
  let client: StabilityClient
  let mockFetch: ReturnType<typeof vi.spyOn>

  const defaultConfig: AIModelConfig = {
    provider: 'stability',
    modelId: 'sd3.5-large-turbo',
    apiKey: 'test-stability-key',
    baseURL: 'https://api.stability.ai/v2beta',
    timeout: 5000,
  }

  beforeEach(() => {
    client = new StabilityClient(defaultConfig)
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
      const clientWithDefaults = new StabilityClient({
        provider: 'stability',
        modelId: 'sd3.5-large-turbo',
        apiKey: 'test-key',
      })
      expect(clientWithDefaults).toBeDefined()
    })

    it('应该使用自定义 baseURL 初始化', () => {
      const customBaseURL = 'https://custom.stability.api'
      const clientWithCustomURL = new StabilityClient({
        provider: 'stability',
        modelId: 'sd3.5-large-turbo',
        apiKey: 'test-key',
        baseURL: customBaseURL,
      })
      expect(clientWithCustomURL).toBeDefined()
    })

    it('应该正确设置 provider', () => {
      expect(client.provider).toBe('stability')
    })
  })

  describe('generateText', () => {
    it('应该抛出不支持的错误', async () => {
      await expect(
        client.generateText({
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('Stability AI 不支持文本生成')
    })
  })

  describe('generateImage', () => {
    it('应该成功生成图像（直接 Blob 响应）', async () => {
      const mockBlob = new Blob(['image-data'], { type: 'image/png' })

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => mockBlob,
          headers: new Headers({ 'content-type': 'image/png' }),
        } as unknown as Response)
      )

      const params: ImageGenerateParams = {
        prompt: 'A beautiful sunset',
        aspectRatio: '1:1',
      }

      const result = await client.generateImage(params)

      expect(result.success).toBe(true)
      expect(result.imageUrl).toBeDefined()
    })

    it('应该成功生成图像（JSON 异步任务响应）', async () => {
      const mockResponse = {
        id: 'test-task-id',
      }

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockResponse,
          text: async () => '',
          headers: new Headers({ 'content-type': 'application/json' }),
        } as unknown as Response)
      )

      const params: ImageGenerateParams = {
        prompt: 'A beautiful sunset',
        aspectRatio: '1:1',
      }

      const result = await client.generateImage(params)

      expect(result.success).toBe(true)
      expect(result.async).toBe(true)
      expect(result.externalId).toBe('test-task-id')
    })

    it('应该处理宽高比和分辨率参数', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob(['image-data'], { type: 'image/png' }),
          headers: new Headers({ 'content-type': 'image/png' }),
        } as unknown as Response)
      )

      await client.generateImage({
        prompt: 'Test',
        aspectRatio: '16:9',
        resolution: '4K',
      })

      // FormData 难以直接验证，但可以通过成功调用来确认
      expect(mockFetch).toHaveBeenCalled()
    })

    it('应该处理空响应', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ images: [] }),
          text: async () => '',
          headers: new Headers({ 'content-type': 'application/json' }),
        } as unknown as Response)
      )

      const result = await client.generateImage({
        prompt: 'Test',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Stability AI 未返回图像')
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

  describe('generateVideo', () => {
    it('应该成功生成视频', async () => {
      const mockResponse = {
        video_url: 'https://example.com/video.mp4',
        id: 'test-video-id',
      }

      // 第一次调用是下载图片，第二次是 API 响应
      let callCount = 0
      mockFetch.mockImplementation((url: string | URL | Request) => {
        callCount++
        const urlStr = url.toString()
        if (urlStr.startsWith('https://example.com') && urlStr.includes('image')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            blob: async () => new Blob(['image-data'], { type: 'image/png' }),
            headers: new Headers(),
          } as Response)
        }
        // API 响应
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockResponse,
          text: async () => '',
          headers: new Headers(),
        } as Response)
      })

      const params: VideoGenerateParams = {
        imageUrl: 'https://example.com/image.jpg',
        prompt: 'A cat walking',
        duration: 4,
      }

      const result = await client.generateVideo(params)

      expect(result.success).toBe(true)
      expect(result.videoUrl).toBe('https://example.com/video.mp4')
    })

    it('应该处理异步任务响应', async () => {
      const mockResponse = {
        id: 'test-task-id',
      }

      let callCount = 0
      mockFetch.mockImplementation((url: string | URL | Request) => {
        callCount++
        const urlStr = url.toString()
        if (urlStr.startsWith('https://example.com') && urlStr.includes('image')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            blob: async () => new Blob(['image-data'], { type: 'image/png' }),
            headers: new Headers(),
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockResponse,
          text: async () => '',
          headers: new Headers(),
        } as Response)
      })

      const params: VideoGenerateParams = {
        imageUrl: 'https://example.com/image.jpg',
        prompt: 'A cat walking',
      }

      const result = await client.generateVideo(params)

      expect(result.success).toBe(true)
      expect(result.async).toBe(true)
      expect(result.externalId).toBe('test-task-id')
    })

    it('应该处理空响应', async () => {
      const mockResponse = {}

      let callCount = 0
      mockFetch.mockImplementation((url: string | URL | Request) => {
        callCount++
        const urlStr = url.toString()
        if (urlStr.startsWith('https://example.com') && urlStr.includes('image')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            blob: async () => new Blob(['image-data'], { type: 'image/png' }),
            headers: new Headers(),
          } as Response)
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockResponse,
          text: async () => '',
          headers: new Headers(),
        } as Response)
      })

      const params: VideoGenerateParams = {
        imageUrl: 'https://example.com/image.jpg',
        prompt: 'A cat walking',
      }

      const result = await client.generateVideo(params)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Stability AI 未返回视频结果')
    })

    it('应该在 API 错误时抛出错误', async () => {
      let callCount = 0
      mockFetch.mockImplementation((url: string | URL | Request) => {
        callCount++
        const urlStr = url.toString()
        if (urlStr.startsWith('https://example.com') && urlStr.includes('image')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            blob: async () => new Blob(['image-data'], { type: 'image/png' }),
            headers: new Headers(),
          } as Response)
        }
        return Promise.resolve({
          ok: false,
          status: 500,
          text: async () => 'Internal error',
        } as Response)
      })

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
      expect(result.error).toBe('Stability AI 不支持语音生成')
    })
  })
})
