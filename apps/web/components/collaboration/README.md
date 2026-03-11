# AI Drama Studio - 协作组件

本目录包含 AI Drama Studio 项目的完整协作功能前端组件。

## 组件列表

### 1. MemberManager - 成员管理面板
管理项目成员，包括邀请、角色修改和移除功能。

```tsx
import { MemberManager } from '@/components/collaboration'

function ProjectSettings() {
  return (
    <MemberManager 
      projectId="project-123" 
      currentUserRole="OWNER" 
    />
  )
}
```

### 2. InviteDialog - 邀请对话框
通过邮件或链接邀请新成员。

```tsx
import { InviteDialog } from '@/components/collaboration'

function ProjectPage() {
  const [open, setOpen] = useState(false)
  
  return (
    <InviteDialog
      projectId="project-123"
      open={open}
      onOpenChange={setOpen}
    />
  )
}
```

### 3. CommentPanel & CommentItem - 评论系统
支持嵌套回复的评论面板和单条评论组件。

```tsx
import { CommentPanel, CommentButton } from '@/components/collaboration'

function EpisodePage() {
  const [showComments, setShowComments] = useState(false)
  
  return (
    <>
      <CommentButton
        projectId="project-123"
        episodeId="episode-456"
        commentCount={5}
        onClick={() => setShowComments(true)}
      />
      
      <CommentPanel
        projectId="project-123"
        episodeId="episode-456"
        open={showComments}
        onOpenChange={setShowComments}
        currentUserId="user-789"
      />
    </>
  )
}
```

### 4. OnlineIndicator - 在线状态指示器
显示用户在线状态和在线用户列表。

```tsx
import { 
  OnlineIndicator, 
  OnlineUsersList,
  OnlineStatusBadge 
} from '@/components/collaboration'

function UserCard({ userId }: { userId: string }) {
  return (
    <div className="flex items-center gap-2">
      <Avatar>
        <AvatarImage src="..." />
        <AvatarFallback>U</AvatarFallback>
      </Avatar>
      <OnlineIndicator userId={userId} />
    </div>
  )
}

function ProjectHeader({ projectId }: { projectId: string }) {
  return (
    <OnlineUsersList 
      projectId={projectId} 
      maxDisplay={3}
      showTooltip={true}
    />
  )
}
```

### 5. LiveEditingIndicator - 实时编辑指示器
显示谁正在编辑内容和保存状态。

```tsx
import { 
  LiveEditingIndicator,
  EditingLock,
  SavingIndicator 
} from '@/components/collaboration'

function ScriptEditor({ episodeId }: { episodeId: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <LiveEditingIndicator
          resource="episode"
          resourceId={episodeId}
          projectId="project-123"
        />
        <SavingIndicator status="saved" />
      </div>
      
      <EditingLock
        resource="episode"
        resourceId={episodeId}
        projectId="project-123"
      />
      
      {/* 编辑器内容 */}
    </div>
  )
}
```

### 6. ActivityLog - 活动日志
显示项目活动历史记录。

```tsx
import { ActivityLog, CompactActivityLog } from '@/components/collaboration'

function ProjectDashboard() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <ActivityLog 
        projectId="project-123" 
        limit={50} 
      />
    </div>
  )
}

function Sidebar() {
  return (
    <CompactActivityLog 
      projectId="project-123" 
      limit={10} 
    />
  )
}
```

### 7. PermissionGate - 权限控制
基于用户权限条件渲染内容。

```tsx
import { 
  PermissionGate, 
  ReadOnlyBadge,
  PermissionBadge,
  PermissionGuard 
} from '@/components/collaboration'

function EpisodeEditor({ projectId }: { projectId: string }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1>剧本编辑</h1>
        <ReadOnlyBadge projectId={projectId} />
      </div>
      
      <PermissionGate 
        projectId={projectId} 
        permission="edit"
        fallback={<p>您只有查看权限</p>}
      >
        <ScriptEditor />
      </PermissionGate>
      
      <PermissionGuard 
        projectId={projectId} 
        requiredPermission="manage" 
      />
    </div>
  )
}
```

### 8. CollaborationBar - 协作状态栏
固定在底部的协作状态栏。

```tsx
import { CollaborationBar } from '@/components/collaboration'

function ProjectLayout({ children, projectId }: { 
  children: React.ReactNode
  projectId: string 
}) {
  return (
    <div>
      {children}
      <CollaborationBar 
        projectId={projectId}
        episodeId="episode-456"
      />
    </div>
  )
}
```

### 9. ShareDialog - 分享对话框
项目分享和可见性设置。

```tsx
import { ShareDialog, QuickShareButton } from '@/components/collaboration'

function ProjectHeader({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false)
  
  return (
    <>
      <QuickShareButton projectId={projectId} />
      
      <ShareDialog
        projectId={projectId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
```

### 10. ConflictDialog - 冲突解决
内容冲突检测和解决对话框。

```tsx
import { ConflictDialog, ConflictWarning } from '@/components/collaboration'

function EditorWithConflict() {
  const [conflict, setConflict] = useState<ConflictData | null>(null)
  const [showConflictDialog, setShowConflictDialog] = useState(false)
  
  return (
    <div>
      {conflict && (
        <ConflictWarning 
          onResolve={() => setShowConflictDialog(true)} 
        />
      )}
      
      <ConflictDialog
        conflict={conflict}
        open={showConflictDialog}
        onOpenChange={setShowConflictDialog}
        onResolve={(resolution, mergedContent) => {
          // 处理冲突解决
        }}
      />
    </div>
  )
}
```

## Hooks

### useProjectMembers
管理项目成员。

```tsx
const { 
  members, 
  isLoading, 
  inviteMember, 
  updateMemberRole, 
  removeMember 
} = useProjectMembers(projectId)
```

### useComments
管理评论。

```tsx
const { 
  comments, 
  isLoading, 
  addComment, 
  updateComment, 
  deleteComment 
} = useComments(projectId, episodeId)
```

### useOnlineUsers
获取在线用户列表。

```tsx
const { onlineUsers, isConnected } = useOnlineUsers(projectId)
```

### useEditingState
管理实时编辑状态。

```tsx
const { 
  editingStates, 
  startEditing, 
  stopEditing 
} = useEditingState(projectId)
```

### useSaveStatus
管理保存状态。

```tsx
const { saveStatus, debouncedSave } = useSaveStatus()
```

### useConflictDetection
冲突检测和解决。

```tsx
const { 
  conflict, 
  checkConflict, 
  resolveConflict 
} = useConflictDetection()
```

### useClipboard
剪贴板操作。

```tsx
const { copy, copied } = useClipboard()
```

## 类型定义

```ts
import type { 
  ProjectRole,
  OnlineStatus,
  User,
  ProjectMember,
  Comment,
  Activity,
  ActivityAction,
  OnlineUser,
  EditingState,
  SaveStatus,
  Permission,
  ConflictData 
} from '@/components/collaboration'
```

## 主题支持

所有组件都支持 shadcn/ui 的主题系统，自动适配亮色/暗色模式。

## 依赖

- @base-ui/react
- @tanstack/react-query
- lucide-react
- date-fns
- sonner
- tailwindcss
