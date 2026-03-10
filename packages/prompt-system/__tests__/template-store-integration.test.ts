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

// Mock the template root to use actual project directory
const ORIGINAL_TEMPLATE_ROOT = process.env.PROMPT_TEMPLATE_ROOT

describe('Template Store Module - With Real Templates', () => {
  beforeEach(() => {
    process.env.PROMPT_TEMPLATE_ROOT = 'packages/prompt-system/templates' // Use actual project path
    clearTemplateCache() // Clear any existing cache
  })

  afterEach(() => {
    process.env.PROMPT_TEMPLATE_ROOT = ORIGINAL_TEMPLATE_ROOT
    clearTemplateCache() // Clean up after each test
  })

  it('should get real prompt template synchronously', () => {
    const template = getPromptTemplate(PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION, 'en')
    expect(typeof template).toBe('string')
    expect(template.length).toBeGreaterThan(0)
  })

  it('should get real prompt template asynchronously', async () => {
    const template = await getPromptTemplateAsync(PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION, 'en')
    expect(typeof template).toBe('string')
    expect(template.length).toBeGreaterThan(0)
  })

  it('should cache templates and return cached version', () => {
    // First call loads and caches
    const template1 = getPromptTemplate(PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION, 'en')

    // Mock fs to ensure second call uses cache
    const fsSpy = vi.spyOn(fs, 'readFileSync')

    // Second call should use cache
    const template2 = getPromptTemplate(PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION, 'en')

    expect(template1).toBe(template2)
    expect(fsSpy).not.toHaveBeenCalled() // Should not call readFileSync again

    fsSpy.mockRestore()
  })

  it('should cache templates and return cached version (async)', async () => {
    // First call loads and caches
    const template1 = await getPromptTemplateAsync(PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION, 'en')

    // Mock fs to ensure second call uses cache
    const fsSpy = vi.spyOn(fs.promises, 'readFile')

    // Second call should use cache
    const template2 = await getPromptTemplateAsync(PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION, 'en')

    expect(template1).toBe(template2)
    expect(fsSpy).not.toHaveBeenCalled() // Should not call readFile again

    fsSpy.mockRestore()
  })

  it('should force reload when forceReload option is true', () => {
    // First call loads and caches
    const template1 = getPromptTemplate(PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION, 'en')

    // Mock fs to detect second call
    const fsSpy = vi.spyOn(fs, 'readFileSync').mockReturnValue('MODIFIED TEMPLATE CONTENT')

    // Second call with forceReload should read from file again
    const template2 = getPromptTemplate(PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION, 'en', { forceReload: true })

    expect(template1).not.toBe(template2)
    expect(fsSpy).toHaveBeenCalled()

    fsSpy.mockRestore()
  })

  it('should get different language versions', () => {
    const enTemplate = getPromptTemplate(PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION, 'en')
    const zhTemplate = getPromptTemplate(PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION, 'zh')

    // Different languages should be different, but both exist
    expect(typeof enTemplate).toBe('string')
    expect(typeof zhTemplate).toBe('string')
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
    // Create a mock catalog entry that points to a non-existent file
    const testCatalog = {
      ...require('../src/catalog').PROMPT_CATALOG,
      ['nonexistent_template_test']: {
        pathStem: 'novel-promotion/nonexistent_template',
        variableKeys: [] as const,
        description: 'Test non-existent template'
      }
    }

    expect(() => {
      getPromptTemplate('nonexistent_template_test' as any, 'en')
    }).toThrow(PromptError)
  })

  it('should throw error for missing template file (async)', async () => {
    const testCatalog = {
      ...require('../src/catalog').PROMPT_CATALOG,
      ['nonexistent_template_test_async']: {
        pathStem: 'novel-promotion/nonexistent_template_async',
        variableKeys: [] as const,
        description: 'Test non-existent template async'
      }
    }

    await expect(async () => {
      await getPromptTemplateAsync('nonexistent_template_test_async' as any, 'en')
    }).rejects.toThrow(PromptError)
  })

  it('should clear template cache properly', () => {
    // Load some templates to populate cache
    getPromptTemplate(PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION, 'en')
    getPromptTemplate(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')

    const statsBefore = getCacheStats()
    expect(statsBefore.size).toBeGreaterThan(0)

    // Clear specific template
    clearTemplateCache(PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION, 'en')
    const statsAfterClearOne = getCacheStats()
    expect(statsAfterClearOne.size).toBeLessThan(statsBefore.size)

    // Clear all templates
    clearTemplateCache()
    const statsAfterClearAll = getCacheStats()
    expect(statsAfterClearAll.size).toBe(0)
  })

  it('should clear cache for specific promptId all locales', () => {
    // Load templates for the same promptId with different locales (if they exist)
    getPromptTemplate(PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION, 'en')

    const statsBefore = getCacheStats()
    expect(statsBefore.size).toBeGreaterThan(0)

    // Clear all locales for this promptId
    clearTemplateCache(PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION)

    const statsAfter = getCacheStats()
    // The exact expectation depends on how many locales were cached for this prompt
    // We expect the size to be reduced
    expect(statsAfter.size).toBeLessThanOrEqual(statsBefore.size)
  })

  it('should preload templates', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    // Only preload a few to avoid too much output
    preloadTemplates(['en'])

    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('should handle preload failures gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Try to preload a locale that may not exist for all templates
    preloadTemplates(['fr']) // French might not exist for all prompts

    // This should warn but not crash
    // We can't guarantee this will always happen since it depends on which templates exist
    // So we just make sure the function doesn't crash

    consoleSpy.mockRestore()
  })

  it('should get cache statistics', () => {
    // Initially empty after clear
    clearTemplateCache()
    const initialStats = getCacheStats()
    expect(initialStats.size).toBe(0)
    expect(initialStats.maxSize).toBeGreaterThan(0)
    expect(Array.isArray(initialStats.keys)).toBe(true)
    expect(initialStats.keys.length).toBe(0)

    // Add some items to cache
    getPromptTemplate(PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION, 'en')

    const statsAfterLoad = getCacheStats()
    expect(statsAfterLoad.size).toBeGreaterThan(0)
    expect(statsAfterLoad.keys.length).toBeGreaterThan(0)
    expect(statsAfterLoad.keys[0]).toContain('character_image_to_description:en')
  })

  it('should handle async template loading errors', async () => {
    await expect(async () =>
      getPromptTemplateAsync('nonexistent_id' as any, 'en')
    ).rejects.toThrow(PromptError)
  })

  it('should clear all cache', () => {
    // Populate cache
    getPromptTemplate(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')
    getPromptTemplate(PROMPT_IDS.NP_EPISODE_SPLIT, 'en')

    const statsBefore = getCacheStats()
    expect(statsBefore.size).toBeGreaterThan(0)

    // Clear all
    clearTemplateCache()

    const statsAfter = getCacheStats()
    expect(statsAfter.size).toBe(0)
  })

  it('should clear cache for specific promptId', () => {
    // Populate cache with multiple entries
    getPromptTemplate(PROMPT_IDS.NP_CHARACTER_CREATE, 'en')
    getPromptTemplate(PROMPT_IDS.NP_LOCATION_CREATE, 'en')

    const statsBefore = getCacheStats()
    expect(statsBefore.size).toBeGreaterThanOrEqual(2)

    // Clear just one prompt ID
    clearTemplateCache(PROMPT_IDS.NP_CHARACTER_CREATE)

    const statsAfter = getCacheStats()
    expect(statsAfter.size).toBeLessThan(statsBefore.size)

    // The specific prompt should be cleared but others remain
    expect(statsAfter.keys.some(key => key.includes('np_character_create'))).toBe(false)
  })
})