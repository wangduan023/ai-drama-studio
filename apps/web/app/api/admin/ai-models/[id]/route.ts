/**
 * Admin AI Model Detail API
 * AI 模型详情接口
 *
 * GET /api/admin/ai-models/[id] - 获取模型详情
 * PUT /api/admin/ai-models/[id] - 更新模型
 * DELETE /api/admin/ai-models/[id] - 删除模型
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@ai-drama-studio/db'
import { requirePermission } from '@/lib/rbac'

// GET - 获取模型详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'ai_model', 'read')
  if (!auth.success) return auth.response

  try {
    const { id } = await params

    const model = await prisma.aiModel.findUnique({
      where: { id },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(model)
  } catch (error: any) {
    console.error('Failed to fetch AI model:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI model' },
      { status: 500 }
    )
  }
}

// PUT - 更新模型
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'ai_model', 'update')
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const body = await request.json()

    const {
      name,
      isEnabled,
      isDefault,
      maxTokens,
      contextWindow,
      inputCost,
      outputCost,
      imageCost,
      videoCost,
      description,
    } = body

    // 检查模型是否存在
    const existing = await prisma.aiModel.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      )
    }

    // 更新模型
    const model = await prisma.aiModel.update({
      where: { id },
      data: {
        name,
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
    console.error('Failed to update AI model:', error)
    return NextResponse.json(
      { error: 'Failed to update AI model' },
      { status: 500 }
    )
  }
}

// DELETE - 删除模型
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'ai_model', 'delete')
  if (!auth.success) return auth.response

  try {
    const { id } = await params

    // 检查模型是否存在
    const existing = await prisma.aiModel.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      )
    }

    // 删除模型
    await prisma.aiModel.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to delete AI model:', error)
    return NextResponse.json(
      { error: 'Failed to delete AI model' },
      { status: 500 }
    )
  }
}
