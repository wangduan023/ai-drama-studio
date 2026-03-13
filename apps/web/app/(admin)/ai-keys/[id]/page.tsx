/**
 * AI Key Detail Page
 * AI 密钥详情页面
 */

'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAiKeys } from '@/hooks/useAiKeys'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CapabilityBadges, type ModelCapability } from '@/components/ai-keys/CapabilityBadges'
import { QuotaProgress } from '@/components/ai-keys/QuotaProgress'
import { ArrowLeft, Key, Activity, Clock } from 'lucide-react'

export default function AiKeyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { keys, toggleKeyStatus, deleteKey, isLoading } = useAiKeys()

  const key = keys.find(k => k.id === params.id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!key) {
    return (
      <div className="text-center py-12">
        <Key className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-900">密钥不存在</h2>
        <p className="text-gray-500 mt-2">该密钥可能已被删除</p>
        <Button onClick={() => router.push('/ai-keys')} className="mt-4">
          返回列表
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{key.name}</h1>
          <p className="text-gray-500">密钥详情与配置</p>
        </div>
      </div>

      {/* 基本信息卡片 */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Key className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{key.name}</h3>
                <Badge className={key.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                  {key.isActive ? '启用' : '禁用'}
                </Badge>
                {key.modelId ? (
                  <Badge variant="outline">专用密钥</Badge>
                ) : (
                  <Badge variant="secondary">通用密钥</Badge>
                )}
              </div>
              <p className="text-sm text-gray-500">渠道：{key.providerId}</p>
            </div>
          </div>

          {/* 配置信息 */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <span className="text-sm text-gray-500">优先级</span>
              <p className="font-medium text-lg">{key.priority}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">权重</span>
              <p className="font-medium text-lg">{key.weight}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">类型</span>
              <p className="font-medium text-lg">{key.modelId ? '模型专用' : '渠道通用'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 配额使用 */}
      {(key.quotaDaily || key.quotaUsed > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>配额使用</CardTitle>
          </CardHeader>
          <CardContent>
            <QuotaProgress
              used={key.quotaUsed}
              daily={key.quotaDaily}
              size="lg"
              showLabels
            />
          </CardContent>
        </Card>
      )}

      {/* 功能支持 */}
      {key.capabilities && key.capabilities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>功能支持</CardTitle>
          </CardHeader>
          <CardContent>
            <CapabilityBadges capabilities={key.capabilities as ModelCapability[]} size="lg" />
          </CardContent>
        </Card>
      )}

      {/* 统计信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            使用统计
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <span className="text-sm text-gray-500">成功次数</span>
            <p className="font-medium text-lg text-green-600">{key.successCount.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">失败次数</span>
            <p className="font-medium text-lg text-red-600">{key.failCount.toLocaleString()}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">最后使用</span>
            <p className="font-medium text-sm">
              {key.lastUsedAt
                ? new Date(key.lastUsedAt).toLocaleString()
                : '尚未使用'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => {
            if (confirm('确定要删除此密钥吗？')) {
              deleteKey(key.id)
              router.push('/ai-keys')
            }
          }}
          className="text-red-600 hover:text-red-700"
        >
          删除密钥
        </Button>
        <Button
          variant="outline"
          onClick={() => toggleKeyStatus(key.id, !key.isActive)}
        >
          {key.isActive ? '禁用' : '启用'}密钥
        </Button>
        <Button onClick={() => router.push(`/ai-keys/${key.id}/edit`)}>
          编辑配置
        </Button>
      </div>
    </div>
  )
}
