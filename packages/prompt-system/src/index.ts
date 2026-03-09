/**
 * 提示词系统统一导出
 * 基于 waoowaoo 项目迁移
 */

// ===== 类型导出 =====
export type {
  Locale,
  PromptId,
  PromptCatalogEntry,
  PromptCatalog,
  BuildPromptInput,
  PromptVariables,
  PromptErrorType,
} from './types'

export { PromptError } from './types'

// ===== Prompt IDs =====
export { PROMPT_IDS, getAllPromptIds, isValidPromptId } from './prompt-ids'

// ===== 目录注册表 =====
export { PROMPT_CATALOG } from './catalog'

// ===== 模板存储 =====
export {
  getPromptTemplate,
  clearTemplateCache,
  preloadTemplates,
  setTemplateRoot,
} from './template-store'

// ===== 渲染器 =====
export {
  buildPrompt,
  buildCharactersIntroduction,
  buildLocationsIntroduction,
} from './renderer'
