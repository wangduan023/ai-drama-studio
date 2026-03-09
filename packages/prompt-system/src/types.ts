/**
 * 提示词系统类型定义
 * 基于 waoowaoo 项目迁移
 */

/** 支持的 locale */
export type Locale = 'zh' | 'en'

/** 提示词 ID（类型安全） */
export type PromptId =
  // 角色参考
  | 'character_image_to_description'
  | 'character_reference_to_sheet'

  // Novel Promotion (小说提升/分镜模式) - Agent 类
  | 'np_agent_acting_direction'
  | 'np_agent_character_profile'
  | 'np_agent_character_visual'
  | 'np_agent_cinematographer'
  | 'np_agent_clip'
  | 'np_agent_shot_variant_analysis'
  | 'np_agent_shot_variant_generate'
  | 'np_agent_storyboard_detail'
  | 'np_agent_storyboard_insert'
  | 'np_agent_storyboard_plan'

  // Novel Promotion - 角色管理
  | 'np_character_create'
  | 'np_character_description_update'
  | 'np_character_modify'
  | 'np_character_regenerate'

  // Novel Promotion - 场景管理
  | 'np_location_create'
  | 'np_location_description_update'
  | 'np_location_modify'
  | 'np_location_regenerate'

  // Novel Promotion - 剧本/分镜
  | 'np_episode_split'
  | 'np_screenplay_conversion'
  | 'np_select_location'
  | 'np_single_panel_image'
  | 'np_storyboard_edit'
  | 'np_image_prompt_modify'

  // Novel Promotion - 语音
  | 'np_voice_analysis'

/** 提示词模板条目 */
export interface PromptCatalogEntry {
  /** 模板文件路径（不含 locale 和后缀） */
  pathStem: string
  /** 声明的变量键列表 */
  variableKeys: readonly string[]
  /** 描述（用于文档） */
  description?: string
}

/** 提示词目录 */
export type PromptCatalog = Record<PromptId, PromptCatalogEntry>

/** 提示词变量键值对 */
export type PromptVariables = Record<string, string>

/** 构建提示词的输入 */
export interface BuildPromptInput {
  /** 提示词 ID */
  promptId: PromptId
  /** 语言 */
  locale: Locale
  /** 变量替换 */
  variables?: PromptVariables
}

/** 提示词错误类型 */
export type PromptErrorType =
  | 'PROMPT_ID_UNREGISTERED'
  | 'PROMPT_TEMPLATE_NOT_FOUND'
  | 'PROMPT_VARIABLE_MISSING'
  | 'PROMPT_VARIABLE_UNEXPECTED'
  | 'PROMPT_VARIABLE_VALUE_INVALID'
  | 'PROMPT_PLACEHOLDER_MISMATCH'

/** 提示词错误 */
export class PromptError extends Error {
  constructor(
    public readonly type: PromptErrorType,
    public readonly promptId: PromptId,
    message: string,
    public readonly details?: Record<string, any>
  ) {
    super(`[${type}] ${message}`)
    this.name = 'PromptError'
  }
}
