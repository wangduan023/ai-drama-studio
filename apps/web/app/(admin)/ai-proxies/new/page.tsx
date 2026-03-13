/**
 * New Proxy Page
 * 新建代理页面
 */

'use client'

import { useRouter } from 'next/navigation'
import { ProxyForm, type ProxyFormData } from '@/components/ai-proxies/ProxyForm'
import { useAiProxy } from '@/hooks/useAiProxy'

export default function NewProxyPage() {
  const router = useRouter()
  const { createProxy, isLoading } = useAiProxy()

  const handleSubmit = async (data: ProxyFormData) => {
    await createProxy(data)
    router.push('/ai-proxies')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">新建代理</h1>
        <p className="text-gray-500 mt-1">添加 HTTP/HTTPS/SOCKS5 代理服务器</p>
      </div>

      <ProxyForm
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isLoading={isLoading}
      />
    </div>
  )
}
