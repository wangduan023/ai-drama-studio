/**
 * 角色一致性服务
 *
 * 核心职责：
 * 1. 管理角色档案的完整生命周期
 * 2. 确保多阶段生成中的角色一致性
 * 3. 提供角色外观映射和验证
 */

import type { CharacterProfile, CharacterAppearance, LocationProfile } from '../types'
import type { PrismaClient } from '@prisma/client'

/** 角色外观映射 */
export interface AppearanceMap {
  [characterId: string]: number  // characterId -> appearanceIndex
}

/** 角色一致性验证结果 */
export interface ConsistencyValidationResult {
  isValid: boolean
  violations: ConsistencyViolation[]
}

/** 一致性问题 */
export interface ConsistencyViolation {
  type: 'missing_identifier' | 'costume_mismatch' | 'appearance_drift' | 'missing_shoes'
  severity: 'warning' | 'error'
  message: string
  characterId?: string
  details?: Record<string, any>
}

/** 角色服务配置 */
export interface CharacterServiceOptions {
  /** 是否启用严格验证 */
  strictValidation?: boolean
  /** S/A 级角色是否必须 primary_identifier */
  requirePrimaryIdentifier?: boolean
  /** 是否强制鞋子描述 */
  requireShoesDescription?: boolean
}

/**
 * 角色档案服务
 */
export class CharacterProfileService {
  private prisma: PrismaClient
  private options: Required<CharacterServiceOptions>

  constructor(
    prisma: PrismaClient,
    options: CharacterServiceOptions = {}
  ) {
    this.prisma = prisma
    this.options = {
      strictValidation: options.strictValidation ?? true,
      requirePrimaryIdentifier: options.requirePrimaryIdentifier ?? true,
      requireShoesDescription: options.requireShoesDescription ?? true,
    }
  }

  /**
   * 创建或更新角色档案
   */
  async upsertCharacterProfile(
    projectId: string,
    data: Partial<CharacterProfile> & { name: string }
  ): Promise<CharacterProfile> {
    const existing = await this.prisma.characterProfile.findUnique({
      where: {
        projectId_name: {
          projectId,
          name: data.name,
        },
      },
    })

    if (existing) {
      // 更新现有角色
      return this.prisma.characterProfile.update({
        where: { id: existing.id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      })
    }

    // 创建新角色
    return this.prisma.characterProfile.create({
      data: {
        projectId,
        name: data.name,
        profileConfirmed: false,
      },
    })
  }

  /**
   * 批量创建/更新角色档案
   */
  async batchUpsertCharacterProfiles(
    projectId: string,
    profiles: Array<Partial<CharacterProfile> & { name: string }>
  ): Promise<CharacterProfile[]> {
    const results: CharacterProfile[] = []

    for (const profile of profiles) {
      const result = await this.upsertCharacterProfile(projectId, profile)
      results.push(result)
    }

    return results
  }

  /**
   * 获取项目的所有角色档案
   */
  async getCharacterProfiles(projectId: string): Promise<CharacterProfile[]> {
    return this.prisma.characterProfile.findMany({
      where: { projectId },
      include: {
        appearances: {
          orderBy: { appearanceIndex: 'asc' },
        },
      },
    })
  }

  /**
   * 获取角色档案（含外观形态）
   */
  async getCharacterProfileWithAppearances(
    characterId: string
  ): Promise<CharacterProfile & { appearances: CharacterAppearance[] } | null> {
    return this.prisma.characterProfile.findUnique({
      where: { id: characterId },
      include: {
        appearances: {
          orderBy: { appearanceIndex: 'asc' },
        },
      },
    })
  }

  /**
   * 确认角色档案（生成视觉描述后调用）
   */
  async confirmCharacterProfile(
    characterId: string,
    appearances: Array<{
      appearanceIndex: number
      changeReason: string
      description: string
      descriptions?: string[]
    }>
  ): Promise<CharacterProfile> {
    return this.prisma.$transaction(async (tx) => {
      // 更新角色确认为 true
      const updated = await tx.characterProfile.update({
        where: { id: characterId },
        data: { profileConfirmed: true },
      })

      // 创建或更新外观形态
      for (const app of appearances) {
        await tx.characterAppearance.upsert({
          where: {
            characterId_appearanceIndex: {
              characterId,
              appearanceIndex: app.appearanceIndex,
            },
          },
          update: {
            changeReason: app.changeReason,
            description: app.description,
            descriptions: app.descriptions ? JSON.stringify(app.descriptions) : null,
          },
          create: {
            characterId,
            appearanceIndex: app.appearanceIndex,
            changeReason: app.changeReason,
            description: app.description,
            descriptions: app.descriptions ? JSON.stringify(app.descriptions) : null,
          },
        })
      }

      return updated
    })
  }

  /**
   * 构建外观映射（用于 Pipeline 上下文传递）
   */
  async buildAppearanceMap(
    episodeId: string,
    characterIds?: string[]
  ): Promise<AppearanceMap> {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      select: { characterAppearanceMap: true },
    })

