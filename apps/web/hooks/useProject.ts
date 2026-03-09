'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Project {
  id: string
  title: string
  description: string
  novel?: string
  status: 'in_progress' | 'completed'
  episodeCount: number
  characterCount: number
  locationCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateProjectInput {
  title: string
  description?: string
  novel?: string
}

export interface UpdateProjectInput {
  title?: string
  description?: string
  novel?: string
  status?: 'in_progress' | 'completed'
}

const queryKeys = {
  projects: {
    all: ['projects'] as const,
    list: () => [...queryKeys.projects.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.projects.all, 'detail', id] as const,
  },
}

/**
 * 获取项目列表
 */
export function useProjectList() {
  return useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: async () => {
      const response = await api.get<Project[]>('/api/projects')
      return response
    },
  })
}

/**
 * 获取项目详情
 */
export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.projects.detail(id!),
    queryFn: async () => {
      if (!id) throw new Error('Project ID is required')
      const response = await api.get<Project>(`/api/projects/${id}`)
      return response
    },
    enabled: !!id,
  })
}

/**
 * 创建项目
 */
export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const response = await api.post<Project>('/api/projects', input)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() })
    },
  })
}

/**
 * 更新项目
 */
export function useUpdateProject(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateProjectInput) => {
      const response = await api.put<Project>(`/api/projects/${id}`, input)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() })
    },
  })
}

/**
 * 删除项目
 */
export function useDeleteProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/projects/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.list() })
    },
  })
}

export { queryKeys as projectQueryKeys }
