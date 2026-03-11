/**
 * 场景生成 API
 * POST /api/generate/scene
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { addTaskJob, TASK_TYPE } from '@ai-drama-studio/queue'
import { LocationType } from '@prisma/client'

// 场景生成请求体类型
interface GenerateSceneRequest {
  projectId: string
  name: string
  description?: string
  type?: 'INDOOR' | 'OUTDOOR' | 'NATURE' | 'BUILDING' | 'FANTASY'
}

// 场景生成响应类型
interface GenerateSceneResponse {
  taskId: string
  locationId: string
}

/**
 * POST /api/generate/scene
 * 创建 AI 场景生成任务
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateSceneRequest = await request.json()
    const { projectId, name, description, type } = body

    // 验证必填字段
    if (!projectId || !name) {
      return NextResponse.json(
        { error: 'Project ID and name are required' },
        { status: 400 }
      )
    }

    // 验证场景类型
    const validTypes: LocationType[] = ['INDOOR', 'OUTDOOR', 'NATURE', 'BUILDING', 'FANTASY']
    if (type && !validTypes.includes(type as LocationType)) {
      return NextResponse.json(
        { error: 'Invalid scene type' },
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

    // 验证项目是否存在且属于当前用户
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
        deletedAt: null,
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // 检查是否已存在同名场景
    const existingLocation = await prisma.locationProfile.findFirst({
      where: {
        projectId,
        name,
        deletedAt: null,
      },
    })

    if (existingLocation) {
      return NextResponse.json(
        { error: 'Scene with this name already exists in the project' },
        { status: 409 }
      )
    }

    // 先创建场景档案记录
    const location = await prisma.locationProfile.create({
      data: {
        projectId,
        name,
        description: description || null,
        locationType: type as LocationType || null,
        locationConfirmed: false,
      },
    })

    // 创建任务记录
    const task = await prisma.task.create({
      data: {
        projectId,
        userId,
        type: 'LOCATION_ANALYZE',
        targetType: 'location',
        targetId: location.id,
        status: 'QUEUED',
        progress: 0,
        payload: {
          name,
          description: description || null,
          type: type || null,
          locationId: location.id,
        },
      },
    })

    // 提交任务到队列
    await addTaskJob({
      taskId: task.id,
      type: TASK_TYPE.AI_CREATE_LOCATION,
      locale: 'zh',
      projectId,
      targetType: 'location',
      targetId: location.id,
      payload: {
        name,
        description: description || null,
        type: type || null,
        locationId: location.id,
      },
      userId,
    })

    return NextResponse.json({
      taskId: task.id,
      locationId: location.id,
    } as GenerateSceneResponse, { status: 201 })

  } catch (error) {
    console.error('Failed to create scene generation task:', error)
    return NextResponse.json(
      { error: 'Failed to create scene generation task' },
      { status: 500 }
    )
  }
}
