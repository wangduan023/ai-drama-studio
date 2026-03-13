/**
 * Proxy Card Component
 * 代理卡片组件
 */

'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HealthStatusBadge, getHealthStatus, type HealthStatus } from './HealthStatus'
import {
  Globe,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  Activity,
  Clock,
} from 'lucide-react'

export interface ProxyCardData {
  id: string
  name: string
  protocol: 'HTTP' | 'HTTPS' | 'SOCKS5'
  host: string
  port: number
  location?: string | null
  provider?: string | null
  username?: string | null
  isActive: boolean
  isHealthy?: boolean | null
  checkLatency?: number | null
  currentConcurrent: number
  maxConcurrent: number
  totalRequests: number
  successRequests: number
  failedRequests: number
  lastCheckAt?: string | null
}

interface ProxyCardProps {
  proxy: ProxyCardData
  onToggle?: (id: string, isActive: boolean) => void
  onDelete?: (id: string) => void
  onTest?: (id: string) => void
  hideActions?: boolean
}

export function ProxyCard({
  proxy,
  onToggle,
  onDelete,
  onTest,
  hideActions = false,
}: ProxyCardProps) {
  const {
    id,
    name,
    protocol,
    host,
    port,
    location,
    provider,
    isActive,
    isHealthy,
    checkLatency,
    currentConcurrent,
    maxConcurrent,
    totalRequests,
    successRequests,
    failedRequests,
    lastCheckAt,
  } = proxy

  const healthStatus: HealthStatus = getHealthStatus(isActive, isHealthy, lastCheckAt)

  const getProtocolIcon = () => {
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

  return (
    <Card className={!isActive ? 'opacity-60' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-2xl">
              {getProtocolIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{name}</h3>
                <HealthStatusBadge
                  status={healthStatus}
                  latency={checkLatency}
                  showLabel
                  size="sm"
                />
              </div>
              <p className="text-sm text-gray-500">
                {protocol}://{host}:{port}
              </p>
              {location && (
                <Badge variant="outline" className="mt-1">{location}</Badge>
              )}
            </div>
          </div>

          {!hideActions && (
            <div className="flex items-center gap-2">
              {onToggle && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onToggle(id, !isActive)}
                  title={isActive ? '禁用' : '启用'}
                >
                  {isActive ? (
                    <PowerOff className="w-4 h-4" />
                  ) : (
                    <Power className="w-4 h-4" />
                  )}
                </Button>
              )}
              {onTest && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onTest(id)}
                  title="测试连通性"
                >
                  <Activity className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/ai-proxies/${id}/edit`}>
                  <Edit2 className="w-4 h-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-red-600 hover:text-red-700"
                onClick={() => onDelete?.(id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 配置信息 */}
        <div className="flex flex-wrap gap-4 text-sm">
          {provider && (
            <div>
              <span className="text-gray-500">提供商:</span>{' '}
              <span className="font-medium">{provider}</span>
            </div>
          )}
          <div>
            <span className="text-gray-500">并发:</span>{' '}
            <span className="font-medium">{currentConcurrent}/{maxConcurrent}</span>
          </div>
        </div>

        {/* 延迟显示 */}
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">延迟:</span>
          <span className={cn(
            'font-medium',
            !checkLatency ? 'text-gray-400' :
            checkLatency < 100 ? 'text-green-600' :
            checkLatency < 300 ? 'text-yellow-600' :
            'text-red-600'
          )}>
            {checkLatency ? `${checkLatency}ms` : '未检测'}
          </span>
        </div>

        {/* 统计信息 */}
        <div className="flex flex-wrap gap-4 pt-3 border-t text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            请求：{totalRequests.toLocaleString()}
          </span>
          <span>成功：{successRequests.toLocaleString()}</span>
          <span>失败：{failedRequests.toLocaleString()}</span>
          {lastCheckAt && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(lastCheckAt).toLocaleString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// 导入 cn 工具函数
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}
