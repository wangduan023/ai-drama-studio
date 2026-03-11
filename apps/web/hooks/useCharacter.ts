'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Character {
  id: string
  projectId: string
  name: string
  roleLevel: 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | null
  introduction: string | null
  aliases: string[]
  gender: string | null
  ageRange: string | null
  archetype: string | null
  personalityTags: string[]
  eraPeriod: string | null
  socialClass: string | null
  occupation: string | null
  costumeTier: string | null
  suggestedColors: string[]
  primaryIdentifier: string | null
  visualKeywords: string[]
  expectedAppearances: number | null
  profileConfirmed: boolean
  appearanceCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateCharacterInput {
  projectId: string
  name: string
  roleLevel?: 'S' | 'A' | 'B' | 'C' | 'D' | 'E'
  introduction?: string
  aliases?: string[]
  gender?: string
  ageRange?: string
  archetype?: string
  personalityTags?: string[]
  eraPeriod?: string
  socialClass?: string
  occupation?: string
  costumeTier?: string
  suggestedColors?: string[]
  primaryIdentifier?: string
  visualKeywords?: string[]
  expectedAppearances?: number
}

export interface UpdateCharacterInput {
  name?: string
  roleLevel?: 'S' | 'A' | 'B' | 'C' | 'D' | 'E'
  introduction?: string
  aliases?: string[]
  gender?: string
  ageRange?: string
  archetype?: string
  personalityTags?: string[]
  eraPeriod?: string
  socialClass?: string
  occupation?: string
  costumeTier?: string
  suggestedColors?: string[]
  primaryIdentifier?: string
  visualKeywords?: string[]
  expectedAppearances?: number
}

const queryKeys = {
  characters: {
    all: ['characters'] as const,
    list: (projectId?: string) => 
      projectId 
        ? [...queryKeys.characters.all, 'list', 'project', projectId] as const
        : [...queryKeys.characters.all, 'list', 'all'] as const,
    detail: (id: string) => [...queryKeys.characters.all, 'detail', id] as const,
  },
}

/**
 * 获取角色列表
 * @param projectId - 项目ID，不传则获取所有角色（通过查询参数）
 */
export function useCharacterList(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.characters.list(projectId),
    queryFn: async () => {
      // API 需要 projectId 作为查询参数
      const url = projectId 
        ? `/api/characters?projectId=${encodeURIComponent(projectId)}`
        : '/api/characters'
      const response = await api.get<Character[]>(url)
      return response
    },
    enabled: projectId === undefined || !!projectId,
  })
}

/**
 * 获取角色详情
 */
export function useCharacter(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.characters.detail(id!),
    queryFn: async () => {
      if (!id) throw new Error('Character ID is required')
      const response = await api.get<Character>(`/api/characters/${id}`)
      return response
    },
    enabled: !!id,
  })
}

/**
 * 创建角色
 */
export function useCreateCharacter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateCharacterInput) => {
      const response = await api.post<Character>('/api/characters', input)
      return response
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.characters.list(variables.projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.characters.list() })
    },
  })
}

/**
 * 更新角色
 */
export function useUpdateCharacter(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateCharacterInput) => {
      const response = await api.put<Character>(`/api/characters/${id}`, input)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.characters.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.characters.list() })
    },
  })
}

/**
 * 删除角色
 */
export function useDeleteCharacter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, characterId }: { projectId: string; characterId: string }) => {
      await api.delete(`/api/characters/${characterId}`)
      return { projectId, characterId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.characters.list(data.projectId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.characters.list() })
      queryClient.removeQueries({ queryKey: queryKeys.characters.detail(data.characterId) })
    },
  })
}

export { queryKeys as characterQueryKeys }
