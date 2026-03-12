/**
 * AI API Key 管理 API
 * 
 * 权限要求: ai_key:read (GET), ai_key:create (POST)
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  AiApiKeyRepository, 
  prisma,
  type CreateAiApiKeyInput 
} from '@ai-drama-studio/db'
import { requirePermission, withPermission } from '@/lib/rbac'

const keyRepo = new AiApiKeyRepository(prisma)

// ============================================
// GET /api/admin/ai-keys - 获取密钥列表
// ============================================
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'ai_key', 'read')
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('providerId')
    const isActive = searchParams.get('isActive')

    const keys = await keyRepo.findAll({
      ...(providerId ? { providerId } : {}),
      ...(isActive !== null ? { isActive: isActive === 'true' } : {}),
    })

    // 过滤敏感信息
    const safeKeys = keys.map(key => ({
      id: key.id,
      providerId: key.providerId,
      modelId: key.modelId,
      name: key.name,
      // apiKey 只显示前8位
      apiKey: key.apiKey.slice(0, 8) + '****',
      capabilities: key.capabilities,
      proxyMode: key.proxyMode,
      proxyId: key.proxyId,
      priority: key.priority,
      weight: key.weight,
      isActive: key.isActive,
      quotaDaily: key.quotaDaily,
      quotaUsed: key.quotaUsed,
      successCount: key.successCount,
      failCount: key.failCount,
      lastUsedAt: key.lastUsedAt,
      lastErrorAt: key.lastErrorAt,
      createdAt: key.createdAt,
    }))

    return NextResponse.json(safeKeys)
  } catch (error) {
    console.error('Failed to fetch AI API keys:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI API keys' },
      { status: 500 }
    )
  }
}

// ============================================
// POST /api/admin/ai-keys - 创建密钥
// ============================================
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'ai_key', 'create')
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    
    // 验证必填字段
    if (!body.providerId || !body.name || !body.apiKey) {
      return NextResponse.json(
        { error: 'Missing required fields: providerId, name, apiKey' },
        { status: 400 }
      )
    }

    const input: CreateAiApiKeyInput = {
      providerId: body.providerId,
      modelId: body.modelId ?? null,
      name: body.name,
      apiKey: body.apiKey,
      apiSecret: body.apiSecret ?? null,
      capabilities: body.capabilities ?? null,
      isActive: body.isActive ?? true,
      priority: body.priority ?? 0,
      weight: body.weight ?? 1,
      quotaDaily: body.quotaDaily ?? null,
      description: body.description ?? null,
      proxyMode: body.proxyMode ?? 'AUTO',
      proxyId: body.proxyId ?? null,
    }

    const key = await keyRepo.create(input)

    return NextResponse.json({
      id: key.id,
      providerId: key.providerId,
      modelId: key.modelId,
      name: key.name,
      apiKey: key.apiKey.slice(0, 8) + '****',
      capabilities: key.capabilities,
      proxyMode: key.proxyMode,
      priority: key.priority,
      weight: key.weight,
      isActive: key.isActive,
      quotaDaily: key.quotaDaily,
      createdAt: key.createdAt,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Failed to create AI API key:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'API key name already exists' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create AI API key' },
      { status: 500 }
    )
  }
}
