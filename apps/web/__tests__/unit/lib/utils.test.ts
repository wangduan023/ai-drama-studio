import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn()', () => {
  describe('正常输入', () => {
    it('应该合并多个 className 字符串', () => {
      const result = cn('class1', 'class2', 'class3')
      expect(result).toBe('class1 class2 class3')
    })

    it('应该正确处理单个 className', () => {
      const result = cn('single-class')
      expect(result).toBe('single-class')
    })

    it('应该正确处理空字符串', () => {
      const result = cn('')
      expect(result).toBe('')
    })
  })

  describe('条件类名', () => {
    it('应该正确处理条件对象', () => {
      const result = cn('base', { active: true, disabled: false })
      expect(result).toBe('base active')
    })

    it('应该正确处理多个条件对象', () => {
      const result = cn('base', { active: true }, { hidden: false, visible: true })
      expect(result).toBe('base active visible')
    })

    it('应该正确处理所有条件都为 false 的情况', () => {
      const result = cn('base', { active: false, disabled: false })
      expect(result).toBe('base')
    })
  })

  describe('数组类名', () => {
    it('应该正确处理数组输入', () => {
      const result = cn(['class1', 'class2'])
      expect(result).toBe('class1 class2')
    })

    it('应该正确处理嵌套数组', () => {
      const result = cn(['class1', ['class2', 'class3']])
      expect(result).toBe('class1 class2 class3')
    })

    it('应该正确处理混合数组和对象', () => {
      const result = cn(['base', { active: true }])
      expect(result).toBe('base active')
    })
  })

  describe('Tailwind 类名合并', () => {
    it('应该正确处理冲突的 Tailwind 类名', () => {
      const result = cn('px-2 py-1', 'px-4')
      expect(result).toBe('py-1 px-4')
    })

    it('应该正确处理颜色类名冲突', () => {
      const result = cn('text-red-500', 'text-blue-500')
      expect(result).toBe('text-blue-500')
    })

    it('应该正确处理多个 Tailwind 类名冲突', () => {
      const result = cn('p-4 m-2 text-sm', 'p-6 m-4 text-base')
      expect(result).toBe('p-6 m-4 text-base')
    })

    it('应该保留不冲突的 Tailwind 类名', () => {
      const result = cn('flex items-center', 'justify-center')
      expect(result).toBe('flex items-center justify-center')
    })
  })

  describe('边界条件', () => {
    it('应该处理无参数情况', () => {
      const result = cn()
      expect(result).toBe('')
    })

    it('应该处理 undefined 和 null', () => {
      const result = cn('base', undefined, null, 'extra')
      expect(result).toBe('base extra')
    })

    it('应该处理多个 undefined 和 null', () => {
      const result = cn(undefined, null, undefined)
      expect(result).toBe('')
    })

    it('应该处理空对象', () => {
      const result = cn('base', {})
      expect(result).toBe('base')
    })

    it('应该处理空数组', () => {
      const result = cn('base', [])
      expect(result).toBe('base')
    })
  })

  describe('复杂场景', () => {
    it('应该处理实际使用场景 - 按钮组件', () => {
      const baseClasses = 'inline-flex items-center justify-center rounded-md'
      const variantClasses = 'bg-blue-500 text-white hover:bg-blue-600'
      const sizeClasses = 'h-10 px-4 py-2'
      const customClasses = 'w-full md:w-auto'

      const result = cn(baseClasses, variantClasses, sizeClasses, customClasses)
      expect(result).toContain('inline-flex')
      expect(result).toContain('items-center')
      expect(result).toContain('justify-center')
      expect(result).toContain('rounded-md')
      expect(result).toContain('bg-blue-500')
      expect(result).toContain('text-white')
    })

    it('应该处理动态类名组合', () => {
      const isActive = true
      const isDisabled = false
      const size = 'large'

      const result = cn(
        'btn',
        {
          'btn-active': isActive,
          'btn-disabled': isDisabled,
        },
        size === 'large' && 'btn-lg',
        size === 'small' && 'btn-sm'
      )

      expect(result).toBe('btn btn-active btn-lg')
    })

    it('应该处理复杂的 Tailwind 条件类名', () => {
      const isDark = true
      const isLarge = false

      const result = cn(
        'card p-4 rounded-lg',
        isDark ? 'bg-gray-900 text-white' : 'bg-white text-gray-900',
        isLarge ? 'text-xl' : 'text-sm',
        'shadow-md hover:shadow-lg transition-shadow'
      )

      expect(result).toContain('card')
      expect(result).toContain('p-4')
      expect(result).toContain('rounded-lg')
      expect(result).toContain('bg-gray-900')
      expect(result).toContain('text-white')
      expect(result).toContain('text-sm')
      expect(result).toContain('shadow-md')
    })
  })
})
