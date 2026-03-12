import { NextRequest, NextResponse } from 'next/server'
import { loginLocalUser } from '@/lib/auth/local'
import { corsHeaders } from '@/lib/cors'

/**
 * 获取 Cookie 配置
 * 根据请求动态设置，支持开发环境的 IP 访问
 */
function getCookieOptions(request: NextRequest, remember?: boolean) {
  // 检测是否为开发环境
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  // 基础配置
  const baseOptions = {
    httpOnly: true,
    path: '/',
    maxAge: remember ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7, // 30天或7天
  }
  
  // 开发环境：允许非 HTTPS，放宽 sameSite 限制
  if (isDevelopment) {
    return {
      ...baseOptions,
      secure: false,
      sameSite: 'lax' as const,
      // 开发环境不指定 domain，让 cookie 跟随当前访问的域名
    }
  }
  
  // 生产环境
  return {
    ...baseOptions,
    secure: true,
    sameSite: 'strict' as const,
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
    const cookieOptions = getCookieOptions(request, remember)
    response.cookies.set('auth_token', result.token, cookieOptions)

    return response
  } catch (error) {
    console.error('Login error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed'
    return NextResponse.json(
      { error: errorMessage },
      { status: 401, headers: corsHeaders() }
    )
  }
}
