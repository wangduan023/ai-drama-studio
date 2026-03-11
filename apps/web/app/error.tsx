'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-2xl font-bold">出错了</h2>
      <p className="text-center text-muted-foreground max-w-md">
        {error.message || '应用程序遇到了一个错误'}
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground">
          错误 ID: {error.digest}
        </p>
      )}
      <div className="flex gap-2">
        <Button onClick={reset} variant="default">
          重试
        </Button>
        <Button onClick={() => window.location.href = '/'} variant="outline">
          返回首页
        </Button>
      </div>
    </div>
  )
}
