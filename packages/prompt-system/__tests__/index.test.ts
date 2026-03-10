import { describe, it, expect } from 'vitest'
import * as promptSystem from '../src/index'
import { PromptError } from '../src/types'
import { PROMPT_IDS } from '../src/prompt-ids'
import { LRUCache } from '../src/lru-cache'

describe('Index Module - Full API Export Test', () => {
  it('should export all expected types', () => {
    expect(promptSystem.Locale).toBeDefined()
    expect(promptSystem.PromptCatalogEntry).toBeDefined()
    expect(promptSystem.PromptCatalog).toBeDefined()
    expect(promptSystem.BuildPromptInput).toBeDefined()
    expect(promptSystem.PromptVariables).toBeDefined()
    expect(promptSystem.PromptErrorType).toBeDefined()
  })

  it('should export PromptError class', () => {
    expect(promptSystem.PromptError).toBe(PromptError)

    const error = new promptSystem.PromptError('PROMPT_ID_UNREGISTERED', 'test_id', 'test message')
    expect(error).toBeInstanceOf(PromptError)
  })

  it('should export PROMPT_IDS and related functions', () => {
    expect(promptSystem.PROMPT_IDS).toBeDefined()
    expect(promptSystem.getAllPromptIds).toBeDefined()
    expect(promptSystem.isValidPromptId).toBeDefined()
    expect(promptSystem.PromptId).toBeDefined()

    // Test the exported constants
    expect(promptSystem.PROMPT_IDS.NP_CHARACTER_CREATE).toBe('np_character_create')

    // Test the functions
    expect(Array.isArray(promptSystem.getAllPromptIds())).toBe(true)
    expect(promptSystem.isValidPromptId('np_character_create')).toBe(true)
    expect(promptSystem.isValidPromptId('invalid')).toBe(false)
  })

  it('should export PROMPT_CATALOG', () => {
    expect(promptSystem.PROMPT_CATALOG).toBeDefined()
    expect(typeof promptSystem.PROMPT_CATALOG).toBe('object')
    expect(promptSystem.PROMPT_CATALOG[PROMPT_IDS.NP_CHARACTER_CREATE]).toBeDefined()
  })

  it('should export template store functions', () => {
    expect(promptSystem.getPromptTemplate).toBeDefined()
    expect(promptSystem.getPromptTemplateAsync).toBeDefined()
    expect(promptSystem.clearTemplateCache).toBeDefined()
    expect(promptSystem.preloadTemplates).toBeDefined()
    expect(promptSystem.setTemplateRoot).toBeDefined()
    expect(promptSystem.getCacheStats).toBeDefined()
  })

  it('should export LRUCache class', () => {
    expect(promptSystem.LRUCache).toBe(LRUCache)

    const cache = new promptSystem.LRUCache<string, string>({ maxSize: 5 })
    expect(cache).toBeInstanceOf(LRUCache)
    expect(cache.size).toBe(0)
  })

  it('should export renderer functions', () => {
    expect(promptSystem.buildPrompt).toBeDefined()
    expect(promptSystem.buildPromptAsync).toBeDefined()
    expect(promptSystem.buildCharactersIntroduction).toBeDefined()
    expect(promptSystem.buildLocationsIntroduction).toBeDefined()
  })

  it('should export worker utils namespace', () => {
    expect(promptSystem.workerUtils).toBeDefined()
    // workerUtils is exported from the SSE package, so just check it's defined
  })

  it('should have correct type definitions', () => {
    // These are just type-checks at runtime, ensuring the types are exported
    const locale: promptSystem.Locale = 'en' // Should accept 'en' or 'zh'
    expect(['en', 'zh']).toContain(locale)

    const promptId: promptSystem.PromptId = PROMPT_IDS.NP_CHARACTER_CREATE
    expect(typeof promptId).toBe('string')

    const variables: promptSystem.PromptVariables = { key: 'value' }
    expect(typeof variables).toBe('object')

    const buildInput: promptSystem.BuildPromptInput = {
      promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
      locale: 'en',
      variables: { user_input: 'test' }
    }
    expect(buildInput.promptId).toBe('np_character_create')
  })
})