import { NextRequest, NextResponse } from 'next/server'
import { registerLocalUser } from '@/lib/auth/local'

// 会话级别 Cookie（浏览器关闭后清除）
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
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

// POST /api/auth/local/register - 用户注册
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name } = body

    // 验证必填字段
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400, headers: corsHeaders() }
      )
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400, headers: corsHeaders() }
      )
    }

    // 验证密码长度
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400, headers: corsHeaders() }
      )
    }

    // 调用注册函数
    const result = await registerLocalUser({ email, password, name })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Registration failed' },
        { status: 400, headers: corsHeaders() }
      )
    }

    // 创建响应并设置 cookie
    const response = NextResponse.json(
      {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
          createdAt: result.user.createdAt,
        },
      },
      { status: 201, headers: corsHeaders() }
    )

    // 设置 HttpOnly cookie
    if (result.token) {
      response.cookies.set('auth_token', result.token, COOKIE_OPTIONS)
    }

    return response
  } catch (error) {
    console.error('Registration error:', error)
    
    // 处理用户已存在的错误
    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400, headers: corsHeaders() }
      )
    }
    
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500, headers: corsHeaders() }
    )
  }
}
