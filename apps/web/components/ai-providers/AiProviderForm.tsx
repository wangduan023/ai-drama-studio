/**
 * AI Provider Form Component
 * AI 渠道商表单组件
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CreateAiProviderInput } from '@/hooks/useAiProvider'

export interface AiProviderFormData extends Omit<CreateAiProviderInput, 'metadata'> {
  id?: string
}

interface AiProviderFormProps {
  initialData?: AiProviderFormData
  onSubmit: (data: AiProviderFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

export function AiProviderForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: AiProviderFormProps) {
  const [formData, setFormData] = useState<AiProviderFormData>(
    initialData || {
      name: '',
      baseUrl: '',
      apiKey: '',
      isActive: true,
      priority: 0,
      weight: 1,
      rateLimit: undefined,
      quotaDaily: undefined,
      description: undefined,
    }
  )

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '请输入渠道名称'
    }

    if (!formData.baseUrl.trim()) {
      newErrors.baseUrl = '请输入 API 地址'
    } else {
      try {
        new URL(formData.baseUrl)
      } catch {
        newErrors.baseUrl = '请输入有效的 URL'
      }
    }

    if (!initialData && !formData.apiKey.trim()) {
      newErrors.apiKey = '请输入 API 密钥'
    }

    if ((formData.priority ?? 0) < 0) {
      newErrors.priority = '优先级必须 >= 0'
    }

    if ((formData.weight ?? 1) < 1) {
      newErrors.weight = '权重必须 >= 1'
    }

    if (formData.rateLimit !== null && formData.rateLimit !== undefined && formData.rateLimit < 0) {
      newErrors.rateLimit = '速率限制必须 >= 0'
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

  const updateField = <K extends keyof AiProviderFormData>(
    field: K,
    value: AiProviderFormData[K]
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
          <CardTitle>{initialData ? '编辑渠道' : '新建渠道'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 渠道名称 */}
          <div className="space-y-2">
            <Label htmlFor="name">
              渠道名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="例如：OpenAI、Anthropic、DeepSeek"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* API 地址 */}
          <div className="space-y-2">
            <Label htmlFor="baseUrl">
              API 地址 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="baseUrl"
              value={formData.baseUrl}
              onChange={(e) => updateField('baseUrl', e.target.value)}
              placeholder="https://api.openai.com/v1"
            />
            {errors.baseUrl && (
              <p className="text-sm text-red-500">{errors.baseUrl}</p>
            )}
            <p className="text-xs text-gray-500">完整的 API 基础 URL</p>
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
            {!initialData && (
              <p className="text-xs text-gray-500">新建时必须提供 API 密钥</p>
            )}
          </div>

          {/* 优先级和权重 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">优先级</Label>
              <Input
                id="priority"
                type="number"
                min="0"
                value={formData.priority ?? 0}
                onChange={(e) => updateField('priority', parseInt(e.target.value) || 0)}
              />
              {errors.priority && (
                <p className="text-sm text-red-500">{errors.priority}</p>
              )}
              <p className="text-xs text-gray-500">优先级高的渠道优先使用</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">权重</Label>
              <Input
                id="weight"
                type="number"
                min="1"
                value={formData.weight ?? 1}
                onChange={(e) => updateField('weight', parseInt(e.target.value) || 1)}
              />
              {errors.weight && (
                <p className="text-sm text-red-500">{errors.weight}</p>
              )}
              <p className="text-xs text-gray-500">同优先级下按权重分配</p>
            </div>
          </div>

          {/* 速率限制和每日配额 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rateLimit">速率限制 (次/分钟)</Label>
              <Input
                id="rateLimit"
                type="number"
                min="0"
                value={formData.rateLimit ?? ''}
                onChange={(e) => updateField('rateLimit', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="留空表示无限制"
              />
              {errors.rateLimit && (
                <p className="text-sm text-red-500">{errors.rateLimit}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quotaDaily">每日配额</Label>
              <Input
                id="quotaDaily"
                type="number"
                min="0"
                value={formData.quotaDaily ?? ''}
                onChange={(e) => updateField('quotaDaily', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="留空表示无限制"
              />
              {errors.quotaDaily && (
                <p className="text-sm text-red-500">{errors.quotaDaily}</p>
              )}
            </div>
          </div>

          {/* 描述 */}
          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={formData.description ?? ''}
              onChange={(e) => updateField('description', e.target.value || undefined)}
              placeholder="备注信息..."
              rows={3}
            />
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
