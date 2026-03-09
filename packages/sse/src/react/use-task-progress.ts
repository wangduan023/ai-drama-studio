/**
 * React Hooks for SSE Task Progress Subscription
 */

'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import type { SSEEvent, TaskProgressEvent } from '../types'

/**
 * Options for useTaskProgress hook
 */
export interface UseTaskProgressOptions {
  /** Project ID (required) */
  projectId: string
  /** Task ID (optional, if not provided subscribes to all project tasks) */
  taskId?: string
  /** Episode ID filter (optional) */
  episodeId?: string | null
  /** Whether to automatically reconnect on disconnect */
  autoReconnect?: boolean
  /** Reconnect delay in milliseconds */
  reconnectDelay?: number
  /** Callback when new event is received */
  onEvent?: (event: SSEEvent) => void
  /** Callback when connection is established */
  onConnect?: () => void
  /** Callback when connection is lost */
  onDisconnect?: () => void
  /** Callback when error occurs */
  onError?: (error: Error) => void
}

/**
 * Task progress state
 */
export interface TaskProgressState {
  /** All received events */
  events: SSEEvent[]
  /** Latest event for the task */
  latestEvent: SSEEvent | null
  /** Current progress percentage (0-100) */
  progress: number
  /** Current status */
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'unknown'
  /** Whether the task is complete */
  isComplete: boolean
  /** Whether the task has failed */
  isFailed: boolean
  /** Whether currently connected to SSE stream */
  isConnected: boolean
  /** Last error if any */
  error: Error | null
  /** Last event timestamp */
  lastEventTs: string | null
  /** Last event ID for replay */
  lastEventId: string | null
}

const initialState: TaskProgressState = {
  events: [],
  latestEvent: null,
  progress: 0,
  status: 'unknown',
  isComplete: false,
  isFailed: false,
  isConnected: false,
  error: null,
  lastEventTs: null,
  lastEventId: null,
}

/**
 * Extract progress from SSE event payload
 */
function extractProgress(event: SSEEvent): number | null {
  const payload = event.payload
  if (!payload) return null
  if (typeof payload.progress === 'number') return payload.progress
  return null
}

/**
 * Extract lifecycle type from SSE event
 */
function extractLifecycleType(event: SSEEvent): string | null {
  const payload = event.payload
  if (!payload) return null
  return payload.lifecycleType || null
}

/**
 * Map lifecycle type to status
 */
function lifecycleTypeToStatus(lifecycleType: string): 'queued' | 'processing' | 'completed' | 'failed' | 'unknown' {
  switch (lifecycleType) {
    case 'task.created':
      return 'queued'
    case 'task.processing':
      return 'processing'
    case 'task.completed':
      return 'completed'
    case 'task.failed':
      return 'failed'
    default:
      return 'unknown'
  }
}

/**
 * React hook for subscribing to task progress via SSE
 *
 * @example
 * ```tsx
 * function TaskProgress({ taskId, projectId }: { taskId: string, projectId: string }) {
 *   const { progress, status, isConnected, events } = useTaskProgress({
 *     projectId,
 *     taskId,
 *     onEvent: (event) => console.log('New event:', event),
 *   })
 *
 *   return (
 *     <div>
 *       <div>Status: {status}</div>
 *       <div>Progress: {progress}%</div>
 *       <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
 *     </div>
 *   )
 * }
 * ```
 */
