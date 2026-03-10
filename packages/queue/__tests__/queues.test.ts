import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  QUEUE_NAME,
  getQueueTypeByTaskType,
  getQueueByType,
  addTaskJob,
  removeTaskJob,
  getTaskStatus,
  getQueueStats,
  clearAllQueues,
  closeQueueConnection,
  llmQueue,
  imageQueue,
  videoQueue,
  voiceQueue
} from '../src/queues'
import { TASK_TYPE } from '../src/types'
import type { TaskJobData } from '../src/types'

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

describe('Queue Management', () => {
  beforeEach(() => {
    // Reset any mocked implementations if needed
  })

  afterEach(async () => {
    // Clean up after each test
    try {
      await clearAllQueues()
    } catch (e) {
      // Ignore cleanup errors in tests
    }
  })

  it('should have correct queue names', () => {
    expect(QUEUE_NAME.LLM).toBe('ai-drama-studio-llm')
    expect(QUEUE_NAME.IMAGE).toBe('ai-drama-studio-image')
    expect(QUEUE_NAME.VIDEO).toBe('ai-drama-studio-video')
    expect(QUEUE_NAME.VOICE).toBe('ai-drama-studio-voice')
  })

  it('should map task types to correct queue types', () => {
    // LLM tasks
    expect(getQueueTypeByTaskType(TASK_TYPE.ANALYZE_NOVEL)).toBe('llm')
    expect(getQueueTypeByTaskType(TASK_TYPE.STORY_TO_SCRIPT_RUN)).toBe('llm')
    expect(getQueueTypeByTaskType(TASK_TYPE.VOICE_ANALYZE)).toBe('llm')

    // Image tasks
    expect(getQueueTypeByTaskType(TASK_TYPE.IMAGE_PANEL)).toBe('image')
    expect(getQueueTypeByTaskType(TASK_TYPE.IMAGE_CHARACTER)).toBe('image')
    expect(getQueueTypeByTaskType(TASK_TYPE.PANEL_VARIANT)).toBe('image')

    // Video tasks
    expect(getQueueTypeByTaskType(TASK_TYPE.VIDEO_PANEL)).toBe('video')
    expect(getQueueTypeByTaskType(TASK_TYPE.LIP_SYNC)).toBe('video')

    // Voice tasks
    expect(getQueueTypeByTaskType(TASK_TYPE.VOICE_LINE)).toBe('voice')
    expect(getQueueTypeByTaskType(TASK_TYPE.VOICE_DESIGN)).toBe('voice')
  })

  it('should return default queue type for unknown task', () => {
    // Using a fake task type that doesn't exist
    const fakeTaskType = 'fake_task_type' as any
    expect(getQueueTypeByTaskType(fakeTaskType)).toBe('llm')
  })

  it('should get correct queue by type', () => {
    expect(getQueueByType('llm')).toBe(llmQueue)
    expect(getQueueByType('image')).toBe(imageQueue)
    expect(getQueueByType('video')).toBe(videoQueue)
    expect(getQueueByType('voice')).toBe(voiceQueue)
  })

  it('should add task job to correct queue', async () => {
    const mockTaskData: TaskJobData = {
      taskId: 'test-task-id',
      type: TASK_TYPE.ANALYZE_NOVEL,
      locale: 'en',
      projectId: 'project-123',
      targetType: 'episode',
      targetId: 'target-456',
      userId: 'user-789'
    }

    const job = await addTaskJob(mockTaskData)

    expect(job.id).toBe('test-task-id')
    expect(job.data).toEqual(mockTaskData)

    // Verify the job was added to the correct queue (llm for ANALYZE_NOVEL)
    const llmQueueJob = await llmQueue.getJob('test-task-id')
    expect(llmQueueJob).not.toBeNull()
    expect(llmQueueJob?.data).toEqual(mockTaskData)
  })

  it('should add task job with options', async () => {
    const mockTaskData: TaskJobData = {
      taskId: 'test-task-id-2',
      type: TASK_TYPE.IMAGE_PANEL,
      locale: 'en',
      projectId: 'project-123',
      targetType: 'panel',
      targetId: 'target-456',
      userId: 'user-789'
    }

    const job = await addTaskJob(mockTaskData, { priority: 5 })

    expect(job.id).toBe('test-task-id-2')
    expect(job.opts?.priority).toBe(5)
  })

  it('should remove task job from queue', async () => {
    const mockTaskData: TaskJobData = {
      taskId: 'test-remove-task',
      type: TASK_TYPE.ANALYZE_NOVEL,
      locale: 'en',
      projectId: 'project-123',
      targetType: 'episode',
      targetId: 'target-456',
      userId: 'user-789'
    }

    // Add a job first
    await addTaskJob(mockTaskData)

    // Verify job exists
    const jobBefore = await llmQueue.getJob('test-remove-task')
    expect(jobBefore).not.toBeNull()

    // Remove the job
    const removed = await removeTaskJob('test-remove-task')

    expect(removed).toBe(true)

    // Verify job no longer exists
    const jobAfter = await llmQueue.getJob('test-remove-task')
    expect(jobAfter).toBeNull()
  })

  it('should return false when trying to remove non-existent task', async () => {
    const removed = await removeTaskJob('non-existent-task')
    expect(removed).toBe(false)
  })

  it('should get task status from correct queue', async () => {
    const mockTaskData: TaskJobData = {
      taskId: 'test-status-task',
      type: TASK_TYPE.VOICE_LINE,
      locale: 'en',
      projectId: 'project-123',
      targetType: 'voice',
      targetId: 'target-456',
      userId: 'user-789'
    }

    // Add a job first
    await addTaskJob(mockTaskData)

    // Get task status
    const status = await getTaskStatus('test-status-task')

    expect(status).toEqual({
      queue: 'voice', // Since VOICE_LINE is a voice task
      status: 'waiting' // From our mock implementation
    })
  })

  it('should return null for non-existent task status', async () => {
    const status = await getTaskStatus('non-existent-task')
    expect(status).toBeNull()
  })

  it('should get queue stats', async () => {
    // Add some jobs to different queues
    await addTaskJob({
      taskId: 'llm-task-1',
      type: TASK_TYPE.ANALYZE_NOVEL,
      locale: 'en',
      projectId: 'project-123',
      targetType: 'episode',
      targetId: 'target-456',
      userId: 'user-789'
    })

    await addTaskJob({
      taskId: 'image-task-1',
      type: TASK_TYPE.IMAGE_PANEL,
      locale: 'en',
      projectId: 'project-123',
      targetType: 'panel',
      targetId: 'target-456',
      userId: 'user-789'
    })

    const stats = await getQueueStats()

    expect(stats['ai-drama-studio-llm'].waiting).toBeGreaterThanOrEqual(1)
    expect(stats['ai-drama-studio-image'].waiting).toBeGreaterThanOrEqual(1)
  })

  it('should clear all queues', async () => {
    // Add jobs to queues
    await addTaskJob({
      taskId: 'task-for-clear',
      type: TASK_TYPE.ANALYZE_NOVEL,
      locale: 'en',
      projectId: 'project-123',
      targetType: 'episode',
      targetId: 'target-456',
      userId: 'user-789'
    })

    // Verify jobs exist
    const jobBefore = await llmQueue.getJob('task-for-clear')
    expect(jobBefore).not.toBeNull()

    // Clear all queues
    await clearAllQueues()

    // Verify jobs are cleared
    const jobAfter = await llmQueue.getJob('task-for-clear')
    expect(jobAfter).toBeNull()
  })
})