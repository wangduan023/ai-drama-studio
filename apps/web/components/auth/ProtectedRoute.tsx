'use client'

/**
 * 受保护路由组件
 * 客户端组件，用于包裹需要认证的页面内容
 * 检查用户是否已认证，未认证时显示登录提示或重定向
 */

import React, { useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

/**
 * 组件 Props
 */
export interface ProtectedRouteProps {
  /** 子组件 */
  children: React.ReactNode
  /** 可选的加载状态组件 */
  fallback?: React.ReactNode
  /** 未认证时重定向路径，默认 /login */
  redirectTo?: string
  /** 是否显示登录提示而不是直接重定向 */
  showLoginPrompt?: boolean
}

/**
 * 默认加载状态组件
 */
function DefaultLoadingState(): React.ReactElement {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">验证中...</p>
      </div>
    </div>
  )
}

/**
 * 登录提示组件
 */
function LoginPrompt({ redirectTo }: { redirectTo: string }): React.ReactElement {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogin = (): void => {
    const returnUrl = encodeURIComponent(pathname)
    router.push(`${redirectTo}?returnUrl=${returnUrl}`)
  }

  const handleGoHome = (): void => {
    router.push('/')
  }

  return (
    <div className="flex min-h-[400px] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle>需要登录</CardTitle>
          <CardDescription>
            此页面需要登录后才能访问。请登录您的账户或返回首页。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={handleLogin} className="w-full">
            前往登录
          </Button>
          <Button variant="outline" onClick={handleGoHome} className="w-full">
            返回首页
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * 受保护路由组件
 * 
 * 使用示例:
 * ```tsx
 * // 直接包裹页面内容
 * export default function DashboardPage() {
 *   return (
 *     <ProtectedRoute>
 *       <DashboardContent />
 *     </ProtectedRoute>
 *   )
 * }
 * 
 * // 使用自定义加载状态
 * <ProtectedRoute fallback={<CustomSpinner />}>
 *   <DashboardContent />
 * </ProtectedRoute>
 * 
 * // 显示登录提示而不是重定向
 * <ProtectedRoute showLoginPrompt>
 *   <DashboardContent />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
  children,
  fallback,
  redirectTo = '/login',
  showLoginPrompt = false,
}: ProtectedRouteProps): React.ReactElement {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isAuthenticated, isLoading, user } = useAuth()

  useEffect(() => {
    console.log('[ProtectedRoute] Auth state:', { pathname, isLoading, isAuthenticated, userEmail: user?.email })
    
    // 如果认证检查完成且未认证，执行重定向
    if (!isLoading && !isAuthenticated && !showLoginPrompt) {
      console.log('[ProtectedRoute] Redirecting to login:', pathname)
      const returnUrl = encodeURIComponent(pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ''))
      router.push(`${redirectTo}?returnUrl=${returnUrl}`)
    }
  }, [isLoading, isAuthenticated, showLoginPrompt, redirectTo, pathname, searchParams, router, user])

  // 加载中状态
  if (isLoading) {
    return <>{fallback || <DefaultLoadingState />}</>
  }

  // 未认证且显示登录提示
  if (!isAuthenticated && showLoginPrompt) {
    return <LoginPrompt redirectTo={redirectTo} />
  }

  // 未认证且不显示提示（等待重定向）
  if (!isAuthenticated) {
    return <>{fallback || <DefaultLoadingState />}</>
  }

  // 已认证，渲染子组件
  return <>{children}</>
}

export default ProtectedRoute
