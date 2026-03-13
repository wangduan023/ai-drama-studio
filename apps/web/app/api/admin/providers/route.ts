/**
 * AI Provider 管理 API
 *
 * 权限要求：ai_provider:read (GET), ai_provider:create (POST)
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  AiProviderRepository,
  prisma,
  type CreateAiProviderInput
} from '@ai-drama-studio/db'
import { requirePermission } from '@/lib/rbac'

const providerRepo = new AiProviderRepository(prisma)

// ============================================
// GET /api/admin/providers - 获取渠道商列表
// ============================================
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'ai_provider', 'read')
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const onlyActive = searchParams.get('active') === 'true'

    const providers = await providerRepo.findAll({
      ...(onlyActive ? { onlyActive: true } : {}),
    })

    // 过滤敏感信息
    const safeProviders = providers.map(provider => ({
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
    }))

    return NextResponse.json(safeProviders)
  } catch (error) {
    console.error('Failed to fetch providers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    )
  }
}

// ============================================
// POST /api/admin/providers - 创建渠道商
// ============================================
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'ai_provider', 'create')
  if (!auth.success) return auth.response

  try {
    const body = await request.json()

    // 验证必填字段
    if (!body.name || !body.baseUrl || !body.apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: name, baseUrl, apiKey' },
        { status: 400 }
      )
    }

    const input: CreateAiProviderInput = {
      name: body.name,
      baseUrl: body.baseUrl,
      apiKey: body.apiKey,
      isActive: body.isActive ?? true,
      priority: body.priority ?? 0,
      weight: body.weight ?? 1,
      rateLimit: body.rateLimit ?? null,
      quotaDaily: body.quotaDaily ?? null,
      metadata: body.metadata ?? null,
      description: body.description ?? null,
    }

    const provider = await providerRepo.create(input)

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
      createdAt: provider.createdAt,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Failed to create provider:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Provider name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create provider' },
      { status: 500 }
    )
  }
}
