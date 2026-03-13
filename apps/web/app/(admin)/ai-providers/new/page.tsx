/**
 * New AI Provider Page
 * 新建渠道商页面
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAiProvider } from '@/hooks/useAiProvider'
import { AiProviderForm, type AiProviderFormData } from '@/components/ai-providers'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function NewAiProviderPage() {
  const router = useRouter()
  const { createProvider } = useAiProvider()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (data: AiProviderFormData) => {
    setIsSubmitting(true)

    try {
      await createProvider(data)
      router.push('/ai-providers')
    } catch (error) {
      console.error('Failed to create provider:', error)
    } finally {
      setIsSubmitting(false)
    }
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
          <h1 className="text-2xl font-bold">新建渠道</h1>
          <p className="text-gray-500">配置新的 AI 渠道商</p>
        </div>
      </div>

      <AiProviderForm
        onSubmit={handleSubmit}
        onCancel={() => router.push('/ai-providers')}
        isLoading={isSubmitting}
      />
    </div>
  )
}
