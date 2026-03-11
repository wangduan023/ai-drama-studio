import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/utils'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'

describe('DropdownMenu', () => {
  it('应该正确渲染下拉菜单触发器', () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>打开菜单</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>选项1</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    
    expect(screen.getByText('打开菜单')).toBeInTheDocument()
  })

  it('应该打开下拉菜单并显示选项', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>选项1</DropdownMenuItem>
          <DropdownMenuItem>选项2</DropdownMenuItem>
          <DropdownMenuItem>选项3</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    
    fireEvent.click(screen.getByText('打开'))
    
    await waitFor(() => {
      expect(screen.getByText('选项1')).toBeInTheDocument()
      expect(screen.getByText('选项2')).toBeInTheDocument()
      expect(screen.getByText('选项3')).toBeInTheDocument()
    })
  })

  it('应该支持点击菜单项', async () => {
    const handleClick = vi.fn()
    
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={handleClick}>可点击选项</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    
    fireEvent.click(screen.getByText('打开'))
    
    await waitFor(() => {
      const item = screen.getByText('可点击选项')
      fireEvent.click(item)
    })
    
    expect(handleClick).toHaveBeenCalled()
  })

  it('应该支持分组和标签', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>分组1</DropdownMenuLabel>
            <DropdownMenuItem>选项A</DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel>分组2</DropdownMenuLabel>
            <DropdownMenuItem>选项B</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    
    fireEvent.click(screen.getByText('打开'))
    
    await waitFor(() => {
      expect(screen.getByText('分组1')).toBeInTheDocument()
      expect(screen.getByText('分组2')).toBeInTheDocument()
      expect(screen.getByText('选项A')).toBeInTheDocument()
      expect(screen.getByText('选项B')).toBeInTheDocument()
    })
  })

  it('应该支持 inset 选项', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel inset>缩进标签</DropdownMenuLabel>
          <DropdownMenuItem inset>缩进选项</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    
    fireEvent.click(screen.getByText('打开'))
    
    await waitFor(() => {
      const label = screen.getByText('缩进标签')
      expect(label).toHaveAttribute('data-inset', 'true')
    })
  })

  it('应该支持 destructive 变体', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem variant="destructive">删除</DropdownMenuItem>
          <DropdownMenuItem variant="default">正常</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    
    fireEvent.click(screen.getByText('打开'))
    
    await waitFor(() => {
      const destructive = screen.getByText('删除')
      expect(destructive).toHaveAttribute('data-variant', 'destructive')
    })
  })

  it('应该支持快捷键显示', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            复制
            <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    
    fireEvent.click(screen.getByText('打开'))
    
    await waitFor(() => {
      expect(screen.getByText('⌘C')).toBeInTheDocument()
    })
  })

  it('应该支持复选框选项', async () => {
    const handleCheckedChange = vi.fn()
    
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem
            checked={false}
            onCheckedChange={handleCheckedChange}
          >
            启用功能
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    
    fireEvent.click(screen.getByText('打开'))
    
    await waitFor(() => {
      const item = screen.getByText('启用功能')
      fireEvent.click(item)
    })
    
    expect(handleCheckedChange).toHaveBeenCalled()
  })

  it('应该支持单选组', async () => {
    const handleValueChange = vi.fn()
    
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="option1" onValueChange={handleValueChange}>
            <DropdownMenuRadioItem value="option1">选项1</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="option2">选项2</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    
    fireEvent.click(screen.getByText('打开'))
    
    await waitFor(() => {
      expect(screen.getByText('选项1')).toBeInTheDocument()
      expect(screen.getByText('选项2')).toBeInTheDocument()
    })
  })

  it('应该支持子菜单', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>普通选项</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>更多</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>子选项1</DropdownMenuItem>
              <DropdownMenuItem>子选项2</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    
    fireEvent.click(screen.getByText('打开'))
    
    await waitFor(() => {
      expect(screen.getByText('更多')).toBeInTheDocument()
    })
  })

  it('应该支持不同的对齐方式', async () => {
    const { rerender } = render(
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem>选项</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    
    fireEvent.click(screen.getByText('打开'))
    
    await waitFor(() => {
      expect(screen.getByText('选项')).toBeInTheDocument()
    })
  })

  it('应该支持不同的弹出位置', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent side="top" sideOffset={8}>
          <DropdownMenuItem>顶部选项</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    
    fireEvent.click(screen.getByText('打开'))
    
    await waitFor(() => {
      expect(screen.getByText('顶部选项')).toBeInTheDocument()
    })
  })

  it('应该支持禁用选项', async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>可用</DropdownMenuItem>
          <DropdownMenuItem disabled>禁用</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    
    fireEvent.click(screen.getByText('打开'))
    
    await waitFor(() => {
      const disabledItem = screen.getByText('禁用')
      expect(disabledItem).toHaveAttribute('data-disabled')
    })
  })
})
