/**
 * GET /api/auth/me - 获取当前登录用户信息
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/middleware'
import { corsHeaders } from '@/lib/cors'

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  })
}

/**
 * GET - 获取当前用户信息
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // 验证用户认证
    const { user, error } = await verifyAuth(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: error || 'Authentication required' },
        { status: 401, headers: corsHeaders() }
      )
    }

    // 返回用户信息（不包含敏感数据）
    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 200, headers: corsHeaders() }
    )
  } catch (error) {
    console.error('Get current user error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders() }
    )
  }
}
