/**
 * 权限管理系统
 * 
 * AI Drama Studio 的项目级别权限控制系统
 * 
 * 功能模块:
 * - 角色层级管理
 * - 权限检查
 * - API 中间件
 * - 审计日志
 * 
 * 使用示例:
 * ```typescript
 * // 1. 权限检查
 * import { checkPermission, ProjectRole } from '@/lib/permissions'
 * 
 * if (checkPermission(userRole, 'EPISODE', 'CREATE')) {
 *   // 允许创建剧集
 * }
 * 
 * // 2. Hook 使用
 * import { useProjectPermissions } from '@/hooks/usePermissions'
 * 
 * const { canEdit, canManageMembers } = useProjectPermissions(projectId)
 * 
 * // 3. 组件权限控制
 * import { PermissionGuard } from '@/components/permissions/PermissionGuard'
 * 
 * <PermissionGuard projectId={id} permission="edit">
 *   <EditButton />
 * </PermissionGuard>
 * 
 * // 4. API 中间件
 * import { requireProjectRole } from '@/lib/permissions/middleware'
 * 
 * const result = await requireProjectRole(request, projectId, ProjectRole.EDITOR)
 * ```
 */

// ============================================
// 核心权限功能
// ============================================

export {
  // 角色层级
  ROLE_HIERARCHY,
  ROLE_DISPLAY_NAMES,
  ROLE_DESCRIPTIONS,
  
  // 角色工具函数
  hasMinimumRole,
  compareRoles,
  getHigherRole,
  getLowerRole,
  
  // 权限定义
  PERMISSIONS,
  
  // 权限检查
  checkPermission,
  checkPermissions,
  checkAnyPermission,
  getUserPermissions,
  
  // 权限守卫
  validatePermissionGuard,
  
  // 项目成员
  isProjectMember,
  getUserProjectRole,
  
  // 类型和枚举
  ProjectRole,
  type ResourceType,
  type ActionType,
  type PermissionGuardConfig,
  type ProjectMemberInfo,
} from './core'

// ============================================
// 中间件
// ============================================

export {
  // 权限验证
  requireProjectRole,
  requireProjectOwner,
  requireProjectEditor,
  requireProjectViewer,
  requireProjectMember,
  
  // HOF 包装器
  withProjectPermission,
  withProjectOwner,
  withProjectEditor,
  withProjectViewer,
  
  // 工具函数
  checkProjectAccess,
  hasMinimumRole as middlewareHasMinimumRole,
  ROLE_HIERARCHY as middlewareRoleHierarchy,
  
  // 类型
  type PermissionValidationResult,
  type AuthUser,
  type ProjectInfo,
  type ProjectMemberInfo as MiddlewareProjectMemberInfo,
} from './middleware'

// ============================================
// 审计日志
// ============================================

export {
  // 日志记录
  logAccess,
  logAccessBatch,
  logSensitiveAction,
  logPermissionDenied,
  
  // 日志查询
  queryAccessLogs,
  
  // 中间件
  createAuditMiddleware,
  
  // 常量
  SensitiveActions,
  ResourceTypes,
  
  // 类型
  type AccessLogData,
  type LogAccessOptions,
  type SensitiveActionType,
  type ResourceTypeValue,
} from './audit'
