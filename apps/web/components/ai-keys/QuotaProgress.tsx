/**
 * Quota Progress Component
 * 配额进度条组件
 */

import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface QuotaProgressProps {
  used: number
  daily: number | null
  className?: string
  showLabels?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function QuotaProgress({
  used,
  daily,
  className,
  showLabels = true,
  size = 'md',
}: QuotaProgressProps) {
  if (!daily) {
    return (
      <div className={cn('text-xs text-gray-500', className)}>
        无限制
      </div>
    )
  }

  const percentage = Math.min((used / daily) * 100, 100)
  const isNearLimit = percentage >= 80
  const isOverLimit = percentage >= 100

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  return (
    <div className={cn('w-full', className)}>
      {showLabels && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span className={cn(isNearLimit && 'text-orange-600', isOverLimit && 'text-red-600')}>
            {used} / {daily}
          </span>
          <span className={cn(isNearLimit && 'text-orange-600', isOverLimit && 'text-red-600')}>
            {percentage.toFixed(0)}%
          </span>
        </div>
      )}
      <Progress
        value={percentage}
        className={cn(sizeClasses[size], isNearLimit && 'bg-orange-100', isOverLimit && 'bg-red-100')}
      />
    </div>
  )
}
