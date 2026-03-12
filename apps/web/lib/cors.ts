/**
 * CORS 配置工具
 */

// 允许的源地址（开发环境）
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://192.168.2.75:3333'

/**
 * 获取 CORS 响应头
 */
export function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}
