/**
 * Next.js 认证中间件
 * 处理路由保护和用户认证
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  verifyAuth,
  isPublicRoute,
  isProtectedRoute,
  getRedirectUrl,
  createAuthHeaders,
} from '@/lib/auth/middleware'

/**
 * 中间件主函数
 * 处理所有传入请求，执行认证检查和路由保护
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  const method = request.method

  // 1. 检查是否为公开路由
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // 2. 验证用户认证
  const { user, token, error } = await verifyAuth(request)

  // 3. 获取重定向 URL（如果有）
  const redirectUrl = getRedirectUrl(user, pathname)

  // 4. 已认证用户访问登录/注册页面，重定向到 dashboard
  if (redirectUrl && user && (pathname === '/login' || pathname === '/register' || pathname === '/')) {
    return NextResponse.redirect(new URL(redirectUrl, request.url))
  }

  // 5. 检查是否需要认证
  const requiresAuth = isProtectedRoute(pathname, method)

  // 6. 未认证用户访问受保护路由
  if (requiresAuth && !user) {
    // API 路由返回 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: error || 'Authentication required' },
        { status: 401 }
      )
    }

    // 页面路由重定向到登录页
    if (redirectUrl) {
      return NextResponse.redirect(new URL(redirectUrl, request.url))
    }
  }

  // 7. 为已认证用户添加用户信息到请求头
  const headers = createAuthHeaders(user)
  const response = NextResponse.next({
    request: {
      headers: new Headers(request.headers),
    },
  })

  // 8. 将用户信息添加到请求头，供后续使用
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
    // 同时修改请求头，确保 API 路由可以访问
    request.headers.set(key, value)
  })

  // 9. 如果 token 即将过期，刷新 token（可选）
  // 这里可以实现 token 刷新逻辑

  return response
}

/**
 * 中间件匹配配置
 * 匹配所有路由，排除静态资源
 */
export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了:
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico (网站图标)
     * - public 目录下的文件
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
