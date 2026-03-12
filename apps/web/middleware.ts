/**
 * Next.js 认证中间件
 * 处理路由保护和用户认证
 * 
 * 注意：此文件运行在 Edge Runtime，不能使用 Node.js 模块如 'crypto'
 * JWT 验证使用 jose 库（Edge Runtime 兼容）
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET 
  || 'ai-drama-studio-jwt-secret-key-2026-change-in-production'

const AUTH_COOKIE_NAME = 'auth_token'

// 公开路由列表（不需要认证）
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/api/auth/local/login',
  '/api/auth/local/register',
  '/api/auth/local/logout',
  '/api/auth/local/refresh',
  '/api/auth/password/reset',
  '/api/auth/password/change',
  '/_next',
  '/static',
  '/favicon',
  '/public',
]

// 受保护路由前缀列表
const PROTECTED_ROUTE_PATTERNS = [
  { pattern: /^\/dashboard/, methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
  { pattern: /^\/projects\/[^/]+\/edit/, methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
  { pattern: /^\/profile/, methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
  { pattern: /^\/settings/, methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
  { pattern: /^\/library/, methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
  // API 路由
  { pattern: /^\/api\/projects\/.+/, methods: ['POST', 'PUT', 'DELETE', 'PATCH'] },
  { pattern: /^\/api\/characters/, methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
  { pattern: /^\/api\/locations/, methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
  { pattern: /^\/api\/episodes/, methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
  { pattern: /^\/api\/tasks/, methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
  { pattern: /^\/api\/assets/, methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
  { pattern: /^\/api\/sse/, methods: ['GET'] },
  { pattern: /^\/api\/credits/, methods: ['GET', 'POST'] },
]

// API 公开路由列表（GET 请求公开）
const PUBLIC_API_ROUTES = [
  { pattern: /^\/api\/projects$/, methods: ['GET'] },
]

/**
 * 检查路由是否为公开路由
 */
function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return true
  }

  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/fonts/') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.gif') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.json')
  ) {
    return true
  }

  return false
}

/**
 * 检查路由是否需要认证
 */
function isProtectedRoute(pathname: string, method: string): boolean {
  const isPublicApi = PUBLIC_API_ROUTES.some(
    route => route.pattern.test(pathname) && route.methods.includes(method)
  )
  if (isPublicApi) return false

  return PROTECTED_ROUTE_PATTERNS.some(
    route => route.pattern.test(pathname) && route.methods.includes(method)
  )
}

/**
 * 从请求中获取 token
 */
function getTokenFromRequest(request: NextRequest): string | null {
  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value
  if (cookieToken) return cookieToken

  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  return null
}

/**
 * 验证 JWT Token (Edge Runtime 兼容)
 */
async function verifyTokenEdge(token: string): Promise<{
  valid: boolean
  payload?: any
  error?: string
}> {
  try {
    const secretKey = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secretKey)
    
    return { valid: true, payload }
  } catch (error: any) {
    if (error.code === 'ERR_JWT_EXPIRED') {
      return { valid: false, error: 'Token has expired' }
    }
    if (error.code === 'ERR_JWT_INVALID') {
      return { valid: false, error: 'Invalid token' }
    }
    return { valid: false, error: `Token verification failed: ${error.message}` }
  }
}

/**
 * 中间件主函数
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl
  const method = request.method

  // 1. 检查是否为公开路由
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // 2. 获取 token
  const token = getTokenFromRequest(request)
  
  console.log('[Middleware] Checking:', pathname, 'Has token:', !!token)

  // 3. 验证 token
  let user = null
  let error = null
  
  if (token) {
    const result = await verifyTokenEdge(token)
    console.log('[Middleware] Token verification:', { valid: result.valid, error: result.error })
    
    if (result.valid && result.payload) {
      user = {
        id: result.payload.userId,
        email: result.payload.email,
        role: result.payload.role,
      }
    } else {
      error = result.error
    }
  } else {
    error = 'No token provided'
  }

  console.log('[Middleware] Auth result:', { pathname, isAuthenticated: !!user, error: error || 'none' })

  // 4. 已认证用户访问登录/注册页面，重定向到 dashboard
  if (user && (pathname === '/login' || pathname === '/register' || pathname === '/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
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
    const returnUrl = encodeURIComponent(pathname)
    return NextResponse.redirect(new URL(`/login?returnUrl=${returnUrl}`, request.url))
  }

  // 7. 为已认证用户添加用户信息到请求头
  const response = NextResponse.next()
  
  if (user) {
    response.headers.set('x-user-id', user.id)
    response.headers.set('x-user-email', user.email)
    response.headers.set('x-user-role', user.role)
  }

  return response
}

/**
 * 中间件匹配配置
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
