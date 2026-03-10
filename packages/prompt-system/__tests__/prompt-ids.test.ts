import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PromptError } from '../src/types'
import { PROMPT_IDS, getAllPromptIds, isValidPromptId } from '../src/prompt-ids'

describe('Prompt IDs Module', () => {
  it('should export all expected prompt IDs', () => {
    expect(PROMPT_IDS).toBeDefined()
    expect(Object.keys(PROMPT_IDS)).toHaveLength(25) // Count the actual prompt IDs

    // Check a few key IDs exist
    expect(PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION).toBe('character_image_to_description')
    expect(PROMPT_IDS.NP_AGENT_ACTING_DIRECTION).toBe('np_agent_acting_direction')
    expect(PROMPT_IDS.NP_CHARACTER_CREATE).toBe('np_character_create')
    expect(PROMPT_IDS.NP_LOCATION_CREATE).toBe('np_location_create')
    expect(PROMPT_IDS.NP_EPISODE_SPLIT).toBe('np_episode_split')
  })

  it('should return all prompt IDs with getAllPromptIds', () => {
    const allIds = getAllPromptIds()
    expect(allIds).toHaveLength(Object.keys(PROMPT_IDS).length)
    expect(Array.isArray(allIds)).toBe(true)

    // Check that all IDs from PROMPT_IDS are in the returned array
    for (const id of Object.values(PROMPT_IDS)) {
      expect(allIds).toContain(id)
    }
  })

  it('should validate prompt IDs correctly', () => {
    // Valid IDs
    expect(isValidPromptId('character_image_to_description')).toBe(true)
    expect(isValidPromptId('np_agent_acting_direction')).toBe(true)
    expect(isValidPromptId('np_character_create')).toBe(true)

    // Invalid IDs
    expect(isValidPromptId('invalid_id')).toBe(false)
    expect(isValidPromptId('')).toBe(false)
    expect(isValidPromptId('random_string')).toBe(false)
  })

  it('should handle edge cases for isValidPromptId', () => {
    // Test with various invalid inputs
    expect(isValidPromptId('CHARACTER_IMAGE_TO_DESCRIPTION')).toBe(false) // Wrong case
    expect(isValidPromptId('character_image_to_description_extra')).toBe(false) // Extra characters
  })
})