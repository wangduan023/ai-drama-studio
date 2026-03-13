/**
 * AI Providers Management Page
 * 渠道商管理列表页
 */

'use client'

import { useRouter } from 'next/navigation'
import { useAiProvider } from '@/hooks/useAiProvider'
import { RBACButton } from '@/components/rbac'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Bot,
  Plus,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  Activity,
  Link as LinkIcon,
} from 'lucide-react'
import { useState } from 'react'

export default function AiProvidersPage() {
  const router = useRouter()
  const { providers, isLoading, toggleProviderStatus, deleteProvider } = useAiProvider()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredProviders = providers.filter(provider =>
    provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.baseUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (provider.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  )

  const getStatusBadge = (isActive: boolean) => {
    return isActive
      ? <Badge className="bg-green-100 text-green-700">启用</Badge>
      : <Badge className="bg-gray-100 text-gray-700">禁用</Badge>
  }

  const getPriorityBadge = (priority: number) => {
    if (priority === 0) {
      return <Badge variant="outline">普通</Badge>
    } else if (priority < 10) {
      return <Badge className="bg-blue-100 text-blue-700">高优先级</Badge>
    } else {
      return <Badge className="bg-purple-100 text-purple-700">最高优先级</Badge>
    }
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
          <h1 className="text-2xl font-bold text-gray-900">渠道管理</h1>
          <p className="text-gray-500 mt-1">管理 AI 模型渠道商配置</p>
        </div>

        <RBACButton
          resource="ai_provider"
          action="create"
          onClick={() => router.push('/ai-providers/new')}
        >
          <Plus className="w-4 h-4 mr-2" />
          新建渠道
        </RBACButton>
      </div>

      {/* 搜索栏 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索渠道名称、API 地址或描述..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 渠道商列表 */}
      <div className="grid gap-4">
        {filteredProviders.map((provider) => (
          <Card key={provider.id} className={!provider.isActive ? 'opacity-60' : ''}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Bot className="w-6 h-6 text-indigo-600" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{provider.name}</h3>
                      {getStatusBadge(provider.isActive)}
                      {getPriorityBadge(provider.priority)}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <LinkIcon className="w-3 h-3" />
                      {provider.baseUrl}
                    </div>

                    {provider.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {provider.description}
                      </p>
                    )}

                    <div className="flex gap-1 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        权重：{provider.weight}
                      </Badge>
                      {provider.rateLimit && (
                        <Badge variant="secondary" className="text-xs">
                          限速：{provider.rateLimit}/min
                        </Badge>
                      )}
                      {provider.quotaDaily && (
                        <Badge variant="secondary" className="text-xs">
                          配额：{provider.quotaDaily}/天
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* 使用统计 */}
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-700">
                      {provider.quotaUsed || 0}
                    </div>
                    <div className="text-xs text-gray-500">今日调用</div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2">
                    <RBACButton
                      resource="ai_provider"
                      action="update"
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleProviderStatus(provider.id, !provider.isActive)}
                      title={provider.isActive ? '禁用' : '启用'}
                    >
                      {provider.isActive ? (
                        <PowerOff className="w-4 h-4" />
                      ) : (
                        <Power className="w-4 h-4" />
                      )}
                    </RBACButton>

                    <RBACButton
                      resource="ai_provider"
                      action="update"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        router.push(`/ai-providers/${provider.id}/edit`)
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </RBACButton>

                    <RBACButton
                      resource="ai_provider"
                      action="delete"
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => {
                        if (confirm('确定要删除此渠道商吗？')) {
                          deleteProvider(provider.id)
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </RBACButton>
                  </div>
                </div>
              </div>

              {/* 统计信息 */}
              <div className="flex items-center gap-6 mt-4 pt-4 border-t text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Activity className="w-4 h-4" />
                  优先级：{provider.priority}
                </span>
                <span>权重：{provider.weight}</span>
                <span>创建时间：{new Date(provider.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredProviders.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无渠道商</p>
            <p className="text-sm">点击上方按钮创建第一个渠道商</p>
          </div>
        )}
      </div>
    </div>
  )
}
