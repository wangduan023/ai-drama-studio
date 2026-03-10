/**
 * HTTP 代理工具
 *
 * 用于从环境变量读取代理配置，帮助国内用户访问国外 AI API
 *
 * @example
 * ```typescript
 * // 使用环境变量创建代理配置
 * const proxy = createProxyFromEnv()
 *
 * // 创建带代理的客户端
 * const client = createAIClient({
 *   provider: 'openai',
 *   modelId: 'gpt-4o',
 *   apiKey: process.env.OPENAI_API_KEY,
 *   proxy,
 * })
 * ```
 */

import type { ProxyConfig } from './types'

/**
 * 从环境变量创建代理配置
 *
 * 环境变量：
 * - HTTP_PROXY_HOST: 代理服务器地址 (如：127.0.0.1)
 * - HTTP_PROXY_PORT: 代理端口 (如：7890)
 * - HTTP_PROXY_USERNAME: 代理用户名 (可选)
 * - HTTP_PROXY_PASSWORD: 代理密码 (可选)
 *
 * @returns 如果配置了代理则返回 ProxyConfig，否则返回 undefined
 */
export function createProxyFromEnv(): ProxyConfig | undefined {
  const host = process.env.HTTP_PROXY_HOST
  const port = process.env.HTTP_PROXY_PORT
  const username = process.env.HTTP_PROXY_USERNAME
  const password = process.env.HTTP_PROXY_PASSWORD

  // 如果没有配置代理主机，返回 undefined
  if (!host || !port) {
    return undefined
  }

  return {
    host,
    port: Number(port),
    username: username || undefined,
    password: password || undefined,
  }
}

/**
 * 检查代理配置是否有效
 */
export function isValidProxyConfig(proxy: ProxyConfig | undefined): boolean {
  if (!proxy) {
    return false
  }
  return !!(proxy.host && proxy.port && proxy.port > 0 && proxy.port < 65536)
}

/**
 * 获取代理 URL 字符串
 */
export function getProxyUrl(proxy: ProxyConfig): string {
  const { host, port, username, password } = proxy
  const protocol = host.startsWith('http://') || host.startsWith('https://') ? '' : 'http://'

  if (username && password) {
    return `${protocol}${username}:${password}@${host}:${port}`
  }
  return `${protocol}${host}:${port}`
}
