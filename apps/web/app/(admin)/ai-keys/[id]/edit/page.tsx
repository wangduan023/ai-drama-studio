/**
 * Edit AI Key Page
 * 编辑 AI 密钥页面
 */

'use client'

import { useParams, useRouter } from 'next/navigation'
import { AiKeyForm, type AiKeyFormData } from '@/components/ai-keys/AiKeyForm'
import { useAiKeys } from '@/hooks/useAiKeys'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function EditAiKeyPage() {
  const params = useParams()
  const router = useRouter()
  const { keys, updateKey, isLoading } = useAiKeys()

  const key = keys.find(k => k.id === params.id)

  const initialData = key ? {
    id: key.id,
    providerId: key.providerId,
    modelId: key.modelId || null,
    name: key.name,
    apiKey: '', // 不显示原有密钥
    apiSecret: '',
    isActive: key.isActive,
    priority: key.priority,
    weight: key.weight,
    quotaDaily: key.quotaDaily,
    proxyId: key.proxyId || null,
  } : undefined

  const handleSubmit = async (data: AiKeyFormData) => {
    if (!key) return
    // 保留原有密钥值，如果新密钥为空
    const submitData = {
      ...data,
      apiKey: data.apiKey || key.apiKey,
    }
    await updateKey(key.id, submitData)
    router.push('/ai-keys')
  }

  if (!key) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">密钥不存在</h2>
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
          <h1 className="text-2xl font-bold text-gray-900">编辑密钥</h1>
          <p className="text-gray-500">修改 {key.name} 的配置</p>
        </div>
      </div>

      <AiKeyForm
        initialData={initialData}
        providers={[]}
        models={[]}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isLoading={isLoading}
      />
    </div>
  )
}
