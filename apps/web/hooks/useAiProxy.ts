/**
 * AI Proxy 管理 Hook
 */

import { useState, useCallback } from 'react'

export interface AiProxy {
  id: string
  name: string
  host: string
  port: number
  protocol: 'HTTP' | 'HTTPS' | 'SOCKS5'
  username: string | null
  location: string | null
  provider: string | null
  isActive: boolean
  isHealthy: boolean
  checkLatency: number | null
  consecutiveFailures: number
  maxConcurrent: number
  currentConcurrent: number
  totalRequests: number
  successRequests: number
  failedRequests: number
  avgLatency: number | null
  lastCheckAt: string | null
  lastUsedAt: string | null
  description: string | null
  createdAt: string
}

export interface CreateAiProxyInput {
  name: string
  host: string
  port: number
  protocol?: 'HTTP' | 'HTTPS' | 'SOCKS5'
  username?: string | null
  password?: string | null
  location?: string | null
  provider?: string | null
  maxConcurrent?: number
  description?: string | null
}

export interface UpdateAiProxyInput {
  name?: string
  host?: string
  port?: number
  protocol?: 'HTTP' | 'HTTPS' | 'SOCKS5'
  username?: string | null
  password?: string | null
  location?: string | null
  provider?: string | null
  isActive?: boolean
  maxConcurrent?: number
  description?: string | null
}

export function useAiProxy() {
  const [proxies, setProxies] = useState<AiProxy[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 获取代理列表
  const fetchProxies = useCallback(async (options?: { active?: boolean; healthy?: boolean }) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const url = new URL('/api/admin/proxy', window.location.origin)
      if (options?.active) url.searchParams.set('active', 'true')
      if (options?.healthy) url.searchParams.set('healthy', 'true')
      
      const response = await fetch(url)
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch proxies')
      }
      
      const data = await response.json()
      setProxies(data)
      return data
    } catch (err: any) {
      setError(err.message)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 创建代理
  const createProxy = useCallback(async (input: CreateAiProxyInput) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/admin/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create proxy')
      }
      
      const data = await response.json()
      setProxies(prev => [...prev, data])
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 更新代理
  const updateProxy = useCallback(async (id: string, input: UpdateAiProxyInput) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/admin/proxy/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update proxy')
      }
      
      const data = await response.json()
      setProxies(prev => prev.map(p => p.id === id ? data : p))
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 删除代理
  const deleteProxy = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/admin/proxy/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete proxy')
      }
      
      setProxies(prev => prev.filter(p => p.id !== id))
      return true
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 切换代理状态
  const toggleProxyStatus = useCallback(async (id: string, isActive: boolean) => {
    return updateProxy(id, { isActive })
  }, [updateProxy])

  // 获取健康代理
  const getHealthyProxies = useCallback(async () => {
    return fetchProxies({ healthy: true })
  }, [fetchProxies])

  return {
    proxies,
    isLoading,
    error,
    fetchProxies,
    createProxy,
    updateProxy,
    deleteProxy,
    toggleProxyStatus,
    getHealthyProxies,
  }
}
