/**
 * SSE Handler for Task Progress Updates
 *
 * Server-Sent Events endpoint for real-time task progress streaming.
 * Connects to Redis pub/sub and forwards events to connected clients.
 *
 * 增强功能:
 * - JWT Token 认证
 * - 项目权限验证
 * - 历史事件回放
 * - 心跳保活
 * - 自动重连支持
 */

import { NextRequest } from 'next/server'
import {
  getProjectChannel,
  listTaskLifecycleEvents,
  listEventsAfter,
  listActiveLifecycleSnapshot,
  SharedSubscriber,
  getSharedSubscriber,
  logInfo,
  logError,
} from '@ai-drama-studio/sse'
import { prisma } from '@/lib/db'
import * as jwt from 'jsonwebtoken'

const logger = {
  info: (message: string, details?: Record<string, unknown>) => logInfo(`SSE:API ${message}`, details),
  warn: (message: string, details?: Record<string, unknown>) => logInfo(`SSE:API ${message}`, details),
  error: (message: string, details?: Record<string, unknown>) => logError(`SSE:API ${message}`, details),
}

// Connection heartbeat interval (15 seconds)
const HEARTBEAT_INTERVAL = 15000

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET

if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET or NEXTAUTH_SECRET must be set in environment variables. ' +
    'Please check your .env file and ensure one of these variables is defined.'
  )
}

/**
 * JWT Payload 类型
 */
interface JWTPayload {
  userId: string
  email: string
  role: string
  iat: number
  exp: number
}

/**
 * 验证 JWT Token
 */
async function verifyToken(token: string): Promise<{ valid: boolean; userId?: string; error?: string }> {
  if (!token) {
    return { valid: false, error: 'Token is required' }
  }

  try {
    // 验证 JWT
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload

    // 检查令牌是否在数据库中存在且未过期
    const refreshToken = await prisma.refreshToken.findFirst({
      where: { token },
    })

    if (!refreshToken) {
      return { valid: false, error: 'Token not found or revoked' }
    }

    if (refreshToken.expiresAt < new Date()) {
      // 删除过期令牌
      await prisma.refreshToken.delete({
        where: { id: refreshToken.id },
      })
      return { valid: false, error: 'Token has expired' }
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, isActive: true },
    })

    if (!user) {
      return { valid: false, error: 'User not found' }
    }

    if (!user.isActive) {
      return { valid: false, error: 'User account is deactivated' }
    }

    return { valid: true, userId: user.id }
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return { valid: false, error: 'Token has expired' }
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return { valid: false, error: 'Invalid token' }
    }
    return { valid: false, error: 'Token verification failed' }
  }
}

/**
 * 验证用户对项目的访问权限
 */
async function verifyProjectAccess(userId: string, projectId: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: userId,
        deletedAt: null,
      },
      select: { id: true },
    })

    if (!project) {
      return { valid: false, error: 'Project not found or access denied' }
    }

    return { valid: true }
  } catch (error) {
    logger.error('Failed to verify project access', { error: String(error) })
    return { valid: false, error: 'Failed to verify project access' }
  }
}

