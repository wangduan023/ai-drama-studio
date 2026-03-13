/**
 * Health Status Component
 * 代理健康状态组件
 */

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Activity, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react'

export type HealthStatus = 'healthy' | 'unhealthy' | 'unknown' | 'disabled'

interface HealthStatusProps {
  status: HealthStatus
  latency?: number | null
  lastCheckAt?: string | null
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const statusConfig: Record<HealthStatus, {
  label: string
  icon: React.ReactNode
  color: string
  bgColor: string
}> = {
  healthy: {
    label: '健康',
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  unhealthy: {
    label: '故障',
    icon: <XCircle className="w-4 h-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  unknown: {
    label: '未知',
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  disabled: {
    label: '禁用',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
}

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
}

const iconSizeClasses = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
}

export function HealthStatusBadge({
  status,
  latency,
  lastCheckAt,
  showLabel = true,
  size = 'md',
  className,
}: HealthStatusProps) {
  const config = statusConfig[status]

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge
        className={cn(
          sizeClasses[size],
          config.bgColor,
          config.color,
          'flex items-center gap-1'
        )}
      >
        {config.icon}
        {showLabel && config.label}
      </Badge>

      {latency !== undefined && latency !== null && status === 'healthy' && (
        <span className={cn('flex items-center gap-1 text-gray-500', size === 'sm' ? 'text-xs' : 'text-sm')}>
          <Activity className={iconSizeClasses[size]} />
          {latency}ms
        </span>
      )}

      {lastCheckAt && (
        <span className={cn('text-gray-400', size === 'sm' ? 'text-xs' : 'text-sm')}>
          {new Date(lastCheckAt).toLocaleString()}
        </span>
      )}
    </div>
  )
}

interface HealthStatusDetailProps {
  status: HealthStatus
  latency?: number | null
  lastCheckAt?: string | null
  errorMessage?: string | null
  className?: string
}

export function HealthStatusDetail({
  status,
  latency,
  lastCheckAt,
  errorMessage,
  className,
}: HealthStatusDetailProps) {
  const config = statusConfig[status]

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <div className={cn('p-2 rounded-full', config.bgColor)}>
          <div className={config.color}>{config.icon}</div>
        </div>
        <div>
          <div className={cn('font-medium', config.color)}>{config.label}</div>
          <div className="text-xs text-gray-500">
            {lastCheckAt ? `最后检查：${new Date(lastCheckAt).toLocaleString()}` : '尚未检查'}
          </div>
        </div>
      </div>

      {latency !== undefined && latency !== null && (
        <div className="flex items-center gap-2 text-sm">
          <Activity className="w-4 h-4 text-gray-400" />
          <span>延迟：</span>
          <span className={cn(
            latency < 100 ? 'text-green-600' :
            latency < 300 ? 'text-yellow-600' :
            'text-red-600'
          )}>
            {latency}ms
          </span>
        </div>
      )}

      {errorMessage && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {errorMessage}
        </div>
      )}
    </div>
  )
}

export function getHealthStatus(
  isActive: boolean,
  isHealthy?: boolean | null,
  lastCheckAt?: string | null
): HealthStatus {
  if (!isActive) return 'disabled'
  if (isHealthy === null || isHealthy === undefined || !lastCheckAt) return 'unknown'
  return isHealthy ? 'healthy' : 'unhealthy'
}
