/**
 * 服务器端认证工具
 * 用于服务端组件获取当前用户信息
 */

import { cookies } from 'next/headers'
import { verifyToken } from './local'

/**
 * 获取当前登录用户
 * @returns 用户信息，如果未登录则返回 null
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return null
    }

    const result = await verifyToken(token)

    if (!result.valid || !result.user) {
      return null
    }

    return result.user
  } catch (error) {
    console.error('[getCurrentUser] Error:', error)
    return null
  }
}

/**
 * 检查用户是否已登录
 * @returns 是否已登录
 */
export async function isAuthenticated() {
  const user = await getCurrentUser()
  return !!user
}

/**
 * 要求用户登录的辅助函数
 * 如果用户未登录，返回 false
 */
export async function requireAuth(): Promise<boolean> {
  return isAuthenticated()
}
