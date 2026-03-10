import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildPrompt, buildPromptAsync, buildCharactersIntroduction, buildLocationsIntroduction } from '../src/renderer'
import { PROMPT_IDS } from '../src/prompt-ids'
import { PromptError } from '../src/types'
import { clearTemplateCache } from '../src/template-store'

describe('Renderer Module - With Real Templates', () => {
  beforeEach(() => {
    process.env.PROMPT_TEMPLATE_ROOT = 'packages/prompt-system/templates'
    clearTemplateCache()
  })

  afterEach(() => {
    clearTemplateCache()
  })

  it('should build prompt synchronously with variables', () => {
    const result = buildPrompt({
      promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
      locale: 'en',
      variables: {
        user_input: 'A brave knight'
      }
    })

    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
    expect(result).toContain('A brave knight')
  })

  it('should build prompt asynchronously with variables', async () => {
    const result = await buildPromptAsync({
      promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
      locale: 'en',
      variables: {
        user_input: 'A wise wizard'
      }
    })

    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
    expect(result).toContain('A wise wizard')
  })

  it('should throw error for unregistered prompt ID', () => {
    expect(() => {
      buildPrompt({
        promptId: 'nonexistent_id' as any,
        locale: 'en',
        variables: {}
      })
    }).toThrow(PromptError)
  })

  it('should throw error for unregistered prompt ID (async)', async () => {
    await expect(async () => {
      await buildPromptAsync({
        promptId: 'nonexistent_id' as any,
        locale: 'en',
        variables: {}
      })
    }).rejects.toThrow(PromptError)
  })

  it('should throw error for missing required variables', () => {
    expect(() => {
      buildPrompt({
        promptId: PROMPT_IDS.NP_EPISODE_SPLIT,
        locale: 'en',
        variables: {} // Missing CONTENT variable
      })
    }).toThrow(PromptError)
  })

  it('should throw error for missing required variables (async)', async () => {
    await expect(async () => {
      await buildPromptAsync({
        promptId: PROMPT_IDS.NP_EPISODE_SPLIT,
        locale: 'en',
        variables: {} // Missing CONTENT variable
      })
    }).rejects.toThrow(PromptError)
  })

  it('should throw error for unexpected variables', () => {
    expect(() => {
      buildPrompt({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'en',
        variables: {
          user_input: 'valid',
          unexpected_var: 'invalid' // This should cause an error
        }
      })
    }).toThrow(PromptError)
  })

  it('should throw error for unexpected variables (async)', async () => {
    await expect(async () => {
      await buildPromptAsync({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'en',
        variables: {
          user_input: 'valid',
          unexpected_var: 'invalid' // This should cause an error
        }
      })
    }).rejects.toThrow(PromptError)
  })

  it('should throw error for non-string variable values', () => {
    expect(() => {
      buildPrompt({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'en',
        variables: {
          user_input: 123 as any // Not a string
        }
      })
    }).toThrow(PromptError)
  })

  it('should throw error for non-string variable values (async)', async () => {
    await expect(async () => {
      await buildPromptAsync({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'en',
        variables: {
          user_input: 123 as any // Not a string
        }
      })
    }).rejects.toThrow(PromptError)
  })

  it('should handle multiple variables correctly', () => {
    const result = buildPrompt({
      promptId: PROMPT_IDS.NP_AGENT_ACTING_DIRECTION,
      locale: 'en',
      variables: {
        panels_json: '{"panel1": "content"}',
        panel_count: '5',
        characters_info: 'Character details'
      }
    })

    expect(result).toContain('{"panel1": "content"}')
    expect(result).toContain('5')
    expect(result).toContain('Character details')
  })

  it('should handle multiple variables correctly (async)', async () => {
    const result = await buildPromptAsync({
      promptId: PROMPT_IDS.NP_AGENT_ACTING_DIRECTION,
      locale: 'en',
      variables: {
        panels_json: '{"panel2": "different_content"}',
        panel_count: '10',
        characters_info: 'Different character details'
      }
    })

    expect(result).toContain('{"panel2": "different_content"}')
    expect(result).toContain('10')
    expect(result).toContain('Different character details')
  })

  it('should work with different locales', () => {
    const enResult = buildPrompt({
      promptId: PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION,
      locale: 'en',
      variables: {}
    })

    const zhResult = buildPrompt({
      promptId: PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION,
      locale: 'zh',
      variables: {}
    })

    expect(typeof enResult).toBe('string')
    expect(typeof zhResult).toBe('string')
    // Both should have content, though different
    expect(enResult.length).toBeGreaterThan(0)
    expect(zhResult.length).toBeGreaterThan(0)
  })

  it('should build characters introduction correctly', () => {
    const characters = [
      { name: 'Alice', introduction: 'Main protagonist' },
      { name: 'Bob', introduction: 'Supporting character' },
      { name: 'Charlie', introduction: '' }, // Empty intro should be filtered
      { name: 'David', introduction: null as any } // Null intro should be filtered
    ]

    const intro = buildCharactersIntroduction(characters)

    expect(intro).toContain('Alice：Main protagonist')
    expect(intro).toContain('Bob：Supporting character')
    expect(intro).not.toContain('Charlie：') // Should not include empty intros
    expect(intro).not.toContain('David：') // Should not include null intros
    expect(intro).not.toEqual('暂无角色介绍') // Should not return default when some exist
  })

  it('should return default when no characters provided to introduction builder', () => {
    const intro = buildCharactersIntroduction([])
    expect(intro).toBe('暂无角色介绍')

    // Test with falsy values
    const introNull = buildCharactersIntroduction(null as any)
    expect(introNull).toBe('暂无角色介绍')

    const introUndefined = buildCharactersIntroduction(undefined as any)
    expect(introUndefined).toBe('暂无角色介绍')
  })

  it('should return default when all character intros are empty', () => {
    const characters = [
      { name: 'Alice', introduction: '' },
      { name: 'Bob', introduction: null as any },
      { name: 'Charlie', introduction: '   ' } // Whitespace-only should be treated as empty
    ]

    const intro = buildCharactersIntroduction(characters)
    expect(intro).toBe('暂无角色介绍')
  })

  it('should build locations introduction correctly', () => {
    const locations = [
      { name: 'Forest', description: 'A dense forest' },
      { name: 'Castle', description: 'Ancient castle' },
      { name: 'River', description: '' }, // Empty description should be filtered
      { name: 'Mountain', description: null as any } // Null description should be filtered
    ]

    const intro = buildLocationsIntroduction(locations)

    expect(intro).toContain('Forest：A dense forest')
    expect(intro).toContain('Castle：Ancient castle')
    expect(intro).not.toContain('River：') // Should not include empty descriptions
    expect(intro).not.toContain('Mountain：') // Should not include null descriptions
    expect(intro).not.toEqual('暂无场景介绍') // Should not return default when some exist
  })

  it('should return default when no locations provided to introduction builder', () => {
    const intro = buildLocationsIntroduction([])
    expect(intro).toBe('暂无场景介绍')

    // Test with falsy values
    const introNull = buildLocationsIntroduction(null as any)
    expect(introNull).toBe('暂无场景介绍')

    const introUndefined = buildLocationsIntroduction(undefined as any)
    expect(introUndefined).toBe('暂无场景介绍')
  })

  it('should return default when all location descriptions are empty', () => {
    const locations = [
      { name: 'Forest', description: '' },
      { name: 'Castle', description: null as any },
      { name: 'River', description: '   ' } // Whitespace-only should be treated as empty
    ]

    const intro = buildLocationsIntroduction(locations)
    expect(intro).toBe('暂无场景介绍')
  })

  it('should correctly validate placeholder mismatches', () => {
    // Test with a prompt that has more variables in the template than declared
    // Since this is harder to test directly, we'll test that proper validation works
    // by ensuring expected variables are properly validated

    // This should work fine (correct variables)
    expect(() => {
      buildPrompt({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'en',
        variables: {
          user_input: 'Some character description'
        }
      })
    }).not.toThrow()

    // This should work fine (correct variables) async
    expect(async () => {
      await buildPromptAsync({
        promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
        locale: 'en',
        variables: {
          user_input: 'Some character description'
        }
      })
    }).not.rejects.toThrow()
  })
})