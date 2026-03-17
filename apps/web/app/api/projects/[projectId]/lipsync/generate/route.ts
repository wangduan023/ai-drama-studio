import { NextRequest, NextResponse } from 'next/server'
import {
  TaskType,
  TaskPriority,
} from '@/lib/task-queue'

// POST /api/projects/[projectId]/lipsync/generate
// 生成对口型效果
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const {
      storyboardId,
      videoUrl,
      audioUrl,
    } = body

    if (!storyboardId || !videoUrl || !audioUrl) {
      return NextResponse.json(
        { error: 'StoryboardId, videoUrl, and audioUrl are required' },
        { status: 400 }
      )
    }

    // 提交对口型任务到队列
    const { getTaskQueue } = await import('@/lib/task-queue')
    const queue = getTaskQueue()

    const taskId = await queue.add({
      projectId: params.projectId,
      type: TaskType.GENERATE_LIPSYNC,
      status: 'pending',
      priority: TaskPriority.MEDIUM,
      payload: {
        storyboardId,
        videoUrl,
        audioUrl,
      },
    })

    return NextResponse.json({
      success: true,
      taskId,
      message: 'Lipsync generation task submitted',
    })
  } catch (error) {
    console.error('Error generating lipsync:', error)
    return NextResponse.json(
      { error: 'Failed to generate lipsync' },
      { status: 500 }
    )
  }
}
