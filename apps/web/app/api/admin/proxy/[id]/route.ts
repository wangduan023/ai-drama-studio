/**
 * AI Proxy 单个资源操作 API
 * 
 * 权限要求: 
 * - GET: ai_proxy:read
 * - PUT: ai_proxy:update
 * - DELETE: ai_proxy:delete
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  AiProxyRepository, 
  prisma,
  type UpdateAiProxyInput 
} from '@ai-drama-studio/db'
import { requirePermission } from '@/lib/rbac'

const proxyRepo = new AiProxyRepository(prisma)

// ============================================
// GET /api/admin/proxy/[id] - 获取代理详情
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'ai_proxy', 'read')
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const proxy = await proxyRepo.findById(id)

    if (!proxy) {
      return NextResponse.json(
        { error: 'Proxy not found' },
        { status: 404 }
      )
    }

    // 过滤敏感信息
    return NextResponse.json({
      id: proxy.id,
      name: proxy.name,
      host: proxy.host,
      port: proxy.port,
      protocol: proxy.protocol,
      location: proxy.location,
      provider: proxy.provider,
      isActive: proxy.isActive,
      isHealthy: proxy.isHealthy,
      checkLatency: proxy.checkLatency,
      checkError: proxy.checkError,
      consecutiveFailures: proxy.consecutiveFailures,
      maxConcurrent: proxy.maxConcurrent,
      currentConcurrent: proxy.currentConcurrent,
      totalRequests: proxy.totalRequests,
      successRequests: proxy.successRequests,
      failedRequests: proxy.failedRequests,
      avgLatency: proxy.avgLatency,
      lastCheckAt: proxy.lastCheckAt,
      lastUsedAt: proxy.lastUsedAt,
      description: proxy.description,
      createdAt: proxy.createdAt,
      updatedAt: proxy.updatedAt,
    })
  } catch (error) {
    console.error('Failed to fetch proxy:', error)
    return NextResponse.json(
      { error: 'Failed to fetch proxy' },
      { status: 500 }
    )
  }
}

// ============================================
// PUT /api/admin/proxy/[id] - 更新代理
// ============================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'ai_proxy', 'update')
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const body = await request.json()

    const input: UpdateAiProxyInput = {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.host !== undefined && { host: body.host }),
      ...(body.port !== undefined && { port: parseInt(body.port) }),
      ...(body.protocol !== undefined && { protocol: body.protocol }),
      ...(body.username !== undefined && { username: body.username }),
      ...(body.password !== undefined && { password: body.password }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.provider !== undefined && { provider: body.provider }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.maxConcurrent !== undefined && { maxConcurrent: parseInt(body.maxConcurrent) }),
      ...(body.description !== undefined && { description: body.description }),
    }

    const proxy = await proxyRepo.update(id, input)

    return NextResponse.json({
      id: proxy.id,
      name: proxy.name,
      host: proxy.host,
      port: proxy.port,
      protocol: proxy.protocol,
      location: proxy.location,
      provider: proxy.provider,
      isActive: proxy.isActive,
      isHealthy: proxy.isHealthy,
      maxConcurrent: proxy.maxConcurrent,
      updatedAt: proxy.updatedAt,
    })
  } catch (error: any) {
    console.error('Failed to update proxy:', error)
    
    if (error.message?.includes('不存在')) {
      return NextResponse.json(
        { error: 'Proxy not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update proxy' },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE /api/admin/proxy/[id] - 删除代理
// ============================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'ai_proxy', 'delete')
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    await proxyRepo.delete(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to delete proxy:', error)
    
    if (error.message?.includes('不存在')) {
      return NextResponse.json(
        { error: 'Proxy not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to delete proxy' },
      { status: 500 }
    )
  }
}
