/**
 * AI 生成 Hook
 */

import { useState, useCallback, useRef } from 'react'

export interface GenerateTextParams {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  temperature?: number
  maxTokens?: number
  topP?: number
}

export interface GenerateImageParams {
  prompt: string
  negativePrompt?: string
  width?: number
  height?: number
  style?: string
}

export interface GenerateOptions {
  stream?: boolean
  timeout?: number
  retries?: number
}

export interface StreamEvent {
  type: 'start' | 'data' | 'done' | 'error'
  content?: string
  finishReason?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  error?: string
}

export function useAiGenerate() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<unknown>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // 生成文本
  const generateText = useCallback(async (
    providerId: string,
    modelId: string | undefined,
    params: GenerateTextParams,
    options?: GenerateOptions,
    projectId?: string
  ) => {
    setIsGenerating(true)
    setError(null)
    
    try {
      const url = new URL('/api/ai/generate', window.location.origin)
      if (projectId) {
        url.searchParams.set('projectId', projectId)
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          modelId,
          type: 'text',
          params,
          options,
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Generation failed')
      }
      
      const data = await response.json()
      setResult(data.result)
      return data.result
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsGenerating(false)
    }
  }, [])

  // 流式生成文本
  const generateTextStream = useCallback(async (
    providerId: string,
    modelId: string | undefined,
    params: GenerateTextParams,
    onEvent: (event: StreamEvent) => void,
    options?: GenerateOptions,
    projectId?: string
  ) => {
    setIsGenerating(true)
    setError(null)
    
    // 创建新的 AbortController
    abortControllerRef.current = new AbortController()
    
    try {
      const url = new URL('/api/ai/generate/stream', window.location.origin)
      if (projectId) {
        url.searchParams.set('projectId', projectId)
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          modelId,
          params,
          options,
        }),
        signal: abortControllerRef.current.signal,
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Stream generation failed')
      }
      
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }
      
      const decoder = new TextDecoder()
      let buffer = ''
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event: StreamEvent = JSON.parse(line.slice(6))
              onEvent(event)
              
              if (event.type === 'done' || event.type === 'error') {
                setIsGenerating(false)
                return
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        onEvent({ type: 'error', error: 'Generation cancelled' })
      } else {
        setError(err.message)
        onEvent({ type: 'error', error: err.message })
      }
    } finally {
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }, [])

  // 生成图片
  const generateImage = useCallback(async (
    providerId: string,
    modelId: string | undefined,
    params: GenerateImageParams,
    options?: GenerateOptions,
    projectId?: string
  ) => {
    setIsGenerating(true)
    setError(null)
    
    try {
      const url = new URL('/api/ai/generate', window.location.origin)
      if (projectId) {
        url.searchParams.set('projectId', projectId)
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId,
          modelId,
          type: 'image',
          params,
          options,
        }),
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Image generation failed')
      }
      
      const data = await response.json()
      setResult(data.result)
      return data.result
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setIsGenerating(false)
    }
  }, [])

  // 取消生成
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsGenerating(false)
    }
  }, [])

  return {
    isGenerating,
    error,
    result,
    generateText,
    generateTextStream,
    generateImage,
    cancelGeneration,
  }
}
