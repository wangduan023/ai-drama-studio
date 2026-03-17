import { NextRequest, NextResponse } from 'next/server'
import {
  TaskType,
  TaskPriority,
} from '@/lib/task-queue'

// POST /api/projects/[projectId]/dubbing/generate
// 生成配音（TTS）
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const body = await request.json()
    const {
      storyboardId,
      dialogues,
      characterVoices,
      settings,
    } = body

    if (!storyboardId || !dialogues || dialogues.length === 0) {
      return NextResponse.json(
        { error: 'StoryboardId and dialogues are required' },
        { status: 400 }
      )
    }

    // 验证角色音色分配
    if (!characterVoices || Object.keys(characterVoices).length === 0) {
      return NextResponse.json(
        { error: 'Character voice assignments are required' },
        { status: 400 }
      )
    }

    // 提交配音生成任务到队列
    const { getTaskQueue } = await import('@/lib/task-queue')
    const queue = getTaskQueue()

    const taskId = await queue.add({
      projectId: params.projectId,
      type: TaskType.GENERATE_DUBBING,
      status: 'pending',
      priority: TaskPriority.MEDIUM,
      payload: {
        storyboardId,
        dialogues,
        characterVoices,
        settings: settings || {
          model: 'azure-tts',
          defaultSpeed: 1.0,
          defaultVolume: 1.0,
          addBackgroundMusic: false,
        },
      },
    })

    return NextResponse.json({
      success: true,
      taskId,
      message: 'Dubbing generation task submitted',
    })
  } catch (error) {
    console.error('Error generating dubbing:', error)
    return NextResponse.json(
      { error: 'Failed to generate dubbing' },
      { status: 500 }
    )
  }
}
