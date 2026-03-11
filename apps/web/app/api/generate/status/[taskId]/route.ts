/**
 * 生成状态查询 API
 * GET /api/generate/status/:taskId
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { getTaskStatus } from '@ai-drama-studio/queue'

// 任务状态类型
interface TaskStatusResponse {
  taskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  result?: unknown
  error?: string
}

/**
 * 将数据库任务状态转换为 API 响应状态
 */
function normalizeStatus(
  dbStatus: string
): 'pending' | 'processing' | 'completed' | 'failed' {
  switch (dbStatus) {
    case 'QUEUED':
      return 'pending'
    case 'PROCESSING':
    case 'RETRYING':
      return 'processing'
    case 'COMPLETED':
      return 'completed'
    case 'FAILED':
      return 'failed'
    default:
      return 'pending'
  }
}

/**
 * GET /api/generate/status/:taskId
 * 查询任务生成状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      )
    }

    // 验证用户认证
    const { user, error: authError } = await verifyAuth(request)
    const userId = user?.id

    if (!userId || authError) {
      return NextResponse.json(
        { error: authError || 'Unauthorized' },
        { status: 401 }
      )
    }

    // 获取任务信息
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      )
    }

    // 验证任务所有权
    if (task.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied: Task does not belong to user' },
        { status: 403 }
      )
    }

    // 获取队列中的任务状态（如果任务还在队列中）
    const queueStatus = await getTaskStatus(taskId)

    // 构建响应
    const response: TaskStatusResponse = {
      taskId: task.id,
      status: normalizeStatus(task.status),
      progress: task.progress,
    }

    // 如果任务已完成，包含结果
    if (task.status === 'COMPLETED' && task.result) {
      response.result = task.result
    }

    // 如果任务失败，包含错误信息
    if (task.status === 'FAILED') {
      response.error = task.errorMessage || 'Task failed'
    }

    // 如果队列状态与数据库状态不一致，优先使用队列状态
    if (queueStatus) {
      const queueState = queueStatus.status
      if (queueState === 'active' || queueState === 'waiting') {
        response.status = 'processing'
      } else if (queueState === 'completed') {
        response.status = 'completed'
      } else if (queueState === 'failed') {
        response.status = 'failed'
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Failed to fetch task status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task status' },
      { status: 500 }
    )
  }
}
