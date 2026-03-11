/**
 * 音频生成 API
 * POST /api/generate/audio
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { addTaskJob, TASK_TYPE } from '@ai-drama-studio/queue'

// 音频生成请求体类型
interface GenerateAudioRequest {
  text: string
  voice?: string
  speed?: number
}

// 音频生成响应类型
interface GenerateAudioResponse {
  taskId: string
  audioUrl?: string
}

// 默认音色配置
const DEFAULT_VOICE = 'zh-CN-XiaoxiaoNeural'
const DEFAULT_SPEED = 1.0

/**
 * POST /api/generate/audio
 * 创建 AI 音频生成任务
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateAudioRequest = await request.json()
    const { text, voice, speed } = body

    // 验证必填字段
    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      )
    }

    // 验证文本长度限制
    if (text.length > 5000) {
      return NextResponse.json(
        { error: 'Text exceeds maximum length of 5000 characters' },
        { status: 400 }
      )
    }

    // 验证语速范围
    const normalizedSpeed = speed || DEFAULT_SPEED
    if (normalizedSpeed < 0.5 || normalizedSpeed > 2.0) {
      return NextResponse.json(
        { error: 'Speed must be between 0.5 and 2.0' },
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

    // 音频生成通常是独立任务，不需要关联项目
    // 但为了追踪，我们创建一个特殊项目或使用默认项目
    // 这里使用用户ID作为targetId，因为音频可能不直接关联特定项目
    const task = await prisma.task.create({
      data: {
        projectId: 'system', // 系统项目
        userId,
        type: 'VOICE_GENERATE',
        targetType: 'audio',
        targetId: `audio-${Date.now()}`,
        status: 'QUEUED',
        progress: 0,
        payload: {
          text,
          voice: voice || DEFAULT_VOICE,
          speed: normalizedSpeed,
        },
      },
    })

    // 提交任务到队列
    await addTaskJob({
      taskId: task.id,
      type: TASK_TYPE.VOICE_LINE,
      locale: 'zh',
      projectId: 'system',
      targetType: 'audio',
      targetId: task.targetId,
      payload: {
        text,
        voice: voice || DEFAULT_VOICE,
        speed: normalizedSpeed,
      },
      userId,
    })

    // 如果任务已完成（同步情况），返回 audioUrl
    // 注意：实际的音频生成是异步的，客户端需要通过 status API 查询结果
    const response: GenerateAudioResponse = {
      taskId: task.id,
    }

    return NextResponse.json(response, { status: 201 })

  } catch (error) {
    console.error('Failed to create audio generation task:', error)
    return NextResponse.json(
      { error: 'Failed to create audio generation task' },
      { status: 500 }
    )
  }
}
