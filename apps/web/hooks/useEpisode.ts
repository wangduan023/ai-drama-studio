'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Episode {
  id: string
  projectId: string
  name: string
  number: number
  novelText: string | null
  script: {
    id: string
    content: string
    characters: unknown
    scenes: unknown
    status: string
    createdAt: string
  } | null
  scriptStatus: string
  storyboardCount: number
  clipCount: number
  clips: {
    id: string
    sequence: number
    description: string | null
    duration: number | null
    status: string
  }[]
  characterAppearanceMap: unknown
  createdAt: string
  updatedAt: string
}

export interface CreateEpisodeInput {
  name: string
  novelText?: string
  number?: number
}

export interface UpdateEpisodeInput {
  name?: string
  novelText?: string
  number?: number
}

const queryKeys = {
  episodes: {
    all: ['episodes'] as const,
    list: (projectId: string) => [...queryKeys.episodes.all, 'list', projectId] as const,
    detail: (id: string) => [...queryKeys.episodes.all, 'detail', id] as const,
  },
}

/**
 * 获取项目的剧集列表
 */
export function useEpisodesByProject(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.episodes.list(projectId!),
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID is required')
      const response = await api.get<Episode[]>(`/api/projects/${projectId}/episodes`)
      return response
    },
    enabled: !!projectId,
  })
}

/**
 * 获取剧集详情
 */
export function useEpisode(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.episodes.detail(id!),
    queryFn: async () => {
      if (!id) throw new Error('Episode ID is required')
      const response = await api.get<Episode>(`/api/episodes/${id}`)
      return response
    },
    enabled: !!id,
  })
}

/**
 * 创建剧集
 */
export function useCreateEpisode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, input }: { projectId: string; input: CreateEpisodeInput }) => {
      const response = await api.post<Episode>(`/api/projects/${projectId}/episodes`, input)
      return response
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.episodes.list(variables.projectId) })
    },
  })
}

/**
 * 更新剧集
 */
export function useUpdateEpisode(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, input }: { projectId: string; input: UpdateEpisodeInput }) => {
      const response = await api.put<Episode>(`/api/episodes/${id}`, input)
      return response
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.episodes.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.episodes.list(variables.projectId) })
    },
  })
}

/**
 * 删除剧集
 */
export function useDeleteEpisode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, episodeId }: { projectId: string; episodeId: string }) => {
      await api.delete(`/api/episodes/${episodeId}`)
      return { projectId, episodeId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.episodes.list(data.projectId) })
      queryClient.removeQueries({ queryKey: queryKeys.episodes.detail(data.episodeId) })
    },
  })
}

export { queryKeys as episodeQueryKeys }