    if (episode?.characterAppearanceMap) {
      const map = episode.characterAppearanceMap as Record<string, number>
      if (characterIds) {
        // 只返回指定的角色
        const filtered: AppearanceMap = {}
        for (const id of characterIds) {
          if (map[id]) {
            filtered[id] = map[id]
          }
        }
        return filtered
      }
      return map
    }

    // 默认返回所有角色的初始形象 (appearanceIndex=1)
    const whereClause = characterIds
      ? { id: { in: characterIds } }
      : {}

    const characters = await this.prisma.characterProfile.findMany({
      where: whereClause,
    })

    const map: AppearanceMap = {}
    for (const char of characters) {
      map[char.id] = 1  // 默认初始形象
    }
    return map
  }

  /**
   * 保存外观映射到剧集
   */
  async saveAppearanceMap(
    episodeId: string,
    appearanceMap: AppearanceMap
  ): Promise<void> {
    await this.prisma.episode.update({
      where: { id: episodeId },
      data: {
        characterAppearanceMap: appearanceMap,
      },
    })
  }

  /**
   * 验证角色一致性
   */
  validateConsistency(
    prompt: string,
    character: CharacterProfile,
    appearanceIndex: number = 1
  ): ConsistencyValidationResult {
    const violations: ConsistencyViolation[] = []

    // 1. 检查 primary_identifier（S/A 级角色必须）
    if (
      this.options.requirePrimaryIdentifier &&
      (character.roleLevel === 'S' || character.roleLevel === 'A') &&
      !character.primaryIdentifier
    ) {
      violations.push({
        type: 'missing_identifier',
        severity: 'error',
        message: `S/A 级角色 ${character.name} 缺少 primary_identifier`,
        characterId: character.id,
      })
    }

    // 2. 检查 primary_identifier 是否在提示词中体现
    if (character.primaryIdentifier && !prompt.includes(character.primaryIdentifier)) {
      violations.push({
        type: 'missing_identifier',
        severity: 'warning',
        message: `提示词中未体现辨识标志 "${character.primaryIdentifier}"`,
        characterId: character.id,
        details: { prompt, primaryIdentifier: character.primaryIdentifier },
      })
    }

    // 3. 检查鞋子描述
    if (this.options.requireShoesDescription && !this.hasShoesKeywords(prompt)) {
      violations.push({
        type: 'missing_shoes',
        severity: 'warning',
        message: `提示词中缺少鞋子描述`,
        characterId: character.id,
      })
    }

    // 4. 检查服装华丽度匹配
    if (character.costumeTier && character.costumeTier >= 4) {
      if (!this.hasLuxuryKeywords(prompt)) {
        violations.push({
          type: 'costume_mismatch',
          severity: 'warning',
          message: `角色服装华丽度为 ${character.costumeTier}，但提示词中缺少奢华关键词`,
          characterId: character.id,
        })
      }
    }

    return {
      isValid: violations.filter((v) => v.severity === 'error').length === 0,
      violations,
    }
  }

  /**
   * 检查提示词是否包含鞋子关键词
   */
  private hasShoesKeywords(prompt: string): boolean {
    const shoesKeywords = [
      '鞋', '靴', '高跟鞋', '马丁靴', '帆布鞋', '牛津鞋', '运动鞋',
      '凉鞋', '拖鞋', '皮鞋', '布鞋', '战靴',
    ]
    return shoesKeywords.some((keyword) => prompt.includes(keyword))
  }

  /**
   * 检查提示词是否包含奢华关键词
   */
  private hasLuxuryKeywords(prompt: string): boolean {
    const luxuryKeywords = [
      '华丽', '精致', '奢华', '高档', '定制', '刺绣', '镶嵌',
      '丝绸', '天鹅绒', '蕾丝', '皮草', '珠宝', '金银',
    ]
    return luxuryKeywords.some((keyword) => prompt.includes(keyword))
  }

  /**
   * 获取角色的当前外观描述
   */
  async getCurrentAppearanceDescription(
    characterId: string,
    appearanceIndex: number = 1
  ): Promise<string | null> {
    const appearance = await this.prisma.characterAppearance.findUnique({
      where: {
        characterId_appearanceIndex: {
          characterId,
          appearanceIndex,
        },
      },
    })

    return appearance?.description || null
  }

  /**
   * 为分镜规划准备角色信息
   */
  async prepareCharactersForStoryboard(
    episodeId: string,
    characterIds?: string[]
  ): Promise<{
    appearanceMap: AppearanceMap
    characters: CharacterProfile[]
    appearanceList: string
  }> {
    const appearanceMap = await this.buildAppearanceMap(episodeId, characterIds)

    const characters = await this.prisma.characterProfile.findMany({
      where: characterIds ? { id: { in: characterIds } } : undefined,
      include: {
        appearances: {
          where: {
            appearanceIndex: { in: Object.values(appearanceMap) },
          },
        },
      },
    })

    // 构建外观列表字符串
    const appearanceList = characters
      .map((char) => {
        const appearanceIndex = appearanceMap[char.id] || 1
        const appearance = char.appearances.find((a) => a.appearanceIndex === appearanceIndex)
        const desc = appearance?.description || '默认外观'
        return `${char.name}: ${desc}`
      })
      .join('\n')

    return {
      appearanceMap,
      characters,
      appearanceList,
    }
  }
}

/**
 * 场景档案服务
 */
export class LocationProfileService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * 创建或更新场景档案
   */
  async upsertLocationProfile(
    projectId: string,
    data: Partial<LocationProfile> & { name: string }
  ): Promise<LocationProfile> {
    const existing = await this.prisma.locationProfile.findUnique({
      where: {
        projectId_name: {
          projectId,
          name: data.name,
        },
      },
    })

    if (existing) {
      return this.prisma.locationProfile.update({
        where: { id: existing.id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      })
    }

    return this.prisma.locationProfile.create({
      data: {
        projectId,
        name: data.name,
        locationConfirmed: false,
      },
    })
  }

  /**
   * 获取项目的所有场景档案
   */
  async getLocationProfiles(projectId: string): Promise<LocationProfile[]> {
    return this.prisma.locationProfile.findMany({
      where: { projectId },
    })
  }

  /**
   * 构建场景介绍字符串
   */
  buildLocationsIntroduction(locations: LocationProfile[]): string {
    if (locations.length === 0) return '暂无场景介绍'

    const introductions = locations
      .filter((l) => l.description)
      .map((l) => `- ${l.name}：${l.description}`)

    return introductions.length > 0
      ? introductions.join('\n')
      : '暂无场景介绍'
  }
}
