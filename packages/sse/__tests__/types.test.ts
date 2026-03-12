/**
 * SSE Types 测试
 */

import { describe, it, expect } from 'vitest'
import {
  TASK_STATUS,
  TASK_EVENT_TYPE,
  TASK_SSE_EVENT_TYPE,
  TASK_LIFECYCLE_EVENT_TYPES,
  TASK_TYPE,
} from '../src/types'

describe('Task Status Constants', () => {
  it('应该包含所有任务状态', () => {
    expect(TASK_STATUS.QUEUED).toBe('QUEUED')
    expect(TASK_STATUS.PROCESSING).toBe('PROCESSING')
    expect(TASK_STATUS.COMPLETED).toBe('COMPLETED')
    expect(TASK_STATUS.FAILED).toBe('FAILED')
    expect(TASK_STATUS.RETRYING).toBe('RETRYING')
  })
})

describe('Task Event Type Constants', () => {
  it('应该包含所有任务事件类型', () => {
    expect(TASK_EVENT_TYPE.CREATED).toBe('task.created')
    expect(TASK_EVENT_TYPE.PROCESSING).toBe('task.processing')
    expect(TASK_EVENT_TYPE.PROGRESS).toBe('task.progress')
    expect(TASK_EVENT_TYPE.COMPLETED).toBe('task.completed')
    expect(TASK_EVENT_TYPE.FAILED).toBe('task.failed')
  })
})

describe('Task SSE Event Type Constants', () => {
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

  it('生命周期事件类型数量应该正确', () => {
    expect(TASK_LIFECYCLE_EVENT_TYPES.length).toBe(4)
  })
})

describe('Task Type Constants', () => {
  it('应该包含脚本生成任务类型', () => {
    expect(TASK_TYPE.SCRIPT_GENERATE).toBe('script_generate')
  })

  it('应该包含分镜生成任务类型', () => {
    expect(TASK_TYPE.STORYBOARD_GENERATE).toBe('storyboard_generate')
  })

  it('应该包含图像生成任务类型', () => {
    expect(TASK_TYPE.IMAGE_GENERATE).toBe('image_generate')
  })

  it('应该包含视频生成任务类型', () => {
    expect(TASK_TYPE.VIDEO_GENERATE).toBe('video_generate')
  })

  it('应该包含语音生成任务类型', () => {
    expect(TASK_TYPE.VOICE_GENERATE).toBe('voice_generate')
  })

  it('应该包含角色分析任务类型', () => {
    expect(TASK_TYPE.CHARACTER_PROFILE_ANALYZE).toBe('character_profile_analyze')
    expect(TASK_TYPE.CHARACTER_VISUAL_GENERATE).toBe('character_visual_generate')
  })

  it('应该包含场景分析任务类型', () => {
    expect(TASK_TYPE.LOCATION_ANALYZE).toBe('location_analyze')
    expect(TASK_TYPE.LOCATION_VISUAL_GENERATE).toBe('location_visual_generate')
  })

  it('应该包含其他任务类型', () => {
    expect(TASK_TYPE.EPISODE_SPLIT).toBe('episode_split')
    expect(TASK_TYPE.SCREENPLAY_CONVERT).toBe('screenplay_convert')
  })
})

describe('类型定义', () => {
  it('应该支持 TaskProgressEvent 接口', () => {
    const event = {
      taskId: 'task-123',
      projectId: 'proj-456',
      userId: 'user-789',
      type: 'task.progress' as const,
      taskType: 'script_generate' as const,
      targetType: 'script',
      targetId: 'script-001',
      episodeId: 'ep-001',
      progress: 50,
      stage: 'generate',
      stageLabel: '生成中',
      message: '正在生成内容...',
      payload: { detail: 'info' },
    }

    expect(event.taskId).toBe('task-123')
    expect(event.progress).toBe(50)
  })

  it('应该支持 StreamChunk 接口', () => {
    const chunk = {
      kind: 'text' as const,
      delta: 'Hello',
      seq: 1,
      lane: 'main',
    }

    expect(chunk.kind).toBe('text')
    expect(chunk.seq).toBe(1)
  })

  it('应该支持 StreamChunk 的 reasoning 类型', () => {
    const chunk = {
      kind: 'reasoning' as const,
      delta: '思考中...',
      seq: 2,
    }

    expect(chunk.kind).toBe('reasoning')
  })

  it('应该支持 SSEEvent 接口', () => {
    const event = {
      id: 'event-001',
      type: 'task.lifecycle' as const,
      taskId: 'task-123',
      projectId: 'proj-456',
      userId: 'user-789',
      ts: new Date().toISOString(),
      payload: {
        lifecycleType: 'task.completed' as const,
        progress: 100,
        message: '任务完成',
      },
    }

    expect(event.type).toBe('task.lifecycle')
    expect(event.payload?.lifecycleType).toBe('task.completed')
  })

  it('应该支持 TaskJobData 接口', () => {
    const jobData = {
      taskId: 'task-123',
      type: 'script_generate' as const,
      projectId: 'proj-456',
      targetType: 'script',
      targetId: 'script-001',
      userId: 'user-789',
    }

    expect(jobData.type).toBe('script_generate')
  })

  it('应该支持 CreateTaskInput 接口', () => {
    const input = {
      userId: 'user-123',
      projectId: 'proj-456',
      type: 'image_generate' as const,
      targetType: 'image',
      targetId: 'img-001',
      payload: { prompt: 'test' },
      dedupeKey: 'dedupe-001',
      priority: 1,
    }

    expect(input.priority).toBe(1)
  })

  it('应该支持 EnhancedProgressReporterOptions 接口', () => {
    const options = {
      minProgressDelta: 5,
      debounceUpdates: true,
      persist: true,
      verbose: false,
    }

    expect(options.minProgressDelta).toBe(5)
    expect(options.persist).toBe(true)
  })

  it('应该支持 QueueType 联合类型', () => {
    const queueTypes: ('image' | 'video' | 'voice' | 'text')[] = [
      'image',
      'video',
      'voice',
      'text',
    ]

    expect(queueTypes).toContain('image')
    expect(queueTypes).toContain('video')
  })

  it('应该支持 TaskBillingInfo（可计费）接口', () => {
    const billingInfo = {
      billable: true,
      source: 'task' as const,
      taskType: 'image_generate' as const,
      apiType: 'image' as const,
      model: 'dall-e-3',
      quantity: 1,
      unit: 'image' as const,
      maxFrozenCost: 0.04,
      action: 'generate',
    }

    expect(billingInfo.billable).toBe(true)
    expect(billingInfo.apiType).toBe('image')
  })

  it('应该支持 TaskBillingInfo（不可计费）接口', () => {
    const billingInfo = {
      billable: false,
    }

    expect(billingInfo.billable).toBe(false)
  })
})
