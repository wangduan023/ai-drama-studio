import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CharacterList, CharacterListSkeleton } from '@/components/cards/CharacterList'
import type { Character } from '@/components/cards/CharacterList'

// Mock 角色数据
const mockCharacters: Character[] = [
  {
    id: 'char-1',
    name: '张三',
    role: '主角',
    description: '勇敢善良的年轻人，故事的核心人物',
    avatar: null,
    profileImage: null,
  },
  {
    id: 'char-2',
    name: '李四',
    role: '女主角',
    description: '聪明独立的女主角',
    avatar: '/images/avatar1.jpg',
    profileImage: null,
  },
  {
    id: 'char-3',
    name: '王五',
    role: '配角',
    description: '张三的好友',
    avatar: null,
    profileImage: '/images/profile.jpg',
  },
]

describe('CharacterList', () => {
  it('应该正确渲染角色列表', () => {
    render(<CharacterList characters={mockCharacters} />)

    // 验证所有角色名称显示
    mockCharacters.forEach((character) => {
      expect(screen.getByText(character.name)).toBeInTheDocument()
    })

    // 验证角色职位显示
    expect(screen.getByText('主角')).toBeInTheDocument()
    expect(screen.getByText('女主角')).toBeInTheDocument()
    expect(screen.getByText('配角')).toBeInTheDocument()
  })

  it('应该显示角色描述', () => {
    render(<CharacterList characters={mockCharacters} />)

    expect(screen.getByText('勇敢善良的年轻人，故事的核心人物')).toBeInTheDocument()
    expect(screen.getByText('聪明独立的女主角')).toBeInTheDocument()
  })

  it('应该在可编辑模式下显示编辑和删除按钮', () => {
    const onEdit = vi.fn()
    const onDelete = vi.fn()

    render(
      <CharacterList
        characters={mockCharacters}
        editable={true}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    )

    // 获取所有按钮（编辑和删除按钮）
    const buttons = screen.getAllByRole('button')
    // 每个角色应该有2个按钮（编辑和删除），共6个
    expect(buttons.length).toBe(mockCharacters.length * 2)
  })

  it('应该在非可编辑模式下隐藏编辑和删除按钮', () => {
    render(<CharacterList characters={mockCharacters} editable={false} />)

    // 验证编辑和删除按钮不存在
    expect(screen.queryByRole('button', { name: /编辑/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /删除/i })).not.toBeInTheDocument()
  })

  it('应该触发编辑回调', () => {
    const onEdit = vi.fn()

    render(
      <CharacterList
        characters={mockCharacters}
        editable={true}
        onEdit={onEdit}
      />
    )

    // 点击第一个角色的编辑按钮（第一个按钮是编辑按钮）
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])

    expect(onEdit).toHaveBeenCalledWith(mockCharacters[0])
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('应该触发删除回调', () => {
    const onDelete = vi.fn()

    render(
      <CharacterList
        characters={mockCharacters}
        editable={true}
        onDelete={onDelete}
      />
    )

    // 点击第一个角色的删除按钮
    // 由于只传递了 onDelete 而没有 onEdit，每个角色只有一个删除按钮
    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])

    expect(onDelete).toHaveBeenCalledWith('char-1')
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('应该显示添加按钮当提供 onAdd 回调', () => {
    const onAdd = vi.fn()

    render(<CharacterList characters={mockCharacters} onAdd={onAdd} />)

    const addButton = screen.getByRole('button', { name: /添加角色/i })
    expect(addButton).toBeInTheDocument()

    // 点击添加按钮
    fireEvent.click(addButton)
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it('应该在角色列表为空时正确渲染', () => {
    const onAdd = vi.fn()

    render(<CharacterList characters={[]} onAdd={onAdd} />)

    // 应该显示添加按钮
    expect(screen.getByRole('button', { name: /添加角色/i })).toBeInTheDocument()

    // 不应该有任何角色名称
    expect(screen.queryByText('张三')).not.toBeInTheDocument()
  })
})

describe('CharacterListSkeleton', () => {
  it('应该渲染骨架屏', () => {
    const { container } = render(<CharacterListSkeleton />)

    // 验证骨架屏元素存在
    const skeletonElements = container.querySelectorAll('.animate-pulse')
    expect(skeletonElements.length).toBeGreaterThan(0)
  })
})
