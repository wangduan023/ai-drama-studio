/**
 * 邀请对话框
 */

'use client'

import { useState } from 'react'
import { Mail, Link, Check, Copy, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useProjectMembers, useClipboard } from './hooks'
import type { ProjectRole } from './types'

interface InviteDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ROLE_DESCRIPTIONS = {
  EDITOR: '可以编辑项目内容、创建和修改剧集',
  VIEWER: '只能查看项目内容，无法编辑',
}

export function InviteDialog({ projectId, open, onOpenChange }: InviteDialogProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ProjectRole>('EDITOR')
  const [emails, setEmails] = useState<string[]>([])
  const { inviteMember, isInviting } = useProjectMembers(projectId)
  const { copy, copied } = useClipboard()

  const handleAddEmail = () => {
    if (email && !emails.includes(email) && email.includes('@')) {
      setEmails([...emails, email])
      setEmail('')
    }
  }

  const handleRemoveEmail = (emailToRemove: string) => {
    setEmails(emails.filter((e) => e !== emailToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddEmail()
    }
    if (e.key === 'Backspace' && !email && emails.length > 0) {
      setEmails(emails.slice(0, -1))
    }
  }

  const handleSendInvites = async () => {
    if (emails.length === 0 && email) {
      await inviteMember({ email, role })
    } else {
      for (const email of emails) {
        await inviteMember({ email, role })
      }
    }
    setEmails([])
    setEmail('')
    onOpenChange(false)
  }

  const generateInviteLink = () => {
    const baseUrl = window.location.origin
    return `${baseUrl}/join/${projectId}?role=${role.toLowerCase()}`
  }

  const handleCopyLink = () => {
    copy(generateInviteLink())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            邀请成员
          </DialogTitle>
          <DialogDescription>
            邀请他人协作编辑此项目。被邀请者将收到邮件通知。
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">
              <Mail className="h-4 w-4 mr-2" />
              邮件邀请
            </TabsTrigger>
            <TabsTrigger value="link">
              <Link className="h-4 w-4 mr-2" />
              邀请链接
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4">
            <div className="space-y-2">
              <Label>角色权限</Label>
              <Select value={role} onValueChange={(v) => setRole(v as ProjectRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EDITOR">编辑者</SelectItem>
                  <SelectItem value="VIEWER">查看者</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {ROLE_DESCRIPTIONS[role]}
              </p>
            </div>

            <div className="space-y-2">
              <Label>邮箱地址</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="输入邮箱地址，按 Enter 添加"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  type="email"
                />
                <Button type="button" onClick={handleAddEmail} size="icon">
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {emails.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
                {emails.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1">
                    {email}
                    <button
                      onClick={() => handleRemoveEmail(email)}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button
                onClick={handleSendInvites}
                disabled={isInviting || (emails.length === 0 && !email)}
              >
                {isInviting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    发送中...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    发送邀请
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="link" className="space-y-4">
            <div className="space-y-2">
              <Label>链接权限</Label>
              <Select value={role} onValueChange={(v) => setRole(v as ProjectRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EDITOR">编辑者</SelectItem>
                  <SelectItem value="VIEWER">查看者</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {ROLE_DESCRIPTIONS[role]}
              </p>
            </div>

            <div className="space-y-2">
              <Label>邀请链接</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={generateInviteLink()}
                  className="font-mono text-sm"
                />
                <Button onClick={handleCopyLink} variant="outline" size="icon">
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                任何拥有此链接的人都可以加入项目。链接有效期为 7 天。
              </p>
            </div>

            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>完成</Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
