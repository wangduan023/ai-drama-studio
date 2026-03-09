/**
 * ElevenLabs Client 测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ElevenLabsClient } from '../src/clients/elevenlabs.client'
import type { AIModelConfig, AudioGenerateParams } from '../src/types'

describe('ElevenLabsClient', () => {
  let client: ElevenLabsClient
  let mockFetch: ReturnType<typeof vi.spyOn>

  const defaultConfig: AIModelConfig = {
    provider: 'elevenlabs',
    modelId: 'eleven_multilingual_v2',
    apiKey: 'test-elevenlabs-key',
    baseURL: 'https://api.elevenlabs.io/v1',
    timeout: 5000,
  }

  beforeEach(() => {
    client = new ElevenLabsClient(defaultConfig)
    mockFetch = vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({}),
        text: async () => '',
        headers: new Headers(),
        blob: async () => new Blob(['audio-data'], { type: 'audio/mpeg' }),
      } as Response)
    )
  })

  afterEach(() => {
    mockFetch.mockRestore()
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('应该使用默认 baseURL 初始化', () => {
      const clientWithDefaults = new ElevenLabsClient({
        provider: 'elevenlabs',
        modelId: 'eleven_multilingual_v2',
        apiKey: 'test-key',
      })
      expect(clientWithDefaults).toBeDefined()
    })

    it('应该使用自定义 baseURL 初始化', () => {
      const customBaseURL = 'https://custom.elevenlabs.api/v1'
      const clientWithCustomURL = new ElevenLabsClient({
        provider: 'elevenlabs',
        modelId: 'eleven_multilingual_v2',
        apiKey: 'test-key',
        baseURL: customBaseURL,
      })
      expect(clientWithCustomURL).toBeDefined()
    })

    it('应该正确设置 provider 和 modelId', () => {
      expect(client.provider).toBe('elevenlabs')
      expect(client.modelId).toBe('eleven_multilingual_v2')
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
      expect(result.error).toBe('ElevenLabs 不支持图像生成')
    })
  })

  describe('generateVideo', () => {
    it('应该返回不支持的错误', async () => {
      const result = await client.generateVideo({
        imageUrl: 'https://example.com/image.jpg',
        prompt: 'A cat walking',
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('ElevenLabs 不支持视频生成')
    })
  })

  describe('generateAudio', () => {
    it('应该成功生成音频', async () => {
      const mockRequestHeaders = {
        'Authorization': 'Bearer test-elevenlabs-key',
        'Content-Type': 'application/json',
      }

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob(['audio-data'], { type: 'audio/mpeg' }),
          text: async () => '',
          headers: new Headers({ 'x-request-id': 'test-request-id' }),
        } as Response)
      )

      const params: AudioGenerateParams = {
        text: 'Hello world',
        voice: 'Rachel',
        outputFormat: 'mp3_44100_128',
      }

      const result = await client.generateAudio(params)

      expect(result.success).toBe(true)
      expect(result.audioUrl).toBeDefined()
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/text-to-speech/Rachel',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining(mockRequestHeaders),
        })
      )
    })

    it('应该使用默认语音', async () => {
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
      })

      const callArgs = mockFetch.mock.calls[0]
      expect(callArgs[0]).toContain('text-to-speech/Rachel')
    })

    it('应该处理 base64 输出格式', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob(['audio-data'], { type: 'audio/mpeg' }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      const result = await client.generateAudio({
        text: 'Hello world',
        outputFormat: 'mp3_base64',
      })

      expect(result.success).toBe(true)
      expect(result.audioBase64).toBeDefined()
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
      expect(body.voice_settings.speed).toBe(1.5)
    })

    it('应该使用自定义模型 ID', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: async () => new Blob(['audio-data'], { type: 'audio/mpeg' }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      const clientWithCustomModel = new ElevenLabsClient({
        provider: 'elevenlabs',
        modelId: 'eleven_monolingual_v1',
        apiKey: 'test-key',
      })

      await clientWithCustomModel.generateAudio({
        text: 'Hello world',
      })

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.model_id).toBe('eleven_monolingual_v1')
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
        client.generateAudio({
          text: 'Hello world',
        })
      ).rejects.toThrow()
    })
  })

  describe('generateAudioStream', () => {
    it('应该成功流式生成音频', async () => {
      const mockChunks = [
        { value: new Uint8Array([1, 2, 3]), done: false },
        { value: new Uint8Array([4, 5, 6]), done: false },
        { value: undefined, done: true },
      ]
      let chunkIndex = 0

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          body: {
            getReader: () => ({
              read: async () => mockChunks[chunkIndex++],
              releaseLock: () => {},
            }),
          },
          text: async () => '',
          headers: new Headers({ 'x-request-id': 'test-request-id' }),
        } as unknown as Response)
      )

      const onStream = vi.fn()

      const result = await client.generateAudioStream(
        {
          text: 'Hello world',
          voice: 'Rachel',
        },
        onStream
      )

      expect(result.success).toBe(true)
      expect(result.audioUrl).toBeDefined()
      expect(onStream).toHaveBeenCalled()
    })

    it('应该处理没有响应体的情况', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          body: null,
          text: async () => '',
          headers: new Headers(),
        } as unknown as Response)
      )

      const result = await client.generateAudioStream({
        text: 'Hello world',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('无法获取流式读取器')
    })

    it('应该处理流式读取错误', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          body: {
            getReader: () => ({
              read: async () => {
                throw new Error('Stream error')
              },
              releaseLock: () => {},
            }),
          },
          text: async () => '',
          headers: new Headers(),
        } as unknown as Response)
      )

      const result = await client.generateAudioStream({
        text: 'Hello world',
      })

      // 错误消息可能是原始错误或包装后的错误
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Stream error|流式音频生成失败/)
    })

    it('应该在 API 错误时抛出错误', async () => {
      // 每次调用都返回错误，这样会触发重试直到失败
      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 429,
          text: async () => 'Rate limit exceeded',
        } as Response)
      )

      // generateAudioStream 在遇到 HTTP 错误时会通过 withRetry 重试，最终抛出错误
      await expect(
        client.generateAudioStream({
          text: 'Hello world',
        })
      ).rejects.toThrow()
    }, 15000)
  })

  describe('getVoices', () => {
    it('应该成功获取语音列表', async () => {
      const mockVoices = {
        voices: [
          { voice_id: 'voice1', name: 'Rachel', category: 'premade' },
          { voice_id: 'voice2', name: 'Josh', category: 'premade' },
        ],
      }

      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockVoices,
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      const voices = await client.getVoices()

      expect(voices).toHaveLength(2)
      expect(voices[0]).toEqual({
        id: 'voice1',
        name: 'Rachel',
        category: 'premade',
      })
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/voices',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-elevenlabs-key',
          }),
        })
      )
    })

    it('应该返回空数组当 API 返回错误', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          text: async () => 'Internal error',
        } as Response)
      )

      const voices = await client.getVoices()

      expect(voices).toEqual([])
    })

    it('应该返回空数组当抛出异常', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.reject(new Error('Network error'))
      )

      const voices = await client.getVoices()

      expect(voices).toEqual([])
    })

    it('应该处理空的 voices 数组', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ voices: [] }),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      const voices = await client.getVoices()

      expect(voices).toEqual([])
    })

    it('应该处理没有 voices 字段的响应', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({}),
          text: async () => '',
          headers: new Headers(),
        } as Response)
      )

      const voices = await client.getVoices()

      expect(voices).toEqual([])
    })
  })

  describe('arrayBufferToBase64', () => {
    it('应该正确转换 ArrayBuffer 到 Base64', () => {
      // 创建一个测试 buffer
      const testString = 'Hello, World!'
      const encoder = new TextEncoder()
      const buffer = encoder.encode(testString).buffer

      // 使用客户端的私有方法进行测试
      // 由于是私有方法，我们通过实例调用
      const result = (client as unknown as { arrayBufferToBase64: (buffer: ArrayBuffer) => string })
        .arrayBufferToBase64(buffer)

      // 验证转换结果
      expect(result).toBe(btoa(testString))
    })
  })
})
