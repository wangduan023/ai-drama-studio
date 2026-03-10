/**
 * Worker Progress Reporter Tests
 * 测试 Worker 任务进度报告器
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getTaskStageLabel,
  buildTaskProgressMessage,
  reportTaskProgress,
  reportTaskStreamChunk,
  tryUpdateTaskProgress,
  touchTaskHeartbeat,
} from '../src/worker/progress-reporter'
import type { TaskJobData, StreamChunk } from '../src/types'
import { TASK_EVENT_TYPE } from '../src/types'

// Mock prisma and publisher
vi.mock('@ai-drama-studio/db', () => ({
  prisma: {
    task: {
      updateMany: vi.fn(),
    },
  },
}))

vi.mock('../src/publisher', () => ({
  publishTaskEvent: vi.fn(),
  publishTaskStreamEvent: vi.fn(),
}))

import { prisma } from '@ai-drama-studio/db'
import { publishTaskEvent, publishTaskStreamEvent } from '../src/publisher'

describe('ProgressReporter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTaskStageLabel', () => {
    it('应该返回已知阶段的标签', () => {
      expect(getTaskStageLabel('received')).toBe('progress.stage.received')
      expect(getTaskStageLabel('processing')).toBe('progress.stage.processing')
      expect(getTaskStageLabel('generating')).toBe('progress.stage.generating')
      expect(getTaskStageLabel('completing')).toBe('progress.stage.completing')
      expect(getTaskStageLabel('retrying')).toBe('progress.stage.retrying')
    })

    it('应该返回未知阶段的原始值', () => {
      expect(getTaskStageLabel('unknown')).toBe('unknown')
      expect(getTaskStageLabel('custom_stage')).toBe('custom_stage')
    })
  })

  describe('buildTaskProgressMessage', () => {
    it('应该为 CREATED 事件返回默认消息', () => {
      const message = buildTaskProgressMessage({
        eventType: TASK_EVENT_TYPE.CREATED,
      })
      expect(message).toBe('Task queued')
    })

    it('应该为 PROCESSING 事件返回阶段标签', () => {
      const message = buildTaskProgressMessage({
        eventType: TASK_EVENT_TYPE.PROCESSING,
        payload: { stage: 'processing' },
      })
      expect(message).toBe('progress.stage.processing')
    })

    it('应该为 PROCESSING 事件返回自定义消息', () => {
      const message = buildTaskProgressMessage({
        eventType: TASK_EVENT_TYPE.PROCESSING,
        payload: { message: 'Custom processing message' },
      })
      expect(message).toBe('Custom processing message')
    })

    it('应该为 PROGRESS 事件返回进度百分比', () => {
      const message = buildTaskProgressMessage({
        eventType: TASK_EVENT_TYPE.PROGRESS,
        progress: 75,
      })
      expect(message).toBe('75% complete')
    })

    it('应该为 COMPLETED 事件返回完成消息', () => {
      const message = buildTaskProgressMessage({
        eventType: TASK_EVENT_TYPE.COMPLETED,
      })
      expect(message).toBe('Task completed')
    })

    it('应该为 FAILED 事件返回失败消息', () => {
      const message = buildTaskProgressMessage({
        eventType: TASK_EVENT_TYPE.FAILED,
        payload: { error: { message: 'API timeout' } },
      })
      expect(message).toBe('API timeout')
    })

    it('应该为 FAILED 事件返回默认失败消息', () => {
      const message = buildTaskProgressMessage({
        eventType: TASK_EVENT_TYPE.FAILED,
        payload: {},
      })
      expect(message).toBe('Task failed')
    })

    it('应该为未知事件返回默认消息', () => {
      const message = buildTaskProgressMessage({
        eventType: 'unknown' as any,
      })
      expect(message).toBe('Task update')
    })

    it('应该优先使用自定义消息', () => {
      const message = buildTaskProgressMessage({
        eventType: TASK_EVENT_TYPE.PROGRESS,
        progress: 50,
        payload: { message: 'Custom message' },
      })
      expect(message).toBe('Custom message')
    })
  })

  describe('reportTaskProgress', () => {
    const mockJobData: TaskJobData = {
      taskId: 'task-1',
      projectId: 'project-1',
      userId: 'user-1',
      type: 'script_generate',
      targetType: 'episode',
      targetId: 'ep-1',
      episodeId: 'ep-1',
      payload: {},
      trace: {
        requestId: 'req-123',
      },
    }

    it('应该更新任务进度并发布事件', async () => {
      vi.mocked(prisma.task.updateMany).mockResolvedValue({ count: 1 })
      vi.mocked(publishTaskEvent).mockResolvedValue(undefined)

      await reportTaskProgress(mockJobData, 50)

      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'task-1',
          status: {
            in: ['QUEUED', 'PROCESSING'],
          },
        },
        data: {
          progress: 50,
          payload: expect.objectContaining({
            displayMode: 'loading',
            message: '50% complete',
          }),
        },
      })

      expect(publishTaskEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-1',
          projectId: 'project-1',
          userId: 'user-1',
          type: TASK_EVENT_TYPE.PROGRESS,
          taskType: 'script_generate',
          targetType: 'episode',
          targetId: 'ep-1',
          episodeId: 'ep-1',
          payload: expect.objectContaining({
            progress: 50,
            displayMode: 'loading',
            message: '50% complete',
            trace: {
              requestId: 'req-123',
            },
          }),
          persist: true,
        })
      )
    })

    it('应该限制进度值在 0-99 范围内', async () => {
      vi.mocked(prisma.task.updateMany).mockResolvedValue({ count: 1 })

      await reportTaskProgress(mockJobData, -10)
      expect(prisma.task.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            progress: 0,
          }),
        })
      )

      vi.clearAllMocks()
      vi.mocked(prisma.task.updateMany).mockResolvedValue({ count: 1 })

      await reportTaskProgress(mockJobData, 150)
      expect(prisma.task.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            progress: 99,
          }),
        })
      )
    })

    it('应该设置默认 displayMode 为 loading', async () => {
      vi.mocked(prisma.task.updateMany).mockResolvedValue({ count: 1 })

      await reportTaskProgress(mockJobData, 50, {})

      expect(prisma.task.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            payload: expect.objectContaining({
              displayMode: 'loading',
            }),
          }),
        })
      )
    })

    it('应该保留自定义 displayMode', async () => {
      vi.mocked(prisma.task.updateMany).mockResolvedValue({ count: 1 })

      await reportTaskProgress(
        mockJobData,
        50,
        { displayMode: 'detail' as const }
      )

      expect(prisma.task.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            payload: expect.objectContaining({
              displayMode: 'detail',
            }),
          }),
        })
      )
    })

    it('应该包含 trace 信息', async () => {
      vi.mocked(prisma.task.updateMany).mockResolvedValue({ count: 1 })

      await reportTaskProgress(mockJobData, 50)

      expect(publishTaskEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            trace: {
              requestId: 'req-123',
            },
          }),
        })
      )
    })

    it('应该在数据库更新失败时不发布事件', async () => {
      vi.mocked(prisma.task.updateMany).mockResolvedValue({ count: 0 })

      await reportTaskProgress(mockJobData, 50)

      expect(publishTaskEvent).not.toHaveBeenCalled()
    })
  })

  describe('reportTaskStreamChunk', () => {
    const mockJobData: TaskJobData = {
      taskId: 'task-1',
      projectId: 'project-1',
      userId: 'user-1',
      type: 'script.generate',
      targetType: 'episode',
      targetId: 'ep-1',
      episodeId: 'ep-1',
      payload: {},
      trace: {
        requestId: 'req-123',
      },
    }

    it('应该发布流式片段事件', async () => {
      vi.mocked(publishTaskStreamEvent).mockResolvedValue(null)

      const chunk: StreamChunk = {
        kind: 'text',
        content: 'Hello World',
      }

      await reportTaskStreamChunk(mockJobData, chunk)

      expect(publishTaskStreamEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-1',
          payload: expect.objectContaining({
            displayMode: 'detail',
            stream: chunk,
            done: false,
          }),
        })
      )
    })

    it('应该为 reasoning 类型设置特定消息', async () => {
      vi.mocked(publishTaskStreamEvent).mockResolvedValue(null)

      const chunk: StreamChunk = {
        kind: 'reasoning',
        content: 'Thinking...',
      }

      await reportTaskStreamChunk(mockJobData, chunk)

      expect(publishTaskStreamEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            message: 'Processing with reasoning...',
          }),
        })
      )
    })

    it('应该为普通类型设置默认消息', async () => {
      vi.mocked(publishTaskStreamEvent).mockResolvedValue(null)

      const chunk: StreamChunk = {
        kind: 'text',
        content: 'Generating...',
      }

      await reportTaskStreamChunk(mockJobData, chunk)

      expect(publishTaskStreamEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            message: 'Generating output...',
          }),
        })
      )
    })

    it('应该支持自定义消息', async () => {
      vi.mocked(publishTaskStreamEvent).mockResolvedValue(null)

      const chunk: StreamChunk = {
        kind: 'text',
        content: 'Custom',
      }

      await reportTaskStreamChunk(mockJobData, chunk, {
        message: 'Custom stream message',
      })

      expect(publishTaskStreamEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            message: 'Custom stream message',
          }),
        })
      )
    })

    it('应该包含 trace 信息', async () => {
      vi.mocked(publishTaskStreamEvent).mockResolvedValue(null)

      const chunk: StreamChunk = {
        kind: 'text',
        content: 'Test',
      }

      await reportTaskStreamChunk(mockJobData, chunk)

      expect(publishTaskStreamEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            trace: {
              requestId: 'req-123',
            },
          }),
        })
      )
    })
  })

  describe('tryUpdateTaskProgress', () => {
    it('应该成功更新任务进度', async () => {
      vi.mocked(prisma.task.updateMany).mockResolvedValue({ count: 1 })

      const result = await tryUpdateTaskProgress('task-1', 50, {
        custom: 'field',
      })

      expect(result).toBe(true)
      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'task-1',
          status: {
            in: ['QUEUED', 'PROCESSING'],
          },
        },
        data: {
          progress: 50,
          payload: { custom: 'field' },
        },
      })
    })

    it('应该在任务不存在时返回 false', async () => {
      vi.mocked(prisma.task.updateMany).mockResolvedValue({ count: 0 })

      const result = await tryUpdateTaskProgress('non-existent', 50)

      expect(result).toBe(false)
    })

    it('应该在错误时返回 false 并记录日志', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      vi.mocked(prisma.task.updateMany).mockRejectedValue(
        new Error('Database error')
      )

      const result = await tryUpdateTaskProgress('task-1', 50)

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TaskProgress] Failed to update task task-1'),
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('touchTaskHeartbeat', () => {
    it('应该更新任务心跳', async () => {
      vi.mocked(prisma.task.updateMany).mockResolvedValue({ count: 1 })

      await touchTaskHeartbeat('task-1')

      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'task-1',
          status: {
            in: ['QUEUED', 'PROCESSING'],
          },
        },
        data: {
          progress: { increment: 0 },
        },
      })
    })

    it('应该在错误时记录日志但不抛出', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      vi.mocked(prisma.task.updateMany).mockRejectedValue(
        new Error('Database error')
      )

      await touchTaskHeartbeat('task-1')

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          '[TaskHeartbeat] Failed to touch heartbeat for task task-1'
        ),
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })
})
