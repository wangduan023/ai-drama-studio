import { NextRequest, NextResponse } from 'next/server'
import { corsHeaders } from '@/lib/cors'

/**
 * 获取清除 Cookie 的配置
 */
function getClearCookieOptions() {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  return {
    httpOnly: true,
    path: '/',
    maxAge: 0, // 立即过期
    secure: !isDevelopment, // 开发环境 false，生产环境 true
    sameSite: isDevelopment ? ('lax' as const) : ('strict' as const),
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  })
}

// POST /api/auth/local/logout - 用户登出
export async function POST(_request: NextRequest) {
  try {
    // 创建响应
    const response = NextResponse.json(
      { success: true },
      { status: 200, headers: corsHeaders() }
    )

    // 清除 auth_token cookie
    const clearOptions = getClearCookieOptions()
    response.cookies.set('auth_token', '', clearOptions)

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500, headers: corsHeaders() }
    )
  }
}
