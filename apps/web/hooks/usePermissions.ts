'use client'

/**
 * 项目权限 Hook
 * 
 * 提供项目级别的权限查询和检查功能
 * 
 * 使用示例:
 * ```tsx
 * function ProjectPage({ projectId }: { projectId: string }) {
 *   const { canEdit, canManageMembers, isLoading } = useProjectPermissions(projectId)
 *   
 *   return (
 *     <div>
 *       {canEdit && <EditButton />}
 *       {canManageMembers && <MemberManager />}
 *     </div>
 *   )
 * }
 * ```
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { ProjectRole, ResourceType, checkPermission, hasMinimumRole } from '@/lib/permissions'
import { useAuth } from './useAuth'

/**
 * 项目角色响应类型
 */
interface ProjectRoleResponse {
  role: ProjectRole
  projectId: string
  isOwner: boolean
}

/**
 * Query Key 定义
 */
const permissionQueryKeys = {
  all: ['permissions'] as const,
  project: (projectId: string) => [...permissionQueryKeys.all, 'project', projectId] as const,
  role: (projectId: string) => [...permissionQueryKeys.project(projectId), 'role'] as const,
}

/**
 * 获取项目角色
 * @param projectId - 项目 ID
 * @returns 角色查询结果
 */
function useProjectRole(projectId: string) {
  return useQuery({
    queryKey: permissionQueryKeys.role(projectId),
    queryFn: async (): Promise<ProjectRoleResponse> => {
      const response = await fetch(`/api/projects/${projectId}/role`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('项目不存在')
        }
        if (response.status === 403) {
          throw new Error('没有访问权限')
        }
        throw new Error('获取角色失败')
      }
      
      return response.json()
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 分钟缓存
    retry: (failureCount, error) => {
      // 403 错误不重试
      if (error.message === '没有访问权限') return false
      return failureCount < 3
    },
  })
}

/**
 * 项目权限 Hook 返回类型
 */
export interface ProjectPermissions {
  /** 用户角色 */
  role: ProjectRole | null
  /** 是否是所有者 */
  isOwner: boolean
  /** 是否是编辑者（包括所有者） */
  isEditor: boolean
  /** 是否是查看者（包括所有角色） */
  isViewer: boolean
  /** 是否可以查看项目 */
  canView: boolean
  /** 是否可以编辑项目内容 */
  canEdit: boolean
  /** 是否可以删除项目 */
  canDelete: boolean
  /** 是否可以管理成员 */
  canManageMembers: boolean
  /** 是否可以邀请成员 */
  canInvite: boolean
  /** 是否可以导出项目 */
  canExport: boolean
  /** 是否可以管理项目设置 */
  canManageSettings: boolean
  /** 是否可以创建剧集 */
  canCreateEpisode: boolean
  /** 是否可以编辑剧集 */
  canEditEpisode: boolean
  /** 是否可以删除剧集 */
  canDeleteEpisode: boolean
  /** 是否可以创建角色 */
  canCreateCharacter: boolean
  /** 是否可以编辑角色 */
  canEditCharacter: boolean
  /** 是否可以删除角色 */
  canDeleteCharacter: boolean
  /** 是否可以创建场景 */
  canCreateLocation: boolean
  /** 是否可以编辑场景 */
  canEditLocation: boolean
  /** 是否可以删除场景 */
  canDeleteLocation: boolean
  /** 是否可以上传资源 */
  canUploadAsset: boolean
  /** 是否可以删除资源 */
  canDeleteAsset: boolean
  /** 是否可以创建任务 */
  canCreateTask: boolean
  /** 是否可以取消任务 */
  canCancelTask: boolean
  /** 是否可以发表评论 */
  canComment: boolean
  /** 检查特定权限 */
  checkPermission: (resource: ResourceType, action: string) => boolean
  /** 检查最低角色要求 */
  hasMinimumRole: (requiredRole: ProjectRole) => boolean
  /** 是否正在加载 */
  isLoading: boolean
  /** 是否发生错误 */
  isError: boolean
  /** 错误信息 */
  error: Error | null
  /** 刷新权限 */
  refresh: () => void
}

/**
 * 项目权限 Hook
 * 
 * @param projectId - 项目 ID
 * @returns 项目权限信息
 */
