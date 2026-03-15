/**
 * Edit Proxy Page
 * 编辑代理页面
 */

'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { ProxyForm, type ProxyFormData } from '@/components/ai-proxies/ProxyForm'
import { useAiProxy } from '@/hooks/useAiProxy'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function EditProxyPage() {
  const params = useParams()
  const router = useRouter()
  const { proxies, updateProxy, isLoading, fetchProxies } = useAiProxy()

  // 加载代理数据
  useEffect(() => {
    fetchProxies()
  }, [])

  const proxy = proxies.find(p => p.id === params.id)

  const initialData = proxy ? {
    id: proxy.id,
    name: proxy.name,
    protocol: proxy.protocol,
    host: proxy.host,
    port: proxy.port,
    username: proxy.username || undefined,
    // 密码不返回，留空让用户输入新密码
    password: undefined,
    location: proxy.location || undefined,
    provider: proxy.provider || undefined,
    isActive: proxy.isActive,
    maxConcurrent: proxy.maxConcurrent,
    description: proxy.description || undefined,
  } : undefined

  const handleSubmit = async (data: ProxyFormData) => {
    if (!proxy) return
    await updateProxy(proxy.id, data)
    router.push('/ai-proxies')
  }

  if (!proxy) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">代理不存在</h2>
        <Button onClick={() => router.back()} className="mt-4">
          返回
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">编辑代理</h1>
          <p className="text-gray-500">修改 {proxy.name} 的配置</p>
        </div>
      </div>

      <ProxyForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isLoading={isLoading}
      />
    </div>
  )
}
