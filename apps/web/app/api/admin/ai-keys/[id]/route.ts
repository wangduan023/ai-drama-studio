/**
 * AI API Key 单个资源操作 API
 * 
 * 权限要求: 
 * - GET: ai_key:read
 * - PUT: ai_key:update
 * - DELETE: ai_key:delete
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  AiApiKeyRepository, 
  prisma,
  type UpdateAiApiKeyInput 
} from '@ai-drama-studio/db'
import { requirePermission } from '@/lib/rbac'

const keyRepo = new AiApiKeyRepository(prisma)

// ============================================
// GET /api/admin/ai-keys/[id] - 获取密钥详情
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'ai_key', 'read')
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const key = await keyRepo.findById(id)

    if (!key) {
      return NextResponse.json(
        { error: 'AI API key not found' },
        { status: 404 }
      )
    }

    // 过滤敏感信息
    return NextResponse.json({
      id: key.id,
      providerId: key.providerId,
      modelId: key.modelId,
      name: key.name,
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
      description: key.description,
      createdAt: key.createdAt,
    })
  } catch (error) {
    console.error('Failed to fetch AI API key:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI API key' },
      { status: 500 }
    )
  }
}

// ============================================
// PUT /api/admin/ai-keys/[id] - 更新密钥
// ============================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'ai_key', 'update')
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const body = await request.json()

    const input: UpdateAiApiKeyInput = {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.apiKey !== undefined && { apiKey: body.apiKey }),
      ...(body.apiSecret !== undefined && { apiSecret: body.apiSecret }),
      ...(body.capabilities !== undefined && { capabilities: body.capabilities }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.weight !== undefined && { weight: body.weight }),
      ...(body.quotaDaily !== undefined && { quotaDaily: body.quotaDaily }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.proxyMode !== undefined && { proxyMode: body.proxyMode }),
      ...(body.proxyId !== undefined && { proxyId: body.proxyId }),
    }

    const key = await keyRepo.update(id, input)

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
      updatedAt: key.updatedAt,
    })
  } catch (error: any) {
    console.error('Failed to update AI API key:', error)
    
    if (error.message?.includes('不存在')) {
      return NextResponse.json(
        { error: 'AI API key not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update AI API key' },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE /api/admin/ai-keys/[id] - 删除密钥
// ============================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'ai_key', 'delete')
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    await keyRepo.delete(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to delete AI API key:', error)
    
    if (error.message?.includes('不存在')) {
      return NextResponse.json(
        { error: 'AI API key not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to delete AI API key' },
      { status: 500 }
    )
  }
}
