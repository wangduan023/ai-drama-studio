'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

/**
 * React Query Provider
 * 包装应用以提供全局缓存能力
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 数据在 5 秒内认为是新鲜的，不会重新请求
            staleTime: 5000,
            // 缓存数据保留 10 分钟
            gcTime: 10 * 60 * 1000,
            // 窗口聚焦时自动刷新
            refetchOnWindowFocus: true,
            // 网络恢复时自动刷新
            refetchOnReconnect: true,
            // 失败后重试 1 次
            retry: 1,
            // 重试延迟
            retryDelay: 1000,
          },
          mutations: {
            // mutation 不重试
            retry: 0,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
