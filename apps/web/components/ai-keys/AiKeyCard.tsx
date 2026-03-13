/**
 * AI Key Card Component
 * AI 密钥卡片组件
 */

'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CapabilityBadges, type ModelCapability } from './CapabilityBadges'
import { QuotaProgress } from './QuotaProgress'
import {
  Key,
  Edit2,
  Trash2,
  Power,
  PowerOff,
  RefreshCw,
} from 'lucide-react'

export interface AiKeyCardData {
  id: string
  providerId: string
  modelId?: string | null
  name: string
  isActive: boolean
  priority: number
  weight: number
  quotaDaily?: number | null
  quotaUsed: number
  successCount: number
  failCount: number
  lastUsedAt?: string | null
  capabilities?: ModelCapability[]
  isDedicated?: boolean // 是否为专用密钥
}

interface AiKeyCardProps {
  key: AiKeyCardData
  onToggle?: (id: string, isActive: boolean) => void
  onDelete?: (id: string) => void
  onResetQuota?: (id: string) => void
  hideActions?: boolean
  showProvider?: boolean
}

export function AiKeyCard({
  key: keyData,
  onToggle,
  onDelete,
  onResetQuota,
  hideActions = false,
  showProvider = true,
}: AiKeyCardProps) {
  const {
    id,
    providerId,
    modelId,
    name,
    isActive,
    priority,
    weight,
    quotaDaily,
    quotaUsed,
    successCount,
    failCount,
    lastUsedAt,
    capabilities,
    isDedicated,
  } = keyData

  const getStatusBadge = () => {
    return isActive
      ? <Badge className="bg-green-100 text-green-700">启用</Badge>
      : <Badge className="bg-gray-100 text-gray-700">禁用</Badge>
  }

  const getTypeBadge = () => {
    if (isDedicated || modelId) {
      return <Badge variant="outline">专用密钥</Badge>
    }
    return <Badge variant="secondary">通用密钥</Badge>
  }

  return (
    <Card className={!isActive ? 'opacity-60' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{name}</h3>
                {getStatusBadge()}
                {getTypeBadge()}
              </div>
              {showProvider && (
                <p className="text-sm text-gray-500">渠道：{providerId}</p>
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
              <Button variant="ghost" size="icon" onClick={() => window.location.href = `/ai-keys/${id}/edit`}>
                <Edit2 className="w-4 h-4" />
              </Button>
              {onResetQuota && quotaDaily && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onResetQuota(id)}
                  title="重置配额"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
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
          <div>
            <span className="text-gray-500">优先级:</span>{' '}
            <span className="font-medium">{priority}</span>
          </div>
          <div>
            <span className="text-gray-500">权重:</span>{' '}
            <span className="font-medium">{weight}</span>
          </div>
          {capabilities && capabilities.length > 0 && (
            <div className="flex-1">
              <CapabilityBadges capabilities={capabilities} size="sm" />
            </div>
          )}
        </div>

        {/* 配额进度 */}
        {(quotaDaily || quotaUsed > 0) && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>配额使用</span>
              <span>{quotaUsed} / {quotaDaily || '∞'}</span>
            </div>
            <QuotaProgress used={quotaUsed} daily={quotaDaily ?? null} size="sm" showLabels={false} />
          </div>
        )}

        {/* 统计信息 */}
        <div className="flex flex-wrap gap-4 pt-3 border-t text-xs text-gray-500">
          <span>成功：{successCount.toLocaleString()}</span>
          <span>失败：{failCount.toLocaleString()}</span>
          {lastUsedAt && (
            <span>
              最后使用：{new Date(lastUsedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
