/**
 * 提示词系统类型定义
 * 基于 waoowaoo 项目迁移
 */

/** 支持的 locale */
export type Locale = 'zh' | 'en'

// PromptId 类型从 prompt-ids.ts 导入，确保单一数据源
import type { PromptId as ImportedPromptId } from './prompt-ids'
export type PromptId = ImportedPromptId

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
