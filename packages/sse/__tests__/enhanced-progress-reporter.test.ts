/**
 * Tests for Enhanced SSE Queue Functionality
 */

import { describe, it, beforeEach, afterEach, vi, expect } from 'vitest'
import {
  reportTaskProgressEnhanced,
  reportTaskStreamChunkEnhanced,
  clearProgressCache,
  getProgressCacheSize
} from '../src/worker/enhanced-progress-reporter'
import { TASK_EVENT_TYPE } from '../src/types'

// Mock the publisher module
vi.mock('../src/publisher', () => ({
  publishTaskEvent: vi.fn().mockResolvedValue({}),
  publishTaskStreamEvent: vi.fn().mockResolvedValue({})
}))

// Mock the database module
vi.mock('@ai-drama-studio/db', () => ({
  prisma: {
    task: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 })
    }
  }
}))

const { publishTaskEvent, publishTaskStreamEvent } = require('../src/publisher')

describe('Enhanced Progress Reporter', () => {
  const mockJobData = {
    taskId: 'test-task-123',
    type: 'image_generate',
    projectId: 'test-project-456',
    episodeId: null,
    targetType: 'image',
    targetId: 'target-789',
    userId: 'user-101',
    trace: null
  }

  beforeEach(() => {
    vi.clearAllMocks()
    clearProgressCache()
  })

  it('should report progress successfully', async () => {
    const result = await reportTaskProgressEnhanced(
      mockJobData,
      25,
      { stage: 'processing', message: 'Test message' },
      { verbose: false }
    )

    expect(result).toBe(true)
    expect(require('@ai-drama-studio/db').prisma.task.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'test-task-123',
          status: {
            in: ['QUEUED', 'PROCESSING']
          }
        },
        data: expect.objectContaining({
          progress: 25
        })
      })
    )
  })

  it('should prevent duplicate progress reports below threshold', async () => {
    // First report at 25%
    await reportTaskProgressEnhanced(mockJobData, 25, {}, { minProgressDelta: 5 })

    // Second report at 26% - should be skipped due to threshold
    const result = await reportTaskProgressEnhanced(mockJobData, 26, {}, { minProgressDelta: 5 })

    expect(result).toBe(false) // Should return false indicating skipped
    expect(publishTaskEvent).toHaveBeenCalledTimes(1) // Only first call should go through
  })

  it('should allow progress reports that exceed threshold', async () => {
    // First report at 25%
    await reportTaskProgressEnhanced(mockJobData, 25, {}, { minProgressDelta: 5 })

    // Second report at 31% - should be allowed due to exceeding threshold
    const result = await reportTaskProgressEnhanced(mockJobData, 31, {}, { minProgressDelta: 5 })

    expect(result).toBe(true) // Should return true indicating successful
    expect(publishTaskEvent).toHaveBeenCalledTimes(2) // Both calls should go through
  })

  it('should report stream chunks successfully', async () => {
    const streamChunk = {
      kind: 'text',
      delta: 'test chunk',
      seq: 1
    }

    const result = await reportTaskStreamChunkEnhanced(
      mockJobData,
      streamChunk,
      { lane: 'test-lane' },
      { verbose: false }
    )

    expect(result).toBe(true)
    expect(publishTaskStreamEvent).toHaveBeenCalled()
  })

  it('should respect debounce timing', async () => {
    vi.useFakeTimers()

    // Report progress
    await reportTaskProgressEnhanced(mockJobData, 10, {}, {
      debounceUpdates: true,
      minProgressDelta: 1
    })

    expect(publishTaskEvent).toHaveBeenCalledTimes(1)

    // Try to report again immediately (should be debounced)
    await reportTaskProgressEnhanced(mockJobData, 11, {}, {
      debounceUpdates: true,
      minProgressDelta: 1
    })

    // Still only 1 call due to debounce
    expect(publishTaskEvent).toHaveBeenCalledTimes(1)

    // Advance timer past debounce interval
    vi.advanceTimersByTime(600) // More than 500ms debounce

    // Now report again
    await reportTaskProgressEnhanced(mockJobData, 12, {}, {
      debounceUpdates: true,
      minProgressDelta: 1
    })

    // Should now have 2 calls
    expect(publishTaskEvent).toHaveBeenCalledTimes(2)

    vi.useRealTimers()
  })

  it('should manage cache properly', () => {
    expect(getProgressCacheSize()).toBe(0)

    reportTaskProgressEnhanced(mockJobData, 10)

    expect(getProgressCacheSize()).toBe(1)

    clearProgressCache()

    expect(getProgressCacheSize()).toBe(0)
  })
})