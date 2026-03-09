/**
 * 项目相关类型
 */
export interface Project {
  id: string
  title: string
  description: string
  novel?: string
  status: ProjectStatus
  episodeCount: number
  characterCount: number
  locationCount: number
  coverImage?: string | null
  createdAt: string
  updatedAt: string
}

export type ProjectStatus = 'in_progress' | 'completed' | 'archived'

export interface CreateProjectInput {
  title: string
  description?: string
  novel?: string
}

export interface UpdateProjectInput {
  title?: string
  description?: string
  novel?: string
  status?: ProjectStatus
}

/**
 * 剧集相关类型
 */
export interface Episode {
  id: string
  projectId: string
  title: string
  episodeNumber: number
  description?: string
  status: EpisodeStatus
  duration?: number
  coverImage?: string | null
  createdAt: string
  updatedAt: string
}

export type EpisodeStatus = 'pending' | 'in_progress' | 'completed' | 'failed'

export interface CreateEpisodeInput {
  title: string
  episodeNumber?: number
  description?: string
}

export interface UpdateEpisodeInput {
  title?: string
  description?: string
  status?: EpisodeStatus
}

/**
 * 分镜相关类型
 */
export interface StoryboardPanel {
  id: string
  episodeId: string
  sceneNumber: number
  shotNumber?: number
  description: string
  character?: string | null
  location?: string | null
  dialogue?: string | null
  narration?: string | null
  imageUrl?: string | null
  videoUrl?: string | null
  prompt?: string | null
  negativePrompt?: string | null
  status: TaskStatus
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

/**
 * 角色相关类型
 */
export interface Character {
  id: string
  projectId: string
  name: string
  role: string
  description?: string | null
  profileImage?: string | null
  voiceId?: string | null
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface CreateCharacterInput {
  name: string
  role: string
  description?: string
  profileImage?: string
}

export interface UpdateCharacterInput {
  name?: string
  role?: string
  description?: string
  profileImage?: string
  voiceId?: string
}

/**
 * 场景相关类型
 */
export interface Location {
  id: string
  projectId: string
  name: string
  type: string
  description?: string | null
  images?: string[]
  createdAt: string
  updatedAt: string
}

export interface CreateLocationInput {
  name: string
  type: string
  description?: string
}

export interface UpdateLocationInput {
  name?: string
  type?: string
  description?: string
  images?: string[]
}

/**
 * 任务相关类型
 */
export type TaskStatus = 'pending' | 'queued' | 'processing' | 'completed' | 'failed'

export interface Task {
  id: string
  type: TaskType
  status: TaskStatus
  progress: number
  error?: string | null
  result?: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
  completedAt?: string | null
}

export type TaskType =
  | 'generate_image'
  | 'generate_video'
  | 'generate_voice'
  | 'generate_script'
  | 'generate_storyboard'

/**
 * 通用类型
 */
export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiResponse<T> {
  data: T
  message?: string
}
