import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/utils'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select'

describe('Select', () => {
  it('应该正确渲染选择器', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="请选择" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">选项1</SelectItem>
          <SelectItem value="option2">选项2</SelectItem>
        </SelectContent>
      </Select>
    )
    
    const trigger = screen.getByRole('combobox')
    expect(trigger).toBeInTheDocument()
    expect(screen.getByText('请选择')).toBeInTheDocument()
  })

  it('应该支持 value 和 onValueChange', async () => {
    const handleChange = vi.fn()
    
    render(
      <Select onValueChange={handleChange}>
        <SelectTrigger>
          <SelectValue placeholder="请选择" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">苹果</SelectItem>
          <SelectItem value="banana">香蕉</SelectItem>
        </SelectContent>
      </Select>
    )
    
    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)
    
    await waitFor(() => {
      const option = screen.getByText('苹果')
      fireEvent.click(option)
    })
    
    expect(handleChange).toHaveBeenCalled()
    expect(handleChange.mock.calls[0][0]).toBe('apple')
  })

  it('应该支持 disabled 状态', () => {
    render(
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="禁用选择" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">选项1</SelectItem>
        </SelectContent>
      </Select>
    )
    
    const trigger = screen.getByRole('combobox')
    expect(trigger).toBeDisabled()
  })

  it('应该支持分组和标签', async () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="请选择水果" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>水果</SelectLabel>
            <SelectItem value="apple">苹果</SelectItem>
            <SelectItem value="orange">橙子</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>蔬菜</SelectLabel>
            <SelectItem value="carrot">胡萝卜</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    )
    
    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)
    
    await waitFor(() => {
      expect(screen.getByText('水果')).toBeInTheDocument()
      expect(screen.getByText('蔬菜')).toBeInTheDocument()
      expect(screen.getByText('苹果')).toBeInTheDocument()
      expect(screen.getByText('橙子')).toBeInTheDocument()
      expect(screen.getByText('胡萝卜')).toBeInTheDocument()
    })
  })

  it('应该支持不同尺寸', () => {
    const { rerender } = render(
      <Select>
        <SelectTrigger size="default">
          <SelectValue placeholder="默认尺寸" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">选项</SelectItem>
        </SelectContent>
      </Select>
    )
    
    expect(screen.getByRole('combobox')).toHaveAttribute('data-size', 'default')
    
    rerender(
      <Select>
        <SelectTrigger size="sm">
          <SelectValue placeholder="小尺寸" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">选项</SelectItem>
        </SelectContent>
      </Select>
    )
    
    expect(screen.getByRole('combobox')).toHaveAttribute('data-size', 'sm')
  })

  it('应该支持默认选中值', () => {
    render(
      <Select defaultValue="banana">
        <SelectTrigger>
          <SelectValue placeholder="请选择" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">苹果</SelectItem>
          <SelectItem value="banana">香蕉</SelectItem>
        </SelectContent>
      </Select>
    )
    
    // SelectValue displays the value directly, not the item text
    expect(screen.getByText('banana')).toBeInTheDocument()
  })

  it('应该支持自定义 className', () => {
    render(
      <Select>
        <SelectTrigger className="custom-trigger">
          <SelectValue placeholder="自定义" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">选项</SelectItem>
        </SelectContent>
      </Select>
    )
    
    expect(screen.getByRole('combobox')).toHaveClass('custom-trigger')
  })

  it('应该支持 disabled 选项', async () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="请选择" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="available">可用选项</SelectItem>
          <SelectItem value="disabled" disabled>禁用选项</SelectItem>
        </SelectContent>
      </Select>
    )
    
    const trigger = screen.getByRole('combobox')
    fireEvent.click(trigger)
    
    await waitFor(() => {
      const disabledOption = screen.getByText('禁用选项').closest('[data-slot="select-item"]')
      expect(disabledOption).toHaveAttribute('data-disabled')
    })
  })

  it('应该包含下拉箭头图标', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="请选择" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">选项</SelectItem>
        </SelectContent>
      </Select>
    )
    
    const trigger = screen.getByRole('combobox')
    expect(trigger.querySelector('svg')).toBeInTheDocument()
  })
})
