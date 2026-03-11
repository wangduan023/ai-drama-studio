import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProjectCard } from '@/components/cards/ProjectCard'

// Mock 项目数据
const mockProject = {
  id: 'test-1',
  title: '测试项目',
  description: '这是一个测试项目描述',
  episodes: 5,
  status: 'in_progress' as const,
  updatedAt: '2024-01-15T10:00:00Z',
}

describe('ProjectCard', () => {
  it('应该正确渲染项目信息', () => {
    render(
      <ProjectCard
        id={mockProject.id}
        title={mockProject.title}
        description={mockProject.description}
        episodes={mockProject.episodes}
        status={mockProject.status}
        updatedAt={mockProject.updatedAt}
      />
    )

    // 验证标题显示
    expect(screen.getByText(mockProject.title)).toBeInTheDocument()
    
    // 验证描述显示
    expect(screen.getByText(mockProject.description)).toBeInTheDocument()
    
    // 验证集数显示
    expect(screen.getByText('5 集')).toBeInTheDocument()
    
    // 验证状态标签
    expect(screen.getByText('制作中')).toBeInTheDocument()
  })

  it('应该显示"已完成"状态', () => {
    render(
      <ProjectCard
        id="test-2"
        title="已完成项目"
        description="描述"
        episodes={10}
        status="completed"
        updatedAt="2024-01-15T10:00:00Z"
      />
    )

    expect(screen.getByText('已完成')).toBeInTheDocument()
  })

  it('应该正确格式化日期', () => {
    render(
      <ProjectCard
        id="test-3"
        title="日期测试"
        description="描述"
        episodes={1}
        status="in_progress"
        updatedAt="2024-01-15T10:00:00Z"
      />
    )

    // 验证日期格式化为本地格式
    expect(screen.getByText('2024/1/15')).toBeInTheDocument()
  })

  it('应该包含正确的链接', () => {
    render(
      <ProjectCard
        id={mockProject.id}
        title={mockProject.title}
        description={mockProject.description}
        episodes={mockProject.episodes}
        status={mockProject.status}
        updatedAt={mockProject.updatedAt}
      />
    )

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', `/projects/${mockProject.id}`)
  })
})
