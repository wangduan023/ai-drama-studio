/**
 * Prompt Renderer 测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buildPrompt,
  buildPromptAsync,
  buildCharactersIntroduction,
  buildLocationsIntroduction,
} from '../src/renderer'
import { PromptError } from '../src/types'
import { PROMPT_IDS } from '../src/prompt-ids'
import * as templateStore from '../src/template-store'

// Mock template-store
vi.mock('../src/template-store', () => ({
  getPromptTemplate: vi.fn(),
  getPromptTemplateAsync: vi.fn(),
}))

describe('Renderer', () => {
  const mockGetPromptTemplate = vi.mocked(templateStore.getPromptTemplate)
  const mockGetPromptTemplateAsync = vi.mocked(templateStore.getPromptTemplateAsync)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('buildPrompt', () => {
    it('应该成功构建提示词', () => {
      const template = 'Hello, {name}!'
      mockGetPromptTemplate.mockReturnValue(template)

      const result = buildPrompt({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'zh',
        variables: { name: 'World' },
      })

      expect(result).toBe('Hello, World!')
    })

    it('应该支持双括号占位符', () => {
      const template = 'Hello, {{name}}!'
      mockGetPromptTemplate.mockReturnValue(template)

      const result = buildPrompt({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'zh',
        variables: { name: 'World' },
      })

      expect(result).toBe('Hello, World!')
    })

    it('应该混合支持单括号和双括号', () => {
      const template = '{greeting}, {{name}}!'
      mockGetPromptTemplate.mockReturnValue(template)

      const result = buildPrompt({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'zh',
        variables: { greeting: 'Hello', name: 'World' },
      })

      expect(result).toBe('Hello, World!')
    })

    it('应该对未注册的提示词 ID 抛出错误', () => {
      expect(() =>
        buildPrompt({
          promptId: 'invalid_prompt' as any,
          locale: 'zh',
          variables: {},
        })
      ).toThrow(PromptError)
    })

    it('应该对缺少必需变量抛出错误', () => {
      const template = 'Hello, {name}!'
      mockGetPromptTemplate.mockReturnValue(template)

      expect(() =>
        buildPrompt({
          promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
          locale: 'zh',
          variables: {},
        })
      ).toThrow(PromptError)
    })

    it('应该对未声明的变量抛出错误', () => {
      const template = 'Hello!'
      mockGetPromptTemplate.mockReturnValue(template)

      expect(() =>
        buildPrompt({
          promptId: PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION,
          locale: 'zh',
          variables: { extra: 'value' },
        })
      ).toThrow(PromptError)
    })

    it('应该对非字符串变量值抛出错误', () => {
      const template = 'Value: {key}'
      mockGetPromptTemplate.mockReturnValue(template)

      expect(() =>
        buildPrompt({
          promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
          locale: 'zh',
          variables: { key: 123 as any },
        })
      ).toThrow(PromptError)
    })

    it('应该处理空变量对象', () => {
      const template = 'Hello!'
      mockGetPromptTemplate.mockReturnValue(template)

      const result = buildPrompt({
        promptId: PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION,
        locale: 'zh',
        variables: {},
      })

      expect(result).toBe('Hello!')
    })

    it('应该支持多行模板', () => {
      const template = `Line 1: {line1}
Line 2: {line2}`
      mockGetPromptTemplate.mockReturnValue(template)

      const result = buildPrompt({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'zh',
        variables: { line1: 'First', line2: 'Second' },
      })

      expect(result).toBe('Line 1: First\nLine 2: Second')
    })
  })

  describe('buildPromptAsync', () => {
    it('应该异步成功构建提示词', async () => {
      const template = 'Hello, {name}!'
      mockGetPromptTemplateAsync.mockResolvedValue(template)

      const result = await buildPromptAsync({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'zh',
        variables: { name: 'World' },
      })

      expect(result).toBe('Hello, World!')
    })

    it('应该异步处理错误', async () => {
      await expect(
        buildPromptAsync({
          promptId: 'invalid_prompt' as any,
          locale: 'zh',
          variables: {},
        })
      ).rejects.toThrow(PromptError)
    })
  })

  describe('buildCharactersIntroduction', () => {
    it('应该构建角色介绍字符串', () => {
      const characters = [
        { name: 'Alice', introduction: '主角' },
        { name: 'Bob', introduction: '配角' },
      ]

      const result = buildCharactersIntroduction(characters)

      expect(result).toBe('- Alice：主角\n- Bob：配角')
    })

    it('应该过滤没有介绍的角色', () => {
      const characters = [
        { name: 'Alice', introduction: '主角' },
        { name: 'Bob', introduction: null },
        { name: 'Charlie', introduction: '' },
      ]

      const result = buildCharactersIntroduction(characters)

      expect(result).toBe('- Alice：主角')
    })

    it('应该处理空数组', () => {
      const result = buildCharactersIntroduction([])

      expect(result).toBe('暂无角色介绍')
    })

    it('应该处理 null 或 undefined 的 characters', () => {
      expect(buildCharactersIntroduction(null as any)).toBe('暂无角色介绍')
      expect(buildCharactersIntroduction(undefined as any)).toBe('暂无角色介绍')
    })

    it('应该处理所有角色都没有介绍的情况', () => {
      const characters = [
        { name: 'Alice', introduction: null },
        { name: 'Bob', introduction: '' },
      ]

      const result = buildCharactersIntroduction(characters)

      expect(result).toBe('暂无角色介绍')
    })
  })

  describe('buildLocationsIntroduction', () => {
    it('应该构建场景介绍字符串', () => {
      const locations = [
        { name: '客厅', description: '宽敞明亮' },
        { name: '厨房', description: '设备齐全' },
      ]

      const result = buildLocationsIntroduction(locations)

      expect(result).toBe('- 客厅：宽敞明亮\n- 厨房：设备齐全')
    })

    it('应该过滤没有描述的场景', () => {
      const locations = [
        { name: '客厅', description: '宽敞明亮' },
        { name: '厨房', description: null },
      ]

      const result = buildLocationsIntroduction(locations)

      expect(result).toBe('- 客厅：宽敞明亮')
    })

    it('应该处理空数组', () => {
      const result = buildLocationsIntroduction([])

      expect(result).toBe('暂无场景介绍')
    })

    it('应该处理 null 或 undefined 的 locations', () => {
      expect(buildLocationsIntroduction(null as any)).toBe('暂无场景介绍')
      expect(buildLocationsIntroduction(undefined as any)).toBe('暂无场景介绍')
    })
  })
})
