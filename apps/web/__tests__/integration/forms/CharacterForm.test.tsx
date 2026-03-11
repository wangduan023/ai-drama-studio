import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateCharacter, type CreateCharacterInput } from '@/hooks/useCharacter'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/mocks/server'
import { toast } from 'sonner'

// 模拟角色创建表单组件
function TestCharacterForm({ projectId = 'test-project-1' }: { projectId?: string }) {
  const createCharacter = useCreateCharacter()
  const [formData, setFormData] = useState<CreateCharacterInput>({
    projectId,
    name: '',
    introduction: '',
    gender: '',
    roleLevel: 'E',
    ageRange: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name?.trim()) {
      newErrors.name = '角色名称不能为空'
    } else if (formData.name.length > 50) {
      newErrors.name = '角色名称不能超过50个字符'
    }
    if (formData.introduction && formData.introduction.length > 500) {
      newErrors.introduction = '角色介绍不能超过500个字符'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      await createCharacter.mutateAsync(formData)
      toast.success('角色创建成功')
      // 重置表单
      setFormData({
        projectId,
        name: '',
        introduction: '',
        gender: '',
        roleLevel: 'E',
        ageRange: '',
      })
    } catch {
      toast.error('角色创建失败')
    }
  }

  const handleReset = () => {
    setFormData({
      projectId,
      name: '',
      introduction: '',
      gender: '',
      roleLevel: 'E',
      ageRange: '',
    })
    setErrors({})
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">角色名称 *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="输入角色名称"
        />
        {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
      </div>

      <div>
        <Label htmlFor="introduction">角色介绍</Label>
        <Textarea
          id="introduction"
          value={formData.introduction || ''}
          onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
          placeholder="输入角色介绍"
          className="min-h-[100px]"
        />
        {errors.introduction && (
          <p className="text-sm text-destructive mt-1">{errors.introduction}</p>
        )}
      </div>

      <div>
        <Label htmlFor="gender">性别</Label>
        <Select
          value={formData.gender}
          onValueChange={(value) => setFormData({ ...formData, gender: value })}
        >
          <SelectTrigger id="gender">
            <SelectValue placeholder="选择性别" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="男">男</SelectItem>
            <SelectItem value="女">女</SelectItem>
            <SelectItem value="未知">未知</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="roleLevel">角色等级</Label>
        <Select
          value={formData.roleLevel}
          onValueChange={(value) =>
            setFormData({ ...formData, roleLevel: value as CreateCharacterInput['roleLevel'] })
          }
        >
          <SelectTrigger id="roleLevel">
            <SelectValue placeholder="选择等级" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="S">S - 主角</SelectItem>
            <SelectItem value="A">A - 重要角色</SelectItem>
            <SelectItem value="B">B - 次要角色</SelectItem>
            <SelectItem value="C">C - 配角</SelectItem>
            <SelectItem value="D">D - 龙套</SelectItem>
            <SelectItem value="E">E - 待定</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="ageRange">年龄范围</Label>
        <Input
          id="ageRange"
          value={formData.ageRange || ''}
          onChange={(e) => setFormData({ ...formData, ageRange: e.target.value })}
          placeholder="例如：25岁"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={createCharacter.isPending}>
          {createCharacter.isPending ? '创建中...' : '创建角色'}
        </Button>
        <Button type="button" variant="outline" onClick={handleReset}>
          重置
        </Button>
      </div>
    </form>
  )
}

describe('角色创建表单', () => {
  beforeEach(() => {
    // 重置 MSW handlers 和 mocks
    server.resetHandlers()
    vi.clearAllMocks()
  })

  it('应该正确渲染角色创建表单', () => {
    render(<TestCharacterForm />)

    // 验证表单字段
    expect(screen.getByLabelText('角色名称 *')).toBeInTheDocument()
    expect(screen.getByLabelText('角色介绍')).toBeInTheDocument()
    expect(screen.getByLabelText('性别')).toBeInTheDocument()
    expect(screen.getByLabelText('角色等级')).toBeInTheDocument()
    expect(screen.getByLabelText('年龄范围')).toBeInTheDocument()

    // 验证按钮
    expect(screen.getByRole('button', { name: '创建角色' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '重置' })).toBeInTheDocument()
  })

  it('应该允许用户输入角色名称和介绍', async () => {
    const user = userEvent.setup()
    render(<TestCharacterForm />)

    const nameInput = screen.getByLabelText('角色名称 *')
    const introductionInput = screen.getByLabelText('角色介绍')

    await user.type(nameInput, '张三')
    await user.type(introductionInput, '这是一个勇敢善良的角色')

    expect(nameInput).toHaveValue('张三')
    expect(introductionInput).toHaveValue('这是一个勇敢善良的角色')
  })

  it('应该验证角色名称必填', async () => {
    const user = userEvent.setup()
    render(<TestCharacterForm />)

    // 不输入名称直接提交
    await user.click(screen.getByRole('button', { name: '创建角色' }))

    // 验证错误消息
    expect(screen.getByText('角色名称不能为空')).toBeInTheDocument()
  })

  it('应该验证角色名称长度限制', async () => {
    const user = userEvent.setup()
    render(<TestCharacterForm />)

    const nameInput = screen.getByLabelText('角色名称 *')
    
    // 输入超过50个字符的名称
    const longName = 'a'.repeat(51)
    await user.type(nameInput, longName)

    // 提交表单
    await user.click(screen.getByRole('button', { name: '创建角色' }))

    // 验证错误消息
    expect(screen.getByText('角色名称不能超过50个字符')).toBeInTheDocument()
  })

  it('应该验证角色介绍长度限制', async () => {
    const user = userEvent.setup()
    render(<TestCharacterForm />)

    // 先输入有效的名称
    await user.type(screen.getByLabelText('角色名称 *'), '张三')
    
    // 输入超过500个字符的介绍
    const longIntroduction = 'b'.repeat(501)
    await user.type(screen.getByLabelText('角色介绍'), longIntroduction)

    // 提交表单
    await user.click(screen.getByRole('button', { name: '创建角色' }))

    // 验证错误消息
    expect(screen.getByText('角色介绍不能超过500个字符')).toBeInTheDocument()
  })

  it('应该允许选择性别', async () => {
    const user = userEvent.setup()
    render(<TestCharacterForm />)

    // 点击性别下拉
    const genderSelect = screen.getByLabelText('性别')
    await user.click(genderSelect)

    // 选择"男"
    await waitFor(() => {
      expect(screen.getByText('男')).toBeInTheDocument()
    })
    await user.click(screen.getByText('男'))

    // 验证选择成功
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: '性别' })).toHaveTextContent('男')
    })
  })

  it('应该允许选择角色等级', async () => {
    const user = userEvent.setup()
    render(<TestCharacterForm />)

    // 点击等级下拉
    const levelSelect = screen.getByLabelText('角色等级')
    await user.click(levelSelect)

    // 选择"A - 重要角色"
    await waitFor(() => {
      expect(screen.getByText('A - 重要角色')).toBeInTheDocument()
    })
    await user.click(screen.getByText('A - 重要角色'))

    // 验证选择成功
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: '角色等级' })).toHaveTextContent('A')
    })
  })

  it('应该成功提交表单并创建角色', async () => {
    const user = userEvent.setup()
    
    // 设置 API mock
    server.use(
      http.post('/api/characters', async ({ request }) => {
        const body = await request.json() as CreateCharacterInput
        return HttpResponse.json({
          id: 'new-char-123',
          projectId: body.projectId,
          name: body.name,
          introduction: body.introduction,
          gender: body.gender,
          roleLevel: body.roleLevel,
          ageRange: body.ageRange,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { status: 201 })
      })
    )

    render(<TestCharacterForm />)

    // 填写表单
    await user.type(screen.getByLabelText('角色名称 *'), '李四')
    await user.type(screen.getByLabelText('角色介绍'), '聪明独立的女主角')
    
    // 选择性别
    await user.click(screen.getByLabelText('性别'))
    await waitFor(() => expect(screen.getByText('女')).toBeInTheDocument())
    await user.click(screen.getByText('女'))

    // 选择等级
    await user.click(screen.getByLabelText('角色等级'))
    await waitFor(() => expect(screen.getByText('A - 重要角色')).toBeInTheDocument())
    await user.click(screen.getByText('A - 重要角色'))

    // 输入年龄
    await user.type(screen.getByLabelText('年龄范围'), '23岁')

    // 提交表单
    await user.click(screen.getByRole('button', { name: '创建角色' }))

    // 验证成功 toast 被调用
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('角色创建成功')
    })

    // 验证表单重置
    await waitFor(() => {
      expect(screen.getByLabelText('角色名称 *')).toHaveValue('')
      expect(screen.getByLabelText('角色介绍')).toHaveValue('')
    })
  })

  it('应该处理创建失败的情况', async () => {
    const user = userEvent.setup()
    
    // 设置失败的 API mock
    server.use(
      http.post('/api/characters', async () => {
        return HttpResponse.json(
          { error: '创建角色失败' },
          { status: 500 }
        )
      })
    )

    render(<TestCharacterForm />)

    // 填写表单
    await user.type(screen.getByLabelText('角色名称 *'), '王五')
    await user.type(screen.getByLabelText('角色介绍'), '反派角色')

    // 提交表单
    await user.click(screen.getByRole('button', { name: '创建角色' }))

    // 验证错误 toast 被调用
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('角色创建失败')
    })
  })

  it('应该能够重置表单', async () => {
    const user = userEvent.setup()
    render(<TestCharacterForm />)

    // 填写表单
    await user.type(screen.getByLabelText('角色名称 *'), '测试角色')
    await user.type(screen.getByLabelText('角色介绍'), '测试介绍')
    await user.type(screen.getByLabelText('年龄范围'), '30岁')

    // 点击重置按钮
    await user.click(screen.getByRole('button', { name: '重置' }))

    // 验证表单已重置
    expect(screen.getByLabelText('角色名称 *')).toHaveValue('')
    expect(screen.getByLabelText('角色介绍')).toHaveValue('')
    expect(screen.getByLabelText('年龄范围')).toHaveValue('')
  })

  it('应该在提交时显示加载状态', async () => {
    const user = userEvent.setup()
    
    // 延迟响应
    server.use(
      http.post('/api/characters', async () => {
        await new Promise(resolve => setTimeout(resolve, 500))
        return HttpResponse.json({
          id: 'new-char-456',
          projectId: 'test-project-1',
          name: '测试角色',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { status: 201 })
      })
    )

    render(<TestCharacterForm />)

    // 填写并提交
    await user.type(screen.getByLabelText('角色名称 *'), '测试角色')
    await user.click(screen.getByRole('button', { name: '创建角色' }))

    // 验证加载状态
    expect(screen.getByRole('button', { name: '创建中...' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '创建中...' })).toBeDisabled()
  })

  it('应该使用正确的项目ID创建角色', async () => {
    const user = userEvent.setup()
    const customProjectId = 'custom-project-123'
    let capturedProjectId = ''

    server.use(
      http.post('/api/characters', async ({ request }) => {
        const body = await request.json() as CreateCharacterInput
        capturedProjectId = body.projectId
        return HttpResponse.json({
          id: 'new-char-789',
          projectId: body.projectId,
          name: body.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { status: 201 })
      })
    )

    render(<TestCharacterForm projectId={customProjectId} />)

    await user.type(screen.getByLabelText('角色名称 *'), '角色A')
    await user.click(screen.getByRole('button', { name: '创建角色' }))

    await waitFor(() => {
      expect(capturedProjectId).toBe(customProjectId)
    })
  })

  it('应该在验证错误时阻止提交', async () => {
    const user = userEvent.setup()
    render(<TestCharacterForm />)

    // 不输入必填项直接提交
    await user.click(screen.getByRole('button', { name: '创建角色' }))

    // 验证显示错误但不调用 API
    expect(screen.getByText('角色名称不能为空')).toBeInTheDocument()
    
    // 修复错误后提交
    await user.type(screen.getByLabelText('角色名称 *'), '有效角色')
    await user.click(screen.getByRole('button', { name: '创建角色' }))

    // 错误消息应该消失
    await waitFor(() => {
      expect(screen.queryByText('角色名称不能为空')).not.toBeInTheDocument()
    })
  })
})
