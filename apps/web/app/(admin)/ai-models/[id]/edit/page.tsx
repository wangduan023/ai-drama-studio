/**
 * Edit AI Model Page
 * 编辑模型页面
 */

'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAiModels, type UpdateAiModelInput } from '@/hooks/useAiModels'
import { useConfirm } from '@/components/providers/ConfirmProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Cpu, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export default function EditAiModelPage() {
  const params = useParams()
  const router = useRouter()
  const { currentModel, isLoading, fetchModel, updateModel, deleteModel } = useAiModels()
  const confirm = useConfirm()
  const modelId = params.id as string

  useEffect(() => {
    fetchModel(modelId)
  }, [modelId])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!currentModel) return

    const formData = new FormData(e.currentTarget)
    const data: UpdateAiModelInput = {
      name: formData.get('name') as string,
      description: (formData.get('description') as string) || null,
      maxTokens: formData.get('maxTokens') ? parseInt(formData.get('maxTokens') as string) : null,
      contextWindow: formData.get('contextWindow') ? parseInt(formData.get('contextWindow') as string) : null,
      inputCost: formData.get('inputCost') ? parseFloat(formData.get('inputCost') as string) : null,
      outputCost: formData.get('outputCost') ? parseFloat(formData.get('outputCost') as string) : null,
      imageCost: formData.get('imageCost') ? parseFloat(formData.get('imageCost') as string) : null,
      videoCost: formData.get('videoCost') ? parseFloat(formData.get('videoCost') as string) : null,
      isEnabled: formData.get('isEnabled') === 'on',
      isDefault: formData.get('isDefault') === 'on',
    }

    try {
      await updateModel(modelId, data)
      toast.success('更新成功', {
        description: `模型 "${data.name}" 已更新`,
      })
      router.push('/ai-models')
    } catch (error: any) {
      toast.error('更新失败', {
        description: error.message || '请稍后重试',
      })
    }
  }

  const handleDelete = () => {
    if (!currentModel) return

    confirm({
      title: '删除确认',
      message: `确定要删除模型 "${currentModel.name}" 吗？此操作不可恢复。`,
      confirmText: '删除',
      cancelText: '取消',
      onConfirm: async () => {
        try {
          await deleteModel(modelId)
          toast.success('删除成功', {
            description: `模型 "${currentModel.name}" 已被删除`,
          })
          router.push('/ai-models')
        } catch (error: any) {
          toast.error('删除失败', {
            description: error.message || '请稍后重试',
          })
        }
      },
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!currentModel) {
    return (
      <div className="text-center py-12">
        <Cpu className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-900">模型不存在</h2>
        <Button onClick={() => router.push('/ai-models')} className="mt-4">
          返回列表
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">编辑模型</h1>
            <p className="text-gray-500">修改 {currentModel.name} 的配置</p>
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

      {/* 表单 */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">模型名称</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={currentModel.name}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modelId">模型 ID</Label>
                <Input
                  id="modelId"
                  value={currentModel.modelId}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500">模型 ID 不可修改</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <textarea
                id="description"
                name="description"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                defaultValue={currentModel.description || ''}
                placeholder="可选：添加模型描述"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="provider">提供商</Label>
                <Input
                  id="provider"
                  value={currentModel.providerId}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500">提供商不可修改</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">类型</Label>
                <Input
                  id="type"
                  value={currentModel.type}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500">模型类型不可修改</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>配置参数</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxTokens">最大 Token 数</Label>
                <Input
                  id="maxTokens"
                  name="maxTokens"
                  type="number"
                  defaultValue={currentModel.maxTokens || ''}
                  placeholder="可选"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contextWindow">上下文窗口</Label>
                <Input
                  id="contextWindow"
                  name="contextWindow"
                  type="number"
                  defaultValue={currentModel.contextWindow || ''}
                  placeholder="可选"
                />
              </div>
            </div>

            {currentModel.type === 'TEXT' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inputCost">输入成本 ($/1K tokens)</Label>
                  <Input
                    id="inputCost"
                    name="inputCost"
                    type="number"
                    step="0.0001"
                    defaultValue={currentModel.inputCost || ''}
                    placeholder="可选"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="outputCost">输出成本 ($/1K tokens)</Label>
                  <Input
                    id="outputCost"
                    name="outputCost"
                    type="number"
                    step="0.0001"
                    defaultValue={currentModel.outputCost || ''}
                    placeholder="可选"
                  />
                </div>
              </div>
            )}

            {currentModel.type === 'IMAGE' && (
              <div className="space-y-2">
                <Label htmlFor="imageCost">图片成本 ($/张)</Label>
                <Input
                  id="imageCost"
                  name="imageCost"
                  type="number"
                  step="0.0001"
                  defaultValue={currentModel.imageCost || ''}
                  placeholder="可选"
                />
              </div>
            )}

            {currentModel.type === 'VIDEO' && (
              <div className="space-y-2">
                <Label htmlFor="videoCost">视频成本 ($/个)</Label>
                <Input
                  id="videoCost"
                  name="videoCost"
                  type="number"
                  step="0.0001"
                  defaultValue={currentModel.videoCost || ''}
                  placeholder="可选"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>状态设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isEnabled">启用模型</Label>
                <p className="text-sm text-gray-500">禁用后该模型将不可用</p>
              </div>
              <Switch
                id="isEnabled"
                name="isEnabled"
                defaultChecked={currentModel.isEnabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="isDefault">设为默认</Label>
                <p className="text-sm text-gray-500">设为该类型的默认模型</p>
              </div>
              <Switch
                id="isDefault"
                name="isDefault"
                defaultChecked={currentModel.isDefault}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            取消
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? '保存中...' : '保存'}
          </Button>
        </div>
      </form>
    </div>
  )
}
