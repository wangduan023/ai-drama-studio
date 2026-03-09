'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

export interface SSEEvent {
  type: string
  taskId?: string
  taskType?: string
  targetType?: string
  targetId?: string
  episodeId?: string
  projectId?: string
  payload?: {
    lifecycleType?: string
    progress?: number
    stage?: string
    stageLabel?: string
    [key: string]: unknown
  }
  ts?: string
}

export interface UseSSEOptions {
  projectId?: string | null
  episodeId?: string | null
  enabled?: boolean
  onEvent?: (event: SSEEvent) => void
}

export interface UseSSEReturn {
  connected: boolean
  events: SSEEvent[]
  lastEvent: SSEEvent | null
}

/**
 * SSE 连接钩子 - 用于接收服务器推送的实时事件
 */
export function useSSE({
  projectId,
  episodeId,
  enabled = true,
  onEvent,
}: UseSSEOptions): UseSSEReturn {
  const [connected, setConnected] = useState(false)
  const [events, setEvents] = useState<SSEEvent[]>([])
  const sourceRef = useRef<EventSource | null>(null)

  const url = useCallback(() => {
    if (!projectId) return null
    const params = new URLSearchParams({ projectId })
    if (episodeId) params.set('episodeId', episodeId)
    return `/api/sse?${params.toString()}`
  }, [projectId, episodeId])

  useEffect(() => {
    if (!enabled || !projectId) return

    const eventSource = new EventSource(url())
    sourceRef.current = eventSource

    const handleEvent = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data || '{}')
        if (!payload || !payload.type) return

        setEvents((prev) => [...prev, payload as SSEEvent])
        onEvent?.(payload as SSEEvent)
      } catch (error) {
        console.error('[useSSE] Failed to parse event:', error)
      }
    }

    eventSource.onopen = () => {
      setConnected(true)
    }

    eventSource.onerror = (error) => {
      console.error('[useSSE] Connection error:', error)
      setConnected(false)
    }

    return () => {
      eventSource.close()
      sourceRef.current = null
    }
  }, [enabled, projectId, url, onEvent])

  return {
    connected,
    events,
    lastEvent: events.length > 0 ? events[events.length - 1] : null,
  }
}
