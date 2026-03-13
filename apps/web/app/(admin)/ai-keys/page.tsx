/**
 * AI Keys Management Page
 * 密钥管理列表页
 */

'use client'

import { useRouter } from 'next/navigation'
import { useAiKeys } from '@/hooks/useAiKeys'
import { RBACButton } from '@/components/rbac'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Key, 
  Plus, 
  Edit2, 
  Trash2, 
  Power, 
  PowerOff,
  RefreshCw,
  Search
} from 'lucide-react'
import { useState } from 'react'

export default function AiKeysPage() {
  const router = useRouter()
  const { keys, isLoading, toggleKeyStatus, deleteKey } = useAiKeys()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredKeys = keys.filter(key =>
    key.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    key.providerId.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (isActive: boolean) => {
    return isActive 
      ? <Badge className="bg-green-100 text-green-700">启用</Badge>
      : <Badge className="bg-gray-100 text-gray-700">禁用</Badge>
  }

  const getQuotaProgress = (used: number, daily: number | null) => {
    if (!daily) return null
    const percentage = Math.min((used / daily) * 100, 100)
    return (
      <div className="w-full">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{used} / {daily}</span>
          <span>{percentage.toFixed(0)}%</span>
        </div>
        <Progress value={percentage} className="h-2" />
      </div>
    )
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
          <h1 className="text-2xl font-bold text-gray-900">密钥管理</h1>
          <p className="text-gray-500 mt-1">管理 AI 渠道 API 密钥</p>
        </div>
        
        <RBACButton resource="ai_key" action="create">
          <Link href="/ai-keys/new">
            <Plus className="w-4 h-4 mr-2" />
            新建密钥
          </Link>
        </RBACButton>
      </div>

      {/* 搜索栏 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索密钥名称或渠道..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 密钥列表 */}
      <div className="grid gap-4">
        {filteredKeys.map((key) => (
          <Card key={key.id} className={!key.isActive ? 'opacity-60' : ''}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Key className="w-5 h-5 text-blue-600" />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{key.name}</h3>
                      {getStatusBadge(key.isActive)}
                      {key.modelId && (
                        <Badge variant="outline">专用密钥</Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-500">
                      渠道: {key.providerId} · 
                      优先级: {key.priority} · 
                      权重: {key.weight}
                    </p>
                    
                    {key.capabilities && (
                      <div className="flex gap-1 mt-2">
                        {key.capabilities.map((cap) => (
                          <Badge key={cap} variant="secondary" className="text-xs">
                            {cap}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* 配额显示 */}
                  <div className="w-32">
                    {getQuotaProgress(key.quotaUsed, key.quotaDaily)}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2">
                    <RBACButton
                      resource="ai_key"
                      action="update"
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleKeyStatus(key.id, !key.isActive)}
                      title={key.isActive ? '禁用' : '启用'}
                    >
                      {key.isActive ? (
                        <PowerOff className="w-4 h-4" />
                      ) : (
                        <Power className="w-4 h-4" />
                      )}
                    </RBACButton>

                    <RBACButton
                      resource="ai_key"
                      action="update"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        router.push(`/ai-keys/${key.id}/edit`)
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </RBACButton>

                    <RBACButton
                      resource="ai_key"
                      action="delete"
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => {
                        if (confirm('确定要删除此密钥吗？')) {
                          deleteKey(key.id)
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
                <span>成功: {key.successCount}</span>
                <span>失败: {key.failCount}</span>
                {key.lastUsedAt && (
                  <span>
                    最后使用: {new Date(key.lastUsedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredKeys.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Key className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无密钥</p>
            <p className="text-sm">点击上方按钮创建第一个密钥</p>
          </div>
        )}
      </div>
    </div>
  )
}
