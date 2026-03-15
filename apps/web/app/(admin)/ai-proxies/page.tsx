/**
 * AI Proxies Management Page
 * 代理管理列表页
 */

'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAiProxy } from '@/hooks/useAiProxy'
import { RBACButton } from '@/components/rbac'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Globe,
  Plus,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  RefreshCw,
  Search,
  Activity,
  Clock
} from 'lucide-react'
import { useState, useEffect } from 'react'

export default function AiProxiesPage() {
  const router = useRouter()
  const { proxies, isLoading, fetchProxies, toggleProxyStatus, deleteProxy } = useAiProxy()
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchProxies()
  }, [])

  const filteredProxies = proxies.filter(proxy =>
    proxy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proxy.host.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proxy.location?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (isActive: boolean, isHealthy: boolean) => {
    if (!isActive) {
      return <Badge className="bg-gray-100 text-gray-700">禁用</Badge>
    }
    return isHealthy 
      ? <Badge className="bg-green-100 text-green-700">健康</Badge>
      : <Badge className="bg-red-100 text-red-700">故障</Badge>
  }

  const getProtocolIcon = (protocol: string) => {
    const icons: Record<string, string> = {
      HTTP: '🌐',
      HTTPS: '🔒',
      SOCKS5: '🔐',
    }
    return icons[protocol] || '🌐'
  }

  const getLatencyColor = (latency: number | null) => {
    if (!latency) return 'text-gray-400'
    if (latency < 100) return 'text-green-600'
    if (latency < 300) return 'text-yellow-600'
    return 'text-red-600'
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
          <h1 className="text-2xl font-bold text-gray-900">代理管理</h1>
          <p className="text-gray-500 mt-1">管理 HTTP/HTTPS/SOCKS5 代理服务器</p>
        </div>
        
        <RBACButton resource="ai_proxy" action="create">
          <Link href="/ai-proxies/new">
            <Plus className="w-4 h-4 mr-2" />
            新建代理
          </Link>
        </RBACButton>
      </div>

      {/* 搜索栏 */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索代理名称、主机或位置..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 代理列表 */}
      <div className="grid gap-4">
        {filteredProxies.map((proxy) => (
          <Card key={proxy.id} className={!proxy.isActive ? 'opacity-60' : ''}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-2xl">
                    {getProtocolIcon(proxy.protocol)}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{proxy.name}</h3>
                      {getStatusBadge(proxy.isActive, proxy.isHealthy)}
                      {proxy.location && (
                        <Badge variant="outline">{proxy.location}</Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-500">
                      {proxy.protocol}://{proxy.host}:{proxy.port}
                    </p>
                    
                    {proxy.provider && (
                      <p className="text-sm text-gray-500">
                        提供商: {proxy.provider}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* 延迟 */}
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getLatencyColor(proxy.checkLatency)}`}>
                      {proxy.checkLatency ? `${proxy.checkLatency}ms` : '-'}
                    </div>
                    <div className="text-xs text-gray-500">延迟</div>
                  </div>

                  {/* 并发 */}
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-700">
                      {proxy.currentConcurrent}/{proxy.maxConcurrent}
                    </div>
                    <div className="text-xs text-gray-500">并发</div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2">
                    <RBACButton
                      resource="ai_proxy"
                      action="update"
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleProxyStatus(proxy.id, !proxy.isActive)}
                      title={proxy.isActive ? '禁用' : '启用'}
                    >
                      {proxy.isActive ? (
                        <PowerOff className="w-4 h-4" />
                      ) : (
                        <Power className="w-4 h-4" />
                      )}
                    </RBACButton>

                    <RBACButton
                      resource="ai_proxy"
                      action="update"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        router.push(`/ai-proxies/${proxy.id}/edit`)
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </RBACButton>

                    <RBACButton
                      resource="ai_proxy"
                      action="delete"
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => {
                        if (confirm('确定要删除此代理吗？')) {
                          deleteProxy(proxy.id)
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
                  请求: {(proxy.totalRequests || 0).toLocaleString()}
                </span>
                <span>成功: {(proxy.successRequests || 0).toLocaleString()}</span>
                <span>失败: {(proxy.failedRequests || 0).toLocaleString()}</span>
                {proxy.lastCheckAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    最后检查: {new Date(proxy.lastCheckAt).toLocaleString()}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredProxies.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Globe className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无代理</p>
            <p className="text-sm">点击上方按钮创建第一个代理</p>
          </div>
        )}
      </div>
    </div>
  )
}
