/**
 * Capability Badges Component
 * 功能标签组件
 */

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type ModelCapability = 'TEXT' | 'IMAGE' | 'VIDEO' | 'VOICE' | 'CHAT' | 'VISION'

interface CapabilityBadgesProps {
  capabilities?: ModelCapability[]
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'secondary'
  showIcons?: boolean
  className?: string
}

const capabilityConfig: Record<ModelCapability, { label: string; icon: string; color: string }> = {
  TEXT: { label: '文字', icon: '📝', color: 'bg-blue-100 text-blue-700' },
  IMAGE: { label: '图像', icon: '🖼️', color: 'bg-purple-100 text-purple-700' },
  VIDEO: { label: '视频', icon: '🎬', color: 'bg-red-100 text-red-700' },
  VOICE: { label: '语音', icon: '🔊', color: 'bg-green-100 text-green-700' },
  CHAT: { label: '对话', icon: '💬', color: 'bg-indigo-100 text-indigo-700' },
  VISION: { label: '视觉', icon: '👁️', color: 'bg-yellow-100 text-yellow-700' },
}

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
}

export function CapabilityBadges({
  capabilities,
  size = 'sm',
  variant = 'default',
  showIcons = true,
  className,
}: CapabilityBadgesProps) {
  if (!capabilities || capabilities.length === 0) {
    return (
      <Badge variant={variant} className={cn('text-xs', className)}>
        通用
      </Badge>
    )
  }

  return (
    <div className={cn('flex gap-1 flex-wrap', className)}>
      {capabilities.map((cap) => {
        const config = capabilityConfig[cap]
        return (
          <Badge
            key={cap}
            variant={variant}
            className={cn(
              sizeClasses[size],
              variant === 'default' && config?.color
            )}
            title={config?.label}
          >
            {showIcons && config?.icon && (
              <span className="mr-1">{config.icon}</span>
            )}
            {config?.label || cap}
          </Badge>
        )
      })}
    </div>
  )
}
