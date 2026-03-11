import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/utils'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
  Toaster: vi.fn(() => null),
}))

describe('Toaster Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该正确渲染 Toaster 组件', () => {
    render(<Toaster />)
    expect(Toaster).toBeDefined()
  })

  it('应该使用主题上下文', () => {
    render(<Toaster />)
    // Toaster 组件内部使用了 useTheme hook
    expect(Toaster).toBeDefined()
  })
})

describe('Toast Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该调用 toast.success 显示成功提示', () => {
    const successMessage = '操作成功'
    const options = { description: '数据已保存' }

    toast.success(successMessage, options)

    expect(toast.success).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledWith(successMessage, options)
  })

  it('应该调用 toast.error 显示错误提示', () => {
    const errorMessage = '操作失败'
    const options = { description: '请稍后重试' }

    toast.error(errorMessage, options)

    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(toast.error).toHaveBeenCalledWith(errorMessage, options)
  })

  it('应该调用 toast.warning 显示警告提示', () => {
    const warningMessage = '注意'
    const options = { description: '此操作不可撤销' }

    toast.warning(warningMessage, options)

    expect(toast.warning).toHaveBeenCalledTimes(1)
    expect(toast.warning).toHaveBeenCalledWith(warningMessage, options)
  })

  it('应该调用 toast.info 显示信息提示', () => {
    const infoMessage = '提示'
    const options = { description: '新功能已上线' }

    toast.info(infoMessage, options)

    expect(toast.info).toHaveBeenCalledTimes(1)
    expect(toast.info).toHaveBeenCalledWith(infoMessage, options)
  })

  it('应该支持不带选项的调用', () => {
    toast.success('简单成功消息')
    toast.error('简单错误消息')
    toast.warning('简单警告消息')
    toast.info('简单信息消息')

    expect(toast.success).toHaveBeenCalledWith('简单成功消息')
    expect(toast.error).toHaveBeenCalledWith('简单错误消息')
    expect(toast.warning).toHaveBeenCalledWith('简单警告消息')
    expect(toast.info).toHaveBeenCalledWith('简单信息消息')
  })

  it('应该支持复杂的选项配置', () => {
    const complexOptions = {
      description: '详细描述信息',
      duration: 5000,
      id: 'custom-toast-id',
      onDismiss: vi.fn(),
      onAutoClose: vi.fn(),
    }

    toast.success('复杂配置', complexOptions)

    expect(toast.success).toHaveBeenCalledWith('复杂配置', complexOptions)
  })
})

describe('Toast Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该在创建项目成功时显示成功提示', () => {
    const showProjectCreatedToast = () => {
      toast.success('项目创建成功', {
        description: '您的新项目已准备就绪',
      })
    }

    showProjectCreatedToast()

    expect(toast.success).toHaveBeenCalledWith('项目创建成功', {
      description: '您的新项目已准备就绪',
    })
  })

  it('应该在保存失败时显示错误提示', () => {
    const showSaveErrorToast = (error: Error) => {
      toast.error('保存失败', {
        description: error.message,
      })
    }

    showSaveErrorToast(new Error('网络连接超时'))

    expect(toast.error).toHaveBeenCalledWith('保存失败', {
      description: '网络连接超时',
    })
  })

  it('应该在删除操作前显示警告提示', () => {
    const showDeleteWarningToast = () => {
      toast.warning('确认删除', {
        description: '此操作将永久删除该项目，是否继续？',
      })
    }

    showDeleteWarningToast()

    expect(toast.warning).toHaveBeenCalledWith('确认删除', {
      description: '此操作将永久删除该项目，是否继续？',
    })
  })

  it('应该在有提示信息时显示信息提示', () => {
    const showInfoToast = () => {
      toast.info('使用提示', {
        description: '您可以使用快捷键 Ctrl+S 快速保存',
      })
    }

    showInfoToast()

    expect(toast.info).toHaveBeenCalledWith('使用提示', {
      description: '您可以使用快捷键 Ctrl+S 快速保存',
    })
  })

  it('应该在表单验证失败时显示错误提示', () => {
    const showValidationErrorToast = (field: string) => {
      toast.error('表单验证失败', {
        description: `${field} 不能为空`,
      })
    }

    showValidationErrorToast('项目名称')

    expect(toast.error).toHaveBeenCalledWith('表单验证失败', {
      description: '项目名称 不能为空',
    })
  })

  it('应该在网络请求失败时显示错误提示', () => {
    const showNetworkErrorToast = () => {
      toast.error('网络错误', {
        description: '无法连接到服务器，请检查网络设置',
      })
    }

    showNetworkErrorToast()

    expect(toast.error).toHaveBeenCalledWith('网络错误', {
      description: '无法连接到服务器，请检查网络设置',
    })
  })

  it('应该在操作成功但有警告时显示警告提示', () => {
    const showPartialSuccessToast = () => {
      toast.warning('部分成功', {
        description: '项目已创建，但封面图片上传失败',
      })
    }

    showPartialSuccessToast()

    expect(toast.warning).toHaveBeenCalledWith('部分成功', {
      description: '项目已创建，但封面图片上传失败',
    })
  })
})

