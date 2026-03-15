/**
 * Proxy Detail Page
 * 代理详情页面
 */

'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAiProxy } from '@/hooks/useAiProxy'
import { useConfirm } from '@/components/providers/ConfirmProvider'
import { ProxyCard } from '@/components/ai-proxies/ProxyCard'
import { HealthStatusDetail } from '@/components/ai-proxies/HealthStatus'
import { LatencyChart } from '@/components/ai-proxies/LatencyChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Activity, Clock, Server } from 'lucide-react'

export default function ProxyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { proxies, toggleProxyStatus, deleteProxy, isLoading } = useAiProxy()
  const confirm = useConfirm()

  const proxy = proxies.find(p => p.id === params.id)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!proxy) {
    return (
      <div className="text-center py-12">
        <Server className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-900">代理不存在</h2>
        <p className="text-gray-500 mt-2">该代理可能已被删除</p>
        <Button onClick={() => router.push('/ai-proxies')} className="mt-4">
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
          <h1 className="text-2xl font-bold text-gray-900">{proxy.name}</h1>
          <p className="text-gray-500">代理详情与健康状态</p>
        </div>
      </div>

      {/* 基本信息卡片 */}
      <ProxyCard
        proxy={proxy}
        onToggle={toggleProxyStatus}
        onDelete={(id) => {
          confirm({
            title: '删除确认',
            message: `确定要删除此代理吗？此操作不可恢复。`,
            confirmText: '删除',
            cancelText: '取消',
            onConfirm: () => {
              deleteProxy(id)
              router.push('/ai-proxies')
            },
          })
        }}
      />

      {/* 健康状态详情 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            健康状态详情
          </CardTitle>
        </CardHeader>
        <CardContent>
          <HealthStatusDetail
            status={proxy.isActive ? (proxy.isHealthy ? 'healthy' : 'unhealthy') : 'disabled'}
            latency={proxy.checkLatency}
            lastCheckAt={proxy.lastCheckAt}
          />
        </CardContent>
      </Card>

      {/* 延迟趋势 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            延迟趋势（24 小时）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LatencyChart
            width={600}
            height={150}
            showLabels
            showGrid
          />
        </CardContent>
      </Card>

      {/* 配置信息 */}
      <Card>
        <CardHeader>
          <CardTitle>配置信息</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-500">协议类型</span>
            <p className="font-medium">{proxy.protocol}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">主机地址</span>
            <p className="font-medium">{proxy.host}:{proxy.port}</p>
          </div>
          {proxy.location && (
            <div>
              <span className="text-sm text-gray-500">位置</span>
              <p className="font-medium">{proxy.location}</p>
            </div>
          )}
          {proxy.provider && (
            <div>
              <span className="text-sm text-gray-500">提供商</span>
              <p className="font-medium">{proxy.provider}</p>
            </div>
          )}
          <div>
            <span className="text-sm text-gray-500">最大并发</span>
            <p className="font-medium">{proxy.maxConcurrent}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">当前并发</span>
            <p className="font-medium">{proxy.currentConcurrent}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
