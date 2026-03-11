'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

export interface Location {
  id: string
  projectId: string
  name: string
  description: string | null
  eraPeriod: string | null
  locationType: 'INDOOR' | 'OUTDOOR' | 'VIRTUAL' | 'TRANSITION' | null
  moodColor: string | null
  keyElements: string[]
  locationConfirmed: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateLocationInput {
  projectId: string
  name: string
  description?: string
  eraPeriod?: string
  locationType?: 'INDOOR' | 'OUTDOOR' | 'VIRTUAL' | 'TRANSITION'
  moodColor?: string
  keyElements?: string[]
}

export interface UpdateLocationInput {
  name?: string
  description?: string
  eraPeriod?: string
  locationType?: 'INDOOR' | 'OUTDOOR' | 'VIRTUAL' | 'TRANSITION'
  moodColor?: string
  keyElements?: string[]
}

const queryKeys = {
  locations: {
    all: ['locations'] as const,
    list: (projectId?: string) => 
      projectId 
        ? [...queryKeys.locations.all, 'list', 'project', projectId] as const
        : [...queryKeys.locations.all, 'list', 'all'] as const,
    detail: (id: string) => [...queryKeys.locations.all, 'detail', id] as const,
  },
}

/**
 * 获取场景列表
 * @param projectId - 项目ID，不传则获取所有场景
 */
export function useLocationList(projectId?: string) {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: queryKeys.locations.list(projectId),
    queryFn: async () => {
      const url = projectId 
        ? `/api/locations?projectId=${encodeURIComponent(projectId)}`
        : '/api/locations'
      const response = await api.get<Location[]>(url)
      return response
    },
    enabled: (projectId === undefined || !!projectId) && isAuthenticated,
  })
}

/**
 * 获取场景详情
 */
export function useLocation(id: string | undefined) {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: queryKeys.locations.detail(id!),
    queryFn: async () => {
      if (!id) throw new Error('Location ID is required')
      const response = await api.get<Location>(`/api/locations/${id}`)
      return response
    },
    enabled: !!id && isAuthenticated,
  })
}

/**
 * 创建场景
 */
export function useCreateLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateLocationInput) => {
      const response = await api.post<Location>('/api/locations', input)
      return response
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.list(variables.projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.list() })
    },
  })
}

/**
 * 更新场景
 */
export function useUpdateLocation(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateLocationInput) => {
      const response = await api.put<Location>(`/api/locations/${id}`, input)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.list() })
    },
  })
}

/**
 * 删除场景
 */
export function useDeleteLocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, locationId }: { projectId: string; locationId: string }) => {
      await api.delete(`/api/locations/${locationId}`)
      return { projectId, locationId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.list(data.projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.locations.list() })
      queryClient.removeQueries({ queryKey: queryKeys.locations.detail(data.locationId) })
    },
  })
}

export { queryKeys as locationQueryKeys }
