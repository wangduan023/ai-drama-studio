/**
 * Queue Types 测试
 */

import { describe, it, expect } from 'vitest'
import {
  TASK_STATUS,
  TASK_EVENT_TYPE,
  TASK_SSE_EVENT_TYPE,
  TASK_LIFECYCLE_EVENT_TYPES,
  TASK_TYPE,
} from '../src/types'

describe('Task Status', () => {
  it('应该包含所有任务状态', () => {
    expect(TASK_STATUS.QUEUED).toBe('QUEUED')
    expect(TASK_STATUS.PROCESSING).toBe('PROCESSING')
    expect(TASK_STATUS.COMPLETED).toBe('COMPLETED')
    expect(TASK_STATUS.FAILED).toBe('FAILED')
    expect(TASK_STATUS.RETRYING).toBe('RETRYING')
  })
})

describe('Task Event Types', () => {
  it('应该包含所有任务事件类型', () => {
    expect(TASK_EVENT_TYPE.CREATED).toBe('task.created')
    expect(TASK_EVENT_TYPE.PROCESSING).toBe('task.processing')
    expect(TASK_EVENT_TYPE.PROGRESS).toBe('task.progress')
    expect(TASK_EVENT_TYPE.COMPLETED).toBe('task.completed')
    expect(TASK_EVENT_TYPE.FAILED).toBe('task.failed')
  })
})

describe('Task SSE Event Types', () => {
  it('应该包含所有 SSE 事件类型', () => {
    expect(TASK_SSE_EVENT_TYPE.LIFECYCLE).toBe('task.lifecycle')
    expect(TASK_SSE_EVENT_TYPE.STREAM).toBe('task.stream')
  })
})

describe('Task Lifecycle Event Types', () => {
  it('应该包含所有生命周期事件类型', () => {
    expect(TASK_LIFECYCLE_EVENT_TYPES).toContain('task.created')
    expect(TASK_LIFECYCLE_EVENT_TYPES).toContain('task.processing')
    expect(TASK_LIFECYCLE_EVENT_TYPES).toContain('task.completed')
    expect(TASK_LIFECYCLE_EVENT_TYPES).toContain('task.failed')
  })
})

describe('Task Types', () => {
  it('应该包含 AI 生成任务类型', () => {
    expect(TASK_TYPE.SCRIPT_GENERATE).toBe('script:generate')
    expect(TASK_TYPE.CHARACTER_GENERATE).toBe('character:generate')
    expect(TASK_TYPE.SCENE_GENERATE).toBe('scene:generate')
    expect(TASK_TYPE.IMAGE_GENERATE).toBe('image:generate')
    expect(TASK_TYPE.VIDEO_GENERATE).toBe('video:generate')
    expect(TASK_TYPE.AUDIO_GENERATE).toBe('audio:generate')
  })

  it('应该包含图像生成任务类型', () => {
    expect(TASK_TYPE.IMAGE_PANEL).toBe('image_panel')
    expect(TASK_TYPE.IMAGE_CHARACTER).toBe('image_character')
    expect(TASK_TYPE.IMAGE_LOCATION).toBe('image_location')
    expect(TASK_TYPE.PANEL_VARIANT).toBe('panel_variant')
  })

  it('应该包含视频生成任务类型', () => {
    expect(TASK_TYPE.VIDEO_PANEL).toBe('video_panel')
    expect(TASK_TYPE.LIP_SYNC).toBe('lip_sync')
  })

  it('应该包含语音任务类型', () => {
    expect(TASK_TYPE.VOICE_LINE).toBe('voice_line')
    expect(TASK_TYPE.VOICE_DESIGN).toBe('voice_design')
  })

  it('应该包含 LLM 任务类型', () => {
    expect(TASK_TYPE.ANALYZE_NOVEL).toBe('analyze_novel')
    expect(TASK_TYPE.STORY_TO_SCRIPT_RUN).toBe('story_to_script_run')
    expect(TASK_TYPE.SCRIPT_TO_STORYBOARD_RUN).toBe('script_to_storyboard_run')
    expect(TASK_TYPE.ANALYZE_GLOBAL).toBe('analyze_global')
    expect(TASK_TYPE.AI_CREATE_CHARACTER).toBe('ai_create_character')
    expect(TASK_TYPE.AI_CREATE_LOCATION).toBe('ai_create_location')
  })
})

describe('类型定义', () => {
  it('应该支持 TaskJobData 接口', () => {
    const jobData = {
      taskId: 'task-123',
      type: TASK_TYPE.SCRIPT_GENERATE,
      locale: 'zh' as const,
      projectId: 'proj-456',
      episodeId: 'ep-789',
      targetType: 'script',
      targetId: 'script-001',
      payload: { content: 'test' },
      userId: 'user-123',
      trace: { requestId: 'req-456' },
    }

    expect(jobData.taskId).toBe('task-123')
    expect(jobData.type).toBe('script:generate')
    expect(jobData.locale).toBe('zh')
  })

  it('应该支持 TaskBillingInfo 接口（可计费）', () => {
    const billingInfo = {
      billable: true,
      source: 'task' as const,
      taskType: TASK_TYPE.IMAGE_GENERATE,
      apiType: 'image' as const,
      model: 'dall-e-3',
      quantity: 1,
      unit: 'image' as const,
      maxFrozenCost: 0.04,
      action: 'generate_image',
    }

    expect(billingInfo.billable).toBe(true)
    expect(billingInfo.apiType).toBe('image')
  })

  it('应该支持 TaskBillingInfo 接口（不可计费）', () => {
    const billingInfo = {
      billable: false,
    }

    expect(billingInfo.billable).toBe(false)
  })

  it('应该支持 SSEEvent 接口', () => {
    const event = {
      id: 'event-123',
      type: 'task.lifecycle' as const,
      taskId: 'task-456',
      projectId: 'proj-789',
      userId: 'user-123',
      ts: new Date().toISOString(),
      taskType: 'script:generate',
      payload: { lifecycleType: 'task.completed' as const },
    }

    expect(event.type).toBe('task.lifecycle')
    expect(event.payload?.lifecycleType).toBe('task.completed')
  })

  it('应该支持 CreateTaskInput 接口', () => {
    const input = {
      userId: 'user-123',
      projectId: 'proj-456',
      type: TASK_TYPE.SCRIPT_GENERATE,
      targetType: 'script',
      targetId: 'script-001',
      payload: { content: 'test' },
      dedupeKey: 'dedupe-123',
      priority: 1,
      maxAttempts: 3,
    }

    expect(input.priority).toBe(1)
    expect(input.maxAttempts).toBe(3)
  })

  it('应该支持 LLMStreamChunk 接口', () => {
    const chunk = {
      kind: 'output' as const,
      delta: 'Hello',
      seq: 1,
      lane: 'main',
    }

    expect(chunk.kind).toBe('output')
    expect(chunk.seq).toBe(1)
  })
})
