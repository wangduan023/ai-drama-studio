/**
 * 视频合成 API
 * POST /api/generate/video
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { addTaskJob, TASK_TYPE } from '@ai-drama-studio/queue'

// 视频合成请求体类型
interface GenerateVideoRequest {
  storyboardIds: string[]
  episodeId: string
}

// 视频合成响应类型
interface GenerateVideoResponse {
  taskId: string
}

/**
 * POST /api/generate/video
 * 创建视频合成任务
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateVideoRequest = await request.json()
    const { storyboardIds, episodeId } = body

    // 验证必填字段
    if (!episodeId) {
      return NextResponse.json(
        { error: 'Episode ID is required' },
        { status: 400 }
      )
    }

    if (!storyboardIds || !Array.isArray(storyboardIds) || storyboardIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one storyboard ID is required' },
        { status: 400 }
      )
    }

    // 验证分镜ID数量限制
    if (storyboardIds.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 storyboards allowed per video generation' },
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

    // 验证所有分镜是否存在且属于该剧集
    const storyboards = await prisma.storyboard.findMany({
      where: {
        id: { in: storyboardIds },
        episodeId,
      },
    })

    if (storyboards.length !== storyboardIds.length) {
      return NextResponse.json(
        { error: 'Some storyboards not found or do not belong to this episode' },
        { status: 404 }
      )
    }

    // 检查是否已有进行中的视频生成任务
    const existingTask = await prisma.task.findFirst({
      where: {
        episodeId,
        type: 'VIDEO_GENERATE',
        status: { in: ['QUEUED', 'PROCESSING'] },
      },
    })

    if (existingTask) {
      return NextResponse.json({
        taskId: existingTask.id,
      } as GenerateVideoResponse)
    }

    // 创建任务记录
    const task = await prisma.task.create({
      data: {
        projectId: episode.projectId,
        episodeId,
        userId,
        type: 'VIDEO_GENERATE',
        targetType: 'video',
        targetId: episodeId,
        status: 'QUEUED',
        progress: 0,
        payload: {
          storyboardIds,
          episodeId,
          storyboardCount: storyboardIds.length,
        },
      },
    })

    // 提交任务到队列
    await addTaskJob({
      taskId: task.id,
      type: TASK_TYPE.VIDEO_PANEL,
      locale: 'zh',
      projectId: episode.projectId,
      episodeId,
      targetType: 'video',
      targetId: episodeId,
      payload: {
        storyboardIds,
        episodeId,
        storyboardCount: storyboardIds.length,
      },
      userId,
    })

    return NextResponse.json({
      taskId: task.id,
    } as GenerateVideoResponse, { status: 201 })

  } catch (error) {
    console.error('Failed to create video generation task:', error)
    return NextResponse.json(
      { error: 'Failed to create video generation task' },
      { status: 500 }
    )
  }
}
