/**
 * RewriteStage 测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RewriteStage } from '../../src/stages/rewrite.stage'
import { PipelineError, type PipelineContext } from '../../src/types'

const createMockContext = (): PipelineContext => ({
  projectId: 'proj-123',
  userId: 'user-456',
  locale: 'zh',
  input: { content: 'Test content to rewrite' },
  characters: { profiles: [], appearanceMap: {} },
  locations: { profiles: [] },
  stageData: {},
  extensions: {},
})

describe('RewriteStage', () => {
  let stage: RewriteStage
  let mockContext: PipelineContext
  let mockAiExecutor: ReturnType<typeof vi.fn>

  beforeEach(() => {
    stage = new RewriteStage()
    mockContext = createMockContext()
    mockAiExecutor = vi.fn()
    stage.setAiExecutor(mockAiExecutor)
  })

  describe('配置', () => {
    it('应该有正确的阶段类型', () => {
      expect(stage.stageType).toBe('rewrite')
    })

    it('应该有正确的默认配置', () => {
      const config = stage.getConfig()
      expect(config.maxRetries).toBe(3)
      expect(config.timeoutMs).toBe(180000)
      expect(config.skippable).toBe(false)
      expect(config.failPipeline).toBe(true)
    })
  })

  describe('验证', () => {
    it('应该在输入为空时抛出错误', async () => {
      mockContext.input.content = ''

      await expect(stage.validate(mockContext)).rejects.toThrow(PipelineError)
      await expect(stage.validate(mockContext)).rejects.toThrow('Input content is empty')
    })

    it('应该在未配置 AI 执行器时抛出错误', async () => {
      stage.setAiExecutor(null as any)

      await expect(stage.validate(mockContext)).rejects.toThrow('AI executor not configured')
    })

    it('应该在输入有效时通过验证', async () => {
      await expect(stage.validate(mockContext)).resolves.toBeUndefined()
    })
  })

  describe('处理', () => {
    it('应该成功处理并返回结果', async () => {
      mockAiExecutor.mockResolvedValue({
        text: JSON.stringify({
          content: 'Rewritten content',
          characters: [{ name: '主角', gender: '男' }],
          locations: [{ name: '客厅', description: '温馨的客厅' }],
          summary: '改写完成',
        }),
      })

      const result = await stage.doProcess(
        mockContext,
        { content: 'Test content' },
        { attempt: 1 }
      )

      expect(result.content).toBe('Rewritten content')
      expect(result.analyzedCharacters).toHaveLength(1)
      expect(result.analyzedLocations).toHaveLength(1)
      expect(result.summary).toBe('改写完成')
    })

    it('应该在未配置 AI 执行器时抛出错误', async () => {
      stage.setAiExecutor(null as any)

      await expect(
        stage.doProcess(mockContext, { content: 'Test' }, { attempt: 1 })
      ).rejects.toThrow(PipelineError)
    })
  })

  describe('响应解析', () => {
    it('应该解析有效的 JSON 响应', async () => {
      mockAiExecutor.mockResolvedValue({
        text: JSON.stringify({
          content: 'Parsed content',
          characters: [],
          locations: [],
        }),
      })

      const result = await stage.doProcess(
        mockContext,
        { content: 'Test' },
        { attempt: 1 }
      )

      expect(result.content).toBe('Parsed content')
    })

    it('应该在 JSON 解析失败时返回原始文本', async () => {
      mockAiExecutor.mockResolvedValue({
        text: 'Plain text response without JSON',
      })

      const result = await stage.doProcess(
        mockContext,
        { content: 'Test' },
        { attempt: 1 }
      )

      expect(result.content).toBe('Plain text response without JSON')
      expect(result.analyzedCharacters).toEqual([])
    })

    it('应该从 markdown 代码块中提取 JSON', async () => {
      mockAiExecutor.mockResolvedValue({
        text: '```json\n{"content": "test", "characters": []}\n```',
      })

      const result = await stage.doProcess(
        mockContext,
        { content: 'Test' },
        { attempt: 1 }
      )

      expect(result.content).toBe('test')
    })
  })

  describe('失败处理', () => {
    it('应该记录失败信息到上下文', async () => {
      const error = new PipelineError('Test error', 'TEST_ERROR', 'rewrite')

      await stage.onFailure(mockContext, error, 1)

      expect(mockContext.extensions.rewriteError).toEqual({
        attempt: 1,
        errorCode: 'TEST_ERROR',
        message: 'Test error',
        timestamp: expect.any(String),
      })
    })
  })
})
