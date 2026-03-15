/**
 * AI Models Management Page
 * 模型管理列表页
 */

'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAiModels } from '@/hooks/useAiModels'
import { useConfirm } from '@/components/providers/ConfirmProvider'
import { RBACButton } from '@/components/rbac'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Cpu,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export default function AiModelsPage() {
  const router = useRouter()
  const { models, isLoading, fetchModels, toggleModelStatus, deleteModel } = useAiModels()
  const confirm = useConfirm()
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchModels()
  }, [])

  const filteredModels = models.filter(model =>
    model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    model.modelId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    model.providerId.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      TEXT: 'bg-blue-100 text-blue-700',
      IMAGE: 'bg-purple-100 text-purple-700',
      VIDEO: 'bg-red-100 text-red-700',
      VOICE: 'bg-green-100 text-green-700',
    }
    return <Badge className={colors[type] || 'bg-gray-100 text-gray-700'}>{type}</Badge>
  }

  const getStatusBadge = (isEnabled: boolean) => {
    return isEnabled
      ? <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="w-3 h-3 mr-1" />启用</Badge>
      : <Badge className="bg-gray-100 text-gray-700"><XCircle className="w-3 h-3 mr-1" />禁用</Badge>
  }

  const getModelCost = (model: any) => {
    if (model.type === 'TEXT') {
      return model.inputCost ? `$${model.inputCost}/1K` : '免费'
    }
    if (model.type === 'IMAGE') {
      return model.imageCost ? `$${model.imageCost}/张` : '免费'
    }
    if (model.type === 'VIDEO') {
      return model.videoCost ? `$${model.videoCost}/个` : '免费'
    }
    return '免费'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">模型管理</h1>
          <p className="text-gray-500 mt-1">管理 AI 模型配置</p>
        </div>

        <RBACButton resource="ai_model" action="create">
          <Link href="/ai-models/new">
            <Plus className="w-4 h-4 mr-2" />
            新建模型
          </Link>
        </RBACButton>
      </div>

      {/* 搜索栏 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索模型名称或 ID..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 模型列表 */}
      <div className="grid gap-4">
        {filteredModels.map((model) => (
          <Card key={model.id} className={!model.isEnabled ? 'opacity-60' : ''}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Cpu className="w-5 h-5 text-blue-600" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{model.name}</h3>
                      {getStatusBadge(model.isEnabled)}
                      {model.isDefault && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700">默认</Badge>
                      )}
                    </div>

                    <p className="text-sm text-gray-500">
                      {model.providerId} / {model.modelId}
                    </p>

                    <div className="flex gap-2 mt-2">
                      {getTypeBadge(model.type)}
                      {model.contextWindow && (
                        <Badge variant="secondary" className="text-xs">
                          上下文：{(model.contextWindow / 1000).toFixed(0)}K
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {getModelCost(model)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <RBACButton
                    resource="ai_model"
                    action="update"
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleModelStatus(model.id, !model.isEnabled)}
                    title={model.isEnabled ? '禁用' : '启用'}
                  >
                    {model.isEnabled ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-gray-600" />
                    )}
                  </RBACButton>

                  <RBACButton
                    resource="ai_model"
                    action="update"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      router.push(`/ai-models/${model.id}/edit`)
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </RBACButton>

                  <RBACButton
                    resource="ai_model"
                    action="delete"
                    variant="ghost"
                    size="icon"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => {
                      confirm({
                        title: '删除确认',
                        message: `确定要删除模型 "${model.name}" 吗？此操作不可恢复。`,
                        confirmText: '删除',
                        cancelText: '取消',
                        onConfirm: async () => {
                          try {
                            await deleteModel(model.id)
                            toast.success('删除成功', {
                              description: `模型 "${model.name}" 已被删除`,
                            })
                          } catch (error: any) {
                            toast.error('删除失败', {
                              description: error.message || '请稍后重试',
                            })
                          }
                        },
                      })
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </RBACButton>
                </div>
              </div>

              {model.description && (
                <div className="mt-4 pt-4 border-t text-sm text-gray-500">
                  {model.description}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredModels.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Cpu className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无模型</p>
            <p className="text-sm">点击上方按钮创建第一个模型</p>
          </div>
        )}
      </div>
    </div>
  )
}
