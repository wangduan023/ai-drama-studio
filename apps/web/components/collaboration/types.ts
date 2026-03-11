/**
 * 协作组件类型定义
 */

export type ProjectRole = 'OWNER' | 'EDITOR' | 'VIEWER'

export type OnlineStatus = 'online' | 'away' | 'offline'

export interface User {
  id: string
  email: string
  name: string | null
  avatar: string | null
}

export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  role: ProjectRole
  invitedBy: string | null
  joinedAt: string
  updatedAt: string
  user: User
  isOnline?: boolean
}

export interface Comment {
  id: string
  projectId: string
  episodeId?: string
  userId: string
  content: string
  parentId?: string
  createdAt: string
  updatedAt: string
  user: User
  replies?: Comment[]
}

export interface Activity {
  id: string
  projectId: string
  userId: string | null
  action: ActivityAction
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
  createdAt: string
  user?: User
}

export type ActivityAction =
  | 'project_created'
  | 'project_updated'
  | 'project_deleted'
  | 'member_joined'
  | 'member_left'
  | 'member_role_changed'
  | 'episode_created'
  | 'episode_updated'
  | 'episode_deleted'
  | 'script_generated'
  | 'image_generated'
  | 'video_generated'
  | 'comment_added'
  | 'comment_deleted'

export interface OnlineUser {
  userId: string
  user: User
  status: OnlineStatus
  lastSeen: string
  cursorPosition?: {
    x: number
    y: number
  }
}

export interface EditingState {
  userId: string
  user: User
  resource: string
  resourceId: string
  startedAt: string
}

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

export type Permission = 'view' | 'edit' | 'manage'

export const ROLE_PERMISSIONS: Record<ProjectRole, Permission[]> = {
  OWNER: ['view', 'edit', 'manage'],
  EDITOR: ['view', 'edit'],
  VIEWER: ['view'],
}

export interface ConflictData {
  resourceId: string
  resourceType: string
  localVersion: {
    content: string
    timestamp: string
    userId: string
  }
  serverVersion: {
    content: string
    timestamp: string
    userId: string
    user: User
  }
}
