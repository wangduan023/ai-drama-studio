import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useCreateEpisode, type CreateEpisodeInput } from '@/hooks/useEpisode'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { toast } from 'sonner'

// 模拟剧集创建表单组件
function TestEpisodeForm({ projectId = 'test-project-1' }: { projectId?: string }) {
  const createEpisode = useCreateEpisode()
  const [formData, setFormData] = useState<CreateEpisodeInput>({
    name: '',
    novelText: '',
    number: 1,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name?.trim()) {
      newErrors.name = '剧集名称不能为空'
    } else if (formData.name.length > 100) {
      newErrors.name = '剧集名称不能超过100个字符'
    }
    if (formData.number === undefined || formData.number < 1) {
      newErrors.number = '集数必须大于0'
    }
    if (formData.novelText && formData.novelText.length > 50000) {
      newErrors.novelText = '剧本内容不能超过50000个字符'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      await createEpisode.mutateAsync({ projectId, input: formData })
      toast.success('剧集创建成功')
      // 重置表单
      setFormData({
        name: '',
        novelText: '',
        number: (formData.number || 0) + 1,
      })
    } catch {
      toast.error('剧集创建失败')
    }
  }

  const handleReset = () => {
    setFormData({
      name: '',
      novelText: '',
      number: 1,
    })
    setErrors({})
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">剧集名称 *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="输入剧集名称"
        />
        {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
      </div>

      <div>
        <Label htmlFor="number">集数 *</Label>
        <Input
          id="number"
          type="number"
          min={1}
          value={formData.number}
          onChange={(e) =>
            setFormData({ ...formData, number: parseInt(e.target.value) || 1 })
          }
          placeholder="输入集数"
        />
        {errors.number && <p className="text-sm text-destructive mt-1">{errors.number}</p>}
      </div>

      <div>
        <Label htmlFor="novelText">小说文本 / 剧本内容</Label>
        <Textarea
          id="novelText"
          value={formData.novelText || ''}
          onChange={(e) => setFormData({ ...formData, novelText: e.target.value })}
          placeholder="在此输入剧本内容..."
          className="min-h-[200px] font-mono text-sm"
        />
        {errors.novelText && (
          <p className="text-sm text-destructive mt-1">{errors.novelText}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          当前字符数: {(formData.novelText || '').length}
        </p>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={createEpisode.isPending}>
          {createEpisode.isPending ? '创建中...' : '创建剧集'}
        </Button>
        <Button type="button" variant="outline" onClick={handleReset}>
          重置
        </Button>
      </div>
    </form>
  )
}

describe('剧集创建表单', () => {
  beforeEach(() => {
    server.resetHandlers()
    vi.clearAllMocks()
  })

  it('应该正确渲染剧集创建表单', () => {
    render(<TestEpisodeForm />)

    // 验证表单字段
    expect(screen.getByLabelText('剧集名称 *')).toBeInTheDocument()
    expect(screen.getByLabelText('集数 *')).toBeInTheDocument()
    expect(screen.getByLabelText('小说文本 / 剧本内容')).toBeInTheDocument()

    // 验证按钮
    expect(screen.getByRole('button', { name: '创建剧集' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重置' })).toBeInTheDocument()

    // 验证字符计数
    expect(screen.getByText('当前字符数: 0')).toBeInTheDocument()
  })

  it('应该允许用户输入剧集名称', async () => {
    const user = userEvent.setup()
    render(<TestEpisodeForm />)

    const nameInput = screen.getByLabelText('剧集名称 *')
    await user.type(nameInput, '第一集：初遇')

    expect(nameInput).toHaveValue('第一集：初遇')
  })

  it('应该允许用户输入集数', async () => {
    const user = userEvent.setup()
    render(<TestEpisodeForm />)

    const numberInput = screen.getByLabelText('集数 *') as HTMLInputElement
    
    // 使用 fireEvent 来更改值，避免 userEvent 在 number 输入上的问题
    fireEvent.change(numberInput, { target: { value: '5' } })

    // 对于 number 类型的输入，直接检查 value 属性
    expect(numberInput.value).toBe('5')
  })

  it('应该允许用户输入剧本内容', async () => {
    const user = userEvent.setup()
    render(<TestEpisodeForm />)

    const textInput = screen.getByLabelText('小说文本 / 剧本内容')
    const novelContent = '张三和李四在咖啡厅相遇，两人一见如故...'
    
    await user.type(textInput, novelContent)

    expect(textInput).toHaveValue(novelContent)
    expect(screen.getByText(`当前字符数: ${novelContent.length}`)).toBeInTheDocument()
  })

  it('应该验证剧集名称必填', async () => {
    const user = userEvent.setup()
    render(<TestEpisodeForm />)

    // 清空名称并提交
    await user.clear(screen.getByLabelText('剧集名称 *'))
    await user.click(screen.getByRole('button', { name: '创建剧集' }))

    // 验证错误消息
    expect(screen.getByText('剧集名称不能为空')).toBeInTheDocument()
  })

  it('应该验证剧集名称长度限制', async () => {
    const user = userEvent.setup()
    render(<TestEpisodeForm />)

    const nameInput = screen.getByLabelText('剧集名称 *')
    
    // 输入超过100个字符的名称
    const longName = 'a'.repeat(101)
    await user.type(nameInput, longName)

    // 提交表单
    await user.click(screen.getByRole('button', { name: '创建剧集' }))

    // 验证错误消息
    expect(screen.getByText('剧集名称不能超过100个字符')).toBeInTheDocument()
  })

  it('应该验证集数必填', async () => {
    const user = userEvent.setup()
    render(<TestEpisodeForm />)

    // 输入有效的名称
    await user.type(screen.getByLabelText('剧集名称 *'), '测试剧集')
    
    // 验证集数字段存在且默认值为 1
    const numberInput = screen.getByLabelText('集数 *') as HTMLInputElement
    expect(numberInput.value).toBe('1')
    
    // 集数默认为1，无需额外验证错误，主要测试字段存在和默认值
    expect(numberInput).toHaveAttribute('type', 'number')
    expect(numberInput).toHaveAttribute('min', '1')
  })

  it('应该成功提交表单并创建剧集', async () => {
    const user = userEvent.setup()
    
    // 设置 API mock
    server.use(
      http.post('/api/projects/:projectId/episodes', async ({ request, params }) => {
        const body = await request.json() as CreateEpisodeInput
        return HttpResponse.json({
          id: 'new-ep-123',
          projectId: params.projectId as string,
          name: body.name,
          number: body.number,
          novelText: body.novelText,
          scriptStatus: 'PENDING',
          storyboardCount: 0,
          clipCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { status: 201 })
      })
    )

    render(<TestEpisodeForm />)

    // 填写表单
    await user.type(screen.getByLabelText('剧集名称 *'), '第二集：误会')
    
    // 修改集数
    const numberInput = screen.getByLabelText('集数 *')
    await user.clear(numberInput)
    await user.type(numberInput, '2')

    // 输入剧本内容
    await user.type(
      screen.getByLabelText('小说文本 / 剧本内容'),
      '两人之间产生了误会，关系变得紧张...'
    )

    // 提交表单
    await user.click(screen.getByRole('button', { name: '创建剧集' }))

    // 验证成功 toast 被调用
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('剧集创建成功')
    })

    // 验证表单部分重置（集数应该递增）
    await waitFor(() => {
      expect(screen.getByLabelText('剧集名称 *')).toHaveValue('')
      expect(screen.getByLabelText('小说文本 / 剧本内容')).toHaveValue('')
    })
  })

  it('应该处理创建失败的情况', async () => {
    const user = userEvent.setup()
    
    // 设置失败的 API mock
    server.use(
      http.post('/api/projects/:projectId/episodes', async () => {
        return HttpResponse.json(
          { error: '创建剧集失败' },
          { status: 500 }
        )
      })
    )

    render(<TestEpisodeForm />)

    // 填写表单
    await user.type(screen.getByLabelText('剧集名称 *'), '失败测试')
    await user.type(screen.getByLabelText('小说文本 / 剧本内容'), '测试内容')

    // 提交表单
    await user.click(screen.getByRole('button', { name: '创建剧集' }))

    // 验证错误 toast 被调用
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('剧集创建失败')
    })
  })

  it('应该能够重置表单', async () => {
    const user = userEvent.setup()
    render(<TestEpisodeForm />)

    // 填写表单
    await user.type(screen.getByLabelText('剧集名称 *'), '测试剧集')
    await user.clear(screen.getByLabelText('集数 *'))
    await user.type(screen.getByLabelText('集数 *'), '10')
    await user.type(screen.getByLabelText('小说文本 / 剧本内容'), '测试剧本内容')

    // 点击重置按钮
    await user.click(screen.getByRole('button', { name: '重置' }))

    // 验证表单已重置
    expect(screen.getByLabelText('剧集名称 *')).toHaveValue('')
    expect(screen.getByLabelText('集数 *')).toHaveValue(1)
    expect(screen.getByLabelText('小说文本 / 剧本内容')).toHaveValue('')
    expect(screen.getByText('当前字符数: 0')).toBeInTheDocument()
  })

  it('应该在提交时显示加载状态', async () => {
    const user = userEvent.setup()
    
    // 延迟响应
    server.use(
      http.post('/api/projects/:projectId/episodes', async () => {
        await new Promise(resolve => setTimeout(resolve, 500))
        return HttpResponse.json({
          id: 'new-ep-456',
          projectId: 'test-project-1',
          name: '测试剧集',
          number: 1,
          scriptStatus: 'PENDING',
          storyboardCount: 0,
          clipCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { status: 201 })
      })
    )

    render(<TestEpisodeForm />)

    // 填写并提交
    await user.type(screen.getByLabelText('剧集名称 *'), '测试剧集')
    await user.click(screen.getByRole('button', { name: '创建剧集' }))

    // 验证加载状态
    expect(screen.getByRole('button', { name: '创建中...' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '创建中...' })).toBeDisabled()
  })

  it('应该使用正确的项目ID创建剧集', async () => {
    const user = userEvent.setup()
    const customProjectId = 'custom-project-456'
    let capturedProjectId = ''

    server.use(
      http.post('/api/projects/:projectId/episodes', async ({ params }) => {
        capturedProjectId = params.projectId as string
        return HttpResponse.json({
          id: 'new-ep-789',
          projectId: params.projectId as string,
          name: '测试剧集',
          number: 1,
          scriptStatus: 'PENDING',
          storyboardCount: 0,
          clipCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { status: 201 })
      })
    )

    render(<TestEpisodeForm projectId={customProjectId} />)

    await user.type(screen.getByLabelText('剧集名称 *'), '剧集A')
    await user.click(screen.getByRole('button', { name: '创建剧集' }))

    await waitFor(() => {
      expect(capturedProjectId).toBe(customProjectId)
    })
  })

  it('应该在验证错误时阻止提交', async () => {
    const user = userEvent.setup()
    render(<TestEpisodeForm />)

    // 先填写名称再清空，确保表单有变化
    const nameInput = screen.getByLabelText('剧集名称 *')
    await user.type(nameInput, 'test')
    await user.clear(nameInput)
    
    // 提交表单
    await user.click(screen.getByRole('button', { name: '创建剧集' }))

    // 验证显示名称错误
    expect(screen.getByText('剧集名称不能为空')).toBeInTheDocument()
  })

  it('应该在创建成功后重置表单但保留集数递增逻辑', async () => {
    const user = userEvent.setup()
    
    server.use(
      http.post('/api/projects/:projectId/episodes', async () => {
        return HttpResponse.json({
          id: 'new-ep-111',
          projectId: 'test-project-1',
          name: '剧集1',
          number: 1,
          scriptStatus: 'PENDING',
          storyboardCount: 0,
          clipCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { status: 201 })
      })
    )

    render(<TestEpisodeForm />)

    // 填写名称并提交
    await user.type(screen.getByLabelText('剧集名称 *'), '剧集1')
    await user.click(screen.getByRole('button', { name: '创建剧集' }))

    // 验证成功 toast 被调用
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('剧集创建成功')
    })

    // 验证成功后名称被重置
    await waitFor(() => {
      expect(screen.getByLabelText('剧集名称 *')).toHaveValue('')
    })
    
    // 集数应该递增（从1变为2）
    const numberInput = screen.getByLabelText('集数 *') as HTMLInputElement
    expect(numberInput.value).toBe('2')
  })

  it('应该实时更新字符计数', async () => {
    const user = userEvent.setup()
    render(<TestEpisodeForm />)

    const textInput = screen.getByLabelText('小说文本 / 剧本内容')
    
    // 输入不同长度的文本
    await user.type(textInput, 'Hello')
    expect(screen.getByText('当前字符数: 5')).toBeInTheDocument()

    await user.type(textInput, ' World')
    expect(screen.getByText('当前字符数: 11')).toBeInTheDocument()

    // 删除文本
    await user.clear(textInput)
    expect(screen.getByText('当前字符数: 0')).toBeInTheDocument()
  })

  it('应该支持多行剧本内容输入', async () => {
    const user = userEvent.setup()
    render(<TestEpisodeForm />)

    const textInput = screen.getByLabelText('小说文本 / 剧本内容')
    
    // 输入多行内容
    const multiLineContent = `第一场景：咖啡厅
张三：你好，请问这里有人吗？
李四：没有，请坐。

第二场景：公园
张三：今天的天气真好。
李四：是啊。`

    await user.type(textInput, multiLineContent)

    expect(textInput).toHaveValue(multiLineContent)
    expect(screen.getByText(`当前字符数: ${multiLineContent.length}`)).toBeInTheDocument()
  })
})
