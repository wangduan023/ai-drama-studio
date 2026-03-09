/**
 * Hugging Face Client 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { HuggingFaceClient } from '../src/clients/huggingface.client'
import type { AIModelConfig, TextGenerateParams, ImageGenerateParams, VideoGenerateParams, AudioGenerateParams } from '../src/types'

describe('HuggingFaceClient', () => {
  let client: HuggingFaceClient
  let mockFetch: ReturnType<typeof vi.spyOn>

  const defaultConfig: AIModelConfig = {
    provider: 'huggingface',
    modelId: 'mistralai/Mistral-Large-Instruct-2407',
    apiKey: 'test-hf-key',
    baseURL: 'https://api-inference.huggingface.co',
    timeout: 5000,
  }

  afterEach(() => {
    if (mockFetch) {
      mockFetch.mockRestore()
    }
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    beforeEach(() => {
      client = new HuggingFaceClient(defaultConfig)
    })

    it('应该使用默认 baseURL 初始化', () => {
      const clientWithDefaults = new HuggingFaceClient({
        provider: 'huggingface',
        modelId: 'mistralai/Mistral-Large-Instruct-2407',
        apiKey: 'test-key',
      })
      expect(clientWithDefaults).toBeDefined()
    })

    it('应该使用自定义 baseURL 初始化', () => {
      const customBaseURL = 'https://custom.hf.api'
      const clientWithCustomURL = new HuggingFaceClient({
        provider: 'huggingface',
        modelId: 'mistralai/Mistral-Large-Instruct-2407',
        apiKey: 'test-key',
        baseURL: customBaseURL,
      })
      expect(clientWithCustomURL).toBeDefined()
    })

    it('应该正确设置 provider 和 modelId', () => {
      expect(client.provider).toBe('huggingface')
      expect(client.modelId).toBe('mistralai/Mistral-Large-Instruct-2407')
    })
  })

  describe('generateText', () => {
    beforeEach(() => {
      client = new HuggingFaceClient(defaultConfig)
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

    it('应该成功生成文本', async () => {
      const mockResponse = [
        { generated_text: 'This is the generated text.' },
      ]

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
        messages: [{ role: 'user', content: 'Write a story' }],
        temperature: 0.7,
        maxTokens: 100,
        topP: 0.95,
      }

      const result = await client.generateText(params)

      expect(result.text).toBe('This is the generated text.')
      expect(result.usage).toBeDefined()
      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[0]).toContain('mistralai/Mistral-Large-Instruct-2407')
    })

    it('应该使用默认模型 ID', async () => {
      const mockResponse = [
        { generated_text: 'Default model response' },
      ]

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockResponse,
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      const clientWithoutModel = new HuggingFaceClient({
        provider: 'huggingface',
        modelId: '',
        apiKey: 'test-key',
      })

      await clientWithoutModel.generateText({
        messages: [{ role: 'user', content: 'Hello' }],
      })

      // 验证使用了默认模型
      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[0]).toContain('mistralai/Mistral-Large-Instruct-2407')
    })

    it('应该处理空响应', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [],
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await expect(
        client.generateText({
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('未返回任何内容')
    }, 15000)

    it('应该处理错误响应', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ error: 'Model loading' }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await expect(
        client.generateText({
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('HF API 错误')
    })

    it('应该处理非数组响应', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ some: 'data' }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await expect(
        client.generateText({
          messages: [{ role: 'user', content: 'Hello' }],
        })
      ).rejects.toThrow('未返回任何内容')
    }, 15000)

    it('应该提取用户消息', async () => {
      const mockResponse = [
        { generated_text: 'Response to user' },
      ]

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
          { role: 'assistant', content: 'Hi there!' },
        ],
      })

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.inputs).toBe('Hello')
    })

    it('应该在没有用户消息时返回空字符串', async () => {
      const mockResponse = [
        { generated_text: '' },
      ]

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
          { role: 'assistant', content: 'Hi there!' },
        ],
      })

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.inputs).toBe('')
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
    beforeEach(() => {
      // 为图像生成创建新的 client 实例，不使用默认 modelId
      client = new HuggingFaceClient({
        provider: 'huggingface',
        modelId: 'stabilityai/stable-diffusion-3.5-large',
        apiKey: 'test-hf-key',
        baseURL: 'https://api-inference.huggingface.co',
        timeout: 5000,
      })
      mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob(['image-data'], { type: 'image/png' }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )
    })

    it('应该成功生成图像', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob(['image-data'], { type: 'image/png' }),
          text: async () => '',
          headers: new Headers({ 'x-request-id': 'test-request-id' }),
        } as Response)
      )

      const params: ImageGenerateParams = {
        prompt: 'A beautiful sunset',
        negativePrompt: 'blurry, low quality',
        aspectRatio: '16:9',
        resolution: '2K',
      }

      const result = await client.generateImage(params)

      expect(result.success).toBe(true)
      expect(result.imageUrl).toBeDefined()
      // 验证使用了正确的默认模型
      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[0]).toContain('stabilityai/stable-diffusion')
    })

    it('应该处理 16:9 宽高比', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob(['image-data'], { type: 'image/png' }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await client.generateImage({
        prompt: 'Test',
        aspectRatio: '16:9',
        resolution: '2K',
      })

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.parameters.width).toBe(1920)
      expect(body.parameters.height).toBe(1080)
    })

    it('应该处理 9:16 宽高比', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob(['image-data'], { type: 'image/png' }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await client.generateImage({
        prompt: 'Test',
        aspectRatio: '9:16',
      })

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.parameters.width).toBe(720)
      expect(body.parameters.height).toBe(1280)
    })

    it('应该处理 4:3 宽高比', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob(['image-data'], { type: 'image/png' }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await client.generateImage({
        prompt: 'Test',
        aspectRatio: '4:3',
        resolution: '4K',
      })

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.parameters.width).toBe(1600)
      expect(body.parameters.height).toBe(1200)
    })

    it('应该处理 3:4 宽高比', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob(['image-data'], { type: 'image/png' }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await client.generateImage({
        prompt: 'Test',
        aspectRatio: '3:4',
      })

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.parameters.width).toBe(768)
      expect(body.parameters.height).toBe(1024)
    })

    it('应该处理 1:1 宽高比', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob(['image-data'], { type: 'image/png' }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await client.generateImage({
        prompt: 'Test',
        aspectRatio: '1:1',
        resolution: '4K',
      })

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.parameters.width).toBe(1024)
      expect(body.parameters.height).toBe(1024)
    })

    it('应该处理默认宽高比', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob(['image-data'], { type: 'image/png' }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await client.generateImage({
        prompt: 'Test',
      })

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.parameters.width).toBe(512)
      expect(body.parameters.height).toBe(512)
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
        client.generateImage({
          prompt: 'Test',
        })
      ).rejects.toThrow()
    })
  })

  describe('generateVideo', () => {
    beforeEach(() => {
      // 为视频生成创建新的 client 实例，不使用默认 modelId
      client = new HuggingFaceClient({
        provider: 'huggingface',
        modelId: 'cerspense/zeroscope_v2_576w',
        apiKey: 'test-hf-key',
        baseURL: 'https://api-inference.huggingface.co',
        timeout: 5000,
      })
      mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob(['video-data'], { type: 'video/mp4' }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )
    })

    it('应该成功生成视频', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob(['video-data'], { type: 'video/mp4' }),
          text: async () => '',
          headers: new Headers({ 'x-request-id': 'test-request-id' }),
        } as Response)
      )

      const params: VideoGenerateParams = {
        imageUrl: 'https://example.com/image.jpg',
        prompt: 'A cat walking',
      }

      const result = await client.generateVideo(params)

      expect(result.success).toBe(true)
      expect(result.videoUrl).toBeDefined()
      // 验证使用了正确的默认模型
      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[0]).toContain('zeroscope')
    })

    it('应该使用自定义模型 ID', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob(['video-data'], { type: 'video/mp4' }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      const clientWithCustomModel = new HuggingFaceClient({
        provider: 'huggingface',
        modelId: 'custom/video-model',
        apiKey: 'test-key',
      })

      await clientWithCustomModel.generateVideo({
        imageUrl: 'https://example.com/image.jpg',
        prompt: 'Test',
      })

      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[0]).toContain('custom/video-model')
    })

    it('应该在 API 错误时抛出错误', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          text: async () => 'Bad request',
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
    beforeEach(() => {
      // 为音频生成创建新的 client 实例，不使用默认 modelId
      client = new HuggingFaceClient({
        provider: 'huggingface',
        modelId: 'microsoft/speecht5_tts',
        apiKey: 'test-hf-key',
        baseURL: 'https://api-inference.huggingface.co',
        timeout: 5000,
      })
      mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob(['audio-data'], { type: 'audio/wav' }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )
    })

    it('应该成功生成音频', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob(['audio-data'], { type: 'audio/wav' }),
          text: async () => '',
          headers: new Headers({ 'x-request-id': 'test-request-id' }),
        } as Response)
      )

      const params: AudioGenerateParams = {
        text: 'Hello world',
        voice: 'speaker_id_1',
      }

      const result = await client.generateAudio(params)

      expect(result.success).toBe(true)
      expect(result.audioUrl).toBeDefined()
      // 验证使用了正确的默认模型
      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[0]).toContain('speecht5')
    })

    it('应该处理不带语音参数', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob(['audio-data'], { type: 'audio/wav' }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      await client.generateAudio({
        text: 'Hello world',
      })

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.parameters).toBeUndefined()
    })

    it('应该使用自定义模型 ID', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob(['audio-data'], { type: 'audio/wav' }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      const clientWithCustomModel = new HuggingFaceClient({
        provider: 'huggingface',
        modelId: 'custom/tts-model',
        apiKey: 'test-key',
      })

      await clientWithCustomModel.generateAudio({
        text: 'Hello world',
      })

      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[0]).toContain('custom/tts-model')
    })

    it('应该在 API 错误时抛出错误', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 503,
          text: async () => 'Service unavailable',
        } as Response)
      )

      await expect(
        client.generateAudio({
          text: 'Hello world',
        })
      ).rejects.toThrow()
    })
  })
})
