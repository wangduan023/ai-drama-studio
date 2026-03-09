/**
 * 提示词模板存储
 * 基于 waoowaoo 项目迁移
 */

import fs from 'fs'
import path from 'path'
import { PROMPT_CATALOG } from './catalog'
import { PromptError } from './types'
import type { PromptId, Locale } from './types'

/** 模板缓存 */
const templateCache = new Map<string, string>()

/** 提示词模板根目录（可通过环境变量配置） */
const PROMPT_TEMPLATE_ROOT = process.env.PROMPT_TEMPLATE_ROOT || 'packages/prompt-system/templates'

/**
 * 构建模板文件路径
 */
function buildTemplatePath(promptId: PromptId, locale: Locale): string {
  const entry = PROMPT_CATALOG[promptId]
  if (!entry) {
    throw new PromptError(
      'PROMPT_ID_UNREGISTERED',
      promptId,
      `提示词 ID 未注册：${promptId}`
    )
  }
  return path.join(PROMPT_TEMPLATE_ROOT, `${entry.pathStem}.${locale}.txt`)
}

/**
 * 构建缓存键
 */
function buildCacheKey(promptId: PromptId, locale: Locale): string {
  return `${promptId}:${locale}`
}

/**
 * 获取提示词模板内容
 * @param promptId - 提示词 ID
 * @param locale - 语言
 * @param options - 选项
 * @returns 模板内容字符串
 */
export function getPromptTemplate(
  promptId: PromptId,
  locale: Locale,
  options?: { forceReload?: boolean }
): string {
  const entry = PROMPT_CATALOG[promptId]
  if (!entry) {
    throw new PromptError(
      'PROMPT_ID_UNREGISTERED',
      promptId,
      `提示词 ID 未注册：${promptId}`
    )
  }

  const cacheKey = buildCacheKey(promptId, locale)
  const cached = templateCache.get(cacheKey)

  // 如果已缓存且不需要强制重载，直接返回
  if (cached && !options?.forceReload) {
    return cached
  }

  const filePath = buildTemplatePath(promptId, locale)

  let template: string
  try {
    template = fs.readFileSync(filePath, 'utf-8')
  } catch (error) {
    throw new PromptError(
      'PROMPT_TEMPLATE_NOT_FOUND',
      promptId,
      `提示词模板文件未找到：${filePath}`,
      { filePath, locale, originalError: error }
    )
  }

  // 更新缓存
  templateCache.set(cacheKey, template)

  return template
}

/**
 * 清除模板缓存
 * @param promptId - 提示词 ID（可选，不传则清除所有）
 * @param locale - 语言（可选，不传则清除该 promptId 的所有语言）
 */
export function clearTemplateCache(promptId?: PromptId, locale?: Locale): void {
  if (!promptId) {
    // 清除所有缓存
    templateCache.clear()
  } else if (!locale) {
    // 清除指定 promptId 的所有语言缓存
    for (const key of templateCache.keys()) {
      if (key.startsWith(`${promptId}:`)) {
        templateCache.delete(key)
      }
    }
  } else {
    // 清除指定 promptId 和 locale 的缓存
    const key = buildCacheKey(promptId, locale)
    templateCache.delete(key)
  }
}

/**
 * 预加载所有模板到缓存（应用启动时调用）
 * @param locales - 需要预加载的语言列表
 */
export function preloadTemplates(locales: Locale[] = ['zh', 'en']): void {
  const promptIds = Object.keys(PROMPT_CATALOG) as PromptId[]

  for (const promptId of promptIds) {
    for (const locale of locales) {
      try {
        getPromptTemplate(promptId, locale)
        console.log(`[PromptSystem] Preloaded template: ${promptId}:${locale}`)
      } catch (error) {
        console.warn(`[PromptSystem] Failed to preload template: ${promptId}:${locale}`, error)
      }
    }
  }
}

/**
 * 注册自定义模板路径（用于运行时动态切换）
 * @param customRoot - 自定义模板根路径
 */
export function setTemplateRoot(customRoot: string): void {
  // 切换模板根路径时，清除所有缓存
  clearTemplateCache()
  // @ts-ignore - 允许运行时修改
  PROMPT_TEMPLATE_ROOT = customRoot
}
