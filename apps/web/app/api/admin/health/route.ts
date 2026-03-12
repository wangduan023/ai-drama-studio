/**
 * Health Check API
 * 健康检查接口
 * 
 * GET /api/admin/health - 获取所有资源健康状态
 * POST /api/admin/health/check - 执行健康检查
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHealthMonitor } from '@/lib/ai/health-monitor'
import { requirePermission } from '@/lib/rbac'

// ============================================
// GET /api/admin/health - 获取当前健康状态
// ============================================
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'ai_key', 'read')
  if (!auth.success) return auth.response

  try {
    const monitor = createHealthMonitor()
    const result = await monitor.performFullCheck()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    })
  } catch (error: any) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      { error: 'Health check failed', message: error.message },
      { status: 500 }
    )
  }
}

// ============================================
// POST /api/admin/health/check - 执行检查
// ============================================
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'ai_key', 'read')
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const { keyId, proxyId, type } = body

    const monitor = createHealthMonitor()
    let result

    if (type === 'key' && keyId) {
      result = await monitor.checkApiKey(keyId)
    } else if (type === 'proxy' && proxyId) {
      result = await monitor.checkProxy(proxyId)
    } else {
      // 执行完整检查
      result = await monitor.performFullCheck()
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    })
  } catch (error: any) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      { error: 'Health check failed', message: error.message },
      { status: 500 }
    )
  }
}
