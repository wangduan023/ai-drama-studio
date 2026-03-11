/**
 * 协作功能自定义 Hooks
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { toast } from 'sonner'
import type {
  ProjectMember,
  Comment,
  Activity,
  OnlineUser,
  EditingState,
  SaveStatus,
  ProjectRole,
  ConflictData,
} from './types'

// 项目成员管理
export function useProjectMembers(projectId: string) {
  const queryClient = useQueryClient()

  const { data: members, isLoading } = useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      const response = await api.get<ProjectMember[]>(`/api/projects/${projectId}/members`)
      return response
    },
  })

  const inviteMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: ProjectRole }) => {
      const response = await api.post<ProjectMember>(`/api/projects/${projectId}/invite`, {
        email,
        role,
      })
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] })
      toast.success('邀请已发送')
    },
    onError: (error: Error) => {
      toast.error(error.message || '邀请发送失败')
    },
  })

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: ProjectRole }) => {
      await api.put(`/api/projects/${projectId}/members/${userId}/role`, { role })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] })
      toast.success('成员角色已更新')
    },
    onError: (error: Error) => {
      toast.error(error.message || '角色更新失败')
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/api/projects/${projectId}/members/${userId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-members', projectId] })
      toast.success('成员已移除')
    },
    onError: (error: Error) => {
      toast.error(error.message || '移除成员失败')
    },
  })

  return {
    members,
    isLoading,
    inviteMember: inviteMutation.mutate,
    updateMemberRole: updateRoleMutation.mutate,
    removeMember: removeMemberMutation.mutate,
    isInviting: inviteMutation.isPending,
    isUpdatingRole: updateRoleMutation.isPending,
    isRemoving: removeMemberMutation.isPending,
  }
}

// 评论管理
export function useComments(projectId: string, episodeId?: string) {
  const queryClient = useQueryClient()

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', projectId, episodeId],
    queryFn: async () => {
      const url = episodeId
        ? `/api/projects/${projectId}/episodes/${episodeId}/comments`
        : `/api/projects/${projectId}/comments`
      const response = await api.get<Comment[]>(url)
      return response
    },
  })

  const addCommentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const url = episodeId
        ? `/api/projects/${projectId}/episodes/${episodeId}/comments`
        : `/api/projects/${projectId}/comments`
      const response = await api.post<Comment>(url, { content, parentId })
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', projectId, episodeId] })
    },
    onError: (error: Error) => {
      toast.error(error.message || '评论发布失败')
    },
  })

  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      await api.put(`/api/comments/${commentId}`, { content })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', projectId, episodeId] })
      toast.success('评论已更新')
    },
    onError: (error: Error) => {
      toast.error(error.message || '评论更新失败')
    },
  })

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/api/comments/${commentId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', projectId, episodeId] })
      toast.success('评论已删除')
    },
    onError: (error: Error) => {
      toast.error(error.message || '评论删除失败')
    },
  })

  return {
    comments,
    isLoading,
    addComment: addCommentMutation.mutate,
    updateComment: updateCommentMutation.mutate,
    deleteComment: deleteCommentMutation.mutate,
    isAdding: addCommentMutation.isPending,
    isUpdating: updateCommentMutation.isPending,
    isDeleting: deleteCommentMutation.isPending,
  }
}

// 活动日志
export function useActivityLog(projectId: string, limit = 50) {
  const { data: activities, isLoading, fetchNextPage, hasNextPage } = useQuery({
    queryKey: ['activity-log', projectId, limit],
    queryFn: async () => {
      const response = await api.get<Activity[]>(`/api/projects/${projectId}/activities?limit=${limit}`)
      return response
    },
  })

  return {
    activities,
    isLoading,
    fetchNextPage,
    hasNextPage,
  }
}

// 在线用户
export function useOnlineUsers(projectId: string) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const connect = () => {
      const eventSource = new EventSource(
        `/api/projects/${projectId}/presence`
      )
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        setIsConnected(true)
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'users') {
            setOnlineUsers(data.users)
          } else if (data.type === 'update') {
            setOnlineUsers((prev) => {
              const filtered = prev.filter((u) => u.userId !== data.user.userId)
              if (data.user.status !== 'offline') {
                return [...filtered, data.user]
              }
              return filtered
            })
          }
        } catch {
          // 忽略解析错误
        }
      }

      eventSource.onerror = () => {
        setIsConnected(false)
        eventSource.close()
        // 5秒后重连
        setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      eventSourceRef.current?.close()
    }
  }, [projectId])

  return { onlineUsers, isConnected }
}

// 实时编辑状态
export function useEditingState(projectId: string) {
  const [editingStates, setEditingStates] = useState<EditingState[]>([])
  const [myEditingState, setMyEditingState] = useState<EditingState | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // 广播编辑状态
  const broadcastEditing = useCallback((resource: string, resourceId: string, isEditing: boolean) => {
    fetch(`/api/projects/${projectId}/editing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resource, resourceId, isEditing }),
    }).catch(() => {
      // 忽略错误
    })
  }, [projectId])

  useEffect(() => {
    const eventSource = new EventSource(`/api/projects/${projectId}/editing`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'editing') {
          setEditingStates(data.states)
        }
      } catch {
        // 忽略解析错误
      }
    }

    return () => {
      eventSource.close()
    }
  }, [projectId])

  const startEditing = useCallback((resource: string, resourceId: string) => {
    broadcastEditing(resource, resourceId, true)
    setMyEditingState({
      userId: 'current-user',
      user: { id: 'current-user', email: '', name: null, avatar: null },
      resource,
      resourceId,
      startedAt: new Date().toISOString(),
    })
  }, [broadcastEditing])

  const stopEditing = useCallback(() => {
    if (myEditingState) {
      broadcastEditing(myEditingState.resource, myEditingState.resourceId, false)
      setMyEditingState(null)
    }
  }, [broadcastEditing, myEditingState])

  return {
    editingStates,
    myEditingState,
    startEditing,
    stopEditing,
  }
}

// 保存状态管理
export function useSaveStatus() {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const timeoutRef = useRef<NodeJS.Timeout>()

  const setSaving = useCallback(() => {
    setSaveStatus('saving')
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  const setSaved = useCallback(() => {
    setSaveStatus('saved')
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  const setUnsaved = useCallback(() => {
    setSaveStatus('unsaved')
  }, [])

  const setError = useCallback(() => {
    setSaveStatus('error')
  }, [])

  const debouncedSave = useCallback((saveFn: () => Promise<void>) => {
    setSaving()
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(async () => {
      try {
        await saveFn()
        setSaved()
      } catch {
        setError()
      }
    }, 1000)
  }, [setSaving, setSaved, setError])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    saveStatus,
    setSaving,
    setSaved,
    setUnsaved,
    setError,
    debouncedSave,
  }
}

// 冲突检测
export function useConflictDetection() {
  const [conflict, setConflict] = useState<ConflictData | null>(null)

  const checkConflict = useCallback(async (
    resourceId: string,
    resourceType: string,
    localContent: string
  ): Promise<boolean> => {
    try {
      const response = await api.post<{ hasConflict: boolean; serverVersion?: ConflictData['serverVersion'] }>(
        `/api/conflicts/check`,
        { resourceId, resourceType, localContent }
      )
      
      if (response.hasConflict && response.serverVersion) {
        setConflict({
          resourceId,
          resourceType,
          localVersion: {
            content: localContent,
            timestamp: new Date().toISOString(),
            userId: 'current-user',
          },
          serverVersion: response.serverVersion,
        })
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  const resolveConflict = useCallback(async (resolution: 'local' | 'server' | 'merge', mergedContent?: string) => {
    if (!conflict) return

    try {
      await api.post('/api/conflicts/resolve', {
        resourceId: conflict.resourceId,
        resourceType: conflict.resourceType,
        resolution,
        mergedContent,
      })
      setConflict(null)
      toast.success('冲突已解决')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '冲突解决失败'
      toast.error(message)
    }
  }, [conflict])

  const clearConflict = useCallback(() => {
    setConflict(null)
  }, [])

  return {
    conflict,
    checkConflict,
    resolveConflict,
    clearConflict,
  }
}

// 剪贴板复制
export function useClipboard() {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('已复制到剪贴板')
      return true
    } catch {
      toast.error('复制失败')
      return false
    }
  }, [])

  return { copy, copied }
}
