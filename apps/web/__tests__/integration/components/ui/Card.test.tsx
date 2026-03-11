import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/utils'
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from '@/components/ui/card'

describe('Card', () => {
  it('应该正确渲染卡片', () => {
    render(
      <Card>
        <CardContent>卡片内容</CardContent>
      </Card>
    )
    
    const card = screen.getByText('卡片内容').closest('[data-slot="card"]')
    expect(card).toBeInTheDocument()
  })

  it('应该渲染完整的卡片结构', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>卡片标题</CardTitle>
          <CardDescription>卡片描述</CardDescription>
        </CardHeader>
        <CardContent>卡片内容</CardContent>
        <CardFooter>卡片页脚</CardFooter>
      </Card>
    )
    
    expect(screen.getByText('卡片标题')).toBeInTheDocument()
    expect(screen.getByText('卡片描述')).toBeInTheDocument()
    expect(screen.getByText('卡片内容')).toBeInTheDocument()
    expect(screen.getByText('卡片页脚')).toBeInTheDocument()
  })

  it('应该支持自定义 className', () => {
    render(
      <Card className="custom-card">
        <CardContent>内容</CardContent>
      </Card>
    )
    
    const card = screen.getByText('内容').closest('[data-slot="card"]')
    expect(card).toHaveClass('custom-card')
  })

  it('应该支持不同的尺寸', () => {
    const { rerender } = render(
      <Card size="default">
        <CardContent>默认尺寸</CardContent>
      </Card>
    )
    
    let card = screen.getByText('默认尺寸').closest('[data-slot="card"]')
    expect(card).toHaveAttribute('data-size', 'default')
    
    rerender(
      <Card size="sm">
        <CardContent>小尺寸</CardContent>
      </Card>
    )
    
    card = screen.getByText('小尺寸').closest('[data-slot="card"]')
    expect(card).toHaveAttribute('data-size', 'sm')
  })

  it('应该支持 CardAction', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>标题</CardTitle>
          <CardAction>
            <button>操作按钮</button>
          </CardAction>
        </CardHeader>
        <CardContent>内容</CardContent>
      </Card>
    )
    
    expect(screen.getByText('操作按钮')).toBeInTheDocument()
  })

  it('应该支持点击事件', () => {
    const handleClick = vi.fn()
    
    render(
      <Card onClick={handleClick}>
        <CardContent>可点击卡片</CardContent>
      </Card>
    )
    
    const card = screen.getByText('可点击卡片').closest('[data-slot="card"]')
    card?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(handleClick).toHaveBeenCalled()
  })

  it('应该正确渲染 CardTitle', () => {
    render(<CardTitle className="custom-title">自定义标题</CardTitle>)
    
    const title = screen.getByText('自定义标题')
    expect(title).toHaveAttribute('data-slot', 'card-title')
    expect(title).toHaveClass('custom-title')
  })

  it('应该正确渲染 CardDescription', () => {
    render(<CardDescription className="custom-desc">描述文字</CardDescription>)
    
    const desc = screen.getByText('描述文字')
    expect(desc).toHaveAttribute('data-slot', 'card-description')
    expect(desc).toHaveClass('custom-desc')
  })

  it('应该正确渲染 CardHeader', () => {
    render(
      <CardHeader className="custom-header">
        <CardTitle>标题</CardTitle>
      </CardHeader>
    )
    
    const header = screen.getByText('标题').closest('[data-slot="card-header"]')
    expect(header).toHaveClass('custom-header')
  })

  it('应该正确渲染 CardFooter', () => {
    render(
      <CardFooter className="custom-footer">页脚内容</CardFooter>
    )
    
    const footer = screen.getByText('页脚内容')
    expect(footer).toHaveAttribute('data-slot', 'card-footer')
    expect(footer).toHaveClass('custom-footer')
  })

  it('应该正确渲染 CardContent', () => {
    render(
      <CardContent className="custom-content">内容区域</CardContent>
    )
    
    const content = screen.getByText('内容区域')
    expect(content).toHaveAttribute('data-slot', 'card-content')
    expect(content).toHaveClass('custom-content')
  })

  it('应该支持嵌套内容', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>
            <span data-testid="nested-title">嵌套标题</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div data-testid="nested-content">
            <p>嵌套段落</p>
          </div>
        </CardContent>
      </Card>
    )
    
    expect(screen.getByTestId('nested-title')).toBeInTheDocument()
    expect(screen.getByTestId('nested-content')).toBeInTheDocument()
    expect(screen.getByText('嵌套段落')).toBeInTheDocument()
  })
})
