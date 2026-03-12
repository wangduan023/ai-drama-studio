/**
 * Workflow Types 测试
 */

import { describe, it, expect } from 'vitest'
import { PipelineError } from '../src/types'

describe('PipelineError', () => {
  it('应该正确创建错误实例', () => {
    const error = new PipelineError('测试错误', 'TEST_ERROR')

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(PipelineError)
    expect(error.name).toBe('PipelineError')
    expect(error.message).toBe('测试错误')
    expect(error.code).toBe('TEST_ERROR')
    expect(error.retryable).toBe(true)
  })

  it('应该支持 stageType 参数', () => {
    const error = new PipelineError('阶段错误', 'STAGE_ERROR', 'rewrite')

    expect(error.stageType).toBe('rewrite')
  })

  it('应该支持 cause 参数', () => {
    const cause = new Error('原始错误')
    const error = new PipelineError('包装错误', 'WRAPPED_ERROR', undefined, cause)

    expect(error.cause).toBe(cause)
  })

  it('应该支持 retryable 参数', () => {
    const error = new PipelineError('不可重试错误', 'NO_RETRY', undefined, undefined, false)

    expect(error.retryable).toBe(false)
  })

  it('应该支持所有参数组合', () => {
    const cause = new Error('原始错误')
    const error = new PipelineError(
      '完整错误',
      'FULL_ERROR',
      'storyboard',
      cause,
      false
    )

    expect(error.message).toBe('完整错误')
    expect(error.code).toBe('FULL_ERROR')
    expect(error.stageType).toBe('storyboard')
    expect(error.cause).toBe(cause)
    expect(error.retryable).toBe(false)
  })
})

describe('类型定义', () => {
  it('应该支持 StageType 联合类型', () => {
    const stageTypes: ('rewrite' | 'storyboard' | 'image' | 'video')[] = [
      'rewrite',
      'storyboard',
      'image',
      'video',
    ]

    expect(stageTypes).toContain('rewrite')
    expect(stageTypes).toContain('storyboard')
    expect(stageTypes).toContain('image')
    expect(stageTypes).toContain('video')
  })

  it('应该支持 StageStatus 联合类型', () => {
    const statuses: ('pending' | 'running' | 'completed' | 'failed' | 'retrying' | 'skipped' | 'cancelled')[] = [
      'pending',
      'running',
      'completed',
      'failed',
      'retrying',
      'skipped',
      'cancelled',
    ]

    expect(statuses.length).toBe(7)
  })

  it('应该支持 CharacterAppearanceMap 接口', () => {
    const appearanceMap = {
      characterId: 'char-123',
      name: 'Alice',
      appearanceId: 'app-456',
      changeReason: '变装',
      description: '穿着晚礼服',
      descriptions: ['描述1', '描述2'],
      imageUrl: 'https://example.com/image.jpg',
    }

    expect(appearanceMap.characterId).toBe('char-123')
    expect(appearanceMap.name).toBe('Alice')
  })

  it('应该支持 LocationInfo 接口', () => {
    const location = {
      locationId: 'loc-123',
      name: '客厅',
      description: '宽敞明亮',
      locationType: '室内',
      imageUrl: 'https://example.com/loc.jpg',
    }

    expect(location.locationId).toBe('loc-123')
    expect(location.name).toBe('客厅')
  })

  it('应该支持 StoryboardPanel 接口', () => {
    const panel = {
      panelNumber: 1,
      description: '角色走进房间',
      location: '客厅',
      sourceText: '原文内容',
      characters: ['Alice', 'Bob'],
      shotType: '中景',
      cameraMove: '推镜',
      imagePrompt: '生成图片提示词',
      videoPrompt: '生成视频提示词',
      duration: 5,
    }

    expect(panel.panelNumber).toBe(1)
    expect(panel.characters).toEqual(['Alice', 'Bob'])
  })

  it('应该支持 PhotographyPlan 接口', () => {
    const plan = {
      composition: '三分法',
      lighting: '自然光',
      colorPalette: '暖色调',
      atmosphere: '温馨',
      technicalNotes: '技术备注',
    }

    expect(plan.composition).toBe('三分法')
  })

  it('应该支持 GeneratedImage 接口', () => {
    const image = {
      id: 'img-123',
      url: 'https://example.com/img.jpg',
      prompt: '提示词',
      modelName: 'dall-e-3',
      params: { size: '1024x1024' },
    }

    expect(image.id).toBe('img-123')
    expect(image.modelName).toBe('dall-e-3')
  })

  it('应该支持 GeneratedVideo 接口', () => {
    const video = {
      id: 'vid-123',
      url: 'https://example.com/vid.mp4',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      duration: 10,
      width: 1920,
      height: 1080,
      fps: 30,
    }

    expect(video.duration).toBe(10)
    expect(video.fps).toBe(30)
  })

  it('应该支持 PipelineContext 接口', () => {
    const context = {
      projectId: 'proj-123',
      episodeId: 'ep-456',
      userId: 'user-789',
      locale: 'zh' as const,
      taskId: 'task-001',
      input: {
        content: '小说内容',
        baseCharacters: ['Alice', 'Bob'],
      },
      characters: {
        profiles: [{ id: 'char-1', name: 'Alice' }],
        appearanceMap: {},
      },
      locations: {
        profiles: [],
      },
      stageData: {},
      extensions: {},
    }

    expect(context.projectId).toBe('proj-123')
    expect(context.input.content).toBe('小说内容')
  })

  it('应该支持 StageResult 接口', () => {
    const result = {
      stageType: 'rewrite' as const,
      status: 'completed' as const,
      data: { content: '改写后的内容' },
      retryCount: 0,
      durationMs: 1000,
      aiLogs: [{ action: 'rewrite', model: 'gpt-4' }],
    }

    expect(result.status).toBe('completed')
    expect(result.durationMs).toBe(1000)
  })

  it('应该支持 StageConfig 接口', () => {
    const config = {
      maxRetries: 3,
      timeoutMs: 30000,
      skippable: false,
      failPipeline: true,
    }

    expect(config.maxRetries).toBe(3)
    expect(config.failPipeline).toBe(true)
  })

  it('应该支持 PipelineResult 接口', () => {
    const result = {
      status: 'completed' as const,
      stageResults: {},
      output: {
        rewrittenContent: '改写内容',
        storyboards: [],
        images: [],
        videos: [],
      },
      durationMs: 5000,
    }

    expect(result.status).toBe('completed')
    expect(result.durationMs).toBe(5000)
  })

  it('应该支持 AiExecuteInput 接口', () => {
    const input = {
      userId: 'user-123',
      model: 'gpt-4',
      messages: [{ role: 'user' as const, content: 'Hello' }],
      reasoning: true,
      projectId: 'proj-456',
      action: 'generate',
      meta: { key: 'value' },
    }

    expect(input.model).toBe('gpt-4')
    expect(input.reasoning).toBe(true)
  })

  it('应该支持 AiExecuteOutput 接口', () => {
    const output = {
      text: '生成的文本',
      reasoning: '推理过程',
    }

    expect(output.text).toBe('生成的文本')
  })
})
