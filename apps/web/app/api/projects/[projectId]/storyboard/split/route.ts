import { NextRequest, NextResponse } from 'next/server'
import {
  TaskType,
  TaskPriority,
} from '@/lib/task-queue'

// POST /api/projects/[projectId]/storyboard/split
// 使用 LLM 拆分剧本为分镜
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const body = await request.json()
    const { script, lensDensity } = body

    if (!script) {
      return NextResponse.json(
        { error: 'Script content is required' },
        { status: 400 }
      )
    }

    // 提交分镜拆分任务到队列
    const { getTaskQueue } = await import('@/lib/task-queue')
    const queue = getTaskQueue()

    const taskId = await queue.add({
      projectId: params.projectId,
      type: TaskType.SPLIT_STORYBOARD,
      status: 'pending',
      priority: TaskPriority.HIGH,
      payload: {
        script,
        lensDensity: lensDensity || 'standard',
      },
    })

    return NextResponse.json({
      success: true,
      taskId,
      message: 'Storyboard splitting task submitted',
    })
  } catch (error) {
    console.error('Error splitting storyboard:', error)
    return NextResponse.json(
      { error: 'Failed to split storyboard' },
      { status: 500 }
    )
  }
}
