/**
 * Task Progress Event Emitter
 *
 * Node.js EventEmitter for internal task progress events.
 * Used for local event distribution before publishing to Redis.
 */

import { EventEmitter } from 'events'
import type { TaskProgressEvent, StreamChunk } from './types'

/**
 * Task progress event emitter
 *
 * Events:
 * - 'progress': (event: TaskProgressEvent) => void
 * - 'stream': (taskId: string, chunk: StreamChunk) => void
 * - 'complete': (taskId: string, result: unknown) => void
 * - 'error': (taskId: string, error: Error) => void
 */
export const taskProgressEmitter = new EventEmitter()

// Set max listeners to avoid warnings in high-concurrency scenarios
taskProgressEmitter.setMaxListeners(100)

/**
 * Emit a task progress event
 */
export function emitTaskProgress(event: TaskProgressEvent): void {
  taskProgressEmitter.emit('progress', event)
}

/**
 * Emit a stream chunk event
 */
export function emitStreamChunk(taskId: string, chunk: StreamChunk): void {
  taskProgressEmitter.emit('stream', taskId, chunk)
}

/**
 * Emit a task complete event
 */
export function emitTaskComplete(taskId: string, result: unknown): void {
  taskProgressEmitter.emit('complete', taskId, result)
}

/**
 * Emit a task error event
 */
export function emitTaskError(taskId: string, error: Error): void {
  taskProgressEmitter.emit('error', taskId, error)
}

/**
 * Subscribe to task progress events
 */
export function onTaskProgress(
  handler: (event: TaskProgressEvent) => void
): () => void {
  taskProgressEmitter.on('progress', handler)
  return () => {
    taskProgressEmitter.off('progress', handler)
  }
}

/**
 * Subscribe to stream chunk events for a specific task
 */
export function onStreamChunk(
  taskId: string,
  handler: (chunk: StreamChunk) => void
): () => void {
  const wrappedHandler = (emittedTaskId: string, chunk: StreamChunk) => {
    if (emittedTaskId === taskId) {
      handler(chunk)
    }
  }
  taskProgressEmitter.on('stream', wrappedHandler)
  return () => {
    taskProgressEmitter.off('stream', wrappedHandler)
  }
}

/**
 * Wait for task completion
 */
export function waitForTaskComplete(
  taskId: string,
  timeoutMs = 300_000
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error(`Task ${taskId} timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    const cleanup = () => {
      clearTimeout(timer)
      taskProgressEmitter.off('complete', onComplete)
      taskProgressEmitter.off('error', onError)
    }

    const onComplete = (emittedTaskId: string, result: unknown) => {
      if (emittedTaskId === taskId) {
        cleanup()
        resolve(result)
      }
    }

    const onError = (emittedTaskId: string, error: Error) => {
      if (emittedTaskId === taskId) {
        cleanup()
        reject(error)
      }
    }

    taskProgressEmitter.on('complete', onComplete)
    taskProgressEmitter.on('error', onError)
  })
}
