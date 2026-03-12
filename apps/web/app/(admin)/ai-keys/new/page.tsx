/**
 * New AI Key Page
 * 新建密钥页面
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAiKeys } from '@/hooks/useAiKeys'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Key } from 'lucide-react'
import Link from 'next/link'

const CAPABILITIES = ['TEXT', 'IMAGE', 'VIDEO', 'VOICE', 'CHAT', 'VISION']
const PROXY_MODES = [
  { value: 'AUTO', label: '自动选择' },
  { value: 'SPECIFIC', label: '指定代理' },
  { value: 'NONE', label: '不使用代理' },
]

export default function NewAiKeyPage() {
  const router = useRouter()
  const { createKey } = useAiKeys()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([])

  const [formData, setFormData] = useState({
    name: '',
    providerId: '',
    apiKey: '',
    apiSecret: '',
    modelId: '',
    priority: '0',
    weight: '1',
    quotaDaily: '',
    proxyMode: 'AUTO',
    proxyId: '',
    description: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await createKey({
        name: formData.name,
        providerId: formData.providerId,
        apiKey: formData.apiKey,
        apiSecret: formData.apiSecret || null,
        modelId: formData.modelId || null,
        capabilities: selectedCapabilities.length > 0 ? selectedCapabilities : null,
        priority: parseInt(formData.priority),
        weight: parseInt(formData.weight),
        quotaDaily: formData.quotaDaily ? parseInt(formData.quotaDaily) : null,
        proxyMode: formData.proxyMode as 'AUTO' | 'SPECIFIC' | 'NONE',
        proxyId: formData.proxyId || null,
        description: formData.description || null,
      })

      router.push('/ai-keys')
    } catch (error) {
      console.error('Failed to create key:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleCapability = (cap: string) => {
    setSelectedCapabilities(prev =>
      prev.includes(cap)
        ? prev.filter(c => c !== cap)
        : [...prev, cap]
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* 页面头部 */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/ai-keys">
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">新建密钥</h1>
          <p className="text-gray-500">配置新的 AI API 密钥</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              基本信息
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* 名称 */}
            <div className="space-y-2">
              <Label htmlFor="name">密钥名称 *</Label>
              <Input
                id="name"
                placeholder="例如：OpenAI Production Key"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* 渠道 */}
            <div className="space-y-2">
              <Label htmlFor="provider">选择渠道 *</Label>
              <Select
                value={formData.providerId}
                onValueChange={(value) => setFormData({ ...formData, providerId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择渠道商" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="deepseek">DeepSeek</SelectItem>
                  <SelectItem value="qwen">通义千问</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key *</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-..."
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                required
              />
            </div>

            {/* API Secret (可选) */}
            <div className="space-y-2">
              <Label htmlFor="apiSecret">
                API Secret
                <span className="text-gray-400 text-sm ml-2">(部分厂商需要)</span>
              </Label>
              <Input
                id="apiSecret"
                type="password"
                value={formData.apiSecret}
                onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
              />
            </div>

            {/* 功能支持 */}
            <div className="space-y-2">
              <Label>功能支持</Label>
              <div className="flex flex-wrap gap-2">
                {CAPABILITIES.map((cap) => (
                  <Badge
                    key={cap}
                    variant={selectedCapabilities.includes(cap) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleCapability(cap)}
                  >
                    {cap}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-gray-500">
                留空则继承模型的功能设置
              </p>
            </div>

            {/* 优先级和权重 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">优先级</Label>
                <Input
                  id="priority"
                  type="number"
                  min="0"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                />
                <p className="text-xs text-gray-500">数值越小优先级越高</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="weight">权重</Label>
                <Input
                  id="weight"
                  type="number"
                  min="1"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                />
                <p className="text-xs text-gray-500">用于负载均衡分配</p>
              </div>
            </div>

            {/* 配额 */}
            <div className="space-y-2">
              <Label htmlFor="quotaDaily">每日配额</Label>
              <Input
                id="quotaDaily"
                type="number"
                min="0"
                placeholder="留空表示无限制"
                value={formData.quotaDaily}
                onChange={(e) => setFormData({ ...formData, quotaDaily: e.target.value })}
              />
            </div>

            {/* 代理模式 */}
            <div className="space-y-2">
              <Label htmlFor="proxyMode">代理模式</Label>
              <Select
                value={formData.proxyMode}
                onValueChange={(value) => setFormData({ ...formData, proxyMode: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROXY_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 描述 */}
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <textarea
                id="description"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="可选：添加密钥用途说明"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* 提交按钮 */}
            <div className="flex items-center justify-end gap-4 pt-4">
              <Button variant="outline" asChild>
                <Link href="/ai-keys">取消</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '创建中...' : '创建密钥'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
