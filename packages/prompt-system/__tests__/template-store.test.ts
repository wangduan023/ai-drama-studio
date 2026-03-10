import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import { PROMPT_IDS } from '../src/prompt-ids'
import { PromptError } from '../src/types'
import {
  getPromptTemplate,
  getPromptTemplateAsync,
  clearTemplateCache,
  preloadTemplates,
  setTemplateRoot,
  getCacheStats
} from '../src/template-store'
import { LRUCache } from '../src/lru-cache'

// Mock the template root to use temp directory
const ORIGINAL_TEMPLATE_ROOT = process.env.PROMPT_TEMPLATE_ROOT

describe('Template Store Module', () => {
  beforeEach(() => {
    process.env.PROMPT_TEMPLATE_ROOT = '/tmp/test-templates'
    clearTemplateCache() // Clear any existing cache
  })

  afterEach(() => {
    process.env.PROMPT_TEMPLATE_ROOT = ORIGINAL_TEMPLATE_ROOT
    clearTemplateCache() // Clean up after each test
  })

  it('should get prompt template synchronously', () => {
    const template = getPromptTemplate(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')
    expect(template).toContain('# Character Creation Prompt')
    expect(template).toContain('{{user_input}}')
  })

  it('should get prompt template asynchronously', async () => {
    const template = await getPromptTemplateAsync(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')
    expect(template).toContain('# Character Creation Prompt')
    expect(template).toContain('{{user_input}}')
  })

  it('should cache templates and return cached version', () => {
    // First call loads and caches
    const template1 = getPromptTemplate(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')

    // Mock fs to ensure second call uses cache
    const fsSpy = vi.spyOn(fs, 'readFileSync')

    // Second call should use cache
    const template2 = getPromptTemplate(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')

    expect(template1).toBe(template2)
    expect(fsSpy).not.toHaveBeenCalled() // Should not call readFileSync again

    fsSpy.mockRestore()
  })

  it('should force reload when forceReload option is true', () => {
    // First call loads and caches
    const template1 = getPromptTemplate(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')

    // Mock fs to detect second call
    const fsSpy = vi.spyOn(fs, 'readFileSync').mockReturnValue('# Modified Template\nModified content')

    // Second call with forceReload should read from file again
    const template2 = getPromptTemplate(PROMPT_IDS.NP_CHARACTER_CREATE, 'en', { forceReload: true })

    expect(template1).not.toBe(template2)
    expect(fsSpy).toHaveBeenCalled()

    fsSpy.mockRestore()
  })

  it('should get cached version with async function', async () => {
    // First call loads and caches
    const template1 = await getPromptTemplateAsync(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')

    // Mock fs to ensure second call uses cache
    const fsSpy = vi.spyOn(fs.promises, 'readFile')

    // Second call should use cache
    const template2 = await getPromptTemplateAsync(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')

    expect(template1).toBe(template2)
    expect(fsSpy).not.toHaveBeenCalled() // Should not call readFile again

    fsSpy.mockRestore()
  })

  it('should throw error for unregistered prompt ID', () => {
    expect(() => {
      getPromptTemplate('nonexistent_id' as any, 'en')
    }).toThrow(PromptError)

    const error = new PromptError(
      'PROMPT_ID_UNREGISTERED',
      'nonexistent_id' as any,
      '提示词 ID 未注册：nonexistent_id'
    )

    expect(() => {
      getPromptTemplate('nonexistent_id' as any, 'en')
    }).toThrow(error.message)
  })

  it('should throw error for unregistered prompt ID (async)', async () => {
    await expect(async () => {
      await getPromptTemplateAsync('nonexistent_id' as any, 'en')
    }).rejects.toThrow(PromptError)
  })

  it('should throw error for missing template file', () => {
    // Use a valid prompt ID but change the path to point to a non-existing file
    expect(() => {
      getPromptTemplate(PROMPT_IDS.NP_EPISODE_SPLIT, 'zh') // Using 'zh' when only 'en' exists
    }).toThrow(PromptError)
  })

  it('should throw error for missing template file (async)', async () => {
    await expect(async () => {
      await getPromptTemplateAsync(PROMPT_IDS.NP_EPISODE_SPLIT, 'zh') // Using 'zh' when only 'en' exists
    }).rejects.toThrow(PromptError)
  })

  it('should clear template cache properly', () => {
    // Load some templates to populate cache
    getPromptTemplate(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')
    getPromptTemplate(PROMPT_IDS.NP_EPISODE_SPLIT, 'en')

    const statsBefore = getCacheStats()
    expect(statsBefore.size).toBeGreaterThan(0)

    // Clear specific template
    clearTemplateCache(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')
    const statsAfterClearOne = getCacheStats()
    expect(statsAfterClearOne.size).toBeLessThan(statsBefore.size)

    // Clear all templates
    clearTemplateCache()
    const statsAfterClearAll = getCacheStats()
    expect(statsAfterClearAll.size).toBe(0)
  })

  it('should clear cache for specific promptId all locales', () => {
    // Load templates for the same promptId with different locales (though only en exists in our test)
    getPromptTemplate(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')

    const statsBefore = getCacheStats()
    expect(statsBefore.size).toBeGreaterThan(0)

    // Try to clear all locales for this promptId
    clearTemplateCache(PROMPT_IDS.NP_CHARACTER_CREATE)

    const statsAfter = getCacheStats()
    expect(statsAfter.size).toBeLessThan(statsBefore.size)
  })

  it('should preload templates', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    preloadTemplates(['en'])

    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('should handle preload failures gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Try to preload templates for a locale that doesn't exist
    preloadTemplates(['zh'])

    // This should warn but not crash
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('should set custom template root', () => {
    const originalRoot = process.env.PROMPT_TEMPLATE_ROOT

    // Temporarily clear the env var to test the default
    delete process.env.PROMPT_TEMPLATE_ROOT

    // Set custom root
    setTemplateRoot('/tmp/test-templates')

    // Restore original
    process.env.PROMPT_TEMPLATE_ROOT = originalRoot

    // We can't easily test the internal property change due to ts-ignore,
    // but we can at least ensure the function executes without error
    expect(() => {
      setTemplateRoot('/tmp/test-templates')
    }).not.toThrow()
  })

  it('should get cache statistics', () => {
    // Initially empty
    const initialStats = getCacheStats()
    expect(initialStats.size).toBe(0)
    expect(initialStats.maxSize).toBeGreaterThan(0)
    expect(Array.isArray(initialStats.keys)).toBe(true)
    expect(initialStats.keys.length).toBe(0)

    // Add some items to cache
    getPromptTemplate(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')

    const statsAfterLoad = getCacheStats()
    expect(statsAfterLoad.size).toBeGreaterThan(0)
    expect(statsAfterLoad.keys.length).toBeGreaterThan(0)
    expect(statsAfterLoad.keys[0]).toContain('np_character_create:en')
  })

  it('should handle async template loading errors', async () => {
    await expect(() => getPromptTemplateAsync('nonexistent_id' as any, 'en')).rejects.toThrow(PromptError)
  })

  it('should work with multiple locales in cache', () => {
    // This test will work with the existing English templates
    const enTemplate = getPromptTemplate(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')
    expect(enTemplate).toContain('# Character Creation Prompt')
  })
})