/**
 * Model Selector Component
 * 模型选择器组件
 */

'use client'

import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CapabilityBadges, type ModelCapability } from './CapabilityBadges'

export interface AiProvider {
  id: string
  name: string
  provider: string
}

export interface AiModel {
  id: string
  providerId: string
  modelId: string
  name: string
  capabilities: ModelCapability[]
}

interface ModelSelectorProps {
  value?: string
  onChange?: (modelId: string | null) => void
  providers?: AiProvider[]
  models?: AiModel[]
  placeholder?: string
  label?: string
  required?: boolean
  className?: string
}

export function ModelSelector({
  value,
  onChange,
  providers = [],
  models = [],
  placeholder = '选择模型',
  label = '绑定模型',
  required = false,
  className,
}: ModelSelectorProps) {
  const [selectedProviderId, setSelectedProviderId] = useState<string | undefined>()
  const [availableModels, setAvailableModels] = useState<AiModel[]>([])

  // 获取当前选中的模型信息
  const selectedModel = models.find(m => m.id === value)

  // 根据选择的模型获取其渠道，加载该渠道下的其他模型
  useEffect(() => {
    if (selectedModel) {
      setSelectedProviderId(selectedModel.providerId)
      setAvailableModels(models.filter(m => m.providerId === selectedModel.providerId))
    } else {
      // 如果没有选中模型，显示所有渠道供选择
      setAvailableModels([])
    }
  }, [selectedModel, models])

  const handleModelChange = (modelId: string | null) => {
    if (modelId === 'all' || modelId === null) {
      onChange?.(null)
    } else {
      onChange?.(modelId)
    }
  }

  return (
    <div className={className}>
      <Label className="flex items-center gap-2">
        {label}
        {required && <span className="text-red-500">*</span>}
        <Badge variant="outline" className="text-xs font-normal">
          不选则为渠道通用密钥
        </Badge>
      </Label>

      <Select value={value || 'all'} onValueChange={handleModelChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <span>所有模型（渠道通用）</span>
            </div>
          </SelectItem>

          {providers.map((provider) => (
            <SelectItem key={provider.id} value={provider.id}>
              <div className="flex items-center gap-2">
                <span className="font-medium">{provider.name}</span>
                <Badge variant="secondary" className="text-xs">渠道</Badge>
              </div>
            </SelectItem>
          ))}

          {availableModels.map((model) => (
            <SelectItem key={model.id} value={model.id}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span>{model.name}</span>
                  <span className="text-xs text-gray-500">({model.modelId})</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedModel && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-gray-500">支持功能:</span>
          <CapabilityBadges capabilities={selectedModel.capabilities} size="sm" />
        </div>
      )}
    </div>
  )
}
