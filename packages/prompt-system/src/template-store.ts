/**
 * 提示词模板存储
 * 基于 waoowaoo 项目迁移
 */

import fs from 'fs'
import path from 'path'
import { PROMPT_CATALOG } from './catalog'
import { PromptError } from './types'
import { LRUCache } from './lru-cache'
import type { Locale } from './types'
import type { PromptId } from './prompt-ids'

/** 最大缓存条目数 */
const MAX_CACHE_SIZE = parseInt(process.env.PROMPT_CACHE_SIZE || '100', 10)

/** 模板缓存（LRU 策略） */
const templateCache = new LRUCache<string, string>({ maxSize: MAX_CACHE_SIZE })

/** 模板存储配置 */
interface TemplateStoreConfig {
  /** 提示词模板根目录 */
  templateRoot: string
  /** 是否启用热重载 */
  hotReload: boolean
  /** 文件监听防抖时间（毫秒） */
  debounceMs: number
}

/** 内部配置存储 */
let storeConfig: TemplateStoreConfig = {
  templateRoot: process.env.PROMPT_TEMPLATE_ROOT || 'packages/prompt-system/templates',
  hotReload: process.env.PROMPT_HOT_RELOAD === 'true',
  debounceMs: parseInt(process.env.PROMPT_RELOAD_DEBOUNCE_MS || '100', 10),
}

/** 文件监听器映射 */
const fileWatchers = new Map<string, fs.FSWatcher>()

/** 防抖定时器映射 */
const debounceTimers = new Map<string, NodeJS.Timeout>()

/**
 * 获取生效的配置
 * 优先从环境变量读取，支持测试和动态修改
 */
function getEffectiveConfig(): TemplateStoreConfig {
  return {
    templateRoot: process.env.PROMPT_TEMPLATE_ROOT || storeConfig.templateRoot,
    hotReload: (process.env.PROMPT_HOT_RELOAD === 'true') || storeConfig.hotReload,
    debounceMs: parseInt(
      process.env.PROMPT_RELOAD_DEBOUNCE_MS || String(storeConfig.debounceMs),
      10
    ),
  }
}

/**
 * 获取当前配置
 * @returns 当前配置副本
 */
export function getStoreConfig(): Readonly<TemplateStoreConfig> {
  return { ...getEffectiveConfig() }
}

/**
 * 更新配置
 * @param updates - 配置更新
 */
function updateStoreConfig(updates: Partial<TemplateStoreConfig>): void {
  storeConfig = { ...storeConfig, ...updates }
}

/**
 * 清除所有文件监听器
 */
function clearAllWatchers(): void {
  for (const [key, watcher] of fileWatchers) {
    watcher.close()
    fileWatchers.delete(key)
  }
  for (const [key, timer] of debounceTimers) {
    clearTimeout(timer)
    debounceTimers.delete(key)
  }
}

/**
 * 设置文件监听器（热重载）
 * @param filePath - 文件路径
 * @param cacheKey - 缓存键
 */
function setupFileWatcher(filePath: string, cacheKey: string): void {
  const config = getEffectiveConfig()
  if (!config.hotReload) return

  // 避免重复监听
  if (fileWatchers.has(filePath)) return

  try {
    const watcher = fs.watch(filePath, (eventType) => {
      if (eventType === 'change') {
        // 防抖处理
        const existingTimer = debounceTimers.get(filePath)
        if (existingTimer) {
          clearTimeout(existingTimer)
        }

        const effectiveConfig = getEffectiveConfig()
        const timer = setTimeout(() => {
          // 清除该模板的缓存
          templateCache.delete(cacheKey)
          console.log(`[PromptSystem] Hot reload: ${cacheKey}`)
          debounceTimers.delete(filePath)
        }, effectiveConfig.debounceMs)

        debounceTimers.set(filePath, timer)
      }
    })

    fileWatchers.set(filePath, watcher)
  } catch (error) {
    console.warn(`[PromptSystem] Failed to watch file: ${filePath}`, error)
  }
}

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
  const config = getEffectiveConfig()
  return path.join(config.templateRoot, `${entry.pathStem}.${locale}.txt`)
}

/**
 * 构建缓存键
 */
function buildCacheKey(promptId: PromptId, locale: Locale): string {
  return `${promptId}:${locale}`
}

/**
 * 获取提示词模板内容（同步）
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

  // 设置文件监听（热重载）
  setupFileWatcher(filePath, cacheKey)

  return template
}

/**
 * 获取提示词模板内容（异步）
 * 推荐使用，避免阻塞事件循环
 * @param promptId - 提示词 ID
 * @param locale - 语言
 * @param options - 选项
 * @returns 模板内容字符串
 */
export async function getPromptTemplateAsync(
  promptId: PromptId,
  locale: Locale,
  options?: { forceReload?: boolean }
): Promise<string> {
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
    template = await fs.promises.readFile(filePath, 'utf-8')
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

  // 设置文件监听（热重载）
  setupFileWatcher(filePath, cacheKey)

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
 * @param options - 额外选项
 */
export function setTemplateRoot(
  customRoot: string,
  options?: { enableHotReload?: boolean }
): void {
  // 切换模板根路径时，清除所有缓存和监听器
  clearTemplateCache()
  clearAllWatchers()

  // 更新环境变量以保持向后兼容
  process.env.PROMPT_TEMPLATE_ROOT = customRoot

  // 更新配置（不再修改常量，而是更新可变配置对象）
  updateStoreConfig({
    templateRoot: customRoot,
    hotReload: options?.enableHotReload ?? storeConfig.hotReload,
  })
}

/**
 * 启用或禁用热重载
 * @param enabled - 是否启用
 */
export function setHotReload(enabled: boolean): void {
  updateStoreConfig({ hotReload: enabled })

  if (!enabled) {
    clearAllWatchers()
  }
}

/**
 * 获取缓存统计信息
 */
export function getCacheStats(): {
  size: number
  maxSize: number
  keys: string[]
  hotReloadEnabled: boolean
  watcherCount: number
} {
  return {
    size: templateCache.size,
    maxSize: MAX_CACHE_SIZE,
    keys: Array.from(templateCache.keys()),
    hotReloadEnabled: storeConfig.hotReload,
    watcherCount: fileWatchers.size,
  }
}

/**
 * 清理资源（关闭所有文件监听器）
 * 应在应用关闭时调用
 */
export function dispose(): void {
  clearAllWatchers()
  templateCache.clear()
}
