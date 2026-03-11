import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, changePassword } from '@/lib/auth/local'

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

// 从请求中获取用户 ID
async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  // 从 cookie 获取 token
  const token = request.cookies.get('auth_token')?.value
  
  if (!token) {
    // 尝试从 Authorization header 获取
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const bearerToken = authHeader.substring(7)
      const decoded = await verifyToken(bearerToken)
      return decoded?.userId || null
    }
    return null
  }

  const decoded = await verifyToken(token)
  return decoded?.userId || null
}

// POST /api/auth/password/change - 修改密码
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: corsHeaders() }
      )
    }

    const body = await request.json()
    const { oldPassword, newPassword } = body

    // 验证必填字段
    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Old password and new password are required' },
        { status: 400, headers: corsHeaders() }
      )
    }

    // 验证新密码长度
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters' },
        { status: 400, headers: corsHeaders() }
      )
    }

    // 验证新密码与旧密码不同
    if (oldPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password must be different from old password' },
        { status: 400, headers: corsHeaders() }
      )
    }

    // 调用修改密码函数
    const result = await changePassword(userId, oldPassword, newPassword)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to change password' },
        { status: 400, headers: corsHeaders() }
      )
    }

    return NextResponse.json(
      { success: true },
      { status: 200, headers: corsHeaders() }
    )
  } catch (error) {
    console.error('Change password error:', error)
    
    // 处理旧密码不正确的错误
    if (error instanceof Error && error.message.includes('incorrect')) {
      return NextResponse.json(
        { error: 'Old password is incorrect' },
        { status: 400, headers: corsHeaders() }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500, headers: corsHeaders() }
    )
  }
}
