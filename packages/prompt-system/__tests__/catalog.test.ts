import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PROMPT_CATALOG } from '../src/catalog'
import { PROMPT_IDS } from '../src/prompt-ids'

describe('Catalog Module', () => {
  it('should export PROMPT_CATALOG', () => {
    expect(PROMPT_CATALOG).toBeDefined()
    expect(typeof PROMPT_CATALOG).toBe('object')
  })

  it('should contain all expected prompt IDs', () => {
    const catalogKeys = Object.keys(PROMPT_CATALOG)
    const promptIds = Object.values(PROMPT_IDS)

    expect(catalogKeys).toHaveLength(promptIds.length)

    for (const id of promptIds) {
      expect(PROMPT_CATALOG[id]).toBeDefined()
      expect(PROMPT_CATALOG[id]).toHaveProperty('pathStem')
      expect(PROMPT_CATALOG[id]).toHaveProperty('variableKeys')
      expect(Array.isArray(PROMPT_CATALOG[id].variableKeys)).toBe(true)
      expect(typeof PROMPT_CATALOG[id].pathStem).toBe('string')
    }
  })

  it('should have correct pathStems for various prompt IDs', () => {
    expect(PROMPT_CATALOG[PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION].pathStem).toBe('character-reference/character_image_to_description')
    expect(PROMPT_CATALOG[PROMPT_IDS.NP_AGENT_ACTING_DIRECTION].pathStem).toBe('novel-promotion/agent_acting_direction')
    expect(PROMPT_IDS.NP_CHARACTER_CREATE in PROMPT_CATALOG).toBe(true)
    expect(PROMPT_CATALOG[PROMPT_IDS.NP_CHARACTER_CREATE].pathStem).toBe('novel-promotion/character_create')
  })

  it('should have correct variableKeys for various prompt IDs', () => {
    // Check a prompt with no variables
    expect(PROMPT_CATALOG[PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION].variableKeys).toEqual([])

    // Check a prompt with multiple variables
    expect(PROMPT_CATALOG[PROMPT_IDS.NP_AGENT_ACTING_DIRECTION].variableKeys).toEqual([
      'panels_json', 'panel_count', 'characters_info'
    ])

    // Check another with multiple variables
    expect(PROMPT_CATALOG[PROMPT_IDS.NP_EPISODE_SPLIT].variableKeys).toEqual(['CONTENT'])
  })

  it('should have descriptions for all entries', () => {
    const entries = Object.values(PROMPT_CATALOG)
    for (const entry of entries) {
      expect(entry).toHaveProperty('description')
      expect(typeof entry.description).toBe('string')
    }
  })
})