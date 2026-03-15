/**
 * AI Model 管理 Hook
 */

import { useState, useCallback } from 'react'

export interface AiModel {
  id: string
  providerId: string
  modelId: string
  name: string
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'VOICE'
  isEnabled: boolean
  isDefault: boolean
  maxTokens: number | null
  contextWindow: number | null
  inputCost: number | null
  outputCost: number | null
  imageCost: number | null
  videoCost: number | null
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateAiModelInput {
  providerId: string
  modelId: string
  name: string
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'VOICE'
  isEnabled?: boolean
  isDefault?: boolean
  maxTokens?: number | null
  contextWindow?: number | null
  inputCost?: number | null
  outputCost?: number | null
  imageCost?: number | null
  videoCost?: number | null
  description?: string | null
}

export interface UpdateAiModelInput {
  name?: string
  isEnabled?: boolean
  isDefault?: boolean
  maxTokens?: number | null
  contextWindow?: number | null
  inputCost?: number | null
  outputCost?: number | null
  imageCost?: number | null
  videoCost?: number | null
  description?: string | null
}

export function useAiModels() {
  const [models, setModels] = useState<AiModel[]>([])
  const [currentModel, setCurrentModel] = useState<AiModel | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 获取模型详情
  const fetchModel = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/ai-models/${id}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch model')
      }

      const data = await response.json()
      setCurrentModel(data)
      return data
    } catch (err: any) {
      setError(err.message)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 获取模型列表
  const fetchModels = useCallback(async (providerId?: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const url = new URL('/api/admin/ai-models', window.location.origin)
      if (providerId) {
        url.searchParams.set('providerId', providerId)
      }

      const response = await fetch(url)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch models')
      }

      const data = await response.json()
      setModels(data)
      return data
    } catch (err: any) {
      setError(err.message)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 创建模型
  const createModel = useCallback(async (input: CreateAiModelInput) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/ai-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create model')
      }

      const data = await response.json()
      setModels(prev => [...prev, data])
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 更新模型
  const updateModel = useCallback(async (id: string, input: UpdateAiModelInput) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/ai-models/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update model')
      }

      const data = await response.json()
      setModels(prev => prev.map(m => m.id === id ? data : m))
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 删除模型
  const deleteModel = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/ai-models/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete model')
      }

      setModels(prev => prev.filter(m => m.id !== id))
      return true
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 切换模型状态
  const toggleModelStatus = useCallback(async (id: string, isEnabled: boolean) => {
    return updateModel(id, { isEnabled })
  }, [updateModel])

  return {
    models,
    currentModel,
    isLoading,
    error,
    fetchModels,
    fetchModel,
    createModel,
    updateModel,
    deleteModel,
    toggleModelStatus,
  }
}
