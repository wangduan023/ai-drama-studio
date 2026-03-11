'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 bg-background text-foreground">
          <h2 className="text-2xl font-bold">应用程序错误</h2>
          <p className="text-center text-muted-foreground max-w-md">
            {error.message || '遇到了一个严重错误'}
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground">
              错误 ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            重试
          </button>
        </div>
      </body>
    </html>
  )
}
