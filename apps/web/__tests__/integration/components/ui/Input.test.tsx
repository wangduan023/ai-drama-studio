import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test/utils'
import { Input } from '@/components/ui/input'

describe('Input', () => {
  it('应该正确渲染输入框', () => {
    render(<Input placeholder="请输入" />)
    
    const input = screen.getByPlaceholderText('请输入')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('data-slot', 'input')
  })

  it('应该支持 value 和 onChange', () => {
    const handleChange = vi.fn()
    render(<Input value="测试值" onChange={handleChange} />)
    
    const input = screen.getByDisplayValue('测试值')
    expect(input).toBeInTheDocument()
    
    fireEvent.change(input, { target: { value: '新值' } })
    expect(handleChange).toHaveBeenCalled()
  })

  it('应该支持不同的 type', () => {
    const { rerender } = render(<Input type="text" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text')

    rerender(<Input type="password" data-testid="password-input" />)
    expect(screen.getByTestId('password-input')).toHaveAttribute('type', 'password')

    rerender(<Input type="email" data-testid="email-input" />)
    expect(screen.getByTestId('email-input')).toHaveAttribute('type', 'email')

    rerender(<Input type="number" data-testid="number-input" />)
    expect(screen.getByTestId('number-input')).toHaveAttribute('type', 'number')
  })

  it('应该支持 disabled 状态', () => {
    render(<Input disabled placeholder="禁用输入" />)
    
    const input = screen.getByPlaceholderText('禁用输入')
    expect(input).toBeDisabled()
  })

  it('应该支持自定义 className', () => {
    render(<Input className="custom-input" placeholder="自定义" />)
    
    const input = screen.getByPlaceholderText('自定义')
    expect(input).toHaveClass('custom-input')
  })

  it('应该支持 placeholder', () => {
    render(<Input placeholder="请输入用户名" />)
    
    expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument()
  })

  it('应该支持 name 属性', () => {
    render(<Input name="username" placeholder="用户名" />)
    
    const input = screen.getByPlaceholderText('用户名')
    expect(input).toHaveAttribute('name', 'username')
  })

  it('应该支持 id 属性', () => {
    render(<Input id="user-id" placeholder="用户ID" />)
    
    const input = screen.getByPlaceholderText('用户ID')
    expect(input).toHaveAttribute('id', 'user-id')
  })

  it('应该支持 aria 属性', () => {
    render(
      <Input 
        aria-label="搜索输入" 
        aria-required="true"
        placeholder="搜索"
      />
    )
    
    const input = screen.getByLabelText('搜索输入')
    expect(input).toHaveAttribute('aria-required', 'true')
  })

  it('应该支持 readOnly 属性', () => {
    render(<Input readOnly value="只读内容" />)
    
    const input = screen.getByDisplayValue('只读内容')
    expect(input).toHaveAttribute('readonly')
  })

  it('应该支持 required 属性', () => {
    render(<Input required placeholder="必填项" />)
    
    const input = screen.getByPlaceholderText('必填项')
    expect(input).toBeRequired()
  })

  it('应该支持 focus 和 blur 事件', () => {
    const handleFocus = vi.fn()
    const handleBlur = vi.fn()
    
    render(
      <Input 
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="焦点测试"
      />
    )
    
    const input = screen.getByPlaceholderText('焦点测试')
    
    fireEvent.focus(input)
    expect(handleFocus).toHaveBeenCalledTimes(1)
    
    fireEvent.blur(input)
    expect(handleBlur).toHaveBeenCalledTimes(1)
  })

  it('应该支持 keyDown 事件', () => {
    const handleKeyDown = vi.fn()
    
    render(<Input onKeyDown={handleKeyDown} placeholder="键盘事件" />)
    
    const input = screen.getByPlaceholderText('键盘事件')
    fireEvent.keyDown(input, { key: 'Enter' })
    
    expect(handleKeyDown).toHaveBeenCalled()
  })
})
