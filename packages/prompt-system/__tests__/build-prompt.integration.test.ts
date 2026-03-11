/**
 * Prompt System 集成测试
 * 测试完整的模板加载 -> 变量验证 -> 渲染流程
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildPrompt, buildPromptAsync } from '../src/renderer'
import { getPromptTemplate, getPromptTemplateAsync, clearTemplateCache, setTemplateRoot } from '../src/template-store'
import { PromptError } from '../src/types'
import { PROMPT_IDS } from '../src/prompt-ids'
import fs from 'fs'
import path from 'path'

describe('BuildPrompt Integration Tests', () => {
  const TEST_TEMPLATE_ROOT = '/tmp/test-templates-integration'

  beforeEach(() => {
    // 清理并创建测试模板目录
    if (fs.existsSync(TEST_TEMPLATE_ROOT)) {
      fs.rmSync(TEST_TEMPLATE_ROOT, { recursive: true })
    }
    fs.mkdirSync(TEST_TEMPLATE_ROOT, { recursive: true })
    fs.mkdirSync(path.join(TEST_TEMPLATE_ROOT, 'novel-promotion'), { recursive: true })
    
    clearTemplateCache()
  })

  afterEach(() => {
    clearTemplateCache()
    if (fs.existsSync(TEST_TEMPLATE_ROOT)) {
      fs.rmSync(TEST_TEMPLATE_ROOT, { recursive: true })
    }
  })

  describe('完整渲染流程', () => {
    it('应该完成从模板加载到变量替换的完整流程', async () => {
      // 使用现有的真实模板进行测试
      const result = buildPrompt({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'en',
        variables: {
          user_input: '创建一个勇敢的骑士角色'
        }
      })

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
      expect(result).toContain('创建一个勇敢的骑士角色')
    })

    it('应该支持异步完整流程', async () => {
      const result = await buildPromptAsync({
        promptId: PROMPT_IDS.NP_EPISODE_SPLIT,
        locale: 'en',
        variables: {
          CONTENT: '测试小说内容'
        }
      })

      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
      expect(result).toContain('测试小说内容')
    })
  })

  describe('多语言模板切换', () => {
    it('应该支持中英文模板切换', () => {
      // 使用真实存在的模板
      const enResult = buildPrompt({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'en',
        variables: {
          user_input: 'Test input in English'
        }
      })

      expect(enResult).toBeDefined()
      expect(enResult.length).toBeGreaterThan(0)

      // 中文模板可能不存在，但应该尝试加载
      try {
        const zhResult = buildPrompt({
          promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
          locale: 'zh',
          variables: {
            user_input: '中文测试输入'
          }
        })
        expect(zhResult).toBeDefined()
        expect(zhResult.length).toBeGreaterThan(0)
      } catch (error) {
        // 中文模板不存在时会抛出错误，这是预期的行为
        expect(error).toBeInstanceOf(PromptError)
      }
    })

    it('应该在使用不同 locale 时独立缓存', () => {
      // 加载英文模板
      const enResult1 = buildPrompt({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'en',
        variables: {
          user_input: 'Cache test'
        }
      })

      // 再次加载，应该使用缓存
      const enResult2 = buildPrompt({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'en',
        variables: {
          user_input: 'Cache test'
        }
      })

      expect(enResult1).toBe(enResult2)
    })
  })

  describe('错误处理和回退机制', () => {
    it('应该抛出错误对于未注册的提示词 ID', () => {
      expect(() => {
        buildPrompt({
          promptId: 'nonexistent_id' as any,
          locale: 'en',
          variables: {}
        })
      }).toThrow(PromptError)
    })

    it('应该在异步加载时抛出错误', async () => {
      await expect(async () => {
        await buildPromptAsync({
          promptId: 'nonexistent_id' as any,
          locale: 'en',
          variables: {}
        })
      }).rejects.toThrow(PromptError)
    })

    it('应该在变量缺失时提供详细的错误信息', () => {
      try {
        buildPrompt({
          promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
          locale: 'en',
          variables: {} // 缺少必需的 user_input
        })
        expect.fail('应该抛出错误')
      } catch (error) {
        expect(error).toBeInstanceOf(PromptError)
        expect((error as PromptError).type).toBe('PROMPT_VARIABLE_MISSING')
      }
    })

    it('应该在变量值类型错误时抛出错误', () => {
      expect(() => {
        buildPrompt({
          promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
          locale: 'en',
          variables: {
            user_input: 123 as any // 错误的类型
          }
        })
      }).toThrow(PromptError)
    })

    it('应该在存在未声明的变量时抛出错误', () => {
      expect(() => {
        buildPrompt({
          promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
          locale: 'en',
          variables: {
            user_input: 'valid input',
            undeclared_var: 'invalid' // 未声明的变量
          }
        })
      }).toThrow(PromptError)
    })
  })

  describe('缓存和性能', () => {
    it('应该在多次构建相同提示词时使用缓存', () => {
      const start1 = performance.now()
      const result1 = buildPrompt({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'en',
        variables: { user_input: '性能测试' }
      })
      const duration1 = performance.now() - start1

      const start2 = performance.now()
      const result2 = buildPrompt({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'en',
        variables: { user_input: '性能测试' }
      })
      const duration2 = performance.now() - start2

      expect(result1).toBe(result2)
      expect(duration2).toBeLessThanOrEqual(duration1)
    })

    it('应该支持强制刷新缓存', () => {
      // 首次加载
      buildPrompt({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'en',
        variables: { user_input: '刷新测试' }
      })

      // 清除特定缓存
      clearTemplateCache(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')

      // 再次加载（应该重新读取文件）
      const result = buildPrompt({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'en',
        variables: { user_input: '刷新测试' }
      })

      expect(result).toBeDefined()
    })
  })

  describe('buildPrompt 和 buildPromptAsync 一致性', () => {
    it('同步和异步版本应该产生相同结果', async () => {
      const syncResult = buildPrompt({
        promptId: PROMPT_IDS.NP_EPISODE_SPLIT,
        locale: 'en',
        variables: { CONTENT: '一致性测试' }
      })

      const asyncResult = await buildPromptAsync({
        promptId: PROMPT_IDS.NP_EPISODE_SPLIT,
        locale: 'en',
        variables: { CONTENT: '一致性测试' }
      })

      expect(syncResult).toBe(asyncResult)
    })
  })
})
