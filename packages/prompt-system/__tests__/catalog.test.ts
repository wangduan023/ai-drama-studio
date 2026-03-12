/**
 * Prompt Catalog 测试
 */

import { describe, it, expect } from 'vitest'
import { PROMPT_CATALOG } from '../src/catalog'
import { PROMPT_IDS } from '../src/prompt-ids'

describe('PROMPT_CATALOG', () => {
  it('应该包含所有注册在 PROMPT_IDS 中的提示词', () => {
    const allIds = Object.values(PROMPT_IDS)
    
    allIds.forEach((id) => {
      expect(PROMPT_CATALOG[id]).toBeDefined()
    })
  })

  it('每个目录条目应该包含必要的字段', () => {
    const entries = Object.values(PROMPT_CATALOG)
    
    entries.forEach((entry) => {
      expect(entry).toHaveProperty('pathStem')
      expect(entry).toHaveProperty('variableKeys')
      expect(Array.isArray(entry.variableKeys)).toBe(true)
      expect(typeof entry.pathStem).toBe('string')
    })
  })

  describe('角色相关提示词', () => {
    it('CHARACTER_IMAGE_TO_DESCRIPTION 配置正确', () => {
      const entry = PROMPT_CATALOG[PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION]
      
      expect(entry.pathStem).toBe('character-reference/character_image_to_description')
      expect(entry.variableKeys).toEqual([])
      expect(entry.description).toBe('从角色图片生成描述')
    })

    it('CHARACTER_REFERENCE_TO_SHEET 配置正确', () => {
      const entry = PROMPT_CATALOG[PROMPT_IDS.CHARACTER_REFERENCE_TO_SHEET]
      
      expect(entry.pathStem).toBe('character-reference/character_reference_to_sheet')
      expect(entry.variableKeys).toEqual([])
      expect(entry.description).toBe('角色参考表生成')
    })

    it('NP_CHARACTER_CREATE 配置正确', () => {
      const entry = PROMPT_CATALOG[PROMPT_IDS.NP_CHARACTER_CREATE]
      
      expect(entry.pathStem).toBe('novel-promotion/character_create')
      expect(entry.variableKeys).toEqual(['user_input'])
      expect(entry.description).toBe('角色创建')
    })
  })

  describe('场景相关提示词', () => {
    it('NP_LOCATION_CREATE 配置正确', () => {
      const entry = PROMPT_CATALOG[PROMPT_IDS.NP_LOCATION_CREATE]
      
      expect(entry.pathStem).toBe('novel-promotion/location_create')
      expect(entry.variableKeys).toEqual(['user_input'])
      expect(entry.description).toBe('场景创建')
    })
  })

  describe('Agent 提示词', () => {
    it('NP_AGENT_STORYBOARD_PLAN 应该包含多个变量', () => {
      const entry = PROMPT_CATALOG[PROMPT_IDS.NP_AGENT_STORYBOARD_PLAN]
      
      expect(entry.variableKeys.length).toBeGreaterThan(0)
      expect(entry.variableKeys).toContain('characters_lib_name')
      expect(entry.variableKeys).toContain('locations_lib_name')
    })

    it('NP_AGENT_CINEMATOGRAPHER 应该包含摄影相关变量', () => {
      const entry = PROMPT_CATALOG[PROMPT_IDS.NP_AGENT_CINEMATOGRAPHER]
      
      expect(entry.variableKeys).toContain('panels_json')
      expect(entry.variableKeys).toContain('panel_count')
      expect(entry.variableKeys).toContain('locations_description')
      expect(entry.variableKeys).toContain('characters_info')
    })
  })

  describe('剧本相关提示词', () => {
    it('NP_EPISODE_SPLIT 配置正确', () => {
      const entry = PROMPT_CATALOG[PROMPT_IDS.NP_EPISODE_SPLIT]
      
      expect(entry.pathStem).toBe('novel-promotion/episode_split')
      expect(entry.variableKeys).toEqual(['CONTENT'])
      expect(entry.description).toBe('小说分集')
    })

    it('NP_SCREENPLAY_CONVERSION 应该包含剧本转换相关变量', () => {
      const entry = PROMPT_CATALOG[PROMPT_IDS.NP_SCREENPLAY_CONVERSION]
      
      expect(entry.variableKeys).toContain('clip_content')
      expect(entry.variableKeys).toContain('characters_lib_name')
    })
  })

  describe('语音相关提示词', () => {
    it('NP_VOICE_ANALYSIS 配置正确', () => {
      const entry = PROMPT_CATALOG[PROMPT_IDS.NP_VOICE_ANALYSIS]
      
      expect(entry.pathStem).toBe('novel-promotion/voice_analysis')
      expect(entry.variableKeys).toContain('input')
      expect(entry.variableKeys).toContain('characters_lib_name')
    })
  })

  it('所有提示词的路径都不应该为空', () => {
    Object.values(PROMPT_CATALOG).forEach((entry) => {
      expect(entry.pathStem.trim()).not.toBe('')
    })
  })

  it('variableKeys 应该是只读数组', () => {
    // TypeScript 编译时确保，这里只是验证数据正确性
    const entry = PROMPT_CATALOG[PROMPT_IDS.NP_CHARACTER_CREATE]
    expect(Array.isArray(entry.variableKeys)).toBe(true)
  })
})
