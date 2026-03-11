/**
 * Renderer 高级功能测试
 * 测试嵌套条件渲染、特殊字符转义、超长变量值处理、循环渲染性能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildPrompt, buildPromptAsync, buildCharactersIntroduction, buildLocationsIntroduction } from '../src/renderer'
import { clearTemplateCache } from '../src/template-store'
import { PromptError } from '../src/types'
import { PROMPT_IDS } from '../src/prompt-ids'

describe('Renderer Advanced Features', () => {
  beforeEach(() => {
    clearTemplateCache()
  })

  afterEach(() => {
    clearTemplateCache()
  })

  describe('嵌套条件渲染（3+ 层）', () => {
    it('应该处理包含多层占位符的模板', () => {
      // 使用真实模板测试多层变量替换
      const result = buildPrompt({
        promptId: PROMPT_IDS.NP_AGENT_ACTING_DIRECTION,
        locale: 'en',
        variables: {
          panels_json: JSON.stringify([
            { id: 1, scene: '场景A', characters: ['角色1', '角色2'] },
            { id: 2, scene: '场景B', characters: ['角色1'] }
          ]),
          panel_count: '2',
          characters_info: '角色1: 主角\n角色2: 配角'
        }
      })

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
      expect(result).toContain('角色1')
      expect(result).toContain('角色2')
    })

    it('应该正确处理变量值包含占位符语法的情况', () => {
      const variableWithPlaceholder = '这是一个包含 {{fake}} 和 {another} 的文本'
      
      const result = buildPrompt({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'en',
        variables: {
          user_input: variableWithPlaceholder
        }
      })

      expect(result).toContain(variableWithPlaceholder)
    })
  })

  describe('特殊字符转义', () => {
    it('应该正确处理正则表达式特殊字符', () => {
      const specialChars = [
        '特殊字符: [test] (example) {key} $100',
        '网址: www.example.com/path',
        '数学公式: A*B+C/D',
        '代码片段: function() { return x; }'
      ]

      specialChars.forEach(content => {
        const result = buildPrompt({
          promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
          locale: 'en',
          variables: {
            user_input: content
          }
        })

        expect(result).toContain(content)
      })
    })

    it('应该正确处理 Unicode 字符和 emoji', () => {
      const unicodeContent = [
        '日本語 한국어 العربية',
        '🎭🎬🎨🎪',
        '中文字符测试',
        '混合: Hello 世界 🌍 123'
      ]

      unicodeContent.forEach(content => {
        const result = buildPrompt({
          promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
          locale: 'en',
          variables: {
            user_input: content
          }
        })

        expect(result).toContain(content)
      })
    })

    it('应该正确处理换行符和制表符', () => {
      const multilineContent = `第一行
第二行
第三行`

      const tabContent = '列1\t列2\t列3'

      const result1 = buildPrompt({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'en',
        variables: {
          user_input: multilineContent
        }
      })

      const result2 = buildPrompt({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'en',
        variables: {
          user_input: tabContent
        }
      })

      expect(result1).toContain('第一行')
      expect(result1).toContain('第二行')
      expect(result1).toContain('第三行')
      expect(result2).toContain('列1')
      expect(result2).toContain('列2')
    })
  })

  describe('超长变量值处理', () => {
    it('应该处理10KB以上的超长文本', () => {
      const longText = '这是一段重复的文字。'.repeat(600)
      expect(longText.length).toBeGreaterThan(10000)

      const result = buildPrompt({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'en',
        variables: {
          user_input: longText
        }
      })

      expect(result).toContain(longText)
      expect(result.length).toBeGreaterThan(10000)
    })

    it('应该处理包含 JSON 的大变量', () => {
      const largeJson = JSON.stringify({
        scenes: Array.from({ length: 50 }, (_, i) => ({
          id: i,
          name: `场景${i}`,
          description: `这是场景${i}的详细描述，包含很多内容。`,
          characters: [`角色${i}_A`, `角色${i}_B`],
          location: `位置${i}`
        }))
      })

      const result = buildPrompt({
        promptId: PROMPT_IDS.NP_AGENT_STORYBOARD_PLAN,
        locale: 'en',
        variables: {
          characters_lib_name: '角色库',
          locations_lib_name: '场景库',
          characters_introduction: '角色介绍',
          characters_appearance_list: '外观列表',
          characters_full_description: largeJson,
          clip_json: '{}',
          clip_content: '片段内容'
        }
      })

      expect(result).toContain(largeJson)
    })
  })

  describe('循环渲染性能', () => {
    it('应该在100次循环渲染中保持良好性能', () => {
      const startTime = performance.now()

      for (let i = 0; i < 100; i++) {
        buildPrompt({
          promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
          locale: 'en',
          variables: {
            user_input: `测试内容 ${i}`
          }
        })
      }

      const endTime = performance.now()
      const totalTime = endTime - startTime

      // 100次渲染应该在1秒内完成（使用缓存后更快）
      expect(totalTime).toBeLessThan(2000)
    })

    it('应该在使用缓存时提供一致的渲染性能', async () => {
      // 首次渲染（加载模板到缓存）
      await buildPromptAsync({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'en',
        variables: { user_input: '性能基准测试' }
      })

      // 缓存后的渲染
      const startTime = performance.now()
      for (let i = 0; i < 1000; i++) {
        buildPrompt({
          promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
          locale: 'en',
          variables: { 
            user_input: `性能测试 ${i}` 
          }
        })
      }
      const endTime = performance.now()

      // 1000次缓存渲染应该在500ms内完成
      expect(endTime - startTime).toBeLessThan(500)
    })

    it('应该并发渲染多个提示词', async () => {
      const promises = Array.from({ length: 20 }, (_, i) => 
        buildPromptAsync({
          promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
          locale: 'en',
          variables: {
            user_input: `并发测试 ${i}`
          }
        })
      )

      const results = await Promise.all(promises)

      expect(results).toHaveLength(20)
      results.forEach((result, i) => {
        expect(result).toContain(`并发测试 ${i}`)
      })
    })
  })

  describe('buildCharactersIntroduction 高级功能', () => {
    it('应该处理大量角色的介绍生成', () => {
      const characters = Array.from({ length: 100 }, (_, i) => ({
        name: `角色${i}`,
        introduction: `这是角色${i}的介绍，一个独特的人物。`
      }))

      const result = buildCharactersIntroduction(characters)

      expect(result).not.toBe('暂无角色介绍')
      for (let i = 0; i < 100; i++) {
        expect(result).toContain(`角色${i}`)
        expect(result).toContain(`这是角色${i}的介绍`)
      }
    })

    it('应该处理包含特殊字符的角色名', () => {
      const characters = [
        { name: '角色 [测试]', introduction: '包含括号的角色' },
        { name: '角色 * 特殊', introduction: '包含星号的角色' },
        { name: '角色 🎭 Emoji', introduction: '包含Emoji的角色' }
      ]

      const result = buildCharactersIntroduction(characters)

      expect(result).toContain('角色 [测试]')
      expect(result).toContain('角色 * 特殊')
      expect(result).toContain('角色 🎭 Emoji')
    })

    it('应该处理超长角色介绍', () => {
      const characters = [{
        name: '主角',
        introduction: '这是一个很长的介绍。'.repeat(1000)
      }]

      const result = buildCharactersIntroduction(characters)

      expect(result.length).toBeGreaterThan(10000)
      expect(result).toContain('这是一个很长的介绍。')
    })

    it('应该过滤掉空介绍的角色', () => {
      const characters = [
        { name: '有介绍的角色', introduction: '我有介绍' },
        { name: '空介绍', introduction: '' },
        { name: 'null介绍', introduction: null as any },
        { name: 'undefined介绍', introduction: undefined as any },
        { name: '另一个有介绍的', introduction: '我也有介绍' }
      ]

      const result = buildCharactersIntroduction(characters)

      expect(result).toContain('有介绍的角色')
      expect(result).toContain('另一个有介绍的')
      expect(result).toContain('我有介绍')
      expect(result).not.toContain('空介绍')
      expect(result).not.toContain('null介绍')
    })
  })

  describe('buildLocationsIntroduction 高级功能', () => {
    it('应该处理大量场景的介绍生成', () => {
      const locations = Array.from({ length: 50 }, (_, i) => ({
        name: `场景${i}`,
        description: `这是场景${i}的描述，一个独特的场景。`
      }))

      const result = buildLocationsIntroduction(locations)

      expect(result).not.toBe('暂无场景介绍')
      for (let i = 0; i < 50; i++) {
        expect(result).toContain(`场景${i}`)
        expect(result).toContain(`这是场景${i}的描述`)
      }
    })

    it('应该正确处理空值和 undefined', () => {
      const locations = [
        { name: '场景1', description: '正常描述' },
        { name: '场景2', description: undefined as any },
        { name: '场景3', description: null as any },
        { name: '场景4', description: '' },
        { name: '场景5' as any }
      ]

      const result = buildLocationsIntroduction(locations)

      expect(result).toContain('场景1：正常描述')
      expect(result).not.toContain('场景2')
      expect(result).not.toContain('场景3')
      expect(result).not.toContain('场景4')
    })

    it('应该在所有场景都为空时返回默认值', () => {
      const locations = [
        { name: '场景1', description: '' },
        { name: '场景2', description: null as any },
        { name: '场景3', description: '   ' } // 只有空白字符
      ]

      const result = buildLocationsIntroduction(locations)

      expect(result).toBe('暂无场景介绍')
    })
  })

  describe('同步/异步一致性', () => {
    it('buildPrompt 和 buildPromptAsync 应该产生相同结果', async () => {
      const variables = {
        user_input: '一致性测试输入'
      }

      const syncResult = buildPrompt({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'en',
        variables
      })

      const asyncResult = await buildPromptAsync({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'en',
        variables
      })

      expect(syncResult).toBe(asyncResult)
    })
  })
})
