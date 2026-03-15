/**
 * AI Proxy 管理 API
 * 
 * 权限要求: ai_proxy:read (GET), ai_proxy:create (POST)
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  AiProxyRepository, 
  prisma,
  type CreateAiProxyInput 
} from '@ai-drama-studio/db'
import { requirePermission } from '@/lib/rbac'

const proxyRepo = new AiProxyRepository(prisma)

// ============================================
// GET /api/admin/proxy - 获取代理列表
// ============================================
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'ai_proxy', 'read')
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const onlyActive = searchParams.get('active') === 'true'
    const onlyHealthy = searchParams.get('healthy') === 'true'
    const location = searchParams.get('location')

    const proxies = await proxyRepo.findAll({
      ...(onlyActive ? { onlyActive: true } : {}),
      ...(onlyHealthy ? { onlyHealthy: true } : {}),
      ...(location ? { location } : {}),
    })

    // 过滤敏感信息（密码不返回）
    const safeProxies = proxies.map(proxy => ({
      id: proxy.id,
      name: proxy.name,
      host: proxy.host,
      port: proxy.port,
      protocol: proxy.protocol,
      username: proxy.username,
      location: proxy.location,
      provider: proxy.provider,
      isActive: proxy.isActive,
      isHealthy: proxy.isHealthy,
      checkLatency: proxy.checkLatency,
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
    }))

    return NextResponse.json(safeProxies)
  } catch (error) {
    console.error('Failed to fetch proxies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch proxies' },
      { status: 500 }
    )
  }
}

// ============================================
// POST /api/admin/proxy - 创建代理
// ============================================
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'ai_proxy', 'create')
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    
    // 验证必填字段
    if (!body.name || !body.host || !body.port) {
      return NextResponse.json(
        { error: 'Missing required fields: name, host, port' },
        { status: 400 }
      )
    }

    const input: CreateAiProxyInput = {
      name: body.name,
      host: body.host,
      port: parseInt(body.port),
      protocol: body.protocol ?? 'HTTP',
      username: body.username ?? null,
      password: body.password ?? null,
      location: body.location ?? null,
      provider: body.provider ?? null,
      maxConcurrent: body.maxConcurrent ?? 10,
      description: body.description ?? null,
    }

    const proxy = await proxyRepo.create(input)

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
      createdAt: proxy.createdAt,
    }, { status: 201 })
  } catch (error: any) {
    console.error('Failed to create proxy:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Proxy name already exists' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create proxy' },
      { status: 500 }
    )
  }
}
