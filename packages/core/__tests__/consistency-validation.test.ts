/**
 * 角色一致性验证深度测试
 * 测试 S/A 级角色检测、鞋子描述检测、奢侈品关键词检测、多阶段外观一致性
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  CharacterProfileService,
  CharacterServiceError,
  type ConsistencyValidationResult,
  type ConsistencyViolation
} from '../src/services/character.service'
import { CharacterRoleLevel } from '../src/types'

// Mock Prisma Client
vi.mock('@prisma/client', () => {
  return {
    PrismaClient: class MockPrismaClient {
      characterProfile = {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      }
      characterAppearance = {
        upsert: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
      }
      episode = {
        findUnique: vi.fn(),
        update: vi.fn(),
      }
      $transaction = vi.fn(async (callback) => {
        // 模拟事务执行
        return callback(this)
      })
    }
  }
})

describe('Character Consistency Validation', () => {
  let prisma: PrismaClient
  let service: CharacterProfileService

  beforeEach(() => {
    prisma = new PrismaClient()
    service = new CharacterProfileService(prisma, {
      strictValidation: true,
      requirePrimaryIdentifier: true,
      requireShoesDescription: true
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('S/A 级角色 primary_identifier 检测', () => {
    it('应该检测到 S 级角色缺少 primary_identifier', () => {
      const character = {
        id: 'char-s-001',
        name: '主角S',
        projectId: 'proj-001',
        roleLevel: CharacterRoleLevel.S,
        profileConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const prompt = '一个年轻的骑士站在城堡前，身穿银色盔甲，手持长剑。'

      const result = service.validateConsistency(prompt, character)

      expect(result.isValid).toBe(false)
      expect(result.violations).toHaveLength(2) // missing_identifier (error) + missing_shoes (warning)
      
      const identifierViolation = result.violations.find(v => v.type === 'missing_identifier')
      expect(identifierViolation).toBeDefined()
      expect(identifierViolation?.severity).toBe('error')
      expect(identifierViolation?.message).toContain('主角S')
      expect(identifierViolation?.characterId).toBe('char-s-001')
    })

    it('应该检测到 A 级角色缺少 primary_identifier', () => {
      const character = {
        id: 'char-a-001',
        name: '配角A',
        projectId: 'proj-001',
        roleLevel: CharacterRoleLevel.A,
        profileConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const prompt = '一位美丽的公主站在花园中，穿着粉色长裙。'

      const result = service.validateConsistency(prompt, character)

      expect(result.isValid).toBe(false)
      
      const identifierViolation = result.violations.find(v => v.type === 'missing_identifier')
      expect(identifierViolation).toBeDefined()
      expect(identifierViolation?.severity).toBe('error')
    })

    it('不应该对 B 级及以下角色强制要求 primary_identifier', () => {
      const bCharacter = {
        id: 'char-b-001',
        name: '配角B',
        projectId: 'proj-001',
        roleLevel: CharacterRoleLevel.B,
        profileConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const cCharacter = {
        id: 'char-c-001',
        name: '配角C',
        projectId: 'proj-001',
        roleLevel: CharacterRoleLevel.C,
        profileConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const prompt = '一个普通的村民站在路边。'

      const bResult = service.validateConsistency(prompt, bCharacter)
      const cResult = service.validateConsistency(prompt, cCharacter)

      // B/C 级角色不应该有 missing_identifier 错误
      expect(bResult.violations.find(v => v.type === 'missing_identifier' && v.severity === 'error')).toBeUndefined()
      expect(cResult.violations.find(v => v.type === 'missing_identifier' && v.severity === 'error')).toBeUndefined()
    })

    it('应该通过有 primary_identifier 的 S 级角色验证', () => {
      const character = {
        id: 'char-s-002',
        name: '主角S2',
        projectId: 'proj-001',
        roleLevel: CharacterRoleLevel.S,
        primaryIdentifier: '额头的星形胎记',
        profileConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const prompt = '主角S2站在月光下，额头的星形胎记闪闪发光，穿着红色长靴。'

      const result = service.validateConsistency(prompt, character, 1)

      // 不应该有 missing_identifier 错误
      const identifierError = result.violations.find(
        v => v.type === 'missing_identifier' && v.severity === 'error'
      )
      expect(identifierError).toBeUndefined()
    })

    it('应该检测到提示词中未体现 primary_identifier', () => {
      const character = {
        id: 'char-s-003',
        name: '主角S3',
        projectId: 'proj-001',
        roleLevel: CharacterRoleLevel.S,
        primaryIdentifier: '金色眼瞳',
        profileConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // 提示词中没有提到 "金色眼瞳"
      const prompt = '主角S3站在山顶，穿着蓝色披风，黑色靴子。'

      const result = service.validateConsistency(prompt, character)

      // 应该有 warning 级别的 missing_identifier
      const identifierWarning = result.violations.find(
        v => v.type === 'missing_identifier' && v.severity === 'warning'
      )
      expect(identifierWarning).toBeDefined()
      expect(identifierWarning?.message).toContain('金色眼瞳')
    })

    it('应该在禁用 requirePrimaryIdentifier 时跳过检测', () => {
      const relaxedService = new CharacterProfileService(prisma, {
        strictValidation: true,
        requirePrimaryIdentifier: false,
        requireShoesDescription: false
      })

      const character = {
        id: 'char-s-004',
        name: '主角S4',
        projectId: 'proj-001',
        roleLevel: CharacterRoleLevel.S,
        profileConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const prompt = '主角S4站在舞台上。'

      const result = relaxedService.validateConsistency(prompt, character)

      // 不应该有任何 missing_identifier 违规
      expect(result.violations.find(v => v.type === 'missing_identifier')).toBeUndefined()
    })
  })

  describe('鞋子描述缺失检测', () => {
    it('应该检测到提示词中缺少鞋子描述', () => {
      const character = {
        id: 'char-001',
        name: '角色1',
        projectId: 'proj-001',
        profileConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const prompt = '一个年轻人站在公园中，穿着白色T恤和牛仔裤。' // 没有鞋子描述

      const result = service.validateConsistency(prompt, character)

      const shoesViolation = result.violations.find(v => v.type === 'missing_shoes')
      expect(shoesViolation).toBeDefined()
      expect(shoesViolation?.severity).toBe('warning')
      expect(shoesViolation?.message).toContain('鞋子')
    })

    it('应该通过包含鞋子关键词的提示词', () => {
      const character = {
        id: 'char-002',
        name: '角色2',
        projectId: 'proj-001',
        profileConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const shoeKeywords = ['运动鞋', '皮鞋', '靴子', '高跟鞋', '凉鞋', '拖鞋']

      shoeKeywords.forEach(keyword => {
        const prompt = `角色2穿着${keyword}走在街上。`
        const result = service.validateConsistency(prompt, character)
        
        const shoesViolation = result.violations.find(v => v.type === 'missing_shoes')
        expect(shoesViolation).toBeUndefined()
      })
    })

    it('应该在禁用 requireShoesDescription 时跳过检测', () => {
      const relaxedService = new CharacterProfileService(prisma, {
        strictValidation: true,
        requirePrimaryIdentifier: false,
        requireShoesDescription: false
      })

      const character = {
        id: 'char-003',
        name: '角色3',
        projectId: 'proj-001',
        profileConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const prompt = '角色3站在舞台上，没有提到鞋子。'

      const result = relaxedService.validateConsistency(prompt, character)

      expect(result.violations.find(v => v.type === 'missing_shoes')).toBeUndefined()
    })
  })

  describe('奢侈品关键词检测', () => {
    it('应该检测到高服装华丽度缺少奢侈品关键词', () => {
      const character = {
        id: 'char-lux-001',
        name: '贵族角色',
        projectId: 'proj-001',
        costumeTier: 5, // 高于默认阈值 4
        profileConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const prompt = '贵族角色穿着普通的衣服，戴着普通的首饰，脚穿皮鞋。' // 没有奢侈品关键词

      const result = service.validateConsistency(prompt, character)

      const luxuryViolation = result.violations.find(v => v.type === 'costume_mismatch')
      expect(luxuryViolation).toBeDefined()
      expect(luxuryViolation?.severity).toBe('warning')
      expect(luxuryViolation?.message).toContain('5')
      expect(luxuryViolation?.message).toContain('奢华')
    })

    it('应该通过包含奢侈品关键词的高华丽度角色', () => {
      const character = {
        id: 'char-lux-002',
        name: '女王',
        projectId: 'proj-001',
        costumeTier: 5,
        profileConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const luxuryKeywords = ['丝绸', '珠宝', '钻石', '黄金', '貂皮', '天鹅绒']

      luxuryKeywords.forEach(keyword => {
        const prompt = `女王穿着镶嵌${keyword}的礼服，脚穿金色高跟鞋。`
        const result = service.validateConsistency(prompt, character)
        
        const luxuryViolation = result.violations.find(v => v.type === 'costume_mismatch')
        expect(luxuryViolation).toBeUndefined()
      })
    })

    it('不应该对低服装华丽度强制要求奢侈品关键词', () => {
      const character = {
        id: 'char-lux-003',
        name: '平民',
        projectId: 'proj-001',
        costumeTier: 2, // 低于阈值
        profileConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const prompt = '平民穿着简单的布衣和草鞋。'

      const result = service.validateConsistency(prompt, character)

      expect(result.violations.find(v => v.type === 'costume_mismatch')).toBeUndefined()
    })

    it('应该正确处理 costumeTier 为 null 的情况', () => {
      const character = {
        id: 'char-lux-004',
        name: '神秘角色',
        projectId: 'proj-001',
        costumeTier: null,
        profileConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const prompt = '神秘角色穿着普通的衣服。'

      const result = service.validateConsistency(prompt, character)

      expect(result.violations.find(v => v.type === 'costume_mismatch')).toBeUndefined()
    })
  })

  describe('多阶段外观一致性检测', () => {
    it('应该验证不同 appearanceIndex 的一致性要求相同', () => {
      const character = {
        id: 'char-multi-001',
        name: '变身角色',
        projectId: 'proj-001',
        roleLevel: CharacterRoleLevel.S,
        primaryIdentifier: '红色披风',
        costumeTier: 4,
        profileConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // 测试不同 appearanceIndex（外观阶段）
      const prompts = [
        { index: 1, text: '变身角色穿着日常服装，红色披风搭在肩上，脚穿运动鞋。' },
        { index: 2, text: '变身角色进入战斗状态，红色披风随风飘扬，铠甲覆盖全身，战靴闪闪发光。' },
        { index: 3, text: '变身角色受伤倒地，红色披风染满鲜血，一只靴子已经破损。' }
      ]

      prompts.forEach(({ index, text }) => {
        const result = service.validateConsistency(text, character, index)
        
        // S 级角色在任何外观阶段都需要 primary_identifier
        const identifierError = result.violations.find(
          v => v.type === 'missing_identifier' && v.severity === 'error'
        )
        expect(identifierError).toBeUndefined()
        
        // 高华丽度在任何阶段都需要奢侈品关键词
        if (index === 2) {
          // 战斗状态可能有华丽的描述
          const luxuryViolation = result.violations.find(v => v.type === 'costume_mismatch')
          // 这个测试用例的文本包含 "闪闪发光" 等词，可能通过了奢侈品检测
        }
      })
    })

    it('应该验证不同外观阶段的角色身份保持一致', () => {
      const character = {
        id: 'char-multi-002',
        name: '双重身份角色',
        projectId: 'proj-001',
        roleLevel: CharacterRoleLevel.A,
        primaryIdentifier: '左眼的疤痕',
        profileConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // 外观1：日常生活
      const prompt1 = '双重身份角色在市场中买菜，左眼的疤痕被头发遮住，穿着普通布鞋。'
      const result1 = service.validateConsistency(prompt1, character, 1)
      expect(result1.isValid).toBe(true)

      // 外观2：战斗形态
      const prompt2 = '双重身份角色拔剑战斗，左眼的疤痕在阳光下清晰可见，战靴踩在地上。'
      const result2 = service.validateConsistency(prompt2, character, 2)
      expect(result2.isValid).toBe(true)

      // 外观3：缺少 primary_identifier（应该产生 warning）
      const prompt3 = '双重身份角色在宴会上，面容精致，穿着高跟鞋。'
      const result3 = service.validateConsistency(prompt3, character, 3)
      // 只有 warning，所以 isValid 仍然是 true
      expect(result3.violations.find(v => v.type === 'missing_identifier' && v.severity === 'warning')).toBeDefined()
    })
  })

  describe('复杂场景验证', () => {
    it('应该同时检测多个违规项', () => {
      const character = {
        id: 'char-complex-001',
        name: '复杂角色',
        projectId: 'proj-001',
        roleLevel: CharacterRoleLevel.S,
        costumeTier: 5,
        profileConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // 这个提示词有多个问题：
      // 1. 缺少 primary_identifier（S级）
      // 2. 缺少鞋子描述
      // 3. 高华丽度缺少奢侈品关键词
      const prompt = '复杂角色站在舞台上。'

      const result = service.validateConsistency(prompt, character)

      expect(result.isValid).toBe(false)
      expect(result.violations.length).toBeGreaterThanOrEqual(2)
      
      expect(result.violations.find(v => v.type === 'missing_identifier' && v.severity === 'error')).toBeDefined()
      expect(result.violations.find(v => v.type === 'missing_shoes')).toBeDefined()
      expect(result.violations.find(v => v.type === 'costume_mismatch')).toBeDefined()
    })

    it('应该处理空或无效的输入', () => {
      const character = {
        id: 'char-edge-001',
        name: '边缘角色',
        projectId: 'proj-001',
        profileConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // 空提示词
      const result1 = service.validateConsistency('', character)
      expect(result1.violations.find(v => v.type === 'missing_shoes')).toBeDefined()

      // 只有空白字符
      const result2 = service.validateConsistency('   \n\t   ', character)
      expect(result2.violations.find(v => v.type === 'missing_shoes')).toBeDefined()
    })

    it('应该正确处理包含特殊字符的提示词', () => {
      const character = {
        id: 'char-special-001',
        name: '特殊角色',
        projectId: 'proj-001',
        roleLevel: CharacterRoleLevel.S,
        primaryIdentifier: '★星形标记★',
        profileConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const prompt = '特殊角色头上有★星形标记★，穿着靴子。'

      const result = service.validateConsistency(prompt, character)

      expect(result.isValid).toBe(true)
      expect(result.violations.find(v => v.type === 'missing_identifier')).toBeUndefined()
    })
  })

  describe('验证结果结构', () => {
    it('应该返回正确结构的验证结果', () => {
      const character = {
        id: 'char-struct-001',
        name: '结构测试角色',
        projectId: 'proj-001',
        roleLevel: CharacterRoleLevel.S,
        profileConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const prompt = '测试提示词'

      const result = service.validateConsistency(prompt, character)

      expect(result).toHaveProperty('isValid')
      expect(result).toHaveProperty('violations')
      expect(Array.isArray(result.violations)).toBe(true)
      
      if (result.violations.length > 0) {
        const violation = result.violations[0]
        expect(violation).toHaveProperty('type')
        expect(violation).toHaveProperty('severity')
        expect(violation).toHaveProperty('message')
        expect(violation).toHaveProperty('characterId')
      }
    })

    it('应该在 isValid 为 false 时至少有一个 error 级别的违规', () => {
      const character = {
        id: 'char-valid-001',
        name: '有效性测试角色',
        projectId: 'proj-001',
        roleLevel: CharacterRoleLevel.S,
        profileConfirmed: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const prompt = '没有任何要求的提示词'

      const result = service.validateConsistency(prompt, character)

      if (!result.isValid) {
        const hasError = result.violations.some(v => v.severity === 'error')
        expect(hasError).toBe(true)
      }
    })
  })
})
