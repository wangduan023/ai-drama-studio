/**
 * 提示词系统统一导出
 * 基于 waoowaoo 项目迁移
 */

// ===== 类型导出 =====
export type {
  Locale,
  PromptCatalogEntry,
  PromptCatalog,
  BuildPromptInput,
  PromptVariables,
  PromptErrorType,
} from './types'

export { PromptError } from './types'

// ===== Prompt IDs（包含 PromptId 类型） =====
export { 
  PROMPT_IDS, 
  getAllPromptIds, 
  isValidPromptId,
  type PromptId,
} from './prompt-ids'

// ===== 目录注册表 =====
export { PROMPT_CATALOG } from './catalog'

// ===== 模板存储 =====
export {
  getPromptTemplate,
  getPromptTemplateAsync,
  clearTemplateCache,
  preloadTemplates,
  setTemplateRoot,
  getCacheStats,
} from './template-store'

// ===== 缓存工具 =====
export { LRUCache } from './lru-cache'

// ===== 渲染器 =====
export {
  buildPrompt,
  buildPromptAsync,
  buildCharactersIntroduction,
  buildLocationsIntroduction,
} from './renderer'
