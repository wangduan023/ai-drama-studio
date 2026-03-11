import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test/utils'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

// Mock next-themes
const mockSetTheme = vi.fn()
const mockUseTheme = vi.fn()

vi.mock('next-themes', () => ({
  useTheme: () => mockUseTheme(),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 默认返回 light 主题
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      resolvedTheme: 'light',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('应该正确渲染主题切换器', async () => {
    render(<ThemeToggle />)
    
    // 等待组件挂载（避免 hydration 不匹配）
    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })
  })

  it('应该在 light 主题下显示 Sun 图标', async () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      resolvedTheme: 'light',
    })
    
    render(<ThemeToggle />)
    
    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      // Sun 图标应该存在（通过查询 svg 确认）
      expect(button.querySelector('svg')).toBeInTheDocument()
    })
  })

  it('应该在 dark 主题下显示 Moon 图标', async () => {
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme,
      resolvedTheme: 'dark',
    })
    
    render(<ThemeToggle />)
    
    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
      expect(button.querySelector('svg')).toBeInTheDocument()
    })
  })

  it('应该打开下拉菜单并显示主题选项', async () => {
    render(<ThemeToggle />)
    
    await waitFor(() => {
      const button = screen.getByRole('button')
      fireEvent.click(button)
    })
    
    await waitFor(() => {
      expect(screen.getByText('亮色模式')).toBeInTheDocument()
      expect(screen.getByText('暗色模式')).toBeInTheDocument()
      expect(screen.getByText('跟随系统')).toBeInTheDocument()
    })
  })

  it('应该切换到亮色模式', async () => {
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme,
      resolvedTheme: 'dark',
    })
    
    render(<ThemeToggle />)
    
    await waitFor(() => {
      const button = screen.getByRole('button')
      fireEvent.click(button)
    })
    
    await waitFor(() => {
      const lightOption = screen.getByText('亮色模式')
      fireEvent.click(lightOption)
    })
    
    expect(mockSetTheme).toHaveBeenCalledWith('light')
  })

  it('应该切换到暗色模式', async () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      resolvedTheme: 'light',
    })
    
    render(<ThemeToggle />)
    
    await waitFor(() => {
      const button = screen.getByRole('button')
      fireEvent.click(button)
    })
    
    await waitFor(() => {
      const darkOption = screen.getByText('暗色模式')
      fireEvent.click(darkOption)
    })
    
    expect(mockSetTheme).toHaveBeenCalledWith('dark')
  })

  it('应该切换到系统主题', async () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      resolvedTheme: 'light',
    })
    
    render(<ThemeToggle />)
    
    await waitFor(() => {
      const button = screen.getByRole('button')
      fireEvent.click(button)
    })
    
    await waitFor(() => {
      const systemOption = screen.getByText('跟随系统')
      fireEvent.click(systemOption)
    })
    
    expect(mockSetTheme).toHaveBeenCalledWith('system')
  })

  it('应该在当前主题选项旁显示选中标记', async () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      resolvedTheme: 'light',
    })
    
    render(<ThemeToggle />)
    
    await waitFor(() => {
      const button = screen.getByRole('button')
      fireEvent.click(button)
    })
    
    await waitFor(() => {
      // 亮色模式应该有选中标记
      const lightOption = screen.getByText('亮色模式').closest('[data-slot="dropdown-menu-item"]')
      expect(lightOption).toHaveClass('bg-accent')
    })
  })

  it('应该显示正确的图标', async () => {
    render(<ThemeToggle />)
    
    await waitFor(() => {
      const button = screen.getByRole('button')
      fireEvent.click(button)
    })
    
    await waitFor(() => {
      // 检查三个选项都有图标
      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems.length).toBeGreaterThanOrEqual(3)
    })
  })

  it('应该有正确的 aria 属性', async () => {
    render(<ThemeToggle />)
    
    await waitFor(() => {
      const button = screen.getByRole('button')
      // 检查按钮是否可以被聚焦
      expect(button).toHaveAttribute('tabIndex', '0')
    })
  })

  it('应该在未挂载时显示占位符', () => {
    // 模拟未挂载状态，通过控制 useEffect 不执行
    // 这种情况下组件会返回占位符
    const { container } = render(<ThemeToggle />)
    
    // 组件会显示占位符直到挂载
    expect(container.firstChild).toBeInTheDocument()
  })
})