export function useTaskProgress(options: UseTaskProgressOptions): TaskProgressState {
  const {
    projectId,
    taskId,
    episodeId,
    autoReconnect = true,
    reconnectDelay = 3000,
    onEvent,
    onConnect,
    onDisconnect,
    onError,
  } = options

  const [state, setState] = useState<TaskProgressState>(initialState)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastEventIdRef = useRef<string | null>(null)

  // Build SSE URL
  const buildSSEUrl = useCallback(() => {
    const baseUrl = taskId
      ? `/api/tasks/${taskId}/stream`
      : '/api/sse'
    const params = new URLSearchParams({ projectId })
    if (episodeId) params.append('episodeId', episodeId)
    return `${baseUrl}?${params.toString()}`
  }, [projectId, taskId, episodeId])

  // Process received event
  const processEvent = useCallback((event: SSEEvent) => {
    setState((prev) => {
      const lifecycleType = extractLifecycleType(event)
      const progress = extractProgress(event)
      const newStatus = lifecycleType ? lifecycleTypeToStatus(lifecycleType) : prev.status

      return {
        ...prev,
        events: [...prev.events, event],
        latestEvent: event,
        progress: progress !== null ? progress : prev.progress,
        status: newStatus,
        isComplete: newStatus === 'completed',
        isFailed: newStatus === 'failed',
        lastEventTs: event.ts,
        lastEventId: event.id,
      }
    })

    // Call user callback
    onEvent?.(event)

    // Update last event ID ref for reconnection
    if (typeof event.id === 'string' && /^\d+$/.test(event.id)) {
      lastEventIdRef.current = event.id
    }
  }, [onEvent])

  // Connect to SSE stream
  const connect = useCallback(() => {
    // Clear any pending reconnect
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    try {
      const url = buildSSEUrl()
      const eventSource = new EventSource(url)

      // Handle lifecycle events
      eventSource.addEventListener('task.lifecycle', (event) => {
        try {
          const data = JSON.parse(event.data) as SSEEvent
          processEvent(data)
        } catch (error) {
          console.error('[SSE] Failed to parse lifecycle event:', error)
        }
      })

      // Handle stream events
      eventSource.addEventListener('task.stream', (event) => {
        try {
          const data = JSON.parse(event.data) as SSEEvent
          processEvent(data)
        } catch (error) {
          console.error('[SSE] Failed to parse stream event:', error)
        }
      })

      // Handle heartbeat
      eventSource.addEventListener('heartbeat', () => {
        // Heartbeat received, connection is alive
        setState((prev) => ({ ...prev, error: null }))
      })

      // Handle connection open
      eventSource.addEventListener('open', () => {
        setState((prev) => ({
          ...prev,
          isConnected: true,
          error: null,
        }))
        onConnect?.()
      })

      // Handle connection error
      eventSource.addEventListener('error', (error) => {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          error: error instanceof Error ? error : new Error('SSE connection error'),
        }))
        onDisconnect?.()

        // Auto-reconnect
        if (autoReconnect && !reconnectTimerRef.current) {
          reconnectTimerRef.current = setTimeout(() => {
            connect()
          }, reconnectDelay)
        }
      })

      eventSourceRef.current = eventSource
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to create EventSource')
      setState((prev) => ({
        ...prev,
        error: err,
      }))
      onError?.(err)
    }
  }, [buildSSEUrl, processEvent, autoReconnect, reconnectDelay, onConnect, onDisconnect, onError])

  // Disconnect from SSE stream
  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setState((prev) => ({
      ...prev,
      isConnected: false,
    }))
  }, [])

  // Initial connection and cleanup
  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  // Expose disconnect method via state for convenience
  ;(state as TaskProgressState & { disconnect: () => void }).disconnect = disconnect

  return state
}

/**
 * React Hook for polling task progress via REST API
 *
 * Alternative to SSE for simpler use cases or when SSE is not available.
 */
export function useTaskProgressPolling(
  taskId: string,
  options: {
    projectId?: string
    pollInterval?: number
    stopOnComplete?: boolean
  } = {}
) {
  const { projectId, pollInterval = 2000, stopOnComplete = true } = options
  const [state, setState] = useState<TaskProgressState>(initialState)
  const [isLoading, setIsLoading] = useState(true)

  const fetchProgress = useCallback(async () => {
    try {
      const url = `/api/tasks/${taskId}/progress${projectId ? `?projectId=${projectId}` : ''}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      setState((prev) => ({
        ...prev,
        progress: data.progress || 0,
        status: data.status || 'unknown',
        isComplete: data.status === 'completed' || data.status === 'COMPLETED',
        isFailed: data.status === 'failed' || data.status === 'FAILED',
        latestEvent: {
          id: String(Date.now()),
          type: 'task.lifecycle' as const,
          taskId: data.taskId,
          projectId: data.projectId,
          userId: '',
          ts: new Date().toISOString(),
          taskType: data.type,
          targetType: data.targetType,
          targetId: data.targetId,
          episodeId: data.episodeId,
          payload: {
            lifecycleType: data.status === 'QUEUED' ? 'task.created' : data.status === 'PROCESSING' ? 'task.processing' : data.status === 'COMPLETED' ? 'task.completed' : 'task.failed',
            progress: data.progress,
          },
        },
        lastEventTs: new Date().toISOString(),
      }))

      setIsLoading(false)

      // Stop polling if task is complete
      if (stopOnComplete && (data.status === 'completed' || data.status === 'failed')) {
        return 'complete'
      }

      return 'continue'
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Failed to fetch progress'),
      }))
      setIsLoading(false)
      return 'error'
    }
  }, [taskId, projectId, stopOnComplete])

  useEffect(() => {
    fetchProgress()

    const interval = setInterval(async () => {
      const result = await fetchProgress()
      if (result === 'complete') {
        clearInterval(interval)
      }
    }, pollInterval)

    return () => clearInterval(interval)
  }, [fetchProgress, pollInterval])

  return { ...state, isLoading }
}
