/**
 * 角色一致性验证配置
 * 可外部化到配置文件或数据库
 */

/** 鞋子关键词列表 */
export const SHOES_KEYWORDS = [
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
]

/** 奢华关键词列表 */
export const LUXURY_KEYWORDS = [
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
]

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
  shoesKeywords: SHOES_KEYWORDS,
  luxuryKeywords: LUXURY_KEYWORDS,
  luxuryThreshold: 4,
}

/**
 * 从环境变量加载验证配置
 */
export function loadValidationConfig(): ValidationConfig {
  return {
    shoesKeywords: process.env.SHOES_KEYWORDS?.split(',') || SHOES_KEYWORDS,
    luxuryKeywords: process.env.LUXURY_KEYWORDS?.split(',') || LUXURY_KEYWORDS,
    luxuryThreshold: parseInt(process.env.LUXURY_THRESHOLD || '4', 10),
  }
}