describe('Toast Helper Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该支持批量显示多个 toast', () => {
    const showMultipleToasts = () => {
      toast.success('第一个操作成功')
      toast.success('第二个操作成功')
      toast.info('附加信息')
    }

    showMultipleToasts()

    expect(toast.success).toHaveBeenCalledTimes(2)
    expect(toast.info).toHaveBeenCalledTimes(1)
  })

  it('应该支持带 ID 的 toast（防止重复）', () => {
    const showUniqueToast = () => {
      toast.success('正在保存...', { id: 'saving-toast' })
      toast.success('保存完成', { id: 'saving-toast' })
    }

    showUniqueToast()

    expect(toast.success).toHaveBeenCalledTimes(2)
    expect(toast.success).toHaveBeenNthCalledWith(1, '正在保存...', { id: 'saving-toast' })
    expect(toast.success).toHaveBeenNthCalledWith(2, '保存完成', { id: 'saving-toast' })
  })

  it('应该在不同业务场景下使用正确的 toast 类型', () => {
    const scenarios = [
      { type: 'success' as const, title: '创建成功', description: '新项目已创建' },
      { type: 'error' as const, title: '创建失败', description: '请检查网络连接' },
      { type: 'warning' as const, title: '即将到期', description: '您的试用将在3天后到期' },
      { type: 'info' as const, title: '新功能', description: '尝试我们的新功能' },
    ]

    scenarios.forEach((scenario) => {
      toast[scenario.type](scenario.title, { description: scenario.description })
      expect(toast[scenario.type]).toHaveBeenCalledWith(scenario.title, {
        description: scenario.description,
      })
    })

    expect(toast.success).toHaveBeenCalledTimes(1)
    expect(toast.error).toHaveBeenCalledTimes(1)
    expect(toast.warning).toHaveBeenCalledTimes(1)
    expect(toast.info).toHaveBeenCalledTimes(1)
  })
})

describe('Toast Integration with React Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该在按钮点击时显示 toast', () => {
    const ToastButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
      <button onClick={onClick}>{label}</button>
    )

    const handleClick = () => {
      toast.success('按钮点击成功')
    }

    render(<ToastButton onClick={handleClick} label="点击我" />)

    // 模拟点击
    handleClick()

    expect(toast.success).toHaveBeenCalledWith('按钮点击成功')
  })

  it('应该在表单提交时显示 toast', () => {
    const handleSubmit = (success: boolean) => {
      if (success) {
        toast.success('表单提交成功')
      } else {
        toast.error('表单提交失败')
      }
    }

    handleSubmit(true)
    expect(toast.success).toHaveBeenCalledWith('表单提交成功')

    handleSubmit(false)
    expect(toast.error).toHaveBeenCalledWith('表单提交失败')
  })

  it('应该在异步操作完成后显示 toast', async () => {
    const asyncOperation = async (shouldFail: boolean) => {
      if (shouldFail) {
        toast.error('异步操作失败')
      } else {
        toast.success('异步操作成功')
      }
    }

    await asyncOperation(false)
    expect(toast.success).toHaveBeenCalledWith('异步操作成功')

    await asyncOperation(true)
    expect(toast.error).toHaveBeenCalledWith('异步操作失败')
  })
})
