'use client'

/**
 * 认证守卫组件
 * 高阶组件/包装组件，用于条件渲染
 * 支持按角色限制访问
 */

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, AlertTriangle } from 'lucide-react'
import { UserRole } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { hasRequiredRole, hasMinimumRole, getRoleLevel } from '@/lib/auth/middleware'

/**
 * 用户类型
 */
interface User {
  id: string
  email: string
  name?: string | null
  role: UserRole
}

/**
 * AuthGuard 组件 Props
 */
export interface AuthGuardProps {
  /** 子组件 */
  children: React.ReactNode
  /** 允许访问的角色列表 */
  allowedRoles?: UserRole[]
  /** 最低角色要求（优先级低于 allowedRoles） */
  minRole?: UserRole
  /** 需要认证（默认 true） */
  requireAuth?: boolean
  /** 无权限时显示的内容 */
  fallback?: React.ReactNode
  /** 无权限时重定向到指定路径 */
  redirectTo?: string
  /** 是否显示无权限提示 */
  showForbiddenPrompt?: boolean
}

/**
 * 默认无权限提示组件
 */
function DefaultForbiddenPrompt({ redirectTo = '/dashboard' }: { redirectTo?: string }): React.ReactElement {
  const router = useRouter()

  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Shield className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>访问被拒绝</CardTitle>
          <CardDescription>
            您没有权限访问此页面。如需访问，请联系管理员提升账户权限。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={() => router.push(redirectTo)} className="w-full">
            返回安全页面
          </Button>
          <Button variant="outline" onClick={() => router.push('/')} className="w-full">
            返回首页
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * 未认证提示组件
 */
function UnauthenticatedPrompt(): React.ReactElement {
  const router = useRouter()

  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <AlertTriangle className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>需要登录</CardTitle>
          <CardDescription>
            此页面需要登录后才能访问。请登录您的账户。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={() => router.push('/login')} className="w-full">
            前往登录
          </Button>
          <Button variant="outline" onClick={() => router.push('/')} className="w-full">
            返回首页
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * 认证守卫组件
 * 
 * 使用示例:
 * ```tsx
 * // 基本用法 - 仅需要登录
 * <AuthGuard>
 *   <AdminContent />
 * </AuthGuard>
 * 
 * // 按角色限制访问
 * <AuthGuard allowedRoles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
 *   <AdminContent />
 * </AuthGuard>
 * 
 * // 使用最低角色要求
 * <AuthGuard minRole={UserRole.PREMIUM}>
 *   <PremiumContent />
 * </AuthGuard>
 * 
 * // 自定义无权限显示内容
 * <AuthGuard 
 *   allowedRoles={[UserRole.ADMIN]}
 *   fallback={<CustomNoAccessMessage />}
 * >
 *   <AdminContent />
 * </AuthGuard>
 * 
 * // 无权限时重定向
 * <AuthGuard 
 *   allowedRoles={[UserRole.ADMIN]}
 *   redirectTo="/unauthorized"
 * >
 *   <AdminContent />
 * </AuthGuard>
 * ```
 */
export function AuthGuard({
  children,
  allowedRoles,
  minRole,
  requireAuth = true,
  fallback,
  redirectTo,
  showForbiddenPrompt = true,
}: AuthGuardProps): React.ReactElement {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    const checkAuthAndRole = async (): Promise<void> => {
      try {
        // 获取当前用户信息
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          const currentUser: User = data.user
          setUser(currentUser)

          // 检查角色权限
          let accessGranted = false
          if (allowedRoles && allowedRoles.length > 0) {
            accessGranted = hasRequiredRole(currentUser, allowedRoles)
          } else if (minRole) {
            accessGranted = hasMinimumRole(currentUser, minRole)
          } else {
            // 只需要认证，不需要特定角色
            accessGranted = true
          }

          setHasAccess(accessGranted)
        } else {
          setUser(null)
          setHasAccess(false)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        setUser(null)
        setHasAccess(false)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthAndRole()
  }, [allowedRoles, minRole])

  useEffect(() => {
    // 如果不需要认证，直接通过
    if (!requireAuth) {
      setHasAccess(true)
      setIsLoading(false)
      return
    }

    // 检查完成后，如果需要重定向
    if (!isLoading && !hasAccess && redirectTo && user) {
      // 已登录但无权限，重定向
      router.push(redirectTo)
    }
  }, [isLoading, hasAccess, redirectTo, user, requireAuth, router])

  // 加载中状态
  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">检查权限...</p>
        </div>
      </div>
    )
  }

  // 不需要认证
  if (!requireAuth) {
    return <>{children}</>
  }

  // 未认证
  if (!user) {
    return <UnauthenticatedPrompt />
  }

  // 无权限
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }
    if (showForbiddenPrompt) {
      return <DefaultForbiddenPrompt redirectTo={redirectTo} />
    }
    if (redirectTo) {
      // 等待重定向
      return (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">正在跳转...</p>
          </div>
        </div>
      )
    }
    return null
  }

  // 有权限，渲染子组件
  return <>{children}</>
}

