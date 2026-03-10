import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Job, UnrecoverableError } from 'bullmq'
import {
  TASK_TYPE,
  type TaskJobData
} from '../src/types'
import {
  getQueueTypeByTaskType,
  addTaskJob,
  removeTaskJob,
  getTaskStatus,
  getQueueStats,
  clearAllQueues
} from '../src/queues'
import {
  withTaskLifecycle,
  normalizeAnyError,
  TaskTerminatedError
} from '../src/shared'

// Mock the BullMQ and ioredis modules
vi.mock('bullmq', async () => {
  const actual = await vi.importActual('bullmq')
  return {
    ...actual,
    Queue: class MockQueue {
      name: string
      jobs: Map<string, any> = new Map()

      constructor(name: string) {
        this.name = name
      }

      async add(jobName: string, data: any, opts?: any) {
        const jobId = opts?.jobId || `mock-job-${Date.now()}`
        const job = {
          id: jobId,
          name: jobName,
          data,
          opts: { ...opts, priority: opts?.priority || 0 },
          getState: vi.fn().mockResolvedValue('waiting'),
          remove: vi.fn().mockImplementation(() => {
            this.jobs.delete(jobId)
            return Promise.resolve()
          }),
          updateProgress: vi.fn().mockResolvedValue(undefined)
        }
        this.jobs.set(jobId, job)
        return job
      }

      async getJob(jobId: string) {
        return this.jobs.get(jobId) || null
      }

      async getWaitingCount() { return this.jobs.size }
      async getActiveCount() { return 0 }
      async getCompletedCount() { return 0 }
      async getFailedCount() { return 0 }
      async getDelayedCount() { return 0 }
      async getPausedCount() { return 0 }

      async obliterate() {
        this.jobs.clear()
      }

      async close() {
        // Mock close implementation
      }
    },
    Job: actual.Job,
    UnrecoverableError: class UnrecoverableError extends Error {
      constructor(message: string) {
        super(message)
        this.name = 'UnrecoverableError'
      }
    }
  }
})

vi.mock('ioredis', () => {
  return {
    default: class MockRedis {
      quit = vi.fn().mockResolvedValue(undefined)
    }
  }
})

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

