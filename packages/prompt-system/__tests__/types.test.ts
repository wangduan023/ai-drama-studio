import { describe, it, expect, vi } from 'vitest'
import { PromptError, type PromptErrorType } from '../src/types'

describe('Types Module', () => {
  it('should define correct Locale type', () => {
    // This is just a type check - the runtime behavior is limited
    const zhLocale: 'zh' = 'zh'
    const enLocale: 'en' = 'en'

    expect(['zh', 'en']).toContain(zhLocale)
    expect(['zh', 'en']).toContain(enLocale)
  })

  it('should create PromptError instances correctly', () => {
    const errorTypes: PromptErrorType[] = [
      'PROMPT_ID_UNREGISTERED',
      'PROMPT_TEMPLATE_NOT_FOUND',
      'PROMPT_VARIABLE_MISSING',
      'PROMPT_VARIABLE_UNEXPECTED',
      'PROMPT_VARIABLE_VALUE_INVALID',
      'PROMPT_PLACEHOLDER_MISMATCH'
    ]

    for (const type of errorTypes) {
      const error = new PromptError(type, 'test_id', 'test message', { test: 'data' })

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(PromptError)
      expect(error.type).toBe(type)
      expect(error.promptId).toBe('test_id')
      expect(error.message).toBe(`[${type}] test message`)
      expect(error.details).toEqual({ test: 'data' })
      expect(error.name).toBe('PromptError')
    }
  })

  it('should create PromptError without details', () => {
    const error = new PromptError('PROMPT_ID_UNREGISTERED', 'test_id', 'test message')

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(PromptError)
    expect(error.type).toBe('PROMPT_ID_UNREGISTERED')
    expect(error.promptId).toBe('test_id')
    expect(error.message).toBe('[PROMPT_ID_UNREGISTERED] test message')
    expect(error.details).toBeUndefined()
  })

  it('should have correct error hierarchy', () => {
    const error = new PromptError('PROMPT_ID_UNREGISTERED', 'test_id', 'test message')

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(PromptError)
    expect(error.name).toBe('PromptError')
  })
})