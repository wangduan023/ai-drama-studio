/**
 * 调试路由 - 验证 Token
 */

import { NextRequest, NextResponse } from 'next/server'
import * as jwt from 'jsonwebtoken'

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
  if (secret) return secret
  return 'ai-drama-studio-jwt-secret-key-2026-change-in-production'
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value
  
  if (!token) {
    return NextResponse.json({
      hasToken: false,
      message: 'No auth_token cookie found'
    })
  }
  
  const result: any = {
    hasToken: true,
    tokenLength: token.length,
    tokenPrefix: token.substring(0, 50) + '...',
  }
  
  try {
    // 尝试解码（不验证）
    const decoded = jwt.decode(token)
    result.decoded = decoded
    
    // 尝试验证
    const JWT_SECRET = getJwtSecret()
    result.secretExists = !!JWT_SECRET
    result.secretLength = JWT_SECRET?.length
    
    try {
      const verified = jwt.verify(token, JWT_SECRET)
      result.verification = 'success'
      result.verified = verified
    } catch (verifyError: any) {
      result.verification = 'failed'
      result.verifyError = verifyError.message
      result.verifyErrorType = verifyError.name
    }
    
  } catch (error: any) {
    result.decodeError = error.message
  }
  
  return NextResponse.json(result)
}