describe('Queue Edge Cases and Error Handling', () => {
  const mockJobData: TaskJobData = {
    taskId: 'edge-case-test-task',
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

  afterEach(async () => {
    try {
      await clearAllQueues()
    } catch (e) {
      // Ignore cleanup errors in tests
    }
    vi.clearAllMocks()
  })

  it('should handle unknown task types gracefully', () => {
    // Use a task type that doesn't exist
    const fakeTaskType = 'unknown_task_type' as any
    const queueType = getQueueTypeByTaskType(fakeTaskType)
    expect(queueType).toBe('llm') // Should default to llm
  })

  it('should return null for non-existent task status', async () => {
    const status = await getTaskStatus('non-existent-task-id')
    expect(status).toBeNull()
  })

  it('should return false when trying to remove non-existent task', async () => {
    const result = await removeTaskJob('non-existent-task-id')
    expect(result).toBe(false)
  })

  it('should handle queue stats when queues are empty', async () => {
    const stats = await getQueueStats()

    expect(stats).toHaveProperty('ai-drama-studio-llm')
    expect(stats).toHaveProperty('ai-drama-studio-image')
    expect(stats).toHaveProperty('ai-drama-studio-video')
    expect(stats).toHaveProperty('ai-drama-studio-voice')

    // All counts should be 0 since queues are empty
    expect(stats['ai-drama-studio-llm'].waiting).toBe(0)
    expect(stats['ai-drama-studio-image'].waiting).toBe(0)
    expect(stats['ai-drama-studio-video'].waiting).toBe(0)
    expect(stats['ai-drama-studio-voice'].waiting).toBe(0)
  })

  it('should handle error in task lifecycle with max retries reached', async () => {
    const mockHandler = vi.fn().mockRejectedValue(new Error('Permanent error'))

    // Simulate max attempts reached
    mockJob.attemptsMade = 2 // Third attempt (0-indexed), max is 3
    mockJob.opts = { attempts: 3 }

    await expect(withTaskLifecycle(mockJob, mockHandler))
      .rejects.toThrow(UnrecoverableError)
  })

  it('should handle various error types with normalizeAnyError', () => {
    // Test TaskTerminatedError
    const termError = new TaskTerminatedError('Task cancelled')
    const normTermError = normalizeAnyError(termError)
    expect(normTermError.code).toBe('TASK_TERMINATED')
    expect(normTermError.retryable).toBe(false)

    // Test regular Error
    const regError = new Error('Regular error')
    const normRegError = normalizeAnyError(regError)
    expect(normRegError.code).toBe('INTERNAL_ERROR')
    expect(typeof normRegError.retryable).toBe('boolean')

    // Test string error
    const strError = 'String error'
    const normStrError = normalizeAnyError(strError)
    expect(normStrError.code).toBe('UNKNOWN_ERROR')
    expect(normStrError.message).toBe('String error')
    expect(normStrError.retryable).toBe(true)

    // Test null
    const normNull = normalizeAnyError(null)
    expect(normNull.message).toBe('null')

    // Test undefined
    const normUndefined = normalizeAnyError(undefined)
    expect(normUndefined.message).toBe('undefined')

    // Test object error
    const objError = { message: 'Object error' }
    const normObjError = normalizeAnyError(objError)
    expect(normObjError.message).toBe('[object Object]')
  })

  it('should handle task lifecycle with retryable errors', async () => {
    const mockHandler = vi.fn().mockRejectedValue(new Error('Network timeout error'))

    // Simulate second attempt (first retry)
    mockJob.attemptsMade = 1 // Second attempt, max is 3
    mockJob.opts = { attempts: 3 }

    await expect(withTaskLifecycle(mockJob, mockHandler))
      .rejects.toThrow('Network timeout error')
    // Should not throw UnrecoverableError yet because attempts haven't maxed out
  })

  it('should clear all queues without errors', async () => {
    // Add some jobs first
    await addTaskJob({
      ...mockJobData,
      taskId: 'job-to-clear-1'
    })

    await addTaskJob({
      ...mockJobData,
      taskId: 'job-to-clear-2',
      type: TASK_TYPE.IMAGE_PANEL
    })

    // Verify jobs exist
    const job1 = await mockJob.queueName === 'test-queue' ? null :
      (await import('../src/queues')).llmQueue.getJob('job-to-clear-1')

    // Actually check by adding to specific queues
    const { llmQueue, imageQueue } = await import('../src/queues')
    expect(await llmQueue.getJob('job-to-clear-1')).not.toBeNull()
    expect(await imageQueue.getJob('job-to-clear-2')).not.toBeNull()

    // Clear all queues
    await clearAllQueues()

    // Verify queues are empty
    expect(await llmQueue.getJob('job-to-clear-1')).toBeNull()
    expect(await imageQueue.getJob('job-to-clear-2')).toBeNull()
  })

  it('should handle tasks with various payload structures', async () => {
    // Test task with complex payload
    const complexPayloadTask: TaskJobData = {
      ...mockJobData,
      taskId: 'complex-payload-task',
      payload: {
        nested: {
          data: [1, 2, 3],
          value: 'test-value',
          nullValue: null,
          boolValue: true
        },
        arrayData: [{ id: 1 }, { id: 2 }],
        primitive: 'simple-string'
      }
    }

    const job = await addTaskJob(complexPayloadTask)
    expect(job.data.payload).toEqual(complexPayloadTask.payload)

    // Test task with no payload
    const noPayloadTask: TaskJobData = {
      ...mockJobData,
      taskId: 'no-payload-task',
      payload: undefined
    }

    const job2 = await addTaskJob(noPayloadTask)
    expect(job2.data.payload).toBeUndefined()

    // Test task with null payload
    const nullPayloadTask: TaskJobData = {
      ...mockJobData,
      taskId: 'null-payload-task',
      payload: null
    }

    const job3 = await addTaskJob(nullPayloadTask)
    expect(job3.data.payload).toBeNull()
  })
})