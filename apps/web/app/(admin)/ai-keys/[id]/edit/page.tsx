/**
 * Edit AI Key Page
 * 编辑 AI 密钥页面
 */

'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAiKeys } from '@/hooks/useAiKeys'
import { useAiProvider } from '@/hooks/useAiProvider'
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
import { ArrowLeft, Key, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useConfirm } from '@/components/providers/ConfirmProvider'

const CAPABILITIES = ['TEXT', 'IMAGE', 'VIDEO', 'VOICE', 'CHAT', 'VISION']
const PROXY_MODES = [
  { value: 'AUTO', label: '自动选择' },
  { value: 'SPECIFIC', label: '指定代理' },
  { value: 'NONE', label: '不使用代理' },
]

export default function EditAiKeyPage() {
  const params = useParams()
  const router = useRouter()
  const { currentKey, updateKey, deleteKey, isLoading: isKeyLoading, fetchKey } = useAiKeys()
  const { providers, isLoading: isProvidersLoading, fetchProviders } = useAiProvider()
  const confirm = useConfirm()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([])

  const keyId = params.id as string

  // 加载数据
  useEffect(() => {
    fetchKey(keyId)
    fetchProviders()
  }, [keyId])

  // 初始化表单数据
  const [formData, setFormData] = useState({
    name: '',
    providerId: '',
    apiKey: '',
    apiSecret: '',
    priority: '0',
    weight: '1',
    quotaDaily: '',
    proxyMode: 'AUTO',
    proxyId: '',
    description: '',
    isActive: true,
  })

  // 当密钥数据加载完成后，初始化表单
  useEffect(() => {
    if (currentKey) {
      setFormData({
        name: currentKey.name,
        providerId: currentKey.providerId,
        apiKey: '', // 不显示原有密钥
        apiSecret: '', // 不显示原有密钥
        priority: String(currentKey.priority),
        weight: String(currentKey.weight),
        quotaDaily: currentKey.quotaDaily ? String(currentKey.quotaDaily) : '',
        proxyMode: currentKey.proxyMode || 'AUTO',
        proxyId: currentKey.proxyId || '',
        description: currentKey.description || '',
        isActive: currentKey.isActive,
      })
      setSelectedCapabilities(currentKey.capabilities || [])
    }
  }, [currentKey])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentKey) return
    
    setIsSubmitting(true)

    try {
      const updateData: any = {
        name: formData.name,
        priority: parseInt(formData.priority),
        weight: parseInt(formData.weight),
        quotaDaily: formData.quotaDaily ? parseInt(formData.quotaDaily) : null,
        proxyMode: formData.proxyMode as 'AUTO' | 'SPECIFIC' | 'NONE',
        proxyId: formData.proxyId || null,
        description: formData.description || null,
        isActive: formData.isActive,
        capabilities: selectedCapabilities.length > 0 ? selectedCapabilities : undefined,
      }

      // 如果填写了新密钥，则更新
      if (formData.apiKey) {
        updateData.apiKey = formData.apiKey
      }
      if (formData.apiSecret) {
        updateData.apiSecret = formData.apiSecret
      }

      await updateKey(currentKey.id, updateData)

      toast.success('更新成功', {
        description: `密钥 "${formData.name}" 已更新`,
      })
      router.push('/ai-keys')
    } catch (error: any) {
      toast.error('更新失败', {
        description: error.message || '请稍后重试',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = () => {
    if (!currentKey) return

    confirm({
      title: '删除确认',
      message: `确定要删除密钥 "${currentKey.name}" 吗？此操作不可恢复。`,
      confirmText: '删除',
      cancelText: '取消',
      onConfirm: async () => {
        try {
          await deleteKey(currentKey.id)
          toast.success('删除成功', {
            description: `密钥 "${currentKey.name}" 已被删除`,
          })
          router.push('/ai-keys')
        } catch (error: any) {
          toast.error('删除失败', {
            description: error.message || '请稍后重试',
          })
        }
      },
    })
  }

  const toggleCapability = (cap: string) => {
    setSelectedCapabilities(prev =>
      prev.includes(cap)
        ? prev.filter(c => c !== cap)
        : [...prev, cap]
    )
  }

  const isLoading = isKeyLoading || isProvidersLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!currentKey) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">密钥不存在</h2>
        <Button onClick={() => router.push('/ai-keys')} className="mt-4">
          返回
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* 页面头部 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/ai-keys">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">编辑密钥</h1>
            <p className="text-gray-500">修改 {currentKey.name} 的配置</p>
          </div>
        </div>

        <Button
          variant="outline"
          className="text-red-600 hover:text-red-700"
          onClick={handleDelete}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          删除
        </Button>
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
            {/* 启用状态 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <Label className="text-base font-medium">启用状态</Label>
                <p className="text-sm text-gray-500">禁用后该密钥将不会被使用</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${formData.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                  {formData.isActive ? '已启用' : '已禁用'}
                </span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.isActive ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

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
              <Label htmlFor="provider">渠道</Label>
              <Input
                id="provider"
                value={providers.find(p => p.id === currentKey.providerId)?.name || currentKey.providerId}
                disabled
                className="bg-gray-100"
              />
              <p className="text-xs text-gray-500">渠道不可修改</p>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label htmlFor="apiKey">
                API Key
                <span className="text-gray-400 text-sm ml-2">(留空则保持不变)</span>
              </Label>
              <Input
                id="apiKey"
                type="password"
                placeholder={`当前: ${currentKey.apiKey.slice(0, 8)}****`}
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              />
            </div>

            {/* API Secret (可选) */}
            <div className="space-y-2">
              <Label htmlFor="apiSecret">
                API Secret
                <span className="text-gray-400 text-sm ml-2">(留空则保持不变)</span>
              </Label>
              <Input
                id="apiSecret"
                type="password"
                placeholder="部分厂商需要"
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
                onValueChange={(value: string | null) => value && setFormData({ ...formData, proxyMode: value })}
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
                {isSubmitting ? '保存中...' : '保存更改'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
