/**
 * 认证中间件工具函数
 * 用于验证 JWT token 和处理路由权限
 */

import { NextRequest } from 'next/server'
import { verifyToken } from './local'
import { UserRole } from '@prisma/client'

// Cookie 名称
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
]

// API 公开路由列表（GET 请求公开）
const PUBLIC_API_ROUTES = [
  { pattern: /^\/api\/projects$/, methods: ['GET'] },
]

/**
 * 用户信息类型
 */
export interface AuthUser {
  id: string
  email: string
  name?: string | null
  role: UserRole
}

/**
 * 验证结果类型
 */
export interface AuthResult {
  user: AuthUser | null
  token: string | null
  error?: string
}

/**
 * 从请求中获取 token
 */
function getTokenFromRequest(request: NextRequest): string | null {
  // 从 cookie 获取
  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value
  if (cookieToken) return cookieToken

  // 从 Authorization header 获取
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  return null
}

/**
 * 验证用户认证
 * @param request - NextRequest 对象
 * @returns 验证结果，包含用户信息和 token
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const token = getTokenFromRequest(request)

    if (!token) {
      return { user: null, token: null, error: 'No token provided' }
    }

    // 验证 token - verifyToken 返回 VerificationResult
    const result = await verifyToken(token)

    if (!result.valid || !result.user) {
      return { user: null, token: null, error: result.error || 'Invalid or expired token' }
    }

    // 从验证结果构建用户信息
    const user: AuthUser = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role as UserRole,
    }

    return {
      user,
      token,
    }
  } catch (error) {
    console.error('Auth verification error:', error)
    return { user: null, token: null, error: 'Authentication failed' }
  }
}

/**
 * 检查路由是否为公开路由
 * @param pathname - 请求路径
 * @returns 是否为公开路由
 */
export function isPublicRoute(pathname: string): boolean {
  // 检查是否在公开路由列表中
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return true
  }

  // 检查静态资源
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
 * @param pathname - 请求路径
 * @param method - HTTP 方法
 * @returns 是否需要认证
 */
export function isProtectedRoute(pathname: string, method: string): boolean {
  // 首先检查是否为公开 API 路由
  const isPublicApi = PUBLIC_API_ROUTES.some(
    route => route.pattern.test(pathname) && route.methods.includes(method)
  )
  if (isPublicApi) return false

  // 检查是否在受保护路由列表中
  return PROTECTED_ROUTE_PATTERNS.some(
    route => route.pattern.test(pathname) && route.methods.includes(method)
  )
}

/**
 * 获取重定向 URL
 * @param user - 当前用户信息
 * @param pathname - 当前路径
 * @returns 重定向 URL，如果不需要重定向则返回 null
 */
export function getRedirectUrl(user: AuthUser | null, pathname: string): string | null {
  // 已认证用户访问登录/注册页面，重定向到 dashboard
  if (user) {
    if (pathname === '/login' || pathname === '/register' || pathname === '/') {
      return '/dashboard'
    }
    return null
  }

  // 未认证用户访问受保护路由，重定向到登录页
  if (!user && isProtectedRoute(pathname, 'GET') && !isPublicRoute(pathname)) {
    // 保存原始 URL，登录后跳转回来
    const returnUrl = encodeURIComponent(pathname)
    return `/login?returnUrl=${returnUrl}`
  }

  return null
}

/**
 * 检查用户是否有指定角色
 * @param user - 用户信息
 * @param allowedRoles - 允许的角色列表
 * @returns 是否有权限
 */
export function hasRequiredRole(user: AuthUser | null, allowedRoles?: UserRole[]): boolean {
  if (!user) return false
  if (!allowedRoles || allowedRoles.length === 0) return true
  return allowedRoles.includes(user.role)
}

/**
 * 获取角色等级（用于权限比较）
 */
export function getRoleLevel(role: UserRole): number {
  const levels: Record<UserRole, number> = {
    [UserRole.USER]: 1,
    [UserRole.PREMIUM]: 2,
    [UserRole.ADMIN]: 3,
    [UserRole.SUPER_ADMIN]: 4,
  }
  return levels[role] || 0
}

/**
 * 检查用户角色等级是否满足最低要求
 * @param user - 用户信息
 * @param minRole - 最低角色要求
 * @returns 是否满足要求
 */
export function hasMinimumRole(user: AuthUser | null, minRole: UserRole): boolean {
  if (!user) return false
  return getRoleLevel(user.role) >= getRoleLevel(minRole)
}

/**
 * 创建认证响应头
 * @param user - 用户信息
 * @returns 包含用户信息的请求头对象
 */
export function createAuthHeaders(user: AuthUser | null): Record<string, string> {
  if (!user) return {}

  return {
    'x-user-id': user.id,
    'x-user-email': user.email,
    'x-user-role': user.role,
  }
}
