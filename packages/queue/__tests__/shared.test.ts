import { describe, it, expect, vi, beforeEach, afterEach, MockedFunction } from 'vitest'
import { Job, UnrecoverableError } from 'bullmq'
import {
  reportTaskProgress,
  withTaskLifecycle,
  reportLLMStreamChunk,
  touchTaskHeartbeat,
  assertTaskActive,
  normalizeAnyError,
  TaskTerminatedError
} from '../src/shared'
import type { TaskJobData } from '../src/types'
import { TASK_TYPE } from '../src/types'

// Mock the SSE worker functions
vi.mock('@ai-drama-studio/sse/worker', async () => {
  return {
    reportTaskProgressEnhanced: vi.fn().mockResolvedValue(true),
    reportTaskStreamChunkEnhanced: vi.fn().mockResolvedValue(true)
  }
})

// Mock console methods
vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation(() => {})
vi.spyOn(console, 'debug').mockImplementation(() => {})

describe('Shared Utilities', () => {
  const mockJobData: TaskJobData = {
    taskId: 'test-task-123',
    type: TASK_TYPE.ANALYZE_NOVEL,
    locale: 'en',
    projectId: 'project-456',
    targetType: 'episode',
    targetId: 'target-789',
    userId: 'user-abc'
  }

  let mockJob: Job<TaskJobData>

  beforeEach(() => {
    mockJob = {
      data: mockJobData,
      queueName: 'test-queue',
      updateProgress: vi.fn().mockResolvedValue(undefined),
      attemptsMade: 0,
      opts: { attempts: 3 }
    } as unknown as Job<TaskJobData>
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('reportTaskProgress', () => {
    it('should report task progress with clamped values', async () => {
      const { reportTaskProgressEnhanced } = await import('@ai-drama-studio/sse/worker')

      await reportTaskProgress(mockJob, 50)
      expect(reportTaskProgressEnhanced).toHaveBeenCalledWith(
        mockJobData,
        50,
        {
          progress: 50,
        },
        {
          minProgressDelta: 2,
          debounceUpdates: true,
          verbose: false,
        }
      )
    })

    it('should clamp progress to valid range when enhanced fails', async () => {
      const { reportTaskProgressEnhanced } = await import('@ai-drama-studio/sse/worker')

      // First test negative value - enhanced method will succeed, so updateProgress won't be called
      ;(reportTaskProgressEnhanced as MockedFunction<any>).mockResolvedValue(true)
      await reportTaskProgress(mockJob, -10) // Will be clamped internally to 0

      // Reset mocks to test fallback scenario
      const { reportTaskProgressEnhanced: reportTaskProgressEnhanced2 } = await import('@ai-drama-studio/sse/worker')
      ;(reportTaskProgressEnhanced2 as MockedFunction<any>).mockResolvedValueOnce(false)

      await reportTaskProgress(mockJob, -5) // Should fallback and call updateProgress with 0
      expect(mockJob.updateProgress).toHaveBeenCalledWith(0)

      // Reset for next test
      mockJob.updateProgress = vi.fn().mockResolvedValue(undefined)
      const { reportTaskProgressEnhanced: reportTaskProgressEnhanced3 } = await import('@ai-drama-studio/sse/worker')
      ;(reportTaskProgressEnhanced3 as MockedFunction<any>).mockResolvedValueOnce(false)

      await reportTaskProgress(mockJob, 150) // Should fallback and call updateProgress with 99
      expect(mockJob.updateProgress).toHaveBeenCalledWith(99)
    })

    it('should fall back to original method when enhanced fails', async () => {
      const { reportTaskProgressEnhanced } = await import('@ai-drama-studio/sse/worker')
      ;(reportTaskProgressEnhanced as MockedFunction<any>).mockResolvedValueOnce(false)

      await reportTaskProgress(mockJob, 75)

      expect(mockJob.updateProgress).toHaveBeenCalledWith(75)
    })
  })

  describe('withTaskLifecycle', () => {
    it('should execute handler successfully', async () => {
      const mockHandler = vi.fn().mockResolvedValue('success-result')

      const result = await withTaskLifecycle(mockJob, mockHandler)

      expect(mockHandler).toHaveBeenCalledWith(mockJob)
      expect(result).toBe('success-result')
    })

    it('should handle errors and propagate them', async () => {
      const mockHandler = vi.fn().mockRejectedValue(new Error('Test error'))

      await expect(withTaskLifecycle(mockJob, mockHandler))
        .rejects.toThrow('Test error')
    })

    it('should handle retryable errors by rethrowing them', async () => {
      const mockHandler = vi.fn().mockRejectedValue(new Error('Network timeout occurred'))

      // Mock job attempts
      mockJob.attemptsMade = 1
      mockJob.opts = { attempts: 3 }

      await expect(withTaskLifecycle(mockJob, mockHandler))
        .rejects.toThrow('Network timeout occurred')
    })

    it('should throw UnrecoverableError for non-retryable scenarios', async () => {
      const mockHandler = vi.fn().mockRejectedValue(new Error('Some permanent error'))

      // Mock job attempts to have reached max
      mockJob.attemptsMade = 2 // This means it will be the 3rd attempt (0-indexed) which is the last
      mockJob.opts = { attempts: 3 }

      await expect(withTaskLifecycle(mockJob, mockHandler))
        .rejects.toThrow(UnrecoverableError)
    })
  })

  describe('reportLLMStreamChunk', () => {
    it('should report LLM stream chunk via enhanced method', async () => {
      const { reportTaskStreamChunkEnhanced } = await import('@ai-drama-studio/sse/worker')

      const chunk = {
        kind: 'output' as const,
        delta: 'Hello, world!',
        seq: 1,
        lane: 'main'
      }

      await reportLLMStreamChunk(mockJob, chunk)

      expect(reportTaskStreamChunkEnhanced).toHaveBeenCalledWith(
        mockJobData,
        {
          kind: 'output',
          delta: 'Hello, world!',
          seq: 1,
          lane: 'main',
        },
        {
          displayMode: 'detail',
        },
        {
          verbose: false,
        }
      )
    })

    it('should handle enhanced method failure gracefully', async () => {
      const { reportTaskStreamChunkEnhanced } = await import('@ai-drama-studio/sse/worker')
      ;(reportTaskStreamChunkEnhanced as MockedFunction<any>).mockResolvedValueOnce(false)

      const chunk = {
        kind: 'output' as const,
        delta: 'Fallback test',
        seq: 1,
        lane: 'main'
      }

      // This should not throw
      await reportLLMStreamChunk(mockJob, chunk)
    })
  })

  describe('touchTaskHeartbeat', () => {
    it('should execute heartbeat function', async () => {
      const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})

      await touchTaskHeartbeat('test-task-id')

      expect(consoleSpy).toHaveBeenCalledWith('[Heartbeat] Task test-task-id heartbeat')
    })
  })

  describe('assertTaskActive', () => {
    it('should return true when task is active', async () => {
      const result = await assertTaskActive(mockJob, 'some-stage')
      expect(result).toBe(true)
    })
  })

  describe('normalizeAnyError', () => {
    it('should normalize TaskTerminatedError', () => {
      const error = new TaskTerminatedError('Task was cancelled')
      const normalized = normalizeAnyError(error)

      expect(normalized).toEqual({
        code: 'TASK_TERMINATED',
        message: 'Task was cancelled',
        retryable: false
      })
    })

    it('should normalize standard Error', () => {
      const error = new Error('Standard error message')
      const normalized = normalizeAnyError(error)

      expect(normalized.code).toBe('INTERNAL_ERROR') // Default code for regular errors
      expect(normalized.message).toBe('Standard error message')
      expect(typeof normalized.retryable).toBe('boolean') // Just check it's a boolean
    })

    it('should handle errors with custom codes', () => {
      const error = new Error('Database error') as Error & { code?: string }
      error.code = 'DATABASE_ERROR'
      const normalized = normalizeAnyError(error)

      expect(normalized.code).toBe('DATABASE_ERROR')
      expect(normalized.message).toBe('Database error')
      expect(typeof normalized.retryable).toBe('boolean') // Just check it's a boolean
    })

    it('should handle non-error objects', () => {
      const error = 'Plain string error'
      const normalized = normalizeAnyError(error)

      expect(normalized).toEqual({
        code: 'UNKNOWN_ERROR',
        message: 'Plain string error',
        retryable: true,
        provider: 'worker'
      })
    })

    it('should handle null/undefined errors', () => {
      const normalized1 = normalizeAnyError(null)
      const normalized2 = normalizeAnyError(undefined)

      expect(normalized1.message).toBe('null')
      expect(normalized2.message).toBe('undefined')
    })
  })

  describe('TaskTerminatedError', () => {
    it('should create TaskTerminatedError with correct properties', () => {
      const error = new TaskTerminatedError('Test termination message')

      expect(error.message).toBe('Test termination message')
      expect(error.name).toBe('TaskTerminatedError')
    })
  })
})