/**
 * 验证关键词配置
 * 支持多语言和动态配置
 */

/** 支持的语言类型 */
export type SupportedLocale = 'zh' | 'en'

/** 关键词配置接口 */
export interface KeywordsConfig {
  /** 鞋子关键词 */
  shoesKeywords: string[]
  /** 奢华关键词 */
  luxuryKeywords: string[]
}

/** 默认中文关键词 */
const DEFAULT_ZH_KEYWORDS: KeywordsConfig = {
  shoesKeywords: [
    '鞋',
    '靴',
    '高跟鞋',
    '马丁靴',
    '帆布鞋',
    '牛津鞋',
    '运动鞋',
    '凉鞋',
    '拖鞋',
    '皮鞋',
    '布鞋',
    '战靴',
    '靴子',
    '短靴',
    '长靴',
    '过膝靴',
    '铆钉靴',
    '骑士靴',
    '木屐',
    '草鞋',
  ],
  luxuryKeywords: [
    '华丽',
    '精致',
    '奢华',
    '高档',
    '定制',
    '刺绣',
    '镶嵌',
    '丝绸',
    '天鹅绒',
    '蕾丝',
    '皮草',
    '珠宝',
    '金银',
    '珠片',
    '镶钻',
    '鎏金',
    '锦缎',
    '云锦',
    '蜀锦',
    '龙袍',
    '凤冠',
  ],
}

/** 英文关键词 */
const DEFAULT_EN_KEYWORDS: KeywordsConfig = {
  shoesKeywords: [
    'shoe',
    'shoes',
    'boot',
    'boots',
    'high heels',
    'martin boots',
    'canvas shoes',
    'oxford shoes',
    'sneakers',
    'sandals',
    'slippers',
    'leather shoes',
    'cloth shoes',
    'combat boots',
    'ankle boots',
    'knee-high boots',
    'over-the-knee boots',
    'studded boots',
    'riding boots',
    'geta',
    'straw sandals',
  ],
  luxuryKeywords: [
    'gorgeous',
    'exquisite',
    'luxurious',
    'high-end',
    'custom-made',
    'embroidered',
    'inlaid',
    'silk',
    'velvet',
    'lace',
    'fur',
    'jewelry',
    'gold',
    'silver',
    'sequins',
    'diamond-studded',
    'gilded',
    'brocade',
    'yunjin',
    'shujin',
    'dragon robe',
    'phoenix crown',
  ],
}

/** 多语言关键词映射 */
export const KEYWORDS_BY_LOCALE: Record<SupportedLocale, KeywordsConfig> = {
  zh: DEFAULT_ZH_KEYWORDS,
  en: DEFAULT_EN_KEYWORDS,
}

/** 配置加载选项 */
export interface KeywordsLoadOptions {
  /** 语言 */
  locale?: SupportedLocale
  /** 自定义鞋子关键词（将覆盖默认值） */
  customShoesKeywords?: string[]
  /** 自定义奢华关键词（将覆盖默认值） */
  customLuxuryKeywords?: string[]
}

/**
 * 加载关键词配置
 * @param options - 加载选项
 * @returns 合并后的关键词配置
 */
export function loadKeywordsConfig(options: KeywordsLoadOptions = {}): KeywordsConfig {
  const locale = options.locale || 'zh'
  const defaults = KEYWORDS_BY_LOCALE[locale] || DEFAULT_ZH_KEYWORDS

  // 从环境变量加载
  const envShoesKeywords = process.env.SHOES_KEYWORDS?.split(',').filter(Boolean)
  const envLuxuryKeywords = process.env.LUXURY_KEYWORDS?.split(',').filter(Boolean)

  return {
    shoesKeywords: options.customShoesKeywords || envShoesKeywords || defaults.shoesKeywords,
    luxuryKeywords: options.customLuxuryKeywords || envLuxuryKeywords || defaults.luxuryKeywords,
  }
}

/**
 * 合并关键词配置
 * @param base - 基础配置
 * @param override - 覆盖配置
 * @returns 合并后的配置
 */
export function mergeKeywordsConfig(
  base: KeywordsConfig,
  override: Partial<KeywordsConfig>
): KeywordsConfig {
  return {
    shoesKeywords: [...base.shoesKeywords, ...(override.shoesKeywords || [])],
    luxuryKeywords: [...base.luxuryKeywords, ...(override.luxuryKeywords || [])],
  }
}
