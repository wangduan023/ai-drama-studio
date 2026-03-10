/**
 * ImageGenerationStage 测试
 * 
 * 注意：部分测试涉及图片生成逻辑，可能包含超时操作
 * 这些测试在持续集成环境中可能会导致超时
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ImageGenerationStage } from '../../src/stages/image.stage'
import { PipelineError, type PipelineContext, type StoryboardPanel } from '../../src/types'

const createMockContext = (): PipelineContext => ({
  projectId: 'proj-123',
  userId: 'user-456',
  locale: 'zh',
  input: { content: 'Test content' },
  characters: { profiles: [], appearanceMap: {} },
  locations: { profiles: [] },
  stageData: {
    storyboard: {
      panels: [
        { panelNumber: 1, description: 'Panel 1', location: '客厅' },
        { panelNumber: 2, description: 'Panel 2', location: '卧室' },
      ],
    },
  },
  extensions: {},
})

describe('ImageGenerationStage', () => {
  let stage: ImageGenerationStage
  let mockContext: PipelineContext
  let mockAiExecutor: ReturnType<typeof vi.fn>

  beforeEach(() => {
    stage = new ImageGenerationStage()
    mockContext = createMockContext()
    mockAiExecutor = vi.fn()
    stage.setAiExecutor(mockAiExecutor)
  })

  describe('配置', () => {
    it('应该有正确的阶段类型', () => {
      expect(stage.stageType).toBe('image')
    })

    it('应该有正确的默认配置', () => {
      const config = stage.getConfig()
      expect(config.maxRetries).toBe(2)
      expect(config.timeoutMs).toBe(600000)
      expect(config.skippable).toBe(false)
      expect(config.failPipeline).toBe(true)
    })
  })

  describe('验证', () => {
    it('应该在缺少分镜面板时抛出错误', async () => {
      mockContext.stageData = {}

      await expect(stage.validate(mockContext)).rejects.toThrow(PipelineError)
      await expect(stage.validate(mockContext)).rejects.toThrow('No storyboard panels available')
    })

    it('应该在未配置 AI 执行器时抛出错误', async () => {
      stage.setAiExecutor(null as any)

      await expect(stage.validate(mockContext)).rejects.toThrow('AI executor not configured')
    })

    it('应该在有分镜面板时通过验证', async () => {
      await expect(stage.validate(mockContext)).resolves.toBeUndefined()
    })
  })

  describe('处理', () => {
    it.skip('应该成功处理并返回生成的图片 (需要 AI 执行器)', async () => {
      mockAiExecutor.mockResolvedValue({ text: 'Optimized prompt' })

      const panels: StoryboardPanel[] = [
        { panelNumber: 1, description: 'A beautiful scene', location: '客厅' },
      ]

      const result = await stage.doProcess(
        mockContext,
        { panels },
        { attempt: 1 }
      )

      expect(result.images).toBeDefined()
      expect(result.stats.totalPanels).toBe(1)
    }, 30000)

    it('应该支持取消信号', async () => {
      const abortController = new AbortController()
      abortController.abort()

      const panels: StoryboardPanel[] = [
        { panelNumber: 1, description: 'Scene', location: '客厅' },
      ]

      const result = await stage.doProcess(
        mockContext,
        { panels },
        { attempt: 1, signal: abortController.signal }
      )

      expect(result).toBeDefined()
    })

    it('应该在未配置 AI 执行器时抛出错误', async () => {
      stage.setAiExecutor(null as any)

      await expect(
        stage.doProcess(mockContext, { panels: [] }, { attempt: 1 })
      ).rejects.toThrow(PipelineError)
    })
  })

  describe('失败处理', () => {
    it('应该记录失败信息到上下文', async () => {
      const error = new PipelineError('Test error', 'TEST_ERROR', 'image')

      await stage.onFailure(mockContext, error, 1)

      expect(mockContext.extensions.imageError).toEqual({
        attempt: 1,
        errorCode: 'TEST_ERROR',
        message: 'Test error',
        timestamp: expect.any(String),
      })
    })
  })
})
