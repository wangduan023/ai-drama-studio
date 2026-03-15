/**
 * Admin AI Models Management API
 * AI 模型管理接口
 *
 * GET /api/admin/ai-models - 获取模型列表
 * POST /api/admin/ai-models - 创建模型
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@ai-drama-studio/db'
import { requirePermission } from '@/lib/rbac'

// GET - 获取模型列表
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'ai_model', 'read')
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('providerId')

    const where = providerId ? { providerId } : {}

    const models = await prisma.aiModel.findMany({
      where,
      include: {
        provider: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { providerId: 'asc' },
        { modelId: 'asc' },
      ],
    })

    return NextResponse.json(models)
  } catch (error: any) {
    console.error('Failed to fetch AI models:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI models' },
      { status: 500 }
    )
  }
}

// POST - 创建模型
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'ai_model', 'create')
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const {
      providerId,
      modelId,
      name,
      type,
      isEnabled = true,
      isDefault = false,
      maxTokens,
      contextWindow,
      inputCost,
      outputCost,
      imageCost,
      videoCost,
      description,
    } = body

    // 验证必填字段
    if (!providerId || !modelId || !name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: providerId, modelId, name, type' },
        { status: 400 }
      )
    }

    // 检查模型是否已存在
    const existing = await prisma.aiModel.findUnique({
      where: {
        providerId_modelId: {
          providerId,
          modelId,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Model already exists' },
        { status: 400 }
      )
    }

    // 创建模型
    const model = await prisma.aiModel.create({
      data: {
        providerId,
        modelId,
        name,
        type,
        isEnabled,
        isDefault,
        maxTokens,
        contextWindow,
        inputCost,
        outputCost,
        imageCost,
        videoCost,
        description,
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(model)
  } catch (error: any) {
    console.error('Failed to create AI model:', error)
    return NextResponse.json(
      { error: 'Failed to create AI model' },
      { status: 500 }
    )
  }
}
