import { NextRequest, NextResponse } from 'next/server'

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 0, // 立即过期
  path: '/',
}

// CORS 处理
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    response.cookies.set('auth_token', '', COOKIE_OPTIONS)

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500, headers: corsHeaders() }
    )
  }
}
