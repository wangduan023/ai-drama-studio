import { NextRequest, NextResponse } from 'next/server'
import { registerLocalUser } from '@/lib/auth/local'
import { corsHeaders } from '@/lib/cors'

/**
 * 获取 Cookie 配置
 */
function getCookieOptions() {
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  return {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 天
    secure: !isDevelopment,
    sameSite: isDevelopment ? ('lax' as const) : ('strict' as const),
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

    // 创建响应并设置 cookie
    const response = NextResponse.json(
      {
        user: {
          id: result.id,
          email: result.email,
          name: result.name,
          role: result.role,
          createdAt: result.createdAt,
        },
      },
      { status: 201, headers: corsHeaders() }
    )

    // 设置 HttpOnly cookie
    const cookieOptions = getCookieOptions()
    response.cookies.set('auth_token', result.token || '', cookieOptions)

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
