import { NextRequest, NextResponse } from 'next/server'
import {
  handleSubmitTask,
  handleListTasks,
  TaskType,
  TaskPriority,
} from '@/lib/task-queue'

// GET /api/projects/[projectId]/assets
// 获取项目的资产列表（场景、角色、道具）
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  // TODO: 从数据库获取资产列表
  return NextResponse.json({
    success: true,
    scenes: [],
    characters: [],
    props: [],
  })
}

// POST /api/projects/[projectId]/assets/extract
// 使用 LLM 提取剧本中的场景、角色、道具
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const body = await request.json()
    const { script } = body

    if (!script) {
      return NextResponse.json(
        { error: 'Script content is required' },
        { status: 400 }
      )
    }

    // 提交 LLM 提取任务到队列
    const { getTaskQueue } = await import('@/lib/task-queue')
    const queue = getTaskQueue()

    const taskId = await queue.add({
      projectId: params.projectId,
      type: TaskType.EXTRACT_ASSETS,
      status: 'pending',
      priority: TaskPriority.HIGH,
      payload: { script },
    })

    return NextResponse.json({
      success: true,
      taskId,
      message: 'Asset extraction task submitted',
    })
  } catch (error) {
    console.error('Error extracting assets:', error)
    return NextResponse.json(
      { error: 'Failed to extract assets' },
      { status: 500 }
    )
  }
}
