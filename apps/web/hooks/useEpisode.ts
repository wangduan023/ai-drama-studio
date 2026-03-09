'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Episode {
  id: string
  projectId: string
  title: string
  episodeNumber: number
  status: 'pending' | 'in_progress' | 'completed'
  duration?: number
  storyboardPanels: StoryboardPanel[]
  createdAt: string
  updatedAt: string
}

export interface StoryboardPanel {
  id: string
  episodeId: string
  sceneNumber: number
  description: string
  character?: string
  location?: string
  dialogue?: string
  imageUrl?: string | null
  videoUrl?: string | null
  status: 'pending' | 'generating' | 'completed' | 'failed'
}

const queryKeys = {
  episodes: {
    all: ['episodes'] as const,
    byProject: (projectId: string) => [...queryKeys.episodes.all, 'project', projectId] as const,
    detail: (id: string) => [...queryKeys.episodes.all, 'detail', id] as const,
    storyboards: (episodeId: string) => [...queryKeys.episodes.all, 'storyboards', episodeId] as const,
  },
}

/**
 * 获取项目的剧集列表
 */
export function useEpisodesByProject(projectId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.episodes.byProject(projectId!),
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
 * 获取分镜列表
 */
export function useStoryboards(episodeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.episodes.storyboards(episodeId!),
    queryFn: async () => {
      if (!episodeId) throw new Error('Episode ID is required')
      const response = await api.get<StoryboardPanel[]>(`/api/episodes/${episodeId}/storyboards`)
      return response
    },
    enabled: !!episodeId,
  })
}

/**
 * 创建剧集
 */
export function useCreateEpisode(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { title: string; episodeNumber?: number }) => {
      const response = await api.post<Episode>(`/api/projects/${projectId}/episodes`, input)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.episodes.byProject(projectId) })
    },
  })
}

/**
 * 更新分镜
 */
export function useUpdateStoryboard(panelId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Partial<StoryboardPanel>) => {
      const response = await api.put<StoryboardPanel>(`/api/storyboards/${panelId}`, input)
      return response
    },
    onSuccess: (_, variables) => {
      if (variables.episodeId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.episodes.storyboards(variables.episodeId) })
      }
    },
  })
}

/**
 * 生成图像
 */
export function useGenerateImage() {
  return useMutation({
    mutationFn: async (input: { panelId: string; prompt: string }) => {
      const response = await api.post<{ taskId: string }>('/api/generate/image', input)
      return response
    },
  })
}

/**
 * 生成视频
 */
export function useGenerateVideo() {
  return useMutation({
    mutationFn: async (input: { panelId: string; imageUrl: string; prompt: string }) => {
      const response = await api.post<{ taskId: string }>('/api/generate/video', input)
      return response
    },
  })
}

export { queryKeys as episodeQueryKeys }
