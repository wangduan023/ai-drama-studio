/**
 * SSE Handler for Single Task Stream
 *
 * Server-Sent Events endpoint for streaming a single task's progress.
 * Filters events to only show events for the specified task.
 */

import { NextRequest } from 'next/server'
import {
  listTaskLifecycleEvents,
  getProjectChannel,
  SharedSubscriber,
  getSharedSubscriber,
  logInfo,
  logError,
} from '@ai-drama-studio/sse'

const logger = {
  info: (message: string, details?: Record<string, unknown>) => logInfo(`SSE:TaskStream ${message}`, details),
  warn: (message: string, details?: Record<string, unknown>) => logInfo(`SSE:TaskStream ${message}`, details),
  error: (message: string, details?: Record<string, unknown>) => logError(`SSE:TaskStream ${message}`, details),
}

// Connection heartbeat interval (15 seconds)
const HEARTBEAT_INTERVAL = 15000

/**
 * GET /api/tasks/[id]/stream?projectId={projectId}
 *
 * Headers:
 * - x-user-id: User ID for authentication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const searchParams = request.nextUrl.searchParams
  const projectId = searchParams.get('projectId')
  const taskId = params.id
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
      let taskCompleted = false

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

          // Filter: only send events for this task
          if (event.taskId !== taskId) {
            return
          }

          sendEvent(message, event.type, String(event.id))

          // Check if task is complete/failed - close connection after brief delay
          if (
            event.type === 'task.lifecycle' &&
            (event.payload?.lifecycleType === 'task.completed' ||
              event.payload?.lifecycleType === 'task.failed')
          ) {
            taskCompleted = true
            // Give a moment for any final events, then close
            setTimeout(() => {
              if (!isClosed) {
                controller.close()
              }
            }, 1000)
          }
        } catch (error) {
          logger.warn(`Failed to parse Redis message: ${message}`)
        }
      }

      try {
        // Replay historical events for this task
        const replayEvents = await listTaskLifecycleEvents(taskId, 500)

        // Send replay events first
        for (const event of replayEvents) {
          sendEvent(JSON.stringify(event), event.type, event.id)
        }

        // Subscribe to Redis channel for new events
        subscriber = getSharedSubscriber()
        unsubscribe = await subscriber.addChannelListener(channel, handleRedisMessage)

        logger.info(`Task stream connection established: taskId=${taskId}, projectId=${projectId}`)

        // Start heartbeat
        heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error(`Failed to establish task stream connection: ${errorMessage}`)
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

        logger.info(`Task stream connection closed: taskId=${taskId}`)
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
