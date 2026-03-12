'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DebugInfo {
  cookies: string
  authApiResponse: unknown
  error?: string
}

export default function DebugAuthPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [loading, setLoading] = useState(false)

  const checkAuth = async () => {
    setLoading(true)
    try {
      // 获取所有 cookies
      const cookies = document.cookie

      // 调用 auth/me API
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      setDebugInfo({
        cookies: cookies || '(no cookies)',
        authApiResponse: {
          status: response.status,
          statusText: response.statusText,
          data,
        },
      })
    } catch (error) {
      setDebugInfo({
        cookies: document.cookie || '(no cookies)',
        authApiResponse: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">认证调试页面</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>调试信息</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={checkAuth} disabled={loading} className="mb-4">
            {loading ? '检查中...' : '重新检查'}
          </Button>
          
          {debugInfo && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Cookies:</h3>
                <pre className="bg-muted p-4 rounded text-sm overflow-auto">
                  {debugInfo.cookies}
                </pre>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Auth API Response:</h3>
                <pre className="bg-muted p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(debugInfo.authApiResponse, null, 2)}
                </pre>
              </div>
              
              {debugInfo.error && (
                <div>
                  <h3 className="font-semibold mb-2 text-red-500">Error:</h3>
                  <pre className="bg-red-50 p-4 rounded text-sm overflow-auto text-red-700">
                    {debugInfo.error}
                  </pre>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>常见问题</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>1. 如果 Cookies 为空，说明登录时 cookie 没有正确设置</p>
          <p>2. 如果 Auth API 返回 401，说明 cookie 中的 token 无效或过期</p>
          <p>3. 确保浏览器允许第三方 cookies（开发环境）</p>
        </CardContent>
      </Card>
    </div>
  )
}
