/**
 * Task Progress Emitter Tests
 * 测试任务进度事件发射器
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  taskProgressEmitter,
  emitTaskProgress,
  emitStreamChunk,
  emitTaskComplete,
  emitTaskError,
  onTaskProgress,
  onStreamChunk,
  waitForTaskComplete,
} from '../src/emitter'
import type { StreamChunk } from '../src/types'
import { TASK_EVENT_TYPE } from '../src/types'

// 抑制测试中的未处理 Promise 拒绝警告（这些是预期的错误测试）
process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason)
  // 忽略测试中预期的错误
  if (message.includes('Task failed') || message.includes('timed out') || message.includes('Failed')) {
    return
  }
  // 其他错误正常抛出
  console.error('Unhandled rejection:', reason)
})

describe('taskProgressEmitter', () => {
  beforeEach(() => {
    // 清除所有监听器
    taskProgressEmitter.removeAllListeners()
  })

  afterEach(() => {
    taskProgressEmitter.removeAllListeners()
  })

  describe('emitTaskProgress', () => {
    it('应该发射进度事件', () => {
      const handler = vi.fn()
      taskProgressEmitter.on('progress', handler)

      const event = {
        taskId: 'task-1',
        projectId: 'project-1',
        userId: 'user-1',
        type: TASK_EVENT_TYPE.PROGRESS,
        progress: 50,
        message: 'Processing...',
      }

      emitTaskProgress(event)

      expect(handler).toHaveBeenCalledWith(event)
    })

    it('应该支持多个监听器', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      taskProgressEmitter.on('progress', handler1)
      taskProgressEmitter.on('progress', handler2)

      const event = {
        taskId: 'task-1',
        projectId: 'project-1',
        userId: 'user-1',
        type: TASK_EVENT_TYPE.PROGRESS,
        progress: 75,
        message: 'Almost done',
      }

      emitTaskProgress(event)

      expect(handler1).toHaveBeenCalledWith(event)
      expect(handler2).toHaveBeenCalledWith(event)
    })
  })

  describe('emitStreamChunk', () => {
    it('应该发射流式片段事件', () => {
      const handler = vi.fn()
      taskProgressEmitter.on('stream', handler)

      const chunk: StreamChunk = {
        kind: 'text',
        content: 'Hello',
      }

      emitStreamChunk('task-1', chunk)

      expect(handler).toHaveBeenCalledWith('task-1', chunk)
    })

    it('应该发射不同类型的流式片段', () => {
      const handler = vi.fn()
      taskProgressEmitter.on('stream', handler)

      const reasoningChunk: StreamChunk = {
        kind: 'reasoning',
        content: 'Thinking...',
      }

      emitStreamChunk('task-2', reasoningChunk)

      expect(handler).toHaveBeenCalledWith('task-2', reasoningChunk)
    })
  })

  describe('emitTaskComplete', () => {
    it('应该发射完成事件', () => {
      const handler = vi.fn()
      taskProgressEmitter.on('complete', handler)

      const result = { success: true, data: { id: '123' } }

      emitTaskComplete('task-1', result)

      expect(handler).toHaveBeenCalledWith('task-1', result)
    })

    it('应该支持简单结果', () => {
      const handler = vi.fn()
      taskProgressEmitter.on('complete', handler)

      emitTaskComplete('task-1', 'done')

      expect(handler).toHaveBeenCalledWith('task-1', 'done')
    })
  })

  describe('emitTaskError', () => {
    it('应该发射错误事件', () => {
      const handler = vi.fn()
      taskProgressEmitter.on('error', handler)

      const error = new Error('Task failed')

      emitTaskError('task-1', error)

      expect(handler).toHaveBeenCalledWith('task-1', error)
    })

    it('应该传递错误详情', () => {
      const handler = vi.fn()
      taskProgressEmitter.on('error', handler)

      const error = new Error('Connection timeout')
      error.stack = 'Custom stack trace'

      emitTaskError('task-2', error)

      expect(handler).toHaveBeenCalledWith('task-2', error)
      expect(handler.mock.calls[0][1].message).toBe('Connection timeout')
    })
  })

  describe('onTaskProgress', () => {
    it('应该订阅进度事件并返回取消订阅函数', () => {
      const handler = vi.fn()
      const unsubscribe = onTaskProgress(handler)

      const event = {
        taskId: 'task-1',
        projectId: 'project-1',
        userId: 'user-1',
        type: TASK_EVENT_TYPE.PROGRESS,
        progress: 30,
        message: 'Starting...',
      }

      emitTaskProgress(event)
      expect(handler).toHaveBeenCalledWith(event)

      // 取消订阅
      unsubscribe()

      // 再次发射应该不会被接收到
      emitTaskProgress(event)
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('应该支持多个订阅者', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const unsubscribe1 = onTaskProgress(handler1)
      const unsubscribe2 = onTaskProgress(handler2)

      const event = {
        taskId: 'task-1',
        type: TASK_EVENT_TYPE.PROGRESS,
        progress: 60,
        message: 'In progress',
        projectId: 'p1',
        userId: 'u1',
      }

      emitTaskProgress(event)

      expect(handler1).toHaveBeenCalledWith(event)
      expect(handler2).toHaveBeenCalledWith(event)

      // 只取消其中一个
      unsubscribe1()

      emitTaskProgress({ ...event, progress: 70 })
      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(2)

      unsubscribe2()
    })
  })

  describe('onStreamChunk', () => {
    it('应该订阅特定任务的流式片段事件', () => {
      const handler = vi.fn()
      const unsubscribe = onStreamChunk('task-1', handler)

      const chunk1: StreamChunk = { kind: 'text', content: 'Hello', seq: 0 }
      const chunk2: StreamChunk = { kind: 'text', content: 'World', seq: 1 }

      // 匹配任务 ID 的事件应该被接收
      emitStreamChunk('task-1', chunk1)
      expect(handler).toHaveBeenCalledWith(chunk1)

      // 不匹配任务 ID 的事件不应该被接收
      emitStreamChunk('task-2', chunk2)
      expect(handler).toHaveBeenCalledTimes(1)

      unsubscribe()
    })

    it('应该返回取消订阅函数', () => {
      const handler = vi.fn()
      const unsubscribe = onStreamChunk('task-1', handler)

      const chunk: StreamChunk = { kind: 'text', content: 'Test', seq: 0 }

      emitStreamChunk('task-1', chunk)
      expect(handler).toHaveBeenCalledTimes(1)

      unsubscribe()

      emitStreamChunk('task-1', chunk)
      expect(handler).toHaveBeenCalledTimes(1)
    })
  })

  describe('waitForTaskComplete', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('应该在任务完成时解析 Promise', async () => {
      const result = { success: true }
      const promise = waitForTaskComplete('task-1')

      // 模拟任务完成事件
      setTimeout(() => {
        emitTaskComplete('task-1', result)
      }, 10)

      await vi.advanceTimersByTimeAsync(10)
      const resolved = await promise

      expect(resolved).toBe(result)
    })

    it('应该只响应匹配任务 ID 的完成事件', async () => {
      const promise = waitForTaskComplete('task-1')

      // 发送不匹配的任务完成事件
      emitTaskComplete('task-2', { wrong: 'task' })

      // 发送正确的任务完成事件
      setTimeout(() => {
        emitTaskComplete('task-1', { correct: 'task' })
      }, 10)

      await vi.advanceTimersByTimeAsync(10)
      const resolved = await promise

      expect(resolved).toEqual({ correct: 'task' })
    })

    it('应该在任务失败时拒绝 Promise', async () => {
      const promise = waitForTaskComplete('task-1')

      const error = new Error('Task failed')

      setTimeout(() => {
        emitTaskError('task-1', error)
      }, 10)

      await vi.advanceTimersByTimeAsync(10)

      await expect(promise).rejects.toThrow('Task failed')
    })

    it('应该在超时后拒绝 Promise', async () => {
      const promise = waitForTaskComplete('task-1', 1000)

      // 推进时间但不触发完成事件
      await vi.advanceTimersByTimeAsync(1001)

      await expect(promise).rejects.toThrow('Task task-1 timed out after 1000ms')
    })

    it('应该清理监听器（成功情况）', async () => {
      const promise = waitForTaskComplete('task-1')

      setTimeout(() => {
        emitTaskComplete('task-1', 'done')
      }, 10)

      await vi.advanceTimersByTimeAsync(10)
      await promise

      // 验证监听器已被清理
      expect(taskProgressEmitter.listenerCount('complete')).toBe(0)
      expect(taskProgressEmitter.listenerCount('error')).toBe(0)
    })

    it('应该清理监听器（失败情况）', async () => {
      const promise = waitForTaskComplete('task-1')

      setTimeout(() => {
        emitTaskError('task-1', new Error('Failed'))
      }, 10)

      await vi.advanceTimersByTimeAsync(10)

      try {
        await promise
      } catch {
        // 预期错误
      }

      // 验证监听器已被清理
      expect(taskProgressEmitter.listenerCount('complete')).toBe(0)
      expect(taskProgressEmitter.listenerCount('error')).toBe(0)
    })
  })

  describe('MaxListeners', () => {
    it('应该设置最大监听器数量为 100', () => {
      expect(taskProgressEmitter.getMaxListeners()).toBe(100)
    })
  })
})
