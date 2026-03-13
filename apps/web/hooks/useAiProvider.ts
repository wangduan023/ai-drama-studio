/**
 * AI Provider 管理 Hook
 * 用于管理 AI 渠道商配置
 */

import { useState, useCallback } from 'react'

export interface AiProvider {
  id: string
  name: string
  baseUrl: string
  apiKey: string | null
  isActive: boolean
  priority: number
  weight: number
  rateLimit: number | null
  quotaDaily: number | null
  quotaUsed: number
  metadata: Record<string, any> | null
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateAiProviderInput {
  name: string
  baseUrl: string
  apiKey: string
  isActive?: boolean
  priority?: number
  weight?: number
  rateLimit?: number
  quotaDaily?: number
  metadata?: Record<string, any>
  description?: string
}

export interface UpdateAiProviderInput {
  baseUrl?: string
  apiKey?: string
  isActive?: boolean
  priority?: number
  weight?: number
  rateLimit?: number
  quotaDaily?: number
  metadata?: Record<string, any>
  description?: string
}

export function useAiProvider() {
  const [providers, setProviders] = useState<AiProvider[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 获取渠道商列表
  const fetchProviders = useCallback(async (options?: { active?: boolean }) => {
    setIsLoading(true)
    setError(null)

    try {
      const url = new URL('/api/admin/providers', window.location.origin)
      if (options?.active) url.searchParams.set('active', 'true')

      const response = await fetch(url)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch providers')
      }

      const data = await response.json()
      setProviders(data)
      return data
    } catch (err: any) {
      setError(err.message)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 创建渠道商
  const createProvider = useCallback(async (input: CreateAiProviderInput) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create provider')
      }

      const data = await response.json()
      setProviders(prev => [...prev, data])
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 更新渠道商
  const updateProvider = useCallback(async (id: string, input: UpdateAiProviderInput) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/providers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update provider')
      }

      const data = await response.json()
      setProviders(prev => prev.map(p => p.id === id ? data : p))
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 删除渠道商
  const deleteProvider = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/providers/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete provider')
      }

      setProviders(prev => prev.filter(p => p.id !== id))
      return true
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 切换渠道商状态
  const toggleProviderStatus = useCallback(async (id: string, isActive: boolean) => {
    return updateProvider(id, { isActive })
  }, [updateProvider])

  // 获取活跃渠道商
  const getActiveProviders = useCallback(async () => {
    return fetchProviders({ active: true })
  }, [fetchProviders])

  return {
    providers,
    isLoading,
    error,
    fetchProviders,
    createProvider,
    updateProvider,
    deleteProvider,
    toggleProviderStatus,
    getActiveProviders,
  }
}
