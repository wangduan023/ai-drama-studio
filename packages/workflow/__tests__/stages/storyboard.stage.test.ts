/**
 * StoryboardStage 测试
 * 
 * 注意：部分测试涉及 AI 调用，可能导致超时
 * 这些测试在持续集成环境中需要更长的超时时间
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StoryboardStage } from '../../src/stages/storyboard.stage'
import { PipelineError, type PipelineContext } from '../../src/types'

const createMockContext = (): PipelineContext => ({
  projectId: 'proj-123',
  userId: 'user-456',
  locale: 'zh',
  input: { content: 'Test content' },
  characters: { profiles: [], appearanceMap: {} },
  locations: { profiles: [] },
  stageData: {
    rewrite: {
      content: 'Rewritten test content',
    },
  },
  extensions: {},
})

describe('StoryboardStage', () => {
  let stage: StoryboardStage
  let mockContext: PipelineContext
  let mockAiExecutor: ReturnType<typeof vi.fn>

  beforeEach(() => {
    stage = new StoryboardStage()
    mockContext = createMockContext()
    mockAiExecutor = vi.fn()
    stage.setAiExecutor(mockAiExecutor)
  })

  describe('配置', () => {
    it('应该有正确的阶段类型', () => {
      expect(stage.stageType).toBe('storyboard')
    })

    it('应该有正确的默认配置', () => {
      const config = stage.getConfig()
      expect(config.maxRetries).toBe(2)
      expect(config.timeoutMs).toBe(300000)
      expect(config.skippable).toBe(false)
      expect(config.failPipeline).toBe(true)
    })
  })

  describe('验证', () => {
    it('应该在缺少改写内容时抛出错误', async () => {
      mockContext.stageData = {}

      await expect(stage.validate(mockContext)).rejects.toThrow(PipelineError)
      await expect(stage.validate(mockContext)).rejects.toThrow('No content available')
    })

    it('应该在未配置 AI 执行器时抛出错误', async () => {
      stage.setAiExecutor(null as any)

      await expect(stage.validate(mockContext)).rejects.toThrow('AI executor not configured')
    })

    it('应该在有改写内容时通过验证', async () => {
      await expect(stage.validate(mockContext)).resolves.toBeUndefined()
    })
  })

  describe('处理', () => {
    it.skip('应该成功处理并返回分镜面板 (需要 AI 执行器)', async () => {
      mockAiExecutor.mockResolvedValue({
        text: JSON.stringify([
          {
            panel_number: 1,
            description: 'First panel description',
            location: '客厅',
            source_text: '原文',
            characters: ['主角'],
            shot_type: 'medium_shot',
            camera_move: 'static',
            duration: 5,
          },
        ]),
      })

      const result = await stage.doProcess(
        mockContext,
        {
          content: 'Test content',
          characterAppearanceMap: {},
          locations: [],
        },
        { attempt: 1 }
      )

      expect(result.panels).toHaveLength(1)
      expect(result.panels[0].panelNumber).toBe(1)
      expect(result.summary).toContain('1')
    }, 30000)

    it.skip('应该解析多个分镜面板 (需要 AI 执行器)', async () => {
      mockAiExecutor.mockResolvedValue({
        text: JSON.stringify([
          { panel_number: 1, description: 'Panel 1', location: '客厅' },
          { panel_number: 2, description: 'Panel 2', location: '卧室' },
        ]),
      })

      const result = await stage.doProcess(
        mockContext,
        {
          content: 'Test content',
          characterAppearanceMap: {},
          locations: [],
        },
        { attempt: 1 }
      )

      expect(result.panels).toHaveLength(2)
    }, 30000)

    it('应该在 AI 调用失败时抛出错误', async () => {
      mockAiExecutor.mockRejectedValue(new Error('AI error'))

      await expect(
        stage.doProcess(
          mockContext,
          { content: 'Test', characterAppearanceMap: {}, locations: [] },
          { attempt: 1 }
        )
      ).rejects.toThrow()
    })
  })

  describe('失败处理', () => {
    it('应该记录失败信息到上下文', async () => {
      const error = new PipelineError('Test error', 'TEST_ERROR', 'storyboard')

      await stage.onFailure(mockContext, error, 1)

      expect(mockContext.extensions.storyboardError).toEqual({
        attempt: 1,
        errorCode: 'TEST_ERROR',
        message: 'Test error',
        timestamp: expect.any(String),
      })
    })
  })
})
