'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

export interface SSEEvent {
  id?: string
  type: string
  taskId?: string
  taskType?: string
  targetType?: string
  targetId?: string
  episodeId?: string
  projectId?: string
  userId?: string
  payload?: {
    lifecycleType?: string
    progress?: number
    stage?: string
    stageLabel?: string
    message?: string
    result?: unknown
    error?: string
    errorCode?: string
    retryable?: boolean
    stream?: {
      kind: string
      delta?: string
      content?: string
      seq: number
    }
    [key: string]: unknown
  }
  ts?: string
  reconnectCount?: number
}

export interface UseSSEOptions {
  projectId?: string | null
  episodeId?: string | null
  enabled?: boolean
  onEvent?: (event: SSEEvent) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: Error) => void
  /**
   * 自动重连配置
   */
  reconnect?: {
    enabled?: boolean
    maxAttempts?: number
    interval?: number
    backoffMultiplier?: number
    maxInterval?: number
  }
}

export interface UseSSEReturn {
  connected: boolean
  connecting: boolean
  events: SSEEvent[]
  lastEvent: SSEEvent | null
  reconnectAttempts: number
  error: Error | null
  /**
   * 手动重连
   */
  reconnect: () => void
  /**
   * 断开连接
   */
  disconnect: () => void
}

// 默认重连配置
const DEFAULT_RECONNECT_CONFIG = {
  enabled: true,
  maxAttempts: 10,
  interval: 3000,
  backoffMultiplier: 1.5,
  maxInterval: 30000,
}

/**
 * SSE 连接钩子 - 用于接收服务器推送的实时事件
 * 
 * 特性:
 * - 自动重连机制 (指数退避)
 * - JWT Token 认证
 * - 连接状态管理
 * - 事件历史记录
 * - 手动重连/断开
 */
