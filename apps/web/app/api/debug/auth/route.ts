/**
 * 调试路由 - 检查认证状态
 * 用于诊断 cookie 和 token 问题
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  const cookies = request.cookies
  const authCookie = cookies.get('auth_token')
  
  // 验证认证
  const authResult = await verifyAuth(request)
  
  return NextResponse.json({
    // Cookie 信息
    cookie: {
      exists: !!authCookie,
      value: authCookie ? `${authCookie.value.substring(0, 20)}...` : null,
      length: authCookie?.value?.length || 0,
    },
    // 认证结果
    auth: {
      isAuthenticated: !!authResult.user,
      user: authResult.user ? {
        id: authResult.user.id,
        email: authResult.user.email,
        role: authResult.user.role,
      } : null,
      error: authResult.error,
    },
    // 请求信息
    request: {
      url: request.url,
      headers: {
        'user-agent': request.headers.get('user-agent'),
        'referer': request.headers.get('referer'),
      },
    },
  })
}
