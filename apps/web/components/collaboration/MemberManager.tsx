/**
 * 项目成员管理面板
 */

'use client'

import { useState } from 'react'
import {
  UserPlus,
  MoreVertical,
  Shield,
  Pencil,
  Eye,
  UserX,
  Crown,
  Mail,
  Users,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useProjectMembers } from './hooks'
import { InviteDialog } from './InviteDialog'
import { OnlineIndicator } from './OnlineIndicator'
import type { ProjectRole } from './types'

interface MemberManagerProps {
  projectId: string
  currentUserRole?: ProjectRole
}

const ROLE_ICONS = {
  OWNER: Crown,
  EDITOR: Pencil,
  VIEWER: Eye,
}

const ROLE_LABELS = {
  OWNER: '所有者',
  EDITOR: '编辑者',
  VIEWER: '查看者',
}

const ROLE_BADGE_VARIANTS = {
  OWNER: 'default' as const,
  EDITOR: 'secondary' as const,
  VIEWER: 'outline' as const,
}

export function MemberManager({ projectId, currentUserRole = 'VIEWER' }: MemberManagerProps) {
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null)
  const { members, isLoading, updateMemberRole, removeMember, isUpdatingRole, isRemoving } =
    useProjectMembers(projectId)

  const canManage = currentUserRole === 'OWNER'
  const canEdit = currentUserRole === 'OWNER' || currentUserRole === 'EDITOR'

  const handleRoleChange = (userId: string, newRole: ProjectRole) => {
    updateMemberRole({ userId, role: newRole })
  }

  const handleRemoveMember = (userId: string) => {
    removeMember(userId)
    setShowRemoveConfirm(null)
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.slice(0, 2).toUpperCase()
    }
    return email.slice(0, 2).toUpperCase()
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
          <div className="h-9 w-24 bg-muted rounded animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 animate-pulse">
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-48 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">项目成员</h3>
          <Badge variant="secondary" className="ml-2">
            {members?.length || 0}
          </Badge>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            邀请成员
          </Button>
        )}
      </div>

      <Separator />

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-2">
          {members?.map((member) => {
            const RoleIcon = ROLE_ICONS[member.role]
            const isOwner = member.role === 'OWNER'
            const isCurrentUser = member.userId === 'current-user'

            return (
              <div
                key={member.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="relative">
                  <Avatar>
                    <AvatarImage src={member.user.avatar || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(member.user.name, member.user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <OnlineIndicator
                    userId={member.userId}
                    className="absolute -bottom-0.5 -right-0.5"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {member.user.name || member.user.email.split('@')[0]}
                    </span>
                    {isOwner && (
                      <Badge variant="default" className="h-5 px-1.5">
                        <Crown className="h-3 w-3 mr-1" />
                        所有者
                      </Badge>
                    )}
                    {isCurrentUser && (
                      <Badge variant="outline" className="h-5 px-1.5">
                        我
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{member.user.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canManage && !isOwner && !isCurrentUser ? (
                    <Select
                      value={member.role}
                      onValueChange={(value) => handleRoleChange(member.userId, value as ProjectRole)}
                      disabled={isUpdatingRole}
                    >
                      <SelectTrigger className="w-[120px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EDITOR">
                          <div className="flex items-center gap-2">
                            <Pencil className="h-4 w-4" />
                            编辑者
                          </div>
                        </SelectItem>
                        <SelectItem value="VIEWER">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            查看者
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={ROLE_BADGE_VARIANTS[member.role]} className="gap-1">
                      <RoleIcon className="h-3 w-3" />
                      {ROLE_LABELS[member.role]}
                    </Badge>
                  )}

                  {canManage && !isOwner && !isCurrentUser && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setShowRemoveConfirm(member.userId)}
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          移除成员
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </ScrollArea>

      <div className="text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            <span>所有者：完全控制</span>
          </div>
          <div className="flex items-center gap-1">
            <Pencil className="h-3 w-3" />
            <span>编辑者：可编辑内容</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            <span>查看者：仅查看</span>
          </div>
        </div>
      </div>

      <InviteDialog
        projectId={projectId}
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
      />

      <Dialog open={!!showRemoveConfirm} onOpenChange={() => setShowRemoveConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认移除成员</DialogTitle>
            <DialogDescription>
              此操作将移除该成员对项目的访问权限。成员将被通知他们已被移除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveConfirm(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => showRemoveConfirm && handleRemoveMember(showRemoveConfirm)}
              disabled={isRemoving}
            >
              {isRemoving ? '移除中...' : '确认移除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
