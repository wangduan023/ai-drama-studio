/**
 * 协作组件导出
 */

// 类型定义
export * from './types'

// Hooks
export {
  useProjectMembers,
  useComments,
  useActivityLog,
  useOnlineUsers,
  useEditingState,
  useSaveStatus,
  useConflictDetection,
  useClipboard,
} from './hooks'

// 组件
export { MemberManager } from './MemberManager'
export { InviteDialog } from './InviteDialog'
export { CommentPanel, CommentButton } from './CommentPanel'
export { CommentItem } from './CommentItem'
export {
  OnlineIndicator,
  OnlineStatusBadge,
  OnlineUsersList,
  OnlineUsersDropdown,
} from './OnlineIndicator'
export {
  LiveEditingIndicator,
  EditingLock,
  UserCursors,
  SavingIndicator,
} from './LiveEditingIndicator'
export { ActivityLog, CompactActivityLog } from './ActivityLog'
export {
  PermissionGate,
  PermissionCheck,
  ReadOnlyBadge,
  PermissionBadge,
  PermissionGuard,
  DisableIfReadOnly,
  ConditionalRender,
} from './PermissionGate'
export { CollaborationBar, SimpleCollaborationStatus } from './CollaborationBar'
export { ShareDialog, QuickShareButton } from './ShareDialog'
export { ConflictDialog, ConflictWarning } from './ConflictDialog'
