/**
 * Runway ML Client 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RunwayClient } from '../src/clients/runway.client'
import type { AIModelConfig, VideoGenerateParams } from '../src/types'

describe('RunwayClient', () => {
  let client: RunwayClient
  let mockFetch: ReturnType<typeof vi.spyOn>

  const defaultConfig: AIModelConfig = {
    provider: 'runway',
    modelId: 'gen3a_turbo',
    apiKey: 'test-runway-key',
    baseURL: 'https://api.runwayml.com/v1',
    timeout: 5000,
  }

  beforeEach(() => {
    client = new RunwayClient(defaultConfig)
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
      const clientWithDefaults = new RunwayClient({
        provider: 'runway',
        modelId: 'gen3a_turbo',
        apiKey: 'test-key',
      })
      expect(clientWithDefaults).toBeDefined()
    })

    it('应该使用自定义 baseURL 初始化', () => {
      const customBaseURL = 'https://custom.runway.api'
      const clientWithCustomURL = new RunwayClient({
        provider: 'runway',
        modelId: 'gen3a_turbo',
        apiKey: 'test-key',
        baseURL: customBaseURL,
      })
      expect(clientWithCustomURL).toBeDefined()
    })

    it('应该正确设置 provider', () => {
      expect(client.provider).toBe('runway')
    })
  })

  describe('generateText', () => {
    it('应该抛出不支持的错误', async () => {
      await expect(
        client.generateText({
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('Runway ML 不支持文本生成')
    })
  })

  describe('generateImage', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateImage({
        prompt: 'A beautiful sunset',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Runway ML 不支持图像生成，请使用 Gen-2/Gen-3 进行视频生成')
    })
  })

  describe('generateVideo', () => {
    it('应该成功生成视频（已完成状态）', async () => {
      const mockResponse = {
        taskId: 'test-task-id',
        status: 'SUCCEEDED',
        output: {
          output: 'https://example.com/video.mp4',
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
      expect(result.requestId).toBe('test-task-id')
    })

    it('应该成功生成视频（异步任务响应）', async () => {
      const mockResponse = {
        taskId: 'test-task-id',
        status: 'PROCESSING',
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
      expect(result.externalId).toBe('test-task-id')
    })

    it('应该处理空响应', async () => {
      const mockResponse = {}

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

      expect(result.success).toBe(false)
      expect(result.error).toBe('Runway ML 未返回任务 ID')
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

  describe('pollForResult', () => {
    it('应该成功轮询视频结果', async () => {
      const mockResponse = {
        taskId: 'test-task-id',
        status: 'SUCCEEDED',
        output: {
          output: 'https://example.com/video.mp4',
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

      const result = await client.pollForResult('test-task-id')

      expect(result.success).toBe(true)
      expect(result.videoUrl).toBe('https://example.com/video.mp4')
      expect(result.requestId).toBe('test-task-id')
    })

    it('应该处理 FAILED 状态', async () => {
      const mockResponse = {
        taskId: 'test-task-id',
        status: 'FAILED',
        failure: 'Video generation failed',
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

      const result = await client.pollForResult('test-task-id')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Video generation failed')
    })

    it('应该处理 CANCELED 状态', async () => {
      const mockResponse = {
        taskId: 'test-task-id',
        status: 'CANCELED',
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

      const result = await client.pollForResult('test-task-id')

      expect(result.success).toBe(false)
      expect(result.error).toBe('视频生成已取消')
    })

    it('应该轮询直到完成', async () => {
      let callCount = 0

      mockFetch.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          // 第一次返回 PROCESSING
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ status: 'PROCESSING' }),
            text: async () => '',
            headers: new Headers(),
          } as Response)
        } else {
          // 第二次返回 SUCCEEDED
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              status: 'SUCCEEDED',
              output: { output: 'https://example.com/video.mp4' },
            }),
            text: async () => '',
            headers: new Headers(),
          } as Response)
        }
      })

      const result = await client.pollForResult('test-task-id')

      expect(result.success).toBe(true)
      expect(result.videoUrl).toBe('https://example.com/video.mp4')
    })

    it('应该处理轮询超时', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: 'PROCESSING' }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      // 使用较短的超时时间进行测试
      const result = await client.pollForResult('test-task-id', 100)

      expect(result.success).toBe(false)
      expect(result.error).toBe('轮询超时')
    })

    it('应该处理网络错误', async () => {
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          text: async () => 'Error',
        } as Response)
      )

      // 网络错误时应继续轮询直到超时
      const result = await client.pollForResult('test-task-id', 100)

      expect(result.success).toBe(false)
    })
  })

  describe('generateAudio', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateAudio({
        text: 'Hello world',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Runway ML 不支持语音生成')
    })
  })
})
