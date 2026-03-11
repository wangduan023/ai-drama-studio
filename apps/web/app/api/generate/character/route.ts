/**
 * 角色生成 API
 * POST /api/generate/character
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { addTaskJob, TASK_TYPE } from '@ai-drama-studio/queue'

// 角色生成请求体类型
interface GenerateCharacterRequest {
  projectId: string
  name: string
  description?: string
  appearance?: string
}

// 角色生成响应类型
interface GenerateCharacterResponse {
  taskId: string
  characterId: string
}

/**
 * POST /api/generate/character
 * 创建 AI 角色生成任务
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateCharacterRequest = await request.json()
    const { projectId, name, description, appearance } = body

    // 验证必填字段
    if (!projectId || !name) {
      return NextResponse.json(
        { error: 'Project ID and name are required' },
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

    // 检查是否已存在同名角色
    const existingCharacter = await prisma.characterProfile.findFirst({
      where: {
        projectId,
        name,
        deletedAt: null,
      },
    })

    if (existingCharacter) {
      return NextResponse.json(
        { error: 'Character with this name already exists in the project' },
        { status: 409 }
      )
    }

    // 先创建角色档案记录
    const character = await prisma.characterProfile.create({
      data: {
        projectId,
        name,
        introduction: description || null,
        profileConfirmed: false,
      },
    })

    // 创建任务记录
    const task = await prisma.task.create({
      data: {
        projectId,
        userId,
        type: 'CHARACTER_PROFILE_ANALYZE',
        targetType: 'character',
        targetId: character.id,
        status: 'QUEUED',
        progress: 0,
        payload: {
          name,
          description: description || null,
          appearance: appearance || null,
          characterId: character.id,
        },
      },
    })

    // 提交任务到队列
    await addTaskJob({
      taskId: task.id,
      type: TASK_TYPE.AI_CREATE_CHARACTER,
      locale: 'zh',
      projectId,
      targetType: 'character',
      targetId: character.id,
      payload: {
        name,
        description: description || null,
        appearance: appearance || null,
        characterId: character.id,
      },
      userId,
    })

    return NextResponse.json({
      taskId: task.id,
      characterId: character.id,
    } as GenerateCharacterResponse, { status: 201 })

  } catch (error) {
    console.error('Failed to create character generation task:', error)
    return NextResponse.json(
      { error: 'Failed to create character generation task' },
      { status: 500 }
    )
  }
}
