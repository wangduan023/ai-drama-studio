/**
 * 认证组件统一导出
 * 
 * @module auth-components
 * 
 * 包含以下组件:
 * - ProtectedRoute: 受保护路由包装组件
 * - AuthGuard: 认证守卫组件（支持角色权限）
 * - RoleGuard: 角色守卫组件
 * - AdminGuard: 管理员守卫组件
 * - PremiumGuard: 付费用户守卫组件
 */

// 主组件
export { ProtectedRoute, useProtectedRoute } from './ProtectedRoute'
export {
  AuthGuard,
  RoleGuard,
  AdminGuard,
  PremiumGuard,
  useAuthGuard,
} from './AuthGuard'

// 类型导出
export type { ProtectedRouteProps } from './ProtectedRoute'
export type { AuthGuardProps, RoleGuardProps, AdminGuardProps, PremiumGuardProps } from './AuthGuard'
