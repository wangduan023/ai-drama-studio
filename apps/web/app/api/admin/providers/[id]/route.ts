/**
 * AI Provider 管理 API - 单个资源
 *
 * 权限要求：
 * - GET: ai_provider:read
 * - PUT: ai_provider:update
 * - DELETE: ai_provider:delete
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  AiProviderRepository,
  prisma,
  type UpdateAiProviderInput
} from '@ai-drama-studio/db'
import { requirePermission } from '@/lib/rbac'

const providerRepo = new AiProviderRepository(prisma)

// ============================================
// GET /api/admin/providers/[id] - 获取单个渠道商
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requirePermission(request, 'ai_provider', 'read')
  if (!auth.success) return auth.response

  try {
    const provider = await providerRepo.findById(id)

    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      )
    }

    // 过滤敏感信息
    const safeProvider = {
      id: provider.id,
      name: provider.name,
      baseUrl: provider.baseUrl,
      isActive: provider.isActive,
      priority: provider.priority,
      weight: provider.weight,
      rateLimit: provider.rateLimit,
      quotaDaily: provider.quotaDaily,
      quotaUsed: provider.quotaUsed,
      metadata: provider.metadata,
      description: provider.description,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    }

    return NextResponse.json(safeProvider)
  } catch (error) {
    console.error('Failed to fetch provider:', error)
    return NextResponse.json(
      { error: 'Failed to fetch provider' },
      { status: 500 }
    )
  }
}

// ============================================
// PUT /api/admin/providers/[id] - 更新渠道商
// ============================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requirePermission(request, 'ai_provider', 'update')
  if (!auth.success) return auth.response

  try {
    const body = await request.json()

    // 验证渠道商是否存在
    const existingProvider = await providerRepo.findById(id)
    if (!existingProvider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      )
    }

    const input: UpdateAiProviderInput = {
      ...(body.baseUrl !== undefined ? { baseUrl: body.baseUrl } : {}),
      ...(body.apiKey !== undefined ? { apiKey: body.apiKey } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.priority !== undefined ? { priority: body.priority } : {}),
      ...(body.weight !== undefined ? { weight: body.weight } : {}),
      ...(body.rateLimit !== undefined ? { rateLimit: body.rateLimit } : {}),
      ...(body.quotaDaily !== undefined ? { quotaDaily: body.quotaDaily } : {}),
      ...(body.metadata !== undefined ? { metadata: body.metadata } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
    }

    const provider = await providerRepo.update(id, input)

    return NextResponse.json({
      id: provider.id,
      name: provider.name,
      baseUrl: provider.baseUrl,
      isActive: provider.isActive,
      priority: provider.priority,
      weight: provider.weight,
      rateLimit: provider.rateLimit,
      quotaDaily: provider.quotaDaily,
      description: provider.description,
      updatedAt: provider.updatedAt,
    })
  } catch (error: any) {
    console.error('Failed to update provider:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update provider' },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE /api/admin/providers/[id] - 删除渠道商
// ============================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const auth = await requirePermission(request, 'ai_provider', 'delete')
  if (!auth.success) return auth.response

  try {
    // 验证渠道商是否存在
    const existingProvider = await providerRepo.findById(id)
    if (!existingProvider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      )
    }

    await providerRepo.delete(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to delete provider:', error)

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete provider' },
      { status: 500 }
    )
  }
}