export function useProjectPermissions(projectId: string): ProjectPermissions {
  const { user, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  
  const { 
    data: roleData, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useProjectRole(projectId)
  
  const role = roleData?.role ?? null
  
  // 检查特定权限
  const checkPermissionFn = useCallback(
    (resource: ResourceType, action: string): boolean => {
      if (!role) return false
      return checkPermission(role, resource, action)
    },
    [role]
  )
  
  // 检查最低角色要求
  const hasMinimumRoleFn = useCallback(
    (requiredRole: ProjectRole): boolean => {
      if (!role) return false
      return hasMinimumRole(role, requiredRole)
    },
    [role]
  )
  
  // 刷新权限
  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ 
      queryKey: permissionQueryKeys.role(projectId) 
    })
  }, [queryClient, projectId])
  
  // 计算各种权限状态
  const isOwner = role === ProjectRole.OWNER
  const isEditor = role === ProjectRole.EDITOR || role === ProjectRole.OWNER
  const isViewer = !!role
  
  return {
    role,
    isOwner,
    isEditor,
    isViewer,
    // 项目权限
    canView: checkPermissionFn('PROJECT', 'VIEW'),
    canEdit: checkPermissionFn('PROJECT', 'EDIT'),
    canDelete: checkPermissionFn('PROJECT', 'DELETE'),
    canManageMembers: checkPermissionFn('PROJECT', 'MANAGE_MEMBERS'),
    canInvite: checkPermissionFn('PROJECT', 'INVITE'),
    canExport: checkPermissionFn('PROJECT', 'EXPORT'),
    canManageSettings: checkPermissionFn('PROJECT', 'SETTINGS'),
    // 剧集权限
    canCreateEpisode: checkPermissionFn('EPISODE', 'CREATE'),
    canEditEpisode: checkPermissionFn('EPISODE', 'EDIT'),
    canDeleteEpisode: checkPermissionFn('EPISODE', 'DELETE'),
    // 角色权限
    canCreateCharacter: checkPermissionFn('CHARACTER', 'CREATE'),
    canEditCharacter: checkPermissionFn('CHARACTER', 'EDIT'),
    canDeleteCharacter: checkPermissionFn('CHARACTER', 'DELETE'),
    // 场景权限
    canCreateLocation: checkPermissionFn('LOCATION', 'CREATE'),
    canEditLocation: checkPermissionFn('LOCATION', 'EDIT'),
    canDeleteLocation: checkPermissionFn('LOCATION', 'DELETE'),
    // 资源权限
    canUploadAsset: checkPermissionFn('ASSET', 'UPLOAD'),
    canDeleteAsset: checkPermissionFn('ASSET', 'DELETE'),
    // 任务权限
    canCreateTask: checkPermissionFn('TASK', 'CREATE'),
    canCancelTask: checkPermissionFn('TASK', 'CANCEL'),
    // 评论权限
    canComment: checkPermissionFn('COMMENT', 'CREATE'),
    // 方法
    checkPermission: checkPermissionFn,
    hasMinimumRole: hasMinimumRoleFn,
    // 状态
    isLoading: isLoading || !isAuthenticated,
    isError,
    error,
    refresh,
  }
}

/**
 * 批量项目权限 Hook
 * 用于同时获取多个项目的权限
 * 
 * @param projectIds - 项目 ID 列表
 * @returns 各项目的权限映射
 */
export function useMultipleProjectPermissions(projectIds: string[]) {
  const { user, isAuthenticated } = useAuth()
  
  const queries = useQuery({
    queryKey: [...permissionQueryKeys.all, 'projects', projectIds],
    queryFn: async (): Promise<Record<string, ProjectRoleResponse>> => {
      const results: Record<string, ProjectRoleResponse> = {}
      
      await Promise.all(
        projectIds.map(async (projectId) => {
          try {
            const response = await fetch(`/api/projects/${projectId}/role`, {
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              },
            })
            
            if (response.ok) {
              const data = await response.json()
              results[projectId] = data
            }
          } catch (error) {
            console.error(`Failed to fetch role for project ${projectId}:`, error)
          }
        })
      )
      
      return results
    },
    enabled: projectIds.length > 0 && isAuthenticated,
    staleTime: 5 * 60 * 1000,
  })
  
  return {
    permissions: queries.data ?? {},
    isLoading: queries.isLoading,
    isError: queries.isError,
    error: queries.error,
  }
}

/**
 * 快速权限检查 Hook
 * 用于简单的权限检查场景
 * 
 * @param projectId - 项目 ID
 * @param resource - 资源类型
 * @param action - 操作类型
 * @returns 是否有权限
 */
export function useHasPermission(
  projectId: string,
  resource: ResourceType,
  action: string
): boolean {
  const { checkPermission, isLoading } = useProjectPermissions(projectId)
  return !isLoading && checkPermission(resource, action)
}

// 导出 Query Keys，供其他模块使用
export { permissionQueryKeys }
