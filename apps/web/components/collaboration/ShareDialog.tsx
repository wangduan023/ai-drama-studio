/**
 * 分享对话框组件
 */

'use client'

import { useState } from 'react'
import {
  Share2,
  Link,
  Check,
  Copy,
  Globe,
  Lock,
  Mail,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { InviteDialog } from './InviteDialog'
import { useClipboard } from './hooks'
import { cn } from '@/lib/utils'

interface ShareDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Visibility = 'private' | 'public'

export function ShareDialog({ projectId, open, onOpenChange }: ShareDialogProps) {
  const [visibility, setVisibility] = useState<Visibility>('private')
  const [allowComments, setAllowComments] = useState(true)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const { copy, copied } = useClipboard()

  const projectUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/projects/${projectId}`
    : ''

  const readonlyUrl = `${projectUrl}?mode=readonly`

  const handleCopyLink = () => {
    copy(projectUrl)
  }

  const handleCopyReadonlyLink = () => {
    copy(readonlyUrl)
  }

  const handleVisibilityChange = (checked: boolean) => {
    setVisibility(checked ? 'public' : 'private')
    // 这里应该调用 API 更新项目可见性
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              分享项目
            </DialogTitle>
            <DialogDescription>
              控制项目的访问权限，邀请他人协作或生成分享链接。
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="link" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="link">
                <Link className="h-4 w-4 mr-2" />
                链接分享
              </TabsTrigger>
              <TabsTrigger value="invite">
                <Mail className="h-4 w-4 mr-2" />
                邀请成员
              </TabsTrigger>
            </TabsList>

            <TabsContent value="link" className="space-y-4">
              {/* 项目链接 */}
              <div className="space-y-2">
                <Label>项目链接</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={projectUrl}
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
              </div>

              {/* 只读链接 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>只读链接</Label>
                  <Badge variant="outline" className="text-xs">推荐</Badge>
                </div>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={readonlyUrl}
                    className="font-mono text-sm"
                  />
                  <Button onClick={handleCopyReadonlyLink} variant="outline" size="icon">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  此链接允许任何人查看项目，但无法编辑。
                </p>
              </div>

              <Separator />

              {/* 访问权限设置 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="visibility" className="flex items-center gap-2">
                      {visibility === 'public' ? (
                        <Globe className="h-4 w-4 text-green-500" />
                      ) : (
                        <Lock className="h-4 w-4 text-orange-500" />
                      )}
                      {visibility === 'public' ? '公开访问' : '私有项目'}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {visibility === 'public'
                        ? '任何人都可以查看此项目'
                        : '只有项目成员可以访问'}
                    </p>
                  </div>
                  <Switch
                    id="visibility"
                    checked={visibility === 'public'}
                    onCheckedChange={handleVisibilityChange}
                  />
                </div>

                {visibility === 'public' && (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="comments">允许评论</Label>
                      <p className="text-xs text-muted-foreground">
                        访客可以对项目发表评论
                      </p>
                    </div>
                    <Switch
                      id="comments"
                      checked={allowComments}
                      onCheckedChange={setAllowComments}
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button onClick={() => onOpenChange(false)}>完成</Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="invite" className="space-y-4">
              <div className="text-center py-8">
                <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h4 className="font-medium mb-2">邀请团队成员</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  通过邮件邀请他人协作编辑此项目
                </p>
                <Button onClick={() => setShowInviteDialog(true)}>
                  <Mail className="h-4 w-4 mr-2" />
                  发送邀请
                </Button>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="text-sm font-medium">权限说明</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge>所有者</Badge>
                    <span className="text-muted-foreground">完全控制项目，包括删除</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">编辑者</Badge>
                    <span className="text-muted-foreground">可以编辑内容和管理评论</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">查看者</Badge>
                    <span className="text-muted-foreground">只能查看项目内容</span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <InviteDialog
        projectId={projectId}
        open={showInviteDialog}
        onOpenChange={(open) => {
          setShowInviteDialog(open)
          if (!open) {
            onOpenChange(false)
          }
        }}
      />
    </>
  )
}

// 快速分享按钮
interface QuickShareButtonProps {
  projectId: string
  className?: string
}

export function QuickShareButton({ projectId, className }: QuickShareButtonProps) {
  const [open, setOpen] = useState(false)
  const { copy } = useClipboard()

  const handleQuickShare = () => {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/projects/${projectId}`
      : ''
    copy(url)
  }

  return (
    <>
      <div className={cn('flex items-center gap-1', className)}>
        <Button variant="ghost" size="icon-sm" onClick={handleQuickShare}>
          <Link className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)}>
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
      <ShareDialog projectId={projectId} open={open} onOpenChange={setOpen} />
    </>
  )
}
