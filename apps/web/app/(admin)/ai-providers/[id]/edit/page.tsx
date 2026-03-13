/**
 * Edit AI Provider Page
 * 编辑渠道商页面
 */

'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useAiProvider, type AiProvider } from '@/hooks/useAiProvider'
import { AiProviderForm, type AiProviderFormData } from '@/components/ai-providers'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function EditAiProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { fetchProviders, updateProvider } = useAiProvider()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [provider, setProvider] = useState<AiProvider | null>(null)

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const response = await fetch(`/api/admin/providers/${resolvedParams.id}`)
        if (response.ok) {
          const data = await response.json()
          setProvider(data)
        }
      } catch (error) {
        console.error('Failed to fetch provider:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProvider()
  }, [resolvedParams.id])

  const handleSubmit = async (data: AiProviderFormData) => {
    setIsSubmitting(true)

    try {
      await updateProvider(resolvedParams.id, {
        baseUrl: data.baseUrl,
        ...(data.apiKey ? { apiKey: data.apiKey } : {}),
        isActive: data.isActive,
        priority: data.priority,
        weight: data.weight,
        ...(data.rateLimit !== undefined && data.rateLimit !== null ? { rateLimit: data.rateLimit } : {}),
        ...(data.quotaDaily !== undefined && data.quotaDaily !== null ? { quotaDaily: data.quotaDaily } : {}),
        ...(data.description !== undefined && data.description !== null ? { description: data.description } : {}),
      })
      router.push('/ai-providers')
    } catch (error) {
      console.error('Failed to update provider:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">渠道商不存在</h1>
        <Button>
          <Link href="/ai-providers">返回渠道列表</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* 页面头部 */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon">
          <Link href="/ai-providers">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">编辑渠道</h1>
          <p className="text-gray-500">修改渠道商配置</p>
        </div>
      </div>

      <AiProviderForm
        initialData={{
          id: provider.id,
          name: provider.name,
          baseUrl: provider.baseUrl,
          apiKey: '', // 不显示原有密钥
          isActive: provider.isActive,
          priority: provider.priority,
          weight: provider.weight,
          rateLimit: provider.rateLimit ?? undefined,
          quotaDaily: provider.quotaDaily ?? undefined,
          description: provider.description ?? undefined,
        }}
        onSubmit={handleSubmit}
        onCancel={() => router.push('/ai-providers')}
        isLoading={isSubmitting}
      />
    </div>
  )
}
