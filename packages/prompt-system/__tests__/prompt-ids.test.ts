/**
 * Prompt IDs 测试
 */

import { describe, it, expect } from 'vitest'
import {
  PROMPT_IDS,
  getAllPromptIds,
  isValidPromptId,
  type PromptId,
} from '../src/prompt-ids'

describe('Prompt IDs', () => {
  describe('PROMPT_IDS 常量', () => {
    it('应该包含所有预期的提示词 ID', () => {
      expect(PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION).toBe('character_image_to_description')
      expect(PROMPT_IDS.CHARACTER_REFERENCE_TO_SHEET).toBe('character_reference_to_sheet')
      expect(PROMPT_IDS.NP_CHARACTER_CREATE).toBe('np_character_create')
      expect(PROMPT_IDS.NP_LOCATION_CREATE).toBe('np_location_create')
      expect(PROMPT_IDS.NP_EPISODE_SPLIT).toBe('np_episode_split')
      expect(PROMPT_IDS.NP_VOICE_ANALYSIS).toBe('np_voice_analysis')
    })

    it('应该包含所有 Agent 类型的提示词 ID', () => {
      expect(PROMPT_IDS.NP_AGENT_ACTING_DIRECTION).toBe('np_agent_acting_direction')
      expect(PROMPT_IDS.NP_AGENT_CHARACTER_PROFILE).toBe('np_agent_character_profile')
      expect(PROMPT_IDS.NP_AGENT_CHARACTER_VISUAL).toBe('np_agent_character_visual')
      expect(PROMPT_IDS.NP_AGENT_CINEMATOGRAPHER).toBe('np_agent_cinematographer')
      expect(PROMPT_IDS.NP_AGENT_CLIP).toBe('np_agent_clip')
      expect(PROMPT_IDS.NP_AGENT_STORYBOARD_PLAN).toBe('np_agent_storyboard_plan')
      expect(PROMPT_IDS.NP_AGENT_STORYBOARD_DETAIL).toBe('np_agent_storyboard_detail')
      expect(PROMPT_IDS.NP_AGENT_STORYBOARD_INSERT).toBe('np_agent_storyboard_insert')
      expect(PROMPT_IDS.NP_AGENT_SHOT_VARIANT_ANALYSIS).toBe('np_agent_shot_variant_analysis')
      expect(PROMPT_IDS.NP_AGENT_SHOT_VARIANT_GENERATE).toBe('np_agent_shot_variant_generate')
    })
  })

  describe('getAllPromptIds', () => {
    it('应该返回所有提示词 ID 数组', () => {
      const allIds = getAllPromptIds()
      
      expect(Array.isArray(allIds)).toBe(true)
      expect(allIds.length).toBeGreaterThan(0)
      expect(allIds).toContain(PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION)
      expect(allIds).toContain(PROMPT_IDS.NP_CHARACTER_CREATE)
      expect(allIds).toContain(PROMPT_IDS.NP_LOCATION_CREATE)
    })

    it('返回的数组不应包含重复项', () => {
      const allIds = getAllPromptIds()
      const uniqueIds = new Set(allIds)
      
      expect(uniqueIds.size).toBe(allIds.length)
    })
  })

  describe('isValidPromptId', () => {
    it('应该返回 true 对于有效的提示词 ID', () => {
      expect(isValidPromptId('character_image_to_description')).toBe(true)
      expect(isValidPromptId('np_character_create')).toBe(true)
      expect(isValidPromptId('np_location_create')).toBe(true)
      expect(isValidPromptId('np_episode_split')).toBe(true)
      expect(isValidPromptId('np_voice_analysis')).toBe(true)
    })

    it('应该返回 false 对于无效的提示词 ID', () => {
      expect(isValidPromptId('invalid_id')).toBe(false)
      expect(isValidPromptId('')).toBe(false)
      expect(isValidPromptId('random_string')).toBe(false)
      expect(isValidPromptId('np_invalid_prompt')).toBe(false)
    })

    it('应该正确进行类型保护', () => {
      const id = 'np_character_create'
      
      if (isValidPromptId(id)) {
        // TypeScript 应该能够推断出 id 是 PromptId 类型
        const promptId: PromptId = id
        expect(promptId).toBe('np_character_create')
      }
    })
  })
})
