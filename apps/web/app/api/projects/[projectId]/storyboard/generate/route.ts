import { NextRequest, NextResponse } from 'next/server'
import {
  TaskType,
  TaskPriority,
} from '@/lib/task-queue'

// POST /api/projects/[projectId]/storyboard/generate
// 生成分镜图（支持多种模式）
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const { storyboardId, mode, prompt, referenceImages, settings } = body

    if (!storyboardId || !prompt) {
      return NextResponse.json(
        { error: 'StoryboardId and prompt are required' },
        { status: 400 }
      )
    }

    // 映射到任务类型
    const taskTypeMap: Record<string, TaskType> = {
      'single': TaskType.GENERATE_STORYBOARD_IMAGE,
      'chat': TaskType.CHAT_GENERATE_IMAGE,
      'grid-nine': TaskType.GENERATE_GRID_NINE,
    }

    const taskType = taskTypeMap[mode || 'single']

    if (!taskType) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be single, chat, or grid-nine' },
        { status: 400 }
      )
    }

    // 提交生成任务到队列
    const { getTaskQueue } = await import('@/lib/task-queue')
    const queue = getTaskQueue()

    const taskId = await queue.add({
      projectId: params.projectId,
      type: taskType,
      status: 'pending',
      priority: TaskPriority.MEDIUM,
      payload: {
        storyboardId,
        prompt,
        referenceImages: referenceImages || [],
        settings: settings || {},
      },
    })

    return NextResponse.json({
      success: true,
      taskId,
      message: 'Storyboard image generation task submitted',
    })
  } catch (error) {
    console.error('Error generating storyboard image:', error)
    return NextResponse.json(
      { error: 'Failed to generate storyboard image' },
      { status: 500 }
    )
  }
}
