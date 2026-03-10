import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Job } from 'bullmq'
import {
  TASK_TYPE,
  TASK_STATUS,
  type TaskJobData
} from '../src/types'
import {
  getQueueTypeByTaskType,
  getQueueByType,
  addTaskJob,
  getTaskStatus,
  clearAllQueues
} from '../src/queues'
import {
  withTaskLifecycle,
  reportTaskProgress,
  normalizeAnyError
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

describe('Queue Integration', () => {
  const mockJobData: TaskJobData = {
    taskId: 'integration-test-task',
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

  it('should properly integrate task creation, lifecycle, and progress reporting', async () => {
    // 1. Add a task to the queue
    const job = await addTaskJob(mockJobData)
    expect(job.id).toBe(mockJobData.taskId)

    // 2. Verify the task is in the correct queue
    const queueType = getQueueTypeByTaskType(mockJobData.type)
    expect(queueType).toBe('llm') // ANALYZE_NOVEL should go to llm queue

    const queue = getQueueByType(queueType)
    const retrievedJob = await queue.getJob(mockJobData.taskId)
    expect(retrievedJob).not.toBeNull()
    expect(retrievedJob?.data).toEqual(mockJobData)

    // 3. Check task status
    const status = await getTaskStatus(mockJobData.taskId)
    expect(status).toEqual({
      queue: 'llm',
      status: 'waiting'
    })

    // 4. Execute the task with lifecycle management
    const mockHandler = vi.fn().mockResolvedValue('task-success-result')
    const result = await withTaskLifecycle(mockJob, mockHandler)
    expect(mockHandler).toHaveBeenCalledWith(mockJob)
    expect(result).toBe('task-success-result')

    // 5. Report progress during task execution
    await reportTaskProgress(mockJob, 50)
    const { reportTaskProgressEnhanced } = await import('@ai-drama-studio/sse/worker')
    expect(reportTaskProgressEnhanced).toHaveBeenCalledWith(
      mockJobData,
      50,
      { progress: 50 },
      expect.any(Object)
    )
  })

  it('should handle task type routing correctly across modules', () => {
    // Test that all major task types route to correct queues
    expect(getQueueTypeByTaskType(TASK_TYPE.ANALYZE_NOVEL)).toBe('llm')
    expect(getQueueTypeByTaskType(TASK_TYPE.IMAGE_PANEL)).toBe('image')
    expect(getQueueTypeByTaskType(TASK_TYPE.VIDEO_PANEL)).toBe('video')
    expect(getQueueTypeByTaskType(TASK_TYPE.VOICE_LINE)).toBe('voice')
  })

  it('should handle errors consistently across modules', () => {
    // Test error normalization
    const error = new Error('Test error for integration')
    const normalized = normalizeAnyError(error)
    expect(normalized.message).toBe('Test error for integration')
    expect(typeof normalized.retryable).toBe('boolean')
  })

  it('should manage full task lifecycle with progress updates', async () => {
    // Create a task
    const taskData: TaskJobData = {
      taskId: 'full-lifecycle-test',
      type: TASK_TYPE.IMAGE_PANEL,
      locale: 'en',
      projectId: 'project-123',
      targetType: 'panel',
      targetId: 'target-456',
      userId: 'user-abc'
    }

    // Add to queue
    const job = await addTaskJob(taskData)
    expect(job.id).toBe('full-lifecycle-test')

    // Mock a job object for lifecycle management
    const mockJobObj = {
      data: taskData,
      queueName: 'image-queue',
      updateProgress: vi.fn().mockResolvedValue(undefined),
      attemptsMade: 0,
      opts: { attempts: 3 }
    } as unknown as Job<TaskJobData>

    // Execute with lifecycle management and report progress
    let progressUpdates = 0
    const handler = async (j: Job<TaskJobData>) => {
      await reportTaskProgress(j, 25)
      progressUpdates++

      await reportTaskProgress(j, 50)
      progressUpdates++

      await reportTaskProgress(j, 75)
      progressUpdates++

      return 'completed'
    }

    const result = await withTaskLifecycle(mockJobObj, handler)
    expect(result).toBe('completed')
    expect(progressUpdates).toBe(3)
  })
})