import { NextRequest, NextResponse } from 'next/server'
import {
  handleSubmitTask,
  handleListTasks,
  handleGetTask,
  handleCancelTask,
  TaskType,
  TaskStatus,
  TaskPriority,
} from '@/lib/task-queue'

// GET /api/projects/[projectId]/tasks
// 获取项目任务列表
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = await params
  const { searchParams } = new URL(request.url)

  const status = searchParams.get('status') as TaskStatus | null
  const type = searchParams.get('type') as TaskType | null

  const filters = {
    status: status || undefined,
    type: type || undefined,
  }

  return handleListTasks(projectId, filters)
}

// POST /api/projects/[projectId]/tasks
// 提交新任务
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = await params
  return handleSubmitTask(request, projectId)
}
