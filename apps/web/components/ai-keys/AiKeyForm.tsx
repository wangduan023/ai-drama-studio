/**
 * AI Key Form Component
 * AI 密钥表单组件
 */

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ModelSelector, type AiProvider, type AiModel } from './ModelSelector'
import { CapabilityBadges, type ModelCapability } from './CapabilityBadges'

export interface AiKeyFormData {
  id?: string
  providerId: string
  modelId?: string | null
  name: string
  apiKey: string
  apiSecret?: string
  capabilities?: ModelCapability[]
  isActive: boolean
  priority: number
  weight: number
  quotaDaily?: number | null
  proxyId?: string | null
}

interface AiKeyFormProps {
  initialData?: AiKeyFormData
  providers: AiProvider[]
  models: AiModel[]
  onSubmit: (data: AiKeyFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

export function AiKeyForm({
  initialData,
  providers,
  models,
  onSubmit,
  onCancel,
  isLoading = false,
}: AiKeyFormProps) {
  const [formData, setFormData] = useState<AiKeyFormData>(
    initialData || {
      providerId: '',
      modelId: null,
      name: '',
      apiKey: '',
      apiSecret: '',
      isActive: true,
      priority: 0,
      weight: 1,
      quotaDaily: null,
      proxyId: null,
    }
  )

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  // 获取当前选中的模型
  const selectedModel = models.find(m => m.id === formData.modelId)
  const selectedProvider = providers.find(p => p.id === formData.providerId)

  // 筛选当前渠道的模型
  const providerModels = models.filter(
    m => m.providerId === formData.providerId
  )

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.providerId) {
      newErrors.providerId = '请选择渠道'
    }

    if (!formData.name.trim()) {
      newErrors.name = '请输入密钥名称'
    }

    if (!formData.apiKey.trim()) {
      newErrors.apiKey = '请输入 API 密钥'
    }

    if (formData.priority < 0) {
      newErrors.priority = '优先级必须 >= 0'
    }

    if (formData.weight < 1) {
      newErrors.weight = '权重必须 >= 1'
    }

    if (formData.quotaDaily !== null && formData.quotaDaily !== undefined && formData.quotaDaily < 0) {
      newErrors.quotaDaily = '配额必须 >= 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!validate()) {
      return
    }

    try {
      await onSubmit(formData)
    } catch (error: any) {
      setSubmitError(error.message || '提交失败')
    }
  }

  const updateField = <K extends keyof AiKeyFormData>(
    field: K,
    value: AiKeyFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field as string]: '' }))
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{initialData ? '编辑密钥' : '新建密钥'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 渠道选择 */}
          <div className="space-y-2">
            <Label htmlFor="providerId">
              渠道 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.providerId}
              onValueChange={(value: string | null) => {
                if (value) {
                  updateField('providerId', value)
                  // 切换渠道时清空模型选择
                  updateField('modelId', null)
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择渠道">
                  {(value: string | null) => {
                    if (!value) return '选择渠道'
                    const provider = providers.find(p => p.id === value)
                    return provider ? provider.name : value
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{provider.name}</span>
                      {provider.description && (
                        <span className="text-xs text-gray-500">{provider.description}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.providerId && (
              <p className="text-sm text-red-500">{errors.providerId}</p>
            )}
          </div>

          {/* 模型选择 */}
          {formData.providerId && (
            <ModelSelector
              value={formData.modelId || undefined}
              onChange={(modelId) => updateField('modelId', modelId)}
              providers={providers}
              models={providerModels}
              label="绑定模型"
              placeholder="不选则为渠道通用密钥"
            />
          )}

          {/* 密钥名称 */}
          <div className="space-y-2">
            <Label htmlFor="name">
              密钥名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="例如：OpenAI 主密钥"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">
              API Key <span className="text-red-500">*</span>
            </Label>
            <Input
              id="apiKey"
              value={formData.apiKey}
              onChange={(e) => updateField('apiKey', e.target.value)}
              placeholder="sk-..."
              type="password"
            />
            {errors.apiKey && (
              <p className="text-sm text-red-500">{errors.apiKey}</p>
            )}
          </div>

          {/* API Secret (可选) */}
          <div className="space-y-2">
            <Label htmlFor="apiSecret">API Secret (可选)</Label>
            <Input
              id="apiSecret"
              value={formData.apiSecret || ''}
              onChange={(e) => updateField('apiSecret', e.target.value)}
              placeholder="部分厂商需要"
              type="password"
            />
          </div>

          {/* 功能支持 */}
          {selectedModel && (
            <div className="space-y-2">
              <Label>功能支持</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                <CapabilityBadges
                  capabilities={selectedModel.capabilities}
                  size="md"
                />
              </div>
              <p className="text-xs text-gray-500">
                密钥将继承上述模型的功能支持
              </p>
            </div>
          )}

          {/* 优先级和权重 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">优先级</Label>
              <Input
                id="priority"
                type="number"
                min="0"
                value={formData.priority}
                onChange={(e) => updateField('priority', parseInt(e.target.value) || 0)}
              />
              {errors.priority && (
                <p className="text-sm text-red-500">{errors.priority}</p>
              )}
              <p className="text-xs text-gray-500">优先级高的密钥优先使用</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">权重</Label>
              <Input
                id="weight"
                type="number"
                min="1"
                value={formData.weight}
                onChange={(e) => updateField('weight', parseInt(e.target.value) || 1)}
              />
              {errors.weight && (
                <p className="text-sm text-red-500">{errors.weight}</p>
              )}
              <p className="text-xs text-gray-500">同优先级下按权重分配</p>
            </div>
          </div>

          {/* 每日配额 */}
          <div className="space-y-2">
            <Label htmlFor="quotaDaily">每日配额 (可选)</Label>
            <Input
              id="quotaDaily"
              type="number"
              min="0"
              value={formData.quotaDaily || ''}
              onChange={(e) => updateField('quotaDaily', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="留空表示无限制"
            />
            {errors.quotaDaily && (
              <p className="text-sm text-red-500">{errors.quotaDaily}</p>
            )}
            <p className="text-xs text-gray-500">留空表示无限制</p>
          </div>

          {/* 启用状态 */}
          <div className="flex items-center justify-between">
            <Label htmlFor="isActive">启用状态</Label>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => updateField('isActive', checked)}
            />
          </div>

          {/* 提交错误 */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {submitError}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                取消
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '提交中...' : initialData ? '保存' : '创建'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
