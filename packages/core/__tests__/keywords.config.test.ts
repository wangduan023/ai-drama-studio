/**
 * Keywords Config 测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  loadKeywordsConfig,
  mergeKeywordsConfig,
  KEYWORDS_BY_LOCALE,
  type SupportedLocale,
  type KeywordsConfig,
} from '../src/config/keywords.config'

describe('Keywords Config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // 重置环境变量
    process.env = { ...originalEnv }
    delete process.env.SHOES_KEYWORDS
    delete process.env.LUXURY_KEYWORDS
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('KEYWORDS_BY_LOCALE', () => {
    it('应该包含中文关键词配置', () => {
      const zhConfig = KEYWORDS_BY_LOCALE.zh

      expect(zhConfig.shoesKeywords).toContain('鞋')
      expect(zhConfig.shoesKeywords).toContain('高跟鞋')
      expect(zhConfig.luxuryKeywords).toContain('华丽')
      expect(zhConfig.luxuryKeywords).toContain('丝绸')
    })

    it('应该包含英文关键词配置', () => {
      const enConfig = KEYWORDS_BY_LOCALE.en

      expect(enConfig.shoesKeywords).toContain('shoe')
      expect(enConfig.shoesKeywords).toContain('high heels')
      expect(enConfig.luxuryKeywords).toContain('luxurious')
      expect(enConfig.luxuryKeywords).toContain('silk')
    })

    it('中文鞋子关键词应该包含多种类型', () => {
      const zhConfig = KEYWORDS_BY_LOCALE.zh

      expect(zhConfig.shoesKeywords.length).toBeGreaterThan(10)
      expect(zhConfig.shoesKeywords).toContain('运动鞋')
      expect(zhConfig.shoesKeywords).toContain('靴子')
      expect(zhConfig.shoesKeywords).toContain('皮鞋')
    })

    it('中文奢华关键词应该包含多种描述', () => {
      const zhConfig = KEYWORDS_BY_LOCALE.zh

      expect(zhConfig.luxuryKeywords.length).toBeGreaterThan(10)
      expect(zhConfig.luxuryKeywords).toContain('定制')
      expect(zhConfig.luxuryKeywords).toContain('珠宝')
      expect(zhConfig.luxuryKeywords).toContain('龙袍')
    })
  })

  describe('loadKeywordsConfig', () => {
    it('应该默认加载中文配置', () => {
      const config = loadKeywordsConfig()

      expect(config.shoesKeywords).toContain('鞋')
      expect(config.luxuryKeywords).toContain('华丽')
    })

    it('应该支持加载英文配置', () => {
      const config = loadKeywordsConfig({ locale: 'en' })

      expect(config.shoesKeywords).toContain('shoe')
      expect(config.luxuryKeywords).toContain('luxurious')
    })

    it('应该支持自定义鞋子关键词', () => {
      const customKeywords = ['定制鞋', '皮鞋']
      const config = loadKeywordsConfig({ customShoesKeywords: customKeywords })

      expect(config.shoesKeywords).toEqual(customKeywords)
    })

    it('应该支持自定义奢华关键词', () => {
      const customKeywords = ['豪华', '顶级']
      const config = loadKeywordsConfig({ customLuxuryKeywords: customKeywords })

      expect(config.luxuryKeywords).toEqual(customKeywords)
    })

    it('应该从环境变量加载鞋子关键词', () => {
      process.env.SHOES_KEYWORDS = '定制鞋,皮鞋,运动鞋'
      const config = loadKeywordsConfig()

      expect(config.shoesKeywords).toEqual(['定制鞋', '皮鞋', '运动鞋'])
    })

    it('应该从环境变量加载奢华关键词', () => {
      process.env.LUXURY_KEYWORDS = '豪华,顶级,尊贵'
      const config = loadKeywordsConfig()

      expect(config.luxuryKeywords).toEqual(['豪华', '顶级', '尊贵'])
    })

    it('自定义关键词应该优先于环境变量', () => {
      process.env.SHOES_KEYWORDS = '环境变量鞋'
      const customKeywords = ['自定义鞋']
      const config = loadKeywordsConfig({ customShoesKeywords: customKeywords })

      expect(config.shoesKeywords).toEqual(customKeywords)
    })

    it('应该处理空的环境变量', () => {
      process.env.SHOES_KEYWORDS = ''
      process.env.LUXURY_KEYWORDS = ''
      const config = loadKeywordsConfig()

      // 应该使用默认配置
      expect(config.shoesKeywords.length).toBeGreaterThan(0)
      expect(config.luxuryKeywords.length).toBeGreaterThan(0)
    })

    it('应该对不支持的语言回退到中文', () => {
      const config = loadKeywordsConfig({ locale: 'fr' as SupportedLocale })

      // 应该回退到中文配置
      expect(config.shoesKeywords).toContain('鞋')
    })
  })

  describe('mergeKeywordsConfig', () => {
    it('应该合并两个配置', () => {
      const base: KeywordsConfig = {
        shoesKeywords: ['鞋', '靴'],
        luxuryKeywords: ['华丽'],
      }
      const override: Partial<KeywordsConfig> = {
        shoesKeywords: ['皮鞋'],
        luxuryKeywords: ['奢华'],
      }

      const merged = mergeKeywordsConfig(base, override)

      expect(merged.shoesKeywords).toContain('鞋')
      expect(merged.shoesKeywords).toContain('靴')
      expect(merged.shoesKeywords).toContain('皮鞋')
      expect(merged.luxuryKeywords).toContain('华丽')
      expect(merged.luxuryKeywords).toContain('奢华')
    })

    it('应该处理空的 override', () => {
      const base: KeywordsConfig = {
        shoesKeywords: ['鞋', '靴'],
        luxuryKeywords: ['华丽'],
      }

      const merged = mergeKeywordsConfig(base, {})

      expect(merged.shoesKeywords).toEqual(['鞋', '靴'])
      expect(merged.luxuryKeywords).toEqual(['华丽'])
    })

    it('应该只合并部分覆盖', () => {
      const base: KeywordsConfig = {
        shoesKeywords: ['鞋', '靴'],
        luxuryKeywords: ['华丽'],
      }
      const override: Partial<KeywordsConfig> = {
        shoesKeywords: ['皮鞋'],
      }

      const merged = mergeKeywordsConfig(base, override)

      expect(merged.shoesKeywords).toContain('鞋')
      expect(merged.shoesKeywords).toContain('靴')
      expect(merged.shoesKeywords).toContain('皮鞋')
      expect(merged.luxuryKeywords).toEqual(['华丽'])
    })

    it('应该处理重复的 keyword', () => {
      const base: KeywordsConfig = {
        shoesKeywords: ['鞋', '皮鞋'],
        luxuryKeywords: ['华丽'],
      }
      const override: Partial<KeywordsConfig> = {
        shoesKeywords: ['皮鞋', '运动鞋'],
      }

      const merged = mergeKeywordsConfig(base, override)

      // 重复项应该被保留（没有去重逻辑）
      expect(merged.shoesKeywords.filter(k => k === '皮鞋').length).toBe(2)
    })
  })
})
