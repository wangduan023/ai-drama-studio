import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test/utils'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('应该正确渲染按钮', () => {
    render(<Button>点击我</Button>)
    
    const button = screen.getByRole('button', { name: '点击我' })
    expect(button).toBeInTheDocument()
  })

  it('应该支持不同的 variant', () => {
    const { rerender } = render(<Button variant="default">默认</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<Button variant="outline">轮廓</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<Button variant="secondary">次要</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<Button variant="ghost">幽灵</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<Button variant="destructive">危险</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<Button variant="link">链接</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('应该支持不同的 size', () => {
    const { rerender } = render(<Button size="default">默认</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<Button size="xs">超小</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<Button size="sm">小</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<Button size="lg">大</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<Button size="icon">图标</Button>)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('应该触发点击事件', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>点击我</Button>)
    
    const button = screen.getByRole('button', { name: '点击我' })
    fireEvent.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('应该支持 disabled 状态', () => {
    const handleClick = vi.fn()
    render(<Button disabled onClick={handleClick}>禁用</Button>)
    
    const button = screen.getByRole('button', { name: '禁用' })
    expect(button).toBeDisabled()
    
    fireEvent.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('应该支持自定义 className', () => {
    render(<Button className="custom-class">自定义样式</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })

  it('应该正确传递 type 属性', () => {
    render(<Button type="submit">提交</Button>)
    
    const button = screen.getByRole('button', { name: '提交' })
    expect(button).toHaveAttribute('type', 'submit')
  })

  it('应该支持 aria 属性', () => {
    render(
      <Button aria-label="关闭对话框" aria-expanded="true">
        关闭
      </Button>
    )
    
    const button = screen.getByRole('button', { name: '关闭对话框' })
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })

  it('应该渲染子元素', () => {
    render(
      <Button>
        <span data-testid="child">子元素</span>
      </Button>
    )
    
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })
})
