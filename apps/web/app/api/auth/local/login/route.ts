import { NextRequest, NextResponse } from 'next/server'
import { loginLocalUser } from '@/lib/auth/local'

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7天
  path: '/',
}

// 记住我选项的 Cookie 配置（30天）
const REMEMBER_COOKIE_OPTIONS = {
  ...COOKIE_OPTIONS,
  maxAge: 60 * 60 * 24 * 30, // 30天
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

// POST /api/auth/local/login - 用户登录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, remember } = body

    // 验证必填字段
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400, headers: corsHeaders() }
      )
    }

    // 调用登录函数
    const result = await loginLocalUser(email, password)

    if (!result.success || !result.token) {
      return NextResponse.json(
        { error: result.error || 'Invalid credentials' },
        { status: 401, headers: corsHeaders() }
      )
    }

    // 创建响应
    const response = NextResponse.json(
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          avatar: result.user.avatar,
        },
        token: result.token,
      },
      { status: 200, headers: corsHeaders() }
    )

    // 设置 HttpOnly cookie
    const cookieOptions = remember ? REMEMBER_COOKIE_OPTIONS : COOKIE_OPTIONS
    response.cookies.set('auth_token', result.token, cookieOptions)

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500, headers: corsHeaders() }
    )
  }
}
