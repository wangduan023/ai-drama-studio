/**
 * AI API Key 管理 Hook
 */

import { useState, useCallback, useEffect } from 'react'

export interface AiApiKey {
  id: string
  providerId: string
  modelId: string | null
  name: string
  apiKey: string
  capabilities: string[] | null
  proxyMode: 'AUTO' | 'SPECIFIC' | 'NONE'
  proxyId: string | null
  priority: number
  weight: number
  isActive: boolean
  quotaDaily: number | null
  quotaUsed: number
  successCount: number
  failCount: number
  lastUsedAt: string | null
  lastErrorAt: string | null
  description: string | null
  createdAt: string
}

export interface CreateAiKeyInput {
  providerId: string
  modelId?: string | null
  name: string
  apiKey: string
  apiSecret?: string | null
  capabilities?: string[]
  proxyMode?: 'AUTO' | 'SPECIFIC' | 'NONE'
  proxyId?: string | null
  priority?: number
  weight?: number
  quotaDaily?: number | null
  description?: string | null
}

export interface UpdateAiKeyInput {
  name?: string
  apiKey?: string
  apiSecret?: string | null
  capabilities?: string[]
  isActive?: boolean
  proxyMode?: 'AUTO' | 'SPECIFIC' | 'NONE'
  proxyId?: string | null
  priority?: number
  weight?: number
  quotaDaily?: number | null
  description?: string | null
}

export function useAiKeys() {
  const [keys, setKeys] = useState<AiApiKey[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 获取密钥列表
  const fetchKeys = useCallback(async (providerId?: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const url = new URL('/api/admin/ai-keys', window.location.origin)
      if (providerId) {
        url.searchParams.set('providerId', providerId)
      }
      
      const response = await fetch(url)
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch keys')
      }
      
      const data = await response.json()
      setKeys(data)
      return data
    } catch (err: any) {
      setError(err.message)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 创建密钥
  const createKey = useCallback(async (input: CreateAiKeyInput) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/admin/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create key')
      }
      
      const data = await response.json()
      setKeys(prev => [...prev, data])
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 更新密钥
  const updateKey = useCallback(async (id: string, input: UpdateAiKeyInput) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/admin/ai-keys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update key')
      }
      
      const data = await response.json()
      setKeys(prev => prev.map(k => k.id === id ? data : k))
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 删除密钥
  const deleteKey = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/admin/ai-keys/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete key')
      }
      
      setKeys(prev => prev.filter(k => k.id !== id))
      return true
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 切换密钥状态
  const toggleKeyStatus = useCallback(async (id: string, isActive: boolean) => {
    return updateKey(id, { isActive })
  }, [updateKey])

  return {
    keys,
    isLoading,
    error,
    fetchKeys,
    createKey,
    updateKey,
    deleteKey,
    toggleKeyStatus,
  }
}
