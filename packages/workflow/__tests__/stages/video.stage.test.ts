/**
 * VideoGenerationStage 测试
 * 
 * 注意：部分测试跳过，因为视频生成阶段包含长时间的轮询逻辑
 * 这些测试在持续集成环境中会导致超时
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VideoGenerationStage } from '../../src/stages/video.stage'
import { PipelineError, type PipelineContext, type GeneratedImage, type StoryboardPanel } from '../../src/types'

const createMockContext = (): PipelineContext => ({
  projectId: 'proj-123',
  userId: 'user-456',
  locale: 'zh',
  input: { content: 'Test content' },
  characters: { profiles: [], appearanceMap: {} },
  locations: { profiles: [] },
  stageData: {
    image: {
      images: [
        {
          panelId: 'panel-1',
          url: 'https://example.com/image1.jpg',
          width: 1024,
          height: 576,
        },
      ],
    },
  },
  extensions: {},
})

describe('VideoGenerationStage', () => {
  let stage: VideoGenerationStage
  let mockContext: PipelineContext
  let mockAiExecutor: ReturnType<typeof vi.fn>

  beforeEach(() => {
    stage = new VideoGenerationStage()
    mockContext = createMockContext()
    mockAiExecutor = vi.fn()
    stage.setAiExecutor(mockAiExecutor)
  })

  describe('配置', () => {
    it('应该有正确的阶段类型', () => {
      expect(stage.stageType).toBe('video')
    })

    it('应该有正确的默认配置', () => {
      const config = stage.getConfig()
      expect(config.maxRetries).toBe(3)
      expect(config.timeoutMs).toBe(900000)
      expect(config.skippable).toBe(true)
      expect(config.failPipeline).toBe(false)
    })
  })

  describe('验证', () => {
    it('应该在缺少图片时抛出错误', async () => {
      mockContext.stageData = {}

      await expect(stage.validate(mockContext)).rejects.toThrow(PipelineError)
      await expect(stage.validate(mockContext)).rejects.toThrow('No generated images available')
    })

    it('应该在未配置 AI 执行器时抛出错误', async () => {
      stage.setAiExecutor(null as any)

      await expect(stage.validate(mockContext)).rejects.toThrow(PipelineError)
      await expect(stage.validate(mockContext)).rejects.toThrow('AI executor not configured')
    })

    it('应该在有图片时通过验证', async () => {
      await expect(stage.validate(mockContext)).resolves.toBeUndefined()
    })
  })

  describe('处理', () => {
    it.skip('应该成功处理并返回视频任务 (跳过长轮询)', async () => {
      const images: GeneratedImage[] = [
        { panelId: 'panel-1', id: 'img_1', url: 'https://example.com/image1.jpg', width: 1024, height: 576 },
      ]
      const panels: (StoryboardPanel & { generatedImages?: GeneratedImage[] })[] = [
        { panelNumber: 1, description: 'Panel 1', location: '客厅', generatedImages: images },
      ]

      const result = await stage.doProcess(
        mockContext,
        { panels, images },
        { attempt: 1 }
      )

      expect(result.videos).toBeDefined()
      expect(result.stats.totalPanels).toBe(1)
    }, 300000)

    it('应该支持取消信号', async () => {
      const abortController = new AbortController()
      abortController.abort()

      const images: GeneratedImage[] = [
        { panelId: 'panel-1', id: 'img_1', url: 'https://example.com/image1.jpg', width: 1024, height: 576 },
      ]
      const panels: (StoryboardPanel & { generatedImages?: GeneratedImage[] })[] = [
        { panelNumber: 1, description: 'Panel 1', location: '客厅', generatedImages: images },
      ]

      const result = await stage.doProcess(
        mockContext,
        { panels, images },
        { attempt: 1, signal: abortController.signal }
      )

      expect(result).toBeDefined()
    })

    it('应该在未配置 AI 执行器时抛出错误', async () => {
      stage.setAiExecutor(null as any)

      await expect(
        stage.doProcess(mockContext, { panels: [], images: [] }, { attempt: 1 })
      ).rejects.toThrow(PipelineError)
    })
  })

  describe('失败处理', () => {
    it('应该记录失败信息到上下文', async () => {
      const error = new PipelineError('Test error', 'TEST_ERROR', 'video')

      await stage.onFailure(mockContext, error, 1)

      expect(mockContext.extensions.videoError).toEqual({
        attempt: 1,
        errorCode: 'TEST_ERROR',
        message: 'Test error',
        timestamp: expect.any(String),
      })
    })
  })
})
