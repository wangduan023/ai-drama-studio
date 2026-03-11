import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/utils'
import { Badge } from '@/components/ui/badge'

describe('Badge', () => {
  it('应该正确渲染徽章', () => {
    render(<Badge>徽章内容</Badge>)
    
    const badge = screen.getByText('徽章内容')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('data-slot', 'badge')
  })

  it('应该支持不同的 variant', () => {
    const { rerender } = render(<Badge variant="default">默认</Badge>)
    expect(screen.getByText('默认')).toBeInTheDocument()

    rerender(<Badge variant="secondary">次要</Badge>)
    expect(screen.getByText('次要')).toBeInTheDocument()

    rerender(<Badge variant="destructive">危险</Badge>)
    expect(screen.getByText('危险')).toBeInTheDocument()

    rerender(<Badge variant="outline">轮廓</Badge>)
    expect(screen.getByText('轮廓')).toBeInTheDocument()

    rerender(<Badge variant="ghost">幽灵</Badge>)
    expect(screen.getByText('幽灵')).toBeInTheDocument()

    rerender(<Badge variant="link">链接</Badge>)
    expect(screen.getByText('链接')).toBeInTheDocument()
  })

  it('应该支持自定义 className', () => {
    render(<Badge className="custom-badge">自定义样式</Badge>)
    
    const badge = screen.getByText('自定义样式')
    expect(badge).toHaveClass('custom-badge')
  })

  it('应该渲染为 span 元素', () => {
    render(<Badge>文本徽章</Badge>)
    
    const badge = screen.getByText('文本徽章')
    expect(badge.tagName.toLowerCase()).toBe('span')
  })

  it('应该支持子元素', () => {
    render(
      <Badge>
        <span data-testid="badge-icon">🔔</span>
        <span>通知</span>
      </Badge>
    )
    
    expect(screen.getByTestId('badge-icon')).toBeInTheDocument()
    expect(screen.getByText('通知')).toBeInTheDocument()
  })

  it('应该支持 aria 属性', () => {
    render(
      <Badge aria-label="状态徽章" role="status">
        状态
      </Badge>
    )
    
    const badge = screen.getByLabelText('状态徽章')
    expect(badge).toHaveAttribute('role', 'status')
  })

  it('应该支持 render 属性来自定义渲染', () => {
    render(
      <Badge render={<a href="/link">链接徽章</a>}>
        链接徽章
      </Badge>
    )
    
    const badge = screen.getByText('链接徽章')
    expect(badge.tagName.toLowerCase()).toBe('a')
    expect(badge).toHaveAttribute('href', '/link')
  })

  it('应该传递其他 HTML 属性', () => {
    render(
      <Badge id="status-badge" data-status="active">
        激活
      </Badge>
    )
    
    const badge = screen.getByText('激活')
    expect(badge).toHaveAttribute('id', 'status-badge')
    expect(badge).toHaveAttribute('data-status', 'active')
  })

  it('应该支持数字内容', () => {
    render(<Badge>99+</Badge>)
    
    expect(screen.getByText('99+')).toBeInTheDocument()
  })

  it('应该支持图标和文字组合', () => {
    render(
      <Badge>
        <svg data-testid="icon" width="12" height="12" />
        带图标
      </Badge>
    )
    
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByText('带图标')).toBeInTheDocument()
  })
})