/**
 * 角色守卫组件 - 简化版，仅用于角色检查
 * 
 * 使用示例:
 * ```tsx
 * <RoleGuard roles={[UserRole.ADMIN, UserRole.SUPER_ADMIN]}>
 *   <AdminOnlyContent />
 * </RoleGuard>
 * ```
 */
export interface RoleGuardProps {
  children: React.ReactNode
  roles: UserRole[]
  fallback?: React.ReactNode
}

export function RoleGuard({ children, roles, fallback }: RoleGuardProps): React.ReactElement {
  return (
    <AuthGuard allowedRoles={roles} fallback={fallback}>
      {children}
    </AuthGuard>
  )
}

/**
 * 管理员守卫组件
 * 
 * 使用示例:
 * ```tsx
 * <AdminGuard>
 *   <AdminPanel />
 * </AdminGuard>
 * ```
 */
export interface AdminGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  superAdminOnly?: boolean
}

export function AdminGuard({ children, fallback, superAdminOnly = false }: AdminGuardProps): React.ReactElement {
  const allowedRoles = superAdminOnly
    ? [UserRole.SUPER_ADMIN]
    : [UserRole.ADMIN, UserRole.SUPER_ADMIN]

  return (
    <AuthGuard allowedRoles={allowedRoles} fallback={fallback}>
      {children}
    </AuthGuard>
  )
}

/**
 * 付费用户守卫组件
 * 
 * 使用示例:
 * ```tsx
 * <PremiumGuard>
 *   <PremiumFeature />
 * </PremiumGuard>
 * ```
 */
export interface PremiumGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PremiumGuard({ children, fallback }: PremiumGuardProps): React.ReactElement {
  return (
    <AuthGuard minRole={UserRole.PREMIUM} fallback={fallback}>
      {children}
    </AuthGuard>
  )
}

/**
 * 使用认证守卫的 Hook
 * 用于在组件内部检查权限
 */
export function useAuthGuard(): {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  hasRole: (roles: UserRole[]) => boolean
  hasMinRole: (minRole: UserRole) => boolean
  isAdmin: boolean
  isSuperAdmin: boolean
  isPremium: boolean
} {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async (): Promise<void> => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const hasRole = (roles: UserRole[]): boolean => {
    return hasRequiredRole(user, roles)
  }

  const hasMinRole = (minRole: UserRole): boolean => {
    return hasMinimumRole(user, minRole)
  }

  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN
  const isPremium = user ? getRoleLevel(user.role) >= getRoleLevel(UserRole.PREMIUM) : false

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    hasRole,
    hasMinRole,
    isAdmin,
    isSuperAdmin,
    isPremium,
  }
}

export default AuthGuard
