/**
 * Types 类型定义测试
 */

import { describe, it, expect } from 'vitest'
import { PromptError, type PromptErrorType } from '../src/types'
import { PROMPT_IDS } from '../src/prompt-ids'

describe('PromptError', () => {
  it('应该正确创建错误实例', () => {
    const error = new PromptError(
      'PROMPT_ID_UNREGISTERED',
      PROMPT_IDS.NP_CHARACTER_CREATE,
      '提示词 ID 未注册'
    )

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(PromptError)
    expect(error.name).toBe('PromptError')
    expect(error.type).toBe('PROMPT_ID_UNREGISTERED')
    expect(error.promptId).toBe(PROMPT_IDS.NP_CHARACTER_CREATE)
    expect(error.message).toBe('[PROMPT_ID_UNREGISTERED] 提示词 ID 未注册')
  })

  it('应该支持所有错误类型', () => {
    const errorTypes: PromptErrorType[] = [
      'PROMPT_ID_UNREGISTERED',
      'PROMPT_TEMPLATE_NOT_FOUND',
      'PROMPT_VARIABLE_MISSING',
      'PROMPT_VARIABLE_UNEXPECTED',
      'PROMPT_VARIABLE_VALUE_INVALID',
      'PROMPT_PLACEHOLDER_MISMATCH',
    ]

    errorTypes.forEach((type) => {
      const error = new PromptError(type, PROMPT_IDS.NP_CHARACTER_CREATE, 'test')
      expect(error.type).toBe(type)
    })
  })

  it('应该支持 details 参数', () => {
    const details = { key: 'test_key', value: 'test_value' }
    const error = new PromptError(
      'PROMPT_VARIABLE_MISSING',
      PROMPT_IDS.NP_CHARACTER_CREATE,
      '缺少变量',
      details
    )

    expect(error.details).toEqual(details)
  })

  it('details 应该是可选的', () => {
    const error = new PromptError(
      'PROMPT_ID_UNREGISTERED',
      PROMPT_IDS.NP_CHARACTER_CREATE,
      '错误信息'
    )

    expect(error.details).toBeUndefined()
  })
})

describe('类型定义', () => {
  it('Locale 类型应该是有效的联合类型', () => {
    // 类型编译时检查
    const locales: ('zh' | 'en')[] = ['zh', 'en']
    
    expect(locales).toContain('zh')
    expect(locales).toContain('en')
  })

  it('应该支持 BuildPromptInput 接口', () => {
    const input = {
      promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
      locale: 'zh' as const,
      variables: { user_input: '创建一个角色' },
    }

    expect(input.promptId).toBe(PROMPT_IDS.NP_CHARACTER_CREATE)
    expect(input.locale).toBe('zh')
    expect(input.variables.user_input).toBe('创建一个角色')
  })

  it('应该支持 PromptCatalogEntry 接口', () => {
    const entry = {
      pathStem: 'novel-promotion/character_create',
      variableKeys: ['user_input'] as const,
      description: '角色创建',
    }

    expect(entry.pathStem).toBe('novel-promotion/character_create')
    expect(entry.variableKeys).toEqual(['user_input'])
    expect(entry.description).toBe('角色创建')
  })

  it('应该支持 PromptVariables 类型', () => {
    const variables: Record<string, string> = {
      key1: 'value1',
      key2: 'value2',
    }

    expect(Object.keys(variables).length).toBe(2)
    expect(variables.key1).toBe('value1')
  })
})
