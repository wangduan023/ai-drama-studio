/**
 * Proxy Form Component
 * 代理表单组件
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export type ProxyProtocol = 'HTTP' | 'HTTPS' | 'SOCKS5'

export interface ProxyFormData {
  id?: string
  name: string
  protocol: ProxyProtocol
  host: string
  port: number
  username?: string | null
  password?: string | null
  location?: string | null
  provider?: string | null
  isActive: boolean
  maxConcurrent: number
  description?: string | null
}

interface ProxyFormProps {
  initialData?: ProxyFormData
  onSubmit: (data: ProxyFormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

export function ProxyForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: ProxyFormProps) {
  const [formData, setFormData] = useState<ProxyFormData>(
    initialData || {
      name: '',
      protocol: 'HTTP',
      host: '',
      port: 8080,
      username: null,
      password: null,
      location: '',
      provider: '',
      isActive: true,
      maxConcurrent: 10,
      description: null,
    }
  )

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '请输入代理名称'
    }

    if (!formData.host.trim()) {
      newErrors.host = '请输入主机地址'
    }

    if (!formData.port || formData.port < 1 || formData.port > 65535) {
      newErrors.port = '端口号必须在 1-65535 之间'
    }

    if (formData.maxConcurrent < 1) {
      newErrors.maxConcurrent = '最大并发数必须 >= 1'
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

  const updateField = <K extends keyof ProxyFormData>(
    field: K,
    value: ProxyFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const protocolIcons: Record<ProxyProtocol, string> = {
    HTTP: '🌐',
    HTTPS: '🔒',
    SOCKS5: '🔐',
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{initialData ? '编辑代理' : '新建代理'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 代理名称 */}
          <div className="space-y-2">
            <Label htmlFor="name">
              代理名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="例如：美国 HTTP 代理"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* 协议选择 */}
          <div className="space-y-2">
            <Label htmlFor="protocol">
              协议类型 <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.protocol} onValueChange={(value) => updateField('protocol', value as ProxyProtocol)}>
              <SelectTrigger>
                <SelectValue placeholder="选择协议" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HTTP">
                  <span className="flex items-center gap-2">
                    <span>{protocolIcons.HTTP}</span> HTTP
                  </span>
                </SelectItem>
                <SelectItem value="HTTPS">
                  <span className="flex items-center gap-2">
                    <span>{protocolIcons.HTTPS}</span> HTTPS
                  </span>
                </SelectItem>
                <SelectItem value="SOCKS5">
                  <span className="flex items-center gap-2">
                    <span>{protocolIcons.SOCKS5}</span> SOCKS5
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 主机和端口 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="host">
                主机地址 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="host"
                value={formData.host}
                onChange={(e) => updateField('host', e.target.value)}
                placeholder="proxy.example.com"
              />
              {errors.host && (
                <p className="text-sm text-red-500">{errors.host}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="port">
                端口 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="port"
                type="number"
                min="1"
                max="65535"
                value={formData.port}
                onChange={(e) => updateField('port', parseInt(e.target.value) || 0)}
                placeholder="8080"
              />
              {errors.port && (
                <p className="text-sm text-red-500">{errors.port}</p>
              )}
            </div>
          </div>

          {/* 认证信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名 (可选)</Label>
              <Input
                id="username"
                value={formData.username || ''}
                onChange={(e) => updateField('username', e.target.value)}
                placeholder="username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码 (可选)</Label>
              <Input
                id="password"
                type="password"
                value={formData.password || ''}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder="password"
              />
            </div>
          </div>

          {/* 位置和提供商 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">位置 (可选)</Label>
              <Input
                id="location"
                value={formData.location || ''}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="例如：美国·洛杉矶"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">提供商 (可选)</Label>
              <Input
                id="provider"
                value={formData.provider || ''}
                onChange={(e) => updateField('provider', e.target.value)}
                placeholder="例如：Bright Data"
              />
            </div>
          </div>

          {/* 并发配置 */}
          <div className="space-y-2">
            <Label htmlFor="maxConcurrent">最大并发数</Label>
            <Input
              id="maxConcurrent"
              type="number"
              min="1"
              value={formData.maxConcurrent}
              onChange={(e) => updateField('maxConcurrent', parseInt(e.target.value) || 1)}
            />
            {errors.maxConcurrent && (
              <p className="text-sm text-red-500">{errors.maxConcurrent}</p>
            )}
            <p className="text-xs text-gray-500">同时使用的最大连接数</p>
          </div>

          {/* 描述 */}
          <div className="space-y-2">
            <Label htmlFor="description">描述 (可选)</Label>
            <textarea
              id="description"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="可选：添加代理用途说明"
              value={formData.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
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
