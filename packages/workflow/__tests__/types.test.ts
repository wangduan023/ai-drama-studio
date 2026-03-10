/**
 * Types 类型测试
 * 确保所有类型定义正确
 */
import { describe, it, expect } from 'vitest'
import {
  PipelineError,
  type StageType,
  type StageStatus,
  type StageResult,
  type PipelineContext,
  type PipelineResult,
  type StoryboardPanel,
  type GeneratedImage,
  type GeneratedVideo,
  type CharacterAppearanceMap,
  type LocationInfo,
  type PhotographyPlan,
  type AiExecuteInput,
  type AiExecuteOutput,
} from '../src/types'

describe('Types', () => {
  describe('PipelineError', () => {
    it('应该创建 PipelineError 实例', () => {
      const error = new PipelineError(
        'Test error message',
        'TEST_ERROR',
        'rewrite',
        new Error('Cause'),
        true
      )

      expect(error).toBeInstanceOf(PipelineError)
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('Test error message')
      expect(error.code).toBe('TEST_ERROR')
      expect(error.stageType).toBe('rewrite')
      expect(error.retryable).toBe(true)
      expect(error.name).toBe('PipelineError')
    })

    it('应该支持非重试错误', () => {
      const error = new PipelineError(
        'Non-retryable error',
        'FATAL_ERROR',
        'storyboard',
        null,
        false
      )

      expect(error.retryable).toBe(false)
      expect(error.cause).toBeNull()
    })

    it('应该支持可选参数', () => {
      const error = new PipelineError(
        'Simple error',
        'SIMPLE_ERROR'
      )

      expect(error.stageType).toBeUndefined()
      expect(error.cause).toBeUndefined()
      expect(error.retryable).toBe(true)
    })
  })

  describe('类型兼容性', () => {
    it('StageType 应该接受有效值', () => {
      const types: StageType[] = ['rewrite', 'storyboard', 'image', 'video']
      expect(types).toHaveLength(4)
    })

    it('StageStatus 应该接受有效值', () => {
      const statuses: StageStatus[] = [
        'pending',
        'running',
        'completed',
        'failed',
        'retrying',
        'skipped',
        'cancelled',
      ]
      expect(statuses).toHaveLength(7)
    })

    it('应该创建 PipelineContext', () => {
      const context: PipelineContext = {
        projectId: 'proj-123',
        userId: 'user-456',
        locale: 'zh',
        input: {
          content: 'Test content',
        },
        characters: {
          profiles: [],
          appearanceMap: {},
        },
        locations: {
          profiles: [],
        },
        stageData: {},
        extensions: {},
      }

      expect(context.projectId).toBe('proj-123')
      expect(context.locale).toBe('zh')
    })

    it('应该创建 StageResult', () => {
      const result: StageResult<string> = {
        stageType: 'rewrite',
        status: 'completed',
        data: 'test data',
        error: null,
        errorDetails: null,
        retryCount: 0,
        durationMs: 1000,
      }

      expect(result.stageType).toBe('rewrite')
      expect(result.status).toBe('completed')
    })

    it('应该创建 StoryboardPanel', () => {
      const panel: StoryboardPanel = {
        panelNumber: 1,
        description: 'Test description',
        location: 'Test location',
      }

      expect(panel.panelNumber).toBe(1)
      expect(panel.description).toBe('Test description')
    })

    it('应该创建 GeneratedImage', () => {
      const image: GeneratedImage = {
        id: 'img-1',
        url: 'https://example.com/image.jpg',
        prompt: 'Test prompt',
        modelName: 'test-model',
      }

      expect(image.id).toBe('img-1')
      expect(image.params).toBeUndefined()
    })

    it('应该创建 GeneratedVideo', () => {
      const video: GeneratedVideo = {
        id: 'vid-1',
        url: 'https://example.com/video.mp4',
        duration: 5,
        width: 1024,
        height: 1024,
        fps: 24,
      }

      expect(video.id).toBe('vid-1')
      expect(video.duration).toBe(5)
    })

    it('应该创建 CharacterAppearanceMap', () => {
      const appearance: CharacterAppearanceMap = {
        characterId: 'char-1',
        name: '主角',
        appearanceId: 'app-1',
        changeReason: '场景变化',
        description: '新的外观',
      }

      expect(appearance.characterId).toBe('char-1')
      expect(appearance.name).toBe('主角')
    })

    it('应该创建 LocationInfo', () => {
      const location: LocationInfo = {
        locationId: 'loc-1',
        name: '客厅',
        description: '温馨的客厅',
        locationType: 'INDOOR',
      }

      expect(location.locationId).toBe('loc-1')
      expect(location.name).toBe('客厅')
    })

    it('应该创建 PhotographyPlan', () => {
      const plan: PhotographyPlan = {
        composition: '三分法构图',
        lighting: '自然光',
        colorPalette: '暖色调',
        atmosphere: '温馨',
        technicalNotes: '使用大光圈',
      }

      expect(plan.composition).toBe('三分法构图')
    })

    it('应该创建 AiExecuteInput', () => {
      const input: AiExecuteInput = {
        userId: 'user-1',
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'System prompt' },
          { role: 'user', content: 'User input' },
        ],
        projectId: 'proj-1',
        action: 'test_action',
      }

      expect(input.messages).toHaveLength(2)
    })

    it('应该创建 AiExecuteOutput', () => {
      const output: AiExecuteOutput = {
        text: 'Generated text',
        reasoning: 'Reasoning process',
      }

      expect(output.text).toBe('Generated text')
    })

    it('应该创建 PipelineResult', () => {
      const result: PipelineResult = {
        status: 'completed',
        stageResults: {},
        output: {
          rewrittenContent: null,
          storyboards: null,
          images: null,
          videos: null,
        },
        durationMs: 5000,
        error: null,
      }

      expect(result.status).toBe('completed')
    })
  })
})