export function useSSE({
  projectId,
  episodeId,
  enabled = true,
  onEvent,
  onConnected,
  onDisconnected,
  onError,
  reconnect: reconnectConfig = {},
}: UseSSEOptions): UseSSEReturn {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [events, setEvents] = useState<SSEEvent[]>([])
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [error, setError] = useState<Error | null>(null)
  
  const sourceRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null)
  const currentIntervalRef = useRef<number>(reconnectConfig.interval || DEFAULT_RECONNECT_CONFIG.interval)
  const lastEventIdRef = useRef<string | null>(null)
  const isManualDisconnectRef = useRef(false)

  // 合并重连配置
  const config = {
    ...DEFAULT_RECONNECT_CONFIG,
    ...reconnectConfig,
  }

  // 获取认证 Token
  const getAuthToken = useCallback((): string | null => {
    // 从 localStorage 获取 JWT token
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || localStorage.getItem('auth_token') || null
    }
    return null
  }, [])

  // 构建 SSE URL
  const buildUrl = useCallback((): string | null => {
    if (!projectId) return null
    
    const params = new URLSearchParams({ projectId })
    if (episodeId) params.set('episodeId', episodeId)
    if (lastEventIdRef.current) params.set('lastEventId', lastEventIdRef.current)
    
    return `/api/sse?${params.toString()}`
  }, [projectId, episodeId])

  // 清理重连定时器
  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }, [])

  // 断开连接
  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true
    clearReconnectTimer()
    
    if (sourceRef.current) {
      sourceRef.current.close()
      sourceRef.current = null
    }
    
    setConnected(false)
    setConnecting(false)
    onDisconnected?.()
  }, [clearReconnectTimer, onDisconnected])

  // 连接 SSE
  const connect = useCallback(() => {
    if (!enabled || !projectId) return

    const url = buildUrl()
    if (!url) return

    const token = getAuthToken()
    if (!token) {
      setError(new Error('Authentication token not found'))
      onError?.(new Error('Authentication token not found'))
      return
    }

    // 清理现有连接
    if (sourceRef.current) {
      sourceRef.current.close()
    }

    clearReconnectTimer()
    setConnecting(true)
    setError(null)

    // 创建 EventSource with custom headers
    // 注意: EventSource 不支持自定义 headers，需要使用 fetch 或传递 token 在 URL
    // 这里我们使用带 token 的 URL 方式
    const urlWithToken = `${url}&_token=${encodeURIComponent(token)}`
    const eventSource = new EventSource(urlWithToken)
    sourceRef.current = eventSource

    // 处理连接打开
    eventSource.onopen = () => {
      setConnected(true)
      setConnecting(false)
      setReconnectAttempts(0)
      currentIntervalRef.current = config.interval
      isManualDisconnectRef.current = false
      onConnected?.()
    }

    // 处理消息
    eventSource.onmessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data || '{}')
        if (!payload || !payload.type) return

        // 保存最后事件 ID (用于重连时恢复)
        if (event.lastEventId) {
          lastEventIdRef.current = event.lastEventId
        }

        const sseEvent = payload as SSEEvent

        // 处理特殊事件类型
        switch (sseEvent.type) {
          case 'heartbeat':
            // 心跳事件，更新重连计数
            if (sseEvent.reconnectCount !== undefined) {
              setReconnectAttempts(sseEvent.reconnectCount)
            }
            break
          case 'connected':
            // 连接确认事件
            console.log('[SSE] Connected:', sseEvent)
            break
          case 'error':
            // 服务器错误事件
            console.error('[SSE] Server error:', sseEvent.payload?.error)
            break
          default:
            // 普通任务事件
            setEvents((prev) => [...prev, sseEvent])
            onEvent?.(sseEvent)
        }
      } catch (error) {
        console.error('[useSSE] Failed to parse event:', error)
      }
    }

    // 处理错误和重连
    eventSource.onerror = (event) => {
      console.error('[useSSE] Connection error:', event)
      
      setConnected(false)
      setConnecting(false)
      setError(new Error('SSE connection error'))
      onError?.(new Error('SSE connection error'))
      onDisconnected?.()

      // 关闭当前连接
      eventSource.close()
      sourceRef.current = null

      // 自动重连逻辑
      if (config.enabled && !isManualDisconnectRef.current) {
        if (reconnectAttempts < config.maxAttempts) {
          const nextAttempt = reconnectAttempts + 1
          setReconnectAttempts(nextAttempt)

          // 计算下次重连间隔 (指数退避)
          const nextInterval = Math.min(
            currentIntervalRef.current * config.backoffMultiplier,
            config.maxInterval
          )
          currentIntervalRef.current = nextInterval

          console.log(`[SSE] Reconnecting in ${nextInterval}ms (attempt ${nextAttempt}/${config.maxAttempts})`)

          reconnectTimerRef.current = setTimeout(() => {
            connect()
          }, nextInterval)
        } else {
          console.error('[SSE] Max reconnection attempts reached')
          setError(new Error('Max reconnection attempts reached'))
          onError?.(new Error('Max reconnection attempts reached'))
        }
      }
    }
  }, [
    enabled,
    projectId,
    buildUrl,
    getAuthToken,
    clearReconnectTimer,
    onEvent,
    onConnected,
    onDisconnected,
    onError,
    config.enabled,
    config.interval,
    config.backoffMultiplier,
    config.maxInterval,
    config.maxAttempts,
    reconnectAttempts,
  ])

  // 手动重连
  const reconnect = useCallback(() => {
    disconnect()
    setReconnectAttempts(0)
    currentIntervalRef.current = config.interval
    isManualDisconnectRef.current = false
    setTimeout(() => connect(), 100)
  }, [disconnect, connect, config.interval])

  // 初始连接和清理
  useEffect(() => {
    if (enabled && projectId) {
      connect()
    }

    return () => {
      clearReconnectTimer()
      if (sourceRef.current) {
        sourceRef.current.close()
        sourceRef.current = null
      }
    }
  }, [enabled, projectId, connect, clearReconnectTimer])

  return {
    connected,
    connecting,
    events,
    lastEvent: events.length > 0 ? events[events.length - 1] : null,
    reconnectAttempts,
    error,
    reconnect,
    disconnect,
  }
}

/**
 * 使用 SSE 流式数据钩子
 * 
 * 专门用于接收 LLM 流式输出
 */
export function useSSEStream({
  projectId,
  episodeId,
  taskId,
  enabled = true,
  onChunk,
  onComplete,
  onError,
}: {
  projectId?: string | null
  episodeId?: string | null
  taskId?: string | null
  enabled?: boolean
  onChunk?: (chunk: { kind: string; delta?: string; content?: string; seq: number }) => void
  onComplete?: () => void
  onError?: (error: Error) => void
}) {
  const { events, connected } = useSSE({
    projectId,
    episodeId,
    enabled: enabled && !!taskId,
    onEvent: (event) => {
      // 只处理指定 taskId 的事件
      if (taskId && event.taskId !== taskId) return

      if (event.type === 'task.stream' && event.payload?.stream) {
        onChunk?.(event.payload.stream as { kind: string; delta?: string; content?: string; seq: number })
      }

      if (event.type === 'task.lifecycle' && event.payload?.lifecycleType === 'task.completed') {
        onComplete?.()
      }
    },
    onError,
  })

  const streamContent = events
    .filter((e) => e.type === 'task.stream' && e.taskId === taskId && e.payload?.stream?.delta)
    .map((e) => e.payload!.stream!.delta)
    .join('')

  return {
    connected,
    streamContent,
    events: events.filter((e) => e.taskId === taskId),
  }
}

export default useSSE
