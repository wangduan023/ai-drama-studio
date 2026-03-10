/**
 * 代理工具测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createProxyFromEnv, isValidProxyConfig, getProxyUrl } from '../src/proxy'
import type { ProxyConfig } from '../src/types'

describe('Proxy Utils', () => {
  // 保存原始环境变量
  const originalEnv = process.env

  beforeEach(() => {
    // 清理环境变量
    process.env = { ...originalEnv }
    vi.resetModules()
  })

  afterEach(() => {
    // 恢复环境变量
    process.env = originalEnv
  })

  describe('createProxyFromEnv', () => {
    it('应该返回 undefined 当没有配置环境变量时', () => {
      delete process.env.HTTP_PROXY_HOST
      delete process.env.HTTP_PROXY_PORT

      const proxy = createProxyFromEnv()
      expect(proxy).toBeUndefined()
    })

    it('应该返回 undefined 当只配置了主机时', () => {
      process.env.HTTP_PROXY_HOST = '127.0.0.1'
      delete process.env.HTTP_PROXY_PORT

      const proxy = createProxyFromEnv()
      expect(proxy).toBeUndefined()
    })

    it('应该返回 undefined 当只配置了端口时', () => {
      delete process.env.HTTP_PROXY_HOST
      process.env.HTTP_PROXY_PORT = '7890'

      const proxy = createProxyFromEnv()
      expect(proxy).toBeUndefined()
    })

    it('应该正确创建代理配置（不带认证）', () => {
      process.env.HTTP_PROXY_HOST = '127.0.0.1'
      process.env.HTTP_PROXY_PORT = '7890'

      const proxy = createProxyFromEnv()
      expect(proxy).toEqual({
        host: '127.0.0.1',
        port: 7890,
        username: undefined,
        password: undefined,
      })
    })

    it('应该正确创建代理配置（带认证）', () => {
      process.env.HTTP_PROXY_HOST = 'proxy.example.com'
      process.env.HTTP_PROXY_PORT = '8080'
      process.env.HTTP_PROXY_USERNAME = 'user'
      process.env.HTTP_PROXY_PASSWORD = 'pass'

      const proxy = createProxyFromEnv()
      expect(proxy).toEqual({
        host: 'proxy.example.com',
        port: 8080,
        username: 'user',
        password: 'pass',
      })
    })

    it('应该将空字符串用户名和密码转换为 undefined', () => {
      process.env.HTTP_PROXY_HOST = '127.0.0.1'
      process.env.HTTP_PROXY_PORT = '7890'
      process.env.HTTP_PROXY_USERNAME = ''
      process.env.HTTP_PROXY_PASSWORD = ''

      const proxy = createProxyFromEnv()
      expect(proxy).toEqual({
        host: '127.0.0.1',
        port: 7890,
        username: undefined,
        password: undefined,
      })
    })
  })

  describe('isValidProxyConfig', () => {
    it('应该返回 false 对于 undefined', () => {
      expect(isValidProxyConfig(undefined)).toBe(false)
    })

    it('应该返回 false 对于缺少 host 的配置', () => {
      const proxy: ProxyConfig = {
        host: '',
        port: 7890,
      }
      expect(isValidProxyConfig(proxy)).toBe(false)
    })

    it('应该返回 false 对于缺少 port 的配置', () => {
      const proxy: ProxyConfig = {
        host: '127.0.0.1',
        port: 0,
      }
      expect(isValidProxyConfig(proxy)).toBe(false)
    })

    it('应该返回 false 对于端口超出范围的配置', () => {
      const proxy: ProxyConfig = {
        host: '127.0.0.1',
        port: 70000,
      }
      expect(isValidProxyConfig(proxy)).toBe(false)
    })

    it('应该返回 true 对于有效的配置', () => {
      const proxy: ProxyConfig = {
        host: '127.0.0.1',
        port: 7890,
      }
      expect(isValidProxyConfig(proxy)).toBe(true)
    })

    it('应该返回 true 对于带认证的配置', () => {
      const proxy: ProxyConfig = {
        host: 'proxy.example.com',
        port: 8080,
        username: 'user',
        password: 'pass',
      }
      expect(isValidProxyConfig(proxy)).toBe(true)
    })
  })

  describe('getProxyUrl', () => {
    it('应该生成不带认证的代理 URL', () => {
      const proxy: ProxyConfig = {
        host: '127.0.0.1',
        port: 7890,
      }
      expect(getProxyUrl(proxy)).toBe('http://127.0.0.1:7890')
    })

    it('应该生成带认证的代理 URL', () => {
      const proxy: ProxyConfig = {
        host: 'proxy.example.com',
        port: 8080,
        username: 'user',
        password: 'pass',
      }
      expect(getProxyUrl(proxy)).toBe('http://user:pass@proxy.example.com:8080')
    })

    it('应该处理已带协议的 host', () => {
      const proxy: ProxyConfig = {
        host: 'http://proxy.example.com',
        port: 8080,
      }
      expect(getProxyUrl(proxy)).toBe('http://proxy.example.com:8080')
    })

    it('应该处理已带 https 协议的 host', () => {
      const proxy: ProxyConfig = {
        host: 'https://proxy.example.com',
        port: 8080,
      }
      expect(getProxyUrl(proxy)).toBe('https://proxy.example.com:8080')
    })
  })
})