/**
 * GET /api/sse?projectId={projectId}&episodeId={episodeId?}&lastEventId={lastEventId?}
 *
 * Headers:
 * - Authorization: Bearer {JWT_TOKEN} - JWT Token for authentication
 * - last-event-id: Optional last event ID for replay
 *
 * Query Parameters:
 * - projectId: Required, project ID to subscribe to
 * - episodeId: Optional, episode ID to filter events
 * - lastEventId: Optional, last received event ID for replay
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const projectId = searchParams.get('projectId')
  const episodeId = searchParams.get('episodeId')
  const lastEventId = searchParams.get('lastEventId')

  // 1. 从 Authorization header 获取 JWT Token
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  // Validate required parameters
  if (!projectId) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameter: projectId' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Missing required header: Authorization (Bearer token)' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // 2. 验证 JWT Token
  const tokenResult = await verifyToken(token)
  if (!tokenResult.valid) {
    return new Response(
      JSON.stringify({ error: tokenResult.error || 'Authentication failed' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const userId = tokenResult.userId!

  // 3. 验证用户是否有权限访问该项目
  const accessResult = await verifyProjectAccess(userId, projectId)
  if (!accessResult.valid) {
    return new Response(
      JSON.stringify({ error: accessResult.error || 'Access denied' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Create encoder for streaming
  const encoder = new TextEncoder()

  // Create EventStream response
  const stream = new ReadableStream({
    async start(controller) {
      const channel = getProjectChannel(projectId)
      let subscriber: SharedSubscriber | null = null
      let unsubscribe: (() => Promise<void>) | null = null
      let heartbeatTimer: NodeJS.Timeout | null = null
      let isClosed = false
      let reconnectCount = 0

      // Send SSE event
      const sendEvent = (data: string, event?: string, id?: string) => {
        if (isClosed) return

        let message = ''
        if (id) message += `id: ${id}\n`
        if (event) message += `event: ${event}\n`
        message += `data: ${data}\n\n`

        try {
          controller.enqueue(encoder.encode(message))
        } catch (error) {
          logger.error('Failed to send SSE event', { error: String(error) })
        }
      }

      // Send heartbeat to keep connection alive
      const sendHeartbeat = () => {
        sendEvent(
          JSON.stringify({ 
            type: 'heartbeat', 
            ts: new Date().toISOString(),
            reconnectCount,
          }), 
          'heartbeat'
        )
      }

      // Handle incoming Redis message
      const handleRedisMessage = (message: string) => {
        try {
          const event = JSON.parse(message)
          // Filter by episode if specified
          if (episodeId && event.episodeId !== episodeId) {
            return
          }
          // Filter by user (security check)
          if (event.userId !== userId) {
            return
          }
          sendEvent(message, event.type, String(event.id))
        } catch (error) {
          logger.warn(`Failed to parse Redis message: ${message}`)
        }
      }

      try {
        // 5. 发送历史事件（从 TaskEvent 表读取）
        const replayEvents = await getReplayEvents(
          projectId,
          episodeId,
          userId,
          lastEventId ? parseInt(lastEventId, 10) : null
        )

        // Send connection established event
        sendEvent(
          JSON.stringify({
            type: 'connected',
            projectId,
            episodeId,
            userId,
            ts: new Date().toISOString(),
            replayCount: replayEvents.length,
          }),
          'connected'
        )

        // Send replay events first
        for (const event of replayEvents) {
          sendEvent(JSON.stringify(event), event.type, event.id)
        }

        // Subscribe to Redis channel for new events
        subscriber = getSharedSubscriber()
        unsubscribe = await subscriber.addChannelListener(channel, handleRedisMessage)

        logger.info(`SSE connection established: projectId=${projectId}, userId=${userId}, episodeId=${episodeId || 'null'}`)

        // 6. 保持连接并推送新事件
        heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error(`Failed to establish SSE connection: ${errorMessage}`)
        
        // Send error event before closing
        sendEvent(
          JSON.stringify({
            type: 'error',
            error: errorMessage,
            ts: new Date().toISOString(),
          }),
          'error'
        )
        
        controller.error(error instanceof Error ? error : new Error(String(error)))
      }

      // Cleanup on connection close
      return () => {
        isClosed = true

        if (heartbeatTimer) {
          clearInterval(heartbeatTimer)
          heartbeatTimer = null
        }

        if (unsubscribe) {
          unsubscribe().catch((err) => {
            logger.error(`Error unsubscribing from Redis channel: ${err instanceof Error ? err.message : String(err)}`)
          })
        }

        logger.info(`SSE connection closed: projectId=${projectId}, userId=${userId}`)
      }
    },
  })

  // Create response with SSE headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
}

/**
 * Get replay events for a connection
 *
 * Strategy:
 * 1. If lastEventId provided: get events after that ID
 * 2. Otherwise: get active task snapshot
 */
async function getReplayEvents(
  projectId: string,
  episodeId: string | null,
  userId: string,
  lastEventId: number | null
): Promise<any[]> {
  try {
    if (lastEventId !== null && lastEventId > 0) {
      // Get events after the last received event ID
      const events = await listEventsAfter(projectId, lastEventId, 200)
      return events.filter((e) => !episodeId || e.episodeId === episodeId)
    }

    // Get active task snapshot for initial connection
    const snapshot = await listActiveLifecycleSnapshot({
      projectId,
      episodeId: episodeId || null,
      userId,
      limit: 100,
    })

    return snapshot
  } catch (error) {
    logError(`Failed to get replay events: ${error}`)
    return []
  }
}
