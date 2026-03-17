import { NextRequest, NextResponse } from 'next/server'
import {
  handleSubmitTask,
  TaskType,
  TaskPriority,
} from '@/lib/task-queue'

// POST /api/projects/[projectId]/assets/generate
// 生成资产图像（场景图/角色图/道具图）
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const body = await request.json()
    const { type, assetId, prompt, imageUrl, settings } = body

    // 验证必要参数
    if (!type || !assetId || !prompt) {
      return NextResponse.json(
        { error: 'Type, assetId, and prompt are required' },
        { status: 400 }
      )
    }

    // 验证类型
    const validTypes = ['scene', 'character', 'prop']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be scene, character, or prop' },
        { status: 400 }
      )
    }

    // 映射到任务类型
    const taskTypeMap: Record<string, TaskType> = {
      scene: TaskType.GENERATE_SCENE_IMAGE,
      character: TaskType.GENERATE_CHARACTER_IMAGE,
      prop: TaskType.GENERATE_PROP_IMAGE,
    }

    // 提交生成任务到队列
    const { getTaskQueue } = await import('@/lib/task-queue')
    const queue = getTaskQueue()

    const taskId = await queue.add({
      projectId: params.projectId,
      type: taskTypeMap[type],
      status: 'pending',
      priority: TaskPriority.MEDIUM,
      payload: {
        assetId,
        prompt,
        imageUrl,
        settings: settings || {},
      },
    })

    return NextResponse.json({
      success: true,
      taskId,
      message: 'Image generation task submitted',
    })
  } catch (error) {
    console.error('Error generating image:', error)
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    )
  }
}
