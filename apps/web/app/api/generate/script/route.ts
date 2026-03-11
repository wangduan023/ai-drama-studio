/**
 * 剧本生成 API
 * POST /api/generate/script
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { addTaskJob, TASK_TYPE } from '@ai-drama-studio/queue'

// 剧本生成请求体类型
interface GenerateScriptRequest {
  episodeId: string
  prompt?: string
  style?: string
}

// 剧本生成响应类型
interface GenerateScriptResponse {
  taskId: string
  message: string
}

/**
 * POST /api/generate/script
 * 创建剧本生成任务
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateScriptRequest = await request.json()
    const { episodeId, prompt, style } = body

    // 验证必填字段
    if (!episodeId) {
      return NextResponse.json(
        { error: 'Episode ID is required' },
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

    // 获取剧集信息
    const episode = await prisma.episode.findUnique({
      where: { id: episodeId },
      include: { project: true },
    })

    if (!episode) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      )
    }

    // 验证项目所有权
    if (episode.project.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied: Episode does not belong to user' },
        { status: 403 }
      )
    }

    // 检查是否已有进行中的剧本生成任务
    const existingTask = await prisma.task.findFirst({
      where: {
        episodeId,
        type: 'SCRIPT_GENERATE',
        status: { in: ['QUEUED', 'PROCESSING'] },
      },
    })

    if (existingTask) {
      return NextResponse.json({
        taskId: existingTask.id,
        message: 'Script generation task already in progress',
      } as GenerateScriptResponse)
    }

    // 创建任务记录
    const task = await prisma.task.create({
      data: {
        projectId: episode.projectId,
        episodeId,
        userId,
        type: 'SCRIPT_GENERATE',
        targetType: 'script',
        targetId: episodeId,
        status: 'QUEUED',
        progress: 0,
        payload: {
          prompt: prompt || null,
          style: style || 'default',
          novelText: episode.novelText,
        },
      },
    })

    // 提交任务到队列
    await addTaskJob({
      taskId: task.id,
      type: TASK_TYPE.STORY_TO_SCRIPT_RUN,
      locale: 'zh',
      projectId: episode.projectId,
      episodeId,
      targetType: 'script',
      targetId: episodeId,
      payload: {
        prompt: prompt || null,
        style: style || 'default',
        novelText: episode.novelText,
      },
      userId,
    })

    return NextResponse.json({
      taskId: task.id,
      message: 'Script generation task created successfully',
    } as GenerateScriptResponse, { status: 201 })

  } catch (error) {
    console.error('Failed to create script generation task:', error)
    return NextResponse.json(
      { error: 'Failed to create script generation task' },
      { status: 500 }
    )
  }
}
