/**
 * SSE Handler for Task Progress Updates
 *
 * Server-Sent Events endpoint for real-time task progress streaming.
 * Connects to Redis pub/sub and forwards events to connected clients.
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
  createScopedLogger,
} from '@ai-drama-studio/sse'

const logger = createScopedLogger('SSE:API')

// Connection heartbeat interval (15 seconds)
const HEARTBEAT_INTERVAL = 15000

/**
 * GET /api/sse?projectId={projectId}&episodeId={episodeId?}&lastEventId={lastEventId?}
 *
 * Headers:
 * - x-user-id: User ID for authentication
 * - last-event-id: Optional last event ID for replay
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const projectId = searchParams.get('projectId')
  const episodeId = searchParams.get('episodeId')
  const lastEventId = searchParams.get('lastEventId')

  const userId = request.headers.get('x-user-id')

  // Validate required parameters
  if (!projectId) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameter: projectId' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'Missing required header: x-user-id' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
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

      // Send SSE event
      const sendEvent = (data: string, event?: string, id?: string) => {
        if (isClosed) return

        let message = ''
        if (id) message += `id: ${id}\n`
        if (event) message += `event: ${event}\n`
        message += `data: ${data}\n\n`

        controller.enqueue(encoder.encode(message))
      }

      // Send heartbeat to keep connection alive
      const sendHeartbeat = () => {
        sendEvent(JSON.stringify({ type: 'heartbeat', ts: new Date().toISOString() }), 'heartbeat')
      }

      // Handle incoming Redis message
      const handleRedisMessage = (message: string) => {
        try {
          const event = JSON.parse(message)
          // Filter by episode if specified
          if (episodeId && event.episodeId !== episodeId) {
            return
          }
          sendEvent(message, event.type, String(event.id))
        } catch (error) {
          logger.warn(`Failed to parse Redis message: ${message}`)
        }
      }

      try {
        // Replay historical events
        const replayEvents = await getReplayEvents(
          projectId,
          episodeId,
          userId,
          lastEventId ? parseInt(lastEventId, 10) : null
        )

        // Send replay events first
        for (const event of replayEvents) {
          sendEvent(JSON.stringify(event), event.type, event.id)
        }

        // Subscribe to Redis channel for new events
        subscriber = getSharedSubscriber()
        unsubscribe = await subscriber.addChannelListener(channel, handleRedisMessage)

        logger.info(`SSE connection established: projectId=${projectId}, userId=${userId}`)

        // Start heartbeat
        heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL)
      } catch (error) {
        logger.error('Failed to establish SSE connection:', error)
        controller.error(error)
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
            logger.error('Error unsubscribing from Redis channel:', err)
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
