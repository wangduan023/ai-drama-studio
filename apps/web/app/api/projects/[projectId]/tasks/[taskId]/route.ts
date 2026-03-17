import { NextRequest, NextResponse } from 'next/server'
import { handleGetTask, handleCancelTask } from '@/lib/task-queue'

// GET /api/projects/[projectId]/tasks/[taskId]
// 获取单个任务状态
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; taskId: string } }
) {
  const { projectId, taskId } = params
  return handleGetTask(projectId, taskId)
}

// PATCH /api/projects/[projectId]/tasks/[taskId]
// 更新任务状态（由 Worker 调用）
export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string; taskId: string } }
) {
  try {
    const { projectId, taskId } = params
    const body = await request.json()

    const { getTaskQueue } = await import('@/lib/task-queue')
    const queue = getTaskQueue()

    const task = await queue.get(taskId)
    if (!task || task.projectId !== projectId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    await queue.update(taskId, body)

    return NextResponse.json({ success: true, task: await queue.get(taskId) })
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/projects/[projectId]/tasks/[taskId]
// 取消任务
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; taskId: string } }
) {
  const { projectId, taskId } = params
  return handleCancelTask(projectId, taskId)
}
