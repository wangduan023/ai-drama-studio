import { describe, it, expect } from 'vitest'
import {
  CharacterRoleLevel,
  LocationType,
  SHOES_KEYWORDS,
  LUXURY_KEYWORDS,
  DEFAULT_VALIDATION_CONFIG,
  loadValidationConfig
} from '../src'

describe('Core Types and Config', () => {
  it('should have correct CharacterRoleLevel enum values', () => {
    expect(CharacterRoleLevel.S).toBe('S')
    expect(CharacterRoleLevel.A).toBe('A')
    expect(CharacterRoleLevel.B).toBe('B')
    expect(CharacterRoleLevel.C).toBe('C')
    expect(CharacterRoleLevel.D).toBe('D')
  })

  it('should have correct LocationType enum values', () => {
    expect(LocationType.INDOOR).toBe('INDOOR')
    expect(LocationType.OUTDOOR).toBe('OUTDOOR')
    expect(LocationType.NATURE).toBe('NATURE')
    expect(LocationType.BUILDING).toBe('BUILDING')
    expect(LocationType.FANTASY).toBe('FANTASY')
  })

  it('should have correct SHOES_KEYWORDS', () => {
    expect(SHOES_KEYWORDS).toContain('鞋')
    expect(SHOES_KEYWORDS).toContain('靴')
    expect(SHOES_KEYWORDS).toContain('高跟鞋')
    expect(SHOES_KEYWORDS).toContain('运动鞋')
    expect(SHOES_KEYWORDS.length).toBeGreaterThan(0)
  })

  it('should have correct LUXURY_KEYWORDS', () => {
    expect(LUXURY_KEYWORDS).toContain('华丽')
    expect(LUXURY_KEYWORDS).toContain('奢华')
    expect(LUXURY_KEYWORDS).toContain('丝绸')
    expect(LUXURY_KEYWORDS).toContain('珠宝')
    expect(LUXURY_KEYWORDS.length).toBeGreaterThan(0)
  })

  it('should have correct DEFAULT_VALIDATION_CONFIG', () => {
    expect(DEFAULT_VALIDATION_CONFIG.shoesKeywords).toEqual(SHOES_KEYWORDS)
    expect(DEFAULT_VALIDATION_CONFIG.luxuryKeywords).toEqual(LUXURY_KEYWORDS)
    expect(DEFAULT_VALIDATION_CONFIG.luxuryThreshold).toBe(4)
  })

  it('should load validation config from environment variables', () => {
    // Save original env values
    const originalShoes = process.env.SHOES_KEYWORDS
    const originalLuxury = process.env.LUXURY_KEYWORDS
    const originalThreshold = process.env.LUXURY_THRESHOLD

    // Test with environment variables
    process.env.SHOES_KEYWORDS = 'test,shoe,boot'
    process.env.LUXURY_KEYWORDS = 'test,luxury,expensive'
    process.env.LUXURY_THRESHOLD = '5'

    const config = loadValidationConfig()
    expect(config.shoesKeywords).toEqual(['test', 'shoe', 'boot'])
    expect(config.luxuryKeywords).toEqual(['test', 'luxury', 'expensive'])
    expect(config.luxuryThreshold).toBe(5)

    // Restore original values
    process.env.SHOES_KEYWORDS = originalShoes
    process.env.LUXURY_KEYWORDS = originalLuxury
    process.env.LUXURY_THRESHOLD = originalThreshold

    // Test with default values
    delete process.env.SHOES_KEYWORDS
    delete process.env.LUXURY_KEYWORDS
    delete process.env.LUXURY_THRESHOLD

    const defaultConfig = loadValidationConfig()
    expect(defaultConfig.shoesKeywords).toEqual(SHOES_KEYWORDS)
    expect(defaultConfig.luxuryKeywords).toEqual(LUXURY_KEYWORDS)
    expect(defaultConfig.luxuryThreshold).toBe(4)
  })

  it('should handle invalid LUXURY_THRESHOLD gracefully', () => {
    const originalThreshold = process.env.LUXURY_THRESHOLD
    process.env.LUXURY_THRESHOLD = 'invalid-number'

    const config = loadValidationConfig()
    expect(isNaN(config.luxuryThreshold)).toBe(true) // parseInt returns NaN for invalid strings

    // Restore original value
    process.env.LUXURY_THRESHOLD = originalThreshold
  })
})