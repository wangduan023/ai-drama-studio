/**
 * 提示词目录注册表
 * 基于 waoowaoo 项目迁移
 */

import { PROMPT_IDS } from './prompt-ids'
import type { PromptCatalog } from './types'

/** 提示词目录注册表 */
export const PROMPT_CATALOG: PromptCatalog = {
  // ===== 角色参考 (Character Reference) =====
  [PROMPT_IDS.CHARACTER_IMAGE_TO_DESCRIPTION]: {
    pathStem: 'character-reference/character_image_to_description',
    variableKeys: [],
    description: '从角色图片生成描述',
  },
  [PROMPT_IDS.CHARACTER_REFERENCE_TO_SHEET]: {
    pathStem: 'character-reference/character_reference_to_sheet',
    variableKeys: [],
    description: '角色参考表生成',
  },

  // ===== Novel Promotion (小说提升/分镜模式) =====
  // Agent 类
  [PROMPT_IDS.NP_AGENT_ACTING_DIRECTION]: {
    pathStem: 'novel-promotion/agent_acting_direction',
    variableKeys: ['panels_json', 'panel_count', 'characters_info'],
    description: '表演指导 Agent',
  },
  [PROMPT_IDS.NP_AGENT_CHARACTER_PROFILE]: {
    pathStem: 'novel-promotion/agent_character_profile',
    variableKeys: ['input', 'characters_lib_info'],
    description: '角色档案分析 Agent',
  },
  [PROMPT_IDS.NP_AGENT_CHARACTER_VISUAL]: {
    pathStem: 'novel-promotion/agent_character_visual',
    variableKeys: ['character_profiles'],
    description: '角色视觉生成 Agent',
  },
  [PROMPT_IDS.NP_AGENT_CINEMATOGRAPHER]: {
    pathStem: 'novel-promotion/agent_cinematographer',
    variableKeys: ['panels_json', 'panel_count', 'locations_description', 'characters_info'],
    description: '运镜设计 Agent',
  },
  [PROMPT_IDS.NP_AGENT_CLIP]: {
    pathStem: 'novel-promotion/agent_clip',
    variableKeys: ['input', 'locations_lib_name', 'characters_lib_name', 'characters_introduction'],
    description: '片段规划 Agent',
  },
  [PROMPT_IDS.NP_AGENT_SHOT_VARIANT_ANALYSIS]: {
    pathStem: 'novel-promotion/agent_shot_variant_analysis',
    variableKeys: ['panel_description', 'shot_type', 'camera_move', 'location', 'characters_info'],
    description: '镜头变体分析 Agent',
  },
  [PROMPT_IDS.NP_AGENT_SHOT_VARIANT_GENERATE]: {
    pathStem: 'novel-promotion/agent_shot_variant_generate',
    variableKeys: [
      'original_description',
      'original_shot_type',
      'original_camera_move',
      'location',
      'characters_info',
      'variant_title',
      'variant_description',
      'target_shot_type',
      'target_camera_move',
      'video_prompt',
      'character_assets',
      'location_asset',
      'aspect_ratio',
      'style',
    ],
    description: '镜头变体生成 Agent',
  },
  [PROMPT_IDS.NP_AGENT_STORYBOARD_DETAIL]: {
    pathStem: 'novel-promotion/agent_storyboard_detail',
    variableKeys: ['panels_json', 'characters_age_gender', 'locations_description'],
    description: '分镜细化 Agent',
  },
  [PROMPT_IDS.NP_AGENT_STORYBOARD_INSERT]: {
    pathStem: 'novel-promotion/agent_storyboard_insert',
    variableKeys: [
      'prev_panel_json',
      'next_panel_json',
      'characters_full_description',
      'locations_description',
      'user_input',
    ],
    description: '分镜插入 Agent',
  },
  [PROMPT_IDS.NP_AGENT_STORYBOARD_PLAN]: {
    pathStem: 'novel-promotion/agent_storyboard_plan',
    variableKeys: [
      'characters_lib_name',
      'locations_lib_name',
      'characters_introduction',
      'characters_appearance_list',
      'characters_full_description',
      'clip_json',
      'clip_content',
    ],
    description: '分镜规划 Agent',
  },

  // 角色管理
  [PROMPT_IDS.NP_CHARACTER_CREATE]: {
    pathStem: 'novel-promotion/character_create',
    variableKeys: ['user_input'],
    description: '角色创建',
  },
  [PROMPT_IDS.NP_CHARACTER_DESCRIPTION_UPDATE]: {
    pathStem: 'novel-promotion/character_description_update',
    variableKeys: ['original_description', 'modify_instruction', 'image_context'],
    description: '角色描述更新',
  },
  [PROMPT_IDS.NP_CHARACTER_MODIFY]: {
    pathStem: 'novel-promotion/character_modify',
    variableKeys: ['character_input', 'user_input'],
    description: '角色修改',
  },
  [PROMPT_IDS.NP_CHARACTER_REGENERATE]: {
    pathStem: 'novel-promotion/character_regenerate',
    variableKeys: ['character_name', 'current_descriptions', 'change_reason', 'novel_text'],
    description: '角色重新生成',
  },

  // 场景管理
  [PROMPT_IDS.NP_LOCATION_CREATE]: {
    pathStem: 'novel-promotion/location_create',
    variableKeys: ['user_input'],
    description: '场景创建',
  },
  [PROMPT_IDS.NP_LOCATION_DESCRIPTION_UPDATE]: {
    pathStem: 'novel-promotion/location_description_update',
    variableKeys: ['location_name', 'original_description', 'modify_instruction', 'image_context'],
    description: '场景描述更新',
  },
  [PROMPT_IDS.NP_LOCATION_MODIFY]: {
    pathStem: 'novel-promotion/location_modify',
    variableKeys: ['location_name', 'location_input', 'user_input'],
    description: '场景修改',
  },
  [PROMPT_IDS.NP_LOCATION_REGENERATE]: {
    pathStem: 'novel-promotion/location_regenerate',
    variableKeys: ['location_name', 'current_descriptions'],
    description: '场景重新生成',
  },

  // 剧本/分镜
  [PROMPT_IDS.NP_EPISODE_SPLIT]: {
    pathStem: 'novel-promotion/episode_split',
    variableKeys: ['CONTENT'],
    description: '小说分集',
  },
  [PROMPT_IDS.NP_SCREENPLAY_CONVERSION]: {
    pathStem: 'novel-promotion/screenplay_conversion',
    variableKeys: ['clip_content', 'locations_lib_name', 'characters_lib_name', 'characters_introduction', 'clip_id'],
    description: '剧本转换',
  },
  [PROMPT_IDS.NP_SELECT_LOCATION]: {
    pathStem: 'novel-promotion/select_location',
    variableKeys: ['input', 'locations_lib_name'],
    description: '场景选择',
  },
  [PROMPT_IDS.NP_SINGLE_PANEL_IMAGE]: {
    pathStem: 'novel-promotion/single_panel_image',
    variableKeys: ['storyboard_text_json_input', 'source_text', 'aspect_ratio', 'style'],
    description: '单面板图片生成',
  },
  [PROMPT_IDS.NP_STORYBOARD_EDIT]: {
    pathStem: 'novel-promotion/storyboard_edit',
    variableKeys: ['user_input'],
    description: '分镜编辑',
  },
  [PROMPT_IDS.NP_IMAGE_PROMPT_MODIFY]: {
    pathStem: 'novel-promotion/image_prompt_modify',
    variableKeys: ['prompt_input', 'user_input', 'video_prompt_input'],
    description: '图片提示词修改',
  },

  // 语音
  [PROMPT_IDS.NP_VOICE_ANALYSIS]: {
    pathStem: 'novel-promotion/voice_analysis',
    variableKeys: ['input', 'characters_lib_name', 'characters_introduction', 'storyboard_json'],
    description: '语音分析',
  },
}
