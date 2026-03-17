import { NextRequest, NextResponse } from 'next/server'
import {
  TaskType,
  TaskPriority,
} from '@/lib/task-queue'

// POST /api/projects/[projectId]/video/generate
// 生成视频（支持多种模式：图生视频、多参生视频、首尾帧视频）
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const body = await request.json()
    const {
      storyboardId,
      mode,
      prompt,
      referenceImages,
      settings,
    } = body

    if (!storyboardId || !prompt) {
      return NextResponse.json(
        { error: 'StoryboardId and prompt are required' },
        { status: 400 }
      )
    }

    // 验证模式
    const validModes = ['image-to-video', 'multi-param', 'frame-to-frame']
    if (mode && !validModes.includes(mode)) {
      return NextResponse.json(
        { error: 'Invalid mode. Must be image-to-video, multi-param, or frame-to-frame' },
        { status: 400 }
      )
    }

    // 映射到任务类型
    const taskTypeMap: Record<string, TaskType> = {
      'image-to-video': TaskType.GENERATE_VIDEO,
      'multi-param': TaskType.GENERATE_MULTI_PARAM_VIDEO,
      'frame-to-frame': TaskType.GENERATE_FRAME_VIDEO,
    }

    const taskType = taskTypeMap[mode || 'image-to-video']

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
        mode,
        prompt,
        referenceImages: referenceImages || [],
        settings: settings || {
          model: 'vidu-1.5',
          duration: 5,
          quantity: 1,
          quality: 'high',
          cameraMotion: 'none',
          specialEffect: 'normal',
        },
      },
    })

    return NextResponse.json({
      success: true,
      taskId,
      message: 'Video generation task submitted',
    })
  } catch (error) {
    console.error('Error generating video:', error)
    return NextResponse.json(
      { error: 'Failed to generate video' },
      { status: 500 }
    )
  }
}
