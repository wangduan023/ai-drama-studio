/**
 * Task Progress REST API
 *
 * Returns current task status and progress.
 * Alternative to SSE for simpler use cases or polling-based updates.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@ai-drama-studio/db'
import { listTaskLifecycleEvents } from '@ai-drama-studio/sse'

/**
 * GET /api/tasks/[id]/progress?projectId={projectId}
 *
 * Returns the current task status, progress, and recent events.
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
    return NextResponse.json(
      { error: 'Missing required parameter: projectId' },
      { status: 400 }
    )
  }

  if (!userId) {
    return NextResponse.json(
      { error: 'Missing required header: x-user-id' },
      { status: 401 }
    )
  }

  try {
    // Fetch task from database
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
      },
      select: {
        id: true,
        projectId: true,
        episodeId: true,
        userId: true,
        type: true,
        targetType: true,
        targetId: true,
        status: true,
        progress: true,
        attempt: true,
        payload: true,
        result: true,
        errorCode: true,
        errorMessage: true,
        queuedAt: true,
        startedAt: true,
        finishedAt: true,
      },
    })

    if (!task) {
      return NextResponse.json(
        { error: `Task not found: ${taskId}` },
        { status: 404 }
      )
    }

    // Verify user ownership
    if (task.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied: Task does not belong to user' },
        { status: 403 }
      )
    }

    // Fetch recent events for this task
    const recentEvents = await listTaskLifecycleEvents(taskId, 50)

    // Build response
    const response = {
      taskId: task.id,
      projectId: task.projectId,
      episodeId: task.episodeId,
      type: task.type,
      targetType: task.targetType,
      targetId: task.targetId,
      status: task.status,
      progress: task.progress,
      attempt: task.attempt,
      payload: task.payload as Record<string, unknown> | null,
      result: task.result as Record<string, unknown> | null,
      error: task.errorCode
        ? {
            code: task.errorCode,
            message: task.errorMessage,
          }
        : null,
      timestamps: {
        queuedAt: task.queuedAt.toISOString(),
        startedAt: task.startedAt?.toISOString() || null,
        finishedAt: task.finishedAt?.toISOString() || null,
      },
      recentEvents: recentEvents.map((event) => ({
        id: event.id,
        type: event.type,
        lifecycleType: event.payload?.lifecycleType as string | undefined,
        progress: event.payload?.progress as number | undefined,
        stage: event.payload?.stage as string | undefined,
        message: event.payload?.message as string | undefined,
        ts: event.ts,
      })),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error(`[TaskProgress] Failed to fetch task ${taskId}:`, error)
    return NextResponse.json(
      { error: 'Failed to fetch task progress' },
      { status: 500 }
    )
  }
}
