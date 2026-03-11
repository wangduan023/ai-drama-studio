import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/utils'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog'

describe('Dialog', () => {
  it('应该正确渲染对话框触发器', () => {
    render(
      <Dialog>
        <DialogTrigger>打开对话框</DialogTrigger>
        <DialogContent>
          <DialogTitle>对话框标题</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    
    expect(screen.getByText('打开对话框')).toBeInTheDocument()
  })

  it('应该打开和关闭对话框', async () => {
    render(
      <Dialog>
        <DialogTrigger>打开</DialogTrigger>
        <DialogContent>
          <DialogTitle>标题</DialogTitle>
          <DialogDescription>描述内容</DialogDescription>
        </DialogContent>
      </Dialog>
    )
    
    // 点击打开
    fireEvent.click(screen.getByText('打开'))
    
    await waitFor(() => {
      expect(screen.getByText('标题')).toBeInTheDocument()
      expect(screen.getByText('描述内容')).toBeInTheDocument()
    })
  })

  it('应该支持受控模式', async () => {
    const handleOpenChange = vi.fn()
    
    render(
      <Dialog open={true} onOpenChange={handleOpenChange}>
        <DialogTrigger>打开</DialogTrigger>
        <DialogContent>
          <DialogTitle>受控对话框</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    
    expect(screen.getByText('受控对话框')).toBeInTheDocument()
  })

  it('应该渲染 DialogHeader', async () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger>打开</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>带头部的对话框</DialogTitle>
            <DialogDescription>头部描述</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
    
    await waitFor(() => {
      const header = screen.getByText('带头部的对话框').closest('[data-slot="dialog-header"]')
      expect(header).toBeInTheDocument()
    })
  })

  it('应该渲染 DialogFooter', async () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger>打开</DialogTrigger>
        <DialogContent>
          <DialogTitle>标题</DialogTitle>
          <DialogFooter data-testid="dialog-footer">
            <button>确认</button>
            <button>取消</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('dialog-footer')).toBeInTheDocument()
      expect(screen.getByText('确认')).toBeInTheDocument()
      expect(screen.getByText('取消')).toBeInTheDocument()
    })
  })

  it('应该支持 showCloseButton 属性', async () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger>打开</DialogTrigger>
        <DialogContent showCloseButton={true}>
          <DialogTitle>带关闭按钮</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    
    await waitFor(() => {
      const closeButton = screen.getByRole('button', { name: /close/i })
      expect(closeButton).toBeInTheDocument()
    })
  })

  it('应该支持隐藏关闭按钮', async () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger>打开</DialogTrigger>
        <DialogContent showCloseButton={false}>
          <DialogTitle>无关闭按钮</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    
    await waitFor(() => {
      const closeButtons = screen.queryAllByRole('button', { name: /close/i })
      expect(closeButtons.length).toBe(0)
    })
  })

  it('应该支持 DialogClose 组件', async () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger>打开</DialogTrigger>
        <DialogContent>
          <DialogTitle>标题</DialogTitle>
          <DialogClose asChild>
            <button>自定义关闭</button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    )
    
    await waitFor(() => {
      expect(screen.getByText('自定义关闭')).toBeInTheDocument()
    })
  })

  it('应该支持 Footer 中的关闭按钮', async () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger>打开</DialogTrigger>
        <DialogContent>
          <DialogTitle>标题</DialogTitle>
          <DialogFooter showCloseButton={true}>
            <button>确认</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
    
    await waitFor(() => {
      // Check for Close button by looking at the footer - the button should have data-slot="button"
      const footer = document.querySelector('[data-slot="dialog-footer"]')
      expect(footer).toBeInTheDocument()
      // The footer should contain a button with "Close" text (outline variant)
      const buttons = footer?.querySelectorAll('button')
      const hasCloseButton = Array.from(buttons || []).some(btn => btn.textContent?.includes('Close'))
      expect(hasCloseButton).toBe(true)
    })
  })

  it('应该支持自定义 className', async () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger>打开</DialogTrigger>
        <DialogContent className="custom-dialog">
          <DialogTitle className="custom-title">标题</DialogTitle>
          <DialogDescription className="custom-desc">描述</DialogDescription>
        </DialogContent>
      </Dialog>
    )
    
    await waitFor(() => {
      const content = screen.getByText('标题').closest('[data-slot="dialog-content"]')
      expect(content).toHaveClass('custom-dialog')
    })
  })

  it('应该支持默认打开状态', async () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger>打开</DialogTrigger>
        <DialogContent>
          <DialogTitle>默认打开</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    
    await waitFor(() => {
      expect(screen.getByText('默认打开')).toBeInTheDocument()
    })
  })

  it('应该渲染遮罩层', async () => {
    render(
      <Dialog defaultOpen>
        <DialogTrigger>打开</DialogTrigger>
        <DialogContent>
          <DialogTitle>标题</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    
    await waitFor(() => {
      const overlay = document.querySelector('[data-slot="dialog-overlay"]')
      expect(overlay).toBeInTheDocument()
    })
  })
})
