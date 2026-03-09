/**
 * 提示词 ID 定义
 * 基于 waoowaoo 项目迁移
 */

import type { PromptId } from './types'

/** 提示词 ID 常量映射 */
export const PROMPT_IDS = {
  // ===== 角色参考 (Character Reference) =====
  CHARACTER_IMAGE_TO_DESCRIPTION: 'character_image_to_description' as const,
  CHARACTER_REFERENCE_TO_SHEET: 'character_reference_to_sheet' as const,

  // ===== Novel Promotion (小说提升/分镜模式) =====
  // Agent 类
  NP_AGENT_ACTING_DIRECTION: 'np_agent_acting_direction' as const,
  NP_AGENT_CHARACTER_PROFILE: 'np_agent_character_profile' as const,
  NP_AGENT_CHARACTER_VISUAL: 'np_agent_character_visual' as const,
  NP_AGENT_CINEMATOGRAPHER: 'np_agent_cinematographer' as const,
  NP_AGENT_CLIP: 'np_agent_clip' as const,
  NP_AGENT_SHOT_VARIANT_ANALYSIS: 'np_agent_shot_variant_analysis' as const,
  NP_AGENT_SHOT_VARIANT_GENERATE: 'np_agent_shot_variant_generate' as const,
  NP_AGENT_STORYBOARD_DETAIL: 'np_agent_storyboard_detail' as const,
  NP_AGENT_STORYBOARD_INSERT: 'np_agent_storyboard_insert' as const,
  NP_AGENT_STORYBOARD_PLAN: 'np_agent_storyboard_plan' as const,

  // 角色管理
  NP_CHARACTER_CREATE: 'np_character_create' as const,
  NP_CHARACTER_DESCRIPTION_UPDATE: 'np_character_description_update' as const,
  NP_CHARACTER_MODIFY: 'np_character_modify' as const,
  NP_CHARACTER_REGENERATE: 'np_character_regenerate' as const,

  // 场景管理
  NP_LOCATION_CREATE: 'np_location_create' as const,
  NP_LOCATION_DESCRIPTION_UPDATE: 'np_location_description_update' as const,
  NP_LOCATION_MODIFY: 'np_location_modify' as const,
  NP_LOCATION_REGENERATE: 'np_location_regenerate' as const,

  // 剧本/分镜
  NP_EPISODE_SPLIT: 'np_episode_split' as const,
  NP_SCREENPLAY_CONVERSION: 'np_screenplay_conversion' as const,
  NP_SELECT_LOCATION: 'np_select_location' as const,
  NP_SINGLE_PANEL_IMAGE: 'np_single_panel_image' as const,
  NP_STORYBOARD_EDIT: 'np_storyboard_edit' as const,
  NP_IMAGE_PROMPT_MODIFY: 'np_image_prompt_modify' as const,

  // 语音
  NP_VOICE_ANALYSIS: 'np_voice_analysis' as const,
} as const

/** 获取所有提示词 ID 列表 */
export function getAllPromptIds(): PromptId[] {
  return Object.values(PROMPT_IDS) as PromptId[]
}

/** 检查是否为有效的提示词 ID */
export function isValidPromptId(id: string): id is PromptId {
  return Object.values(PROMPT_IDS).includes(id as PromptId)
}
