/**
 * Unified RBAC Hook
 * 统一权限控制 Hook
 * 
 * 支持系统级和项目级权限检查
 * 使用全局缓存避免重复请求
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'

export interface Permission {
  resource: string
  action: string
}

export interface RBACPermissions {
  system: Permission[]
  projects: Record<string, Permission[]>
}

// 全局缓存
const globalCache: Map<string, { data: RBACPermissions; timestamp: number }> = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存

// 获取缓存键
const getCacheKey = (userId: string | undefined, projectId: string | undefined) => {
  return `${userId || 'anonymous'}:${projectId || 'global'}`
}

export function useRBAC(projectId?: string) {
  const { user, isAuthenticated } = useAuth()
  const [permissions, setPermissions] = useState<RBACPermissions | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const cacheKeyRef = useRef<string>('')

  // 获取用户权限
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setPermissions(null)
      setIsLoading(false)
      return
    }

    const cacheKey = getCacheKey(user.id, projectId)
    cacheKeyRef.current = cacheKey

    // 检查缓存
    const cached = globalCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('[useRBAC] Using cached permissions for:', cacheKey)
      setPermissions(cached.data)
      setIsLoading(false)
      return
    }

    const fetchPermissions = async () => {
      try {
        const url = projectId
          ? `/api/rbac/permissions?projectId=${projectId}`
          : '/api/rbac/permissions'
        
        console.log('[useRBAC] Fetching permissions for:', cacheKey)
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          setPermissions(data)
          // 更新全局缓存
          globalCache.set(cacheKey, { data, timestamp: Date.now() })
        }
      } catch (error) {
        console.error('Failed to fetch permissions:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPermissions()
  }, [isAuthenticated, user?.id, projectId])

  /**
   * 检查权限
   * 完全依赖数据库配置的权限，无硬编码
   */
  const checkPermission = useCallback((
    resource: string,
    action: string,
    ctxProjectId?: string
  ): boolean => {
    if (!permissions) return false

    const targetProjectId = ctxProjectId || projectId

    // 1. 检查通配符权限 (*:*)
    const hasWildcard = permissions.system.some(
      p => p.resource === '*' && p.action === '*'
    )
    if (hasWildcard) return true

    // 2. 检查系统级权限
    const hasSystemPermission = permissions.system.some(
      p => p.resource === resource && p.action === action
    )
    if (hasSystemPermission) return true

    // 3. 检查项目级权限
    if (targetProjectId && permissions.projects[targetProjectId]) {
      const hasProjectPermission = permissions.projects[targetProjectId].some(
        p => p.resource === resource && p.action === action
      )
      if (hasProjectPermission) return true
    }

    return false
  }, [permissions, projectId])

  /**
   * 简写方法
   */
  const can = useCallback((
    resource: string,
    action: string,
    ctxProjectId?: string
  ): boolean => {
    return checkPermission(resource, action, ctxProjectId)
  }, [checkPermission])

  /**
   * 检查是否有任意一个权限
   */
  const canAny = useCallback((
    permissions: Array<{ resource: string; action: string }>,
    ctxProjectId?: string
  ): boolean => {
    return permissions.some(p => checkPermission(p.resource, p.action, ctxProjectId))
  }, [checkPermission])

  /**
   * 检查是否拥有所有权限
   */
  const canAll = useCallback((
    permissions: Array<{ resource: string; action: string }>,
    ctxProjectId?: string
  ): boolean => {
    return permissions.every(p => checkPermission(p.resource, p.action, ctxProjectId))
  }, [checkPermission])

  return {
    permissions,
    isLoading,
    checkPermission,
    can,
    canAny,
    canAll,
  }
}

/**
 * 使用系统级权限的便捷 Hook
 */
export function useSystemPermissions() {
  return useRBAC()
}

/**
 * 使用项目级权限的便捷 Hook
 */
export function useProjectPermissions(projectId: string) {
  return useRBAC(projectId)
}

/**
 * 清除权限缓存
 * 在权限变更后调用以刷新
 */
export function clearRBACCache(userId?: string) {
  if (userId) {
    // 清除特定用户的缓存
    for (const key of globalCache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        globalCache.delete(key)
      }
    }
  } else {
    // 清除所有缓存
    globalCache.clear()
  }
}
