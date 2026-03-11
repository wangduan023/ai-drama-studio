import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocationList, LocationListSkeleton } from '@/components/cards/LocationList'
import type { Location } from '@/components/cards/LocationList'

// Mock 地点数据
const mockLocations: Location[] = [
  {
    id: 'loc-1',
    name: '咖啡厅',
    type: 'indoor',
    description: '温馨的街角咖啡厅，主角们经常在这里相遇',
    images: ['/images/cafe.jpg'],
  },
  {
    id: 'loc-2',
    name: '城市公园',
    type: 'outdoor',
    description: '繁华的都市绿地，适合拍摄户外场景',
    images: [],
  },
  {
    id: 'loc-3',
    name: '虚拟场景',
    type: 'virtual',
    description: '使用绿幕技术创建的虚拟背景',
    images: null as unknown as undefined,
  },
]

describe('LocationList', () => {
  it('应该正确渲染地点列表', () => {
    render(<LocationList locations={mockLocations} />)

    // 验证所有地点名称显示
    mockLocations.forEach((location) => {
      expect(screen.getByText(location.name)).toBeInTheDocument()
    })

    // 验证地点类型显示
    expect(screen.getByText('indoor')).toBeInTheDocument()
    expect(screen.getByText('outdoor')).toBeInTheDocument()
    expect(screen.getByText('virtual')).toBeInTheDocument()
  })

  it('应该显示地点描述', () => {
    render(<LocationList locations={mockLocations} />)

    expect(screen.getByText('温馨的街角咖啡厅，主角们经常在这里相遇')).toBeInTheDocument()
    expect(screen.getByText('繁华的都市绿地，适合拍摄户外场景')).toBeInTheDocument()
  })

  it('应该在可编辑模式下显示编辑和删除按钮', () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()

    render(
      <LocationList
        locations={mockLocations}
        editable={true}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    )

    // 获取所有按钮（编辑和删除按钮）
    const buttons = screen.getAllByRole('button')
    // 每个地点应该有2个按钮（编辑和删除），共6个
    expect(buttons.length).toBe(mockLocations.length * 2)
  })

  it('应该在非可编辑模式下隐藏编辑和删除按钮', () => {
    render(<LocationList locations={mockLocations} editable={false} />)

    // 验证编辑和删除按钮不存在
    expect(screen.queryByRole('button', { name: /编辑/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /删除/i })).not.toBeInTheDocument()
  })

  it('应该触发编辑回调', () => {
    const onEdit = vi.fn()

    render(
      <LocationList
        locations={mockLocations}
        editable={true}
        onEdit={onEdit}
      />
    )

    // 点击第一个地点的编辑按钮（第一个按钮是编辑按钮）
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])

    expect(onEdit).toHaveBeenCalledWith(mockLocations[0])
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('应该触发删除回调', () => {
    const onDelete = vi.fn()

    render(
      <LocationList
        locations={mockLocations}
        editable={true}
        onDelete={onDelete}
      />
    )

    // 点击第一个地点的删除按钮
    // 由于只传递了 onDelete 而没有 onEdit，每个地点只有一个删除按钮
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])

    expect(onDelete).toHaveBeenCalledWith('loc-1')
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('应该显示添加按钮当提供 onAdd 回调', () => {
    const onAdd = vi.fn()

    render(<LocationList locations={mockLocations} onAdd={onAdd} />)

    const addButton = screen.getByRole('button', { name: /添加场景/i })
    expect(addButton).toBeInTheDocument()

    // 点击添加按钮
    fireEvent.click(addButton)
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it('应该在地点列表为空时正确渲染', () => {
    const onAdd = vi.fn()

    render(<LocationList locations={[]} onAdd={onAdd} />)

    // 应该显示添加按钮
    expect(screen.getByRole('button', { name: /添加场景/i })).toBeInTheDocument()

    // 不应该有任何地点名称
    expect(screen.queryByText('咖啡厅')).not.toBeInTheDocument()
  })

  it('应该处理没有图片的地点', () => {
    const locationsWithoutImages = [
      {
        id: 'loc-4',
        name: '无图片场景',
        type: 'indoor',
        description: '这是一个没有图片的场景',
      },
    ]

    render(<LocationList locations={locationsWithoutImages} />)

    expect(screen.getByText('无图片场景')).toBeInTheDocument()
  })
})

describe('LocationListSkeleton', () => {
  it('应该渲染骨架屏', () => {
    const { container } = render(<LocationListSkeleton />)

    // 验证骨架屏元素存在
    const skeletonElements = container.querySelectorAll('.animate-pulse')
    expect(skeletonElements.length).toBeGreaterThan(0)
  })
})
