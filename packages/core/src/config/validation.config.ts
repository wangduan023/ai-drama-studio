/**
 * 角色一致性验证配置
 * 可外部化到配置文件或数据库
 */

import {
  loadKeywordsConfig,
  type KeywordsConfig,
  type KeywordsLoadOptions,
  type SupportedLocale,
  KEYWORDS_BY_LOCALE,
} from './keywords.config'

// 重新导出关键词配置相关类型和函数
export { type KeywordsConfig, type KeywordsLoadOptions, type SupportedLocale } from './keywords.config'
export { loadKeywordsConfig, KEYWORDS_BY_LOCALE } from './keywords.config'

/** 中文鞋子关键词（默认） */
export const SHOES_KEYWORDS: string[] = KEYWORDS_BY_LOCALE.zh.shoesKeywords

/** 中文奢华关键词（默认） */
export const LUXURY_KEYWORDS: string[] = KEYWORDS_BY_LOCALE.zh.luxuryKeywords

/** 验证配置接口 */
export interface ValidationConfig {
  /** 鞋子关键词 */
  shoesKeywords: string[]
  /** 奢华关键词 */
  luxuryKeywords: string[]
  /** 服装华丽度阈值（达到此等级需要奢华关键词） */
  luxuryThreshold: number
}

/** 默认验证配置 */
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  shoesKeywords: loadKeywordsConfig({ locale: 'zh' }).shoesKeywords,
  luxuryKeywords: loadKeywordsConfig({ locale: 'zh' }).luxuryKeywords,
  luxuryThreshold: 4,
}

/** 验证配置加载选项 */
export interface ValidationLoadOptions extends KeywordsLoadOptions {
  /** 服装华丽度阈值 */
  luxuryThreshold?: number
}

/**
 * 从环境变量加载验证配置
 * @param options - 加载选项，支持国际化
 * @returns 验证配置
 */
export function loadValidationConfig(options: ValidationLoadOptions = {}): ValidationConfig {
  const keywordsConfig = loadKeywordsConfig(options)
  
  return {
    shoesKeywords: keywordsConfig.shoesKeywords,
    luxuryKeywords: keywordsConfig.luxuryKeywords,
    luxuryThreshold: options.luxuryThreshold ?? parseInt(process.env.LUXURY_THRESHOLD || '4', 10),
  }
}

/**
 * 获取指定语言的默认验证配置
 * @param locale - 语言代码
 * @returns 验证配置
 */
export function getValidationConfigByLocale(locale: SupportedLocale): ValidationConfig {
  const keywordsConfig = loadKeywordsConfig({ locale })
  
  return {
    shoesKeywords: keywordsConfig.shoesKeywords,
    luxuryKeywords: keywordsConfig.luxuryKeywords,
    luxuryThreshold: 4,
  }
}
