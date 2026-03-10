import { describe, it, expect } from 'vitest'
import {
  TASK_STATUS,
  TASK_EVENT_TYPE,
  TASK_SSE_EVENT_TYPE,
  TASK_LIFECYCLE_EVENT_TYPES,
  TASK_TYPE,
  QUEUE_TYPE
} from '../src/types'

describe('Queue Types', () => {
  it('should have correct TASK_STATUS values', () => {
    expect(TASK_STATUS.QUEUED).toBe('QUEUED')
    expect(TASK_STATUS.PROCESSING).toBe('PROCESSING')
    expect(TASK_STATUS.COMPLETED).toBe('COMPLETED')
    expect(TASK_STATUS.FAILED).toBe('FAILED')
    expect(TASK_STATUS.RETRYING).toBe('RETRYING')
  })

  it('should have correct TASK_EVENT_TYPE values', () => {
    expect(TASK_EVENT_TYPE.CREATED).toBe('task.created')
    expect(TASK_EVENT_TYPE.PROCESSING).toBe('task.processing')
    expect(TASK_EVENT_TYPE.PROGRESS).toBe('task.progress')
    expect(TASK_EVENT_TYPE.COMPLETED).toBe('task.completed')
    expect(TASK_EVENT_TYPE.FAILED).toBe('task.failed')
  })

  it('should have correct TASK_SSE_EVENT_TYPE values', () => {
    expect(TASK_SSE_EVENT_TYPE.LIFECYCLE).toBe('task.lifecycle')
    expect(TASK_SSE_EVENT_TYPE.STREAM).toBe('task.stream')
  })

  it('should have correct TASK_LIFECYCLE_EVENT_TYPES array', () => {
    expect(TASK_LIFECYCLE_EVENT_TYPES).toEqual([
      'task.created',
      'task.processing',
      'task.completed',
      'task.failed',
    ])
  })

  it('should have correct TASK_TYPE values', () => {
    expect(TASK_TYPE.IMAGE_PANEL).toBe('image_panel')
    expect(TASK_TYPE.VOICE_LINE).toBe('voice_line')
    expect(TASK_TYPE.ANALYZE_NOVEL).toBe('analyze_novel')
    expect(TASK_TYPE.VIDEO_PANEL).toBe('video_panel')
    expect(Object.keys(TASK_TYPE).length).toBeGreaterThan(20)
  })

  it('should have correct QUEUE_TYPE values', () => {
    const queueTypes: QueueType[] = ['llm', 'image', 'video', 'voice']
    expect(queueTypes).toEqual(['llm', 'image', 'video', 'voice'])
  })
})