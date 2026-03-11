import { NextRequest, NextResponse } from 'next/server'

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

// POST /api/auth/password/reset - 请求密码重置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    // 验证必填字段
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
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

    // TODO: 实现密码重置逻辑
    // 1. 查找用户是否存在
    // 2. 生成重置令牌
    // 3. 发送重置邮件
    // 注意：为了安全，即使用户不存在也返回成功，避免泄露用户邮箱信息

    // 这里模拟异步操作
    await new Promise(resolve => setTimeout(resolve, 100))

    return NextResponse.json(
      { 
        success: true, 
        message: 'If the email exists, a password reset link has been sent' 
      },
      { status: 200, headers: corsHeaders() }
    )
  } catch (error) {
    console.error('Password reset request error:', error)
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500, headers: corsHeaders() }
    )
  }
}
