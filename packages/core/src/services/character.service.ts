/**
 * 角色一致性服务
 *
 * 核心职责：
 * 1. 管理角色档案的完整生命周期
 * 2. 确保多阶段生成中的角色一致性
 * 3. 提供角色外观映射和验证
 */

import type { CharacterProfile, CharacterAppearance, LocationProfile } from '../types'
import { CharacterRoleLevel } from '../types'
import type { PrismaClient, Prisma } from '@prisma/client'
import { DEFAULT_VALIDATION_CONFIG, type ValidationConfig } from '../config/validation.config'
import * as helpers from './helpers'

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
  details?: Record<string, unknown>
}

/** 角色服务配置 */
export interface CharacterServiceOptions {
  /** 是否启用严格验证 */
  strictValidation?: boolean
  /** S/A 级角色是否必须 primary_identifier */
  requirePrimaryIdentifier?: boolean
  /** 是否强制鞋子描述 */
  requireShoesDescription?: boolean
  /** 验证配置 */
  validationConfig?: ValidationConfig
}

/**
 * 角色服务错误
 */
export class CharacterServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'CharacterServiceError'
  }
}

/**
 * 角色档案服务
 */
export class CharacterProfileService {
  private prisma: PrismaClient
  private options: Required<CharacterServiceOptions>

  private validationConfig: ValidationConfig

  constructor(
    prisma: PrismaClient,
    options: CharacterServiceOptions = {}
  ) {
    this.prisma = prisma
    this.options = {
      strictValidation: options.strictValidation ?? true,
      requirePrimaryIdentifier: options.requirePrimaryIdentifier ?? true,
      requireShoesDescription: options.requireShoesDescription ?? true,
      validationConfig: options.validationConfig || DEFAULT_VALIDATION_CONFIG,
    }
    this.validationConfig = this.options.validationConfig
  }

  /**
   * 创建或更新角色档案
   */
  async upsertCharacterProfile(
    projectId: string,
    data: Partial<CharacterProfile> & { name: string }
  ): Promise<CharacterProfile> {
    // 输入验证
    validateCharacterData(data)

    try {
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
        return await this.prisma.characterProfile.update({
          where: { id: existing.id },
          data: {
            ...data,
            updatedAt: new Date(),
          },
        })
      }

      // 创建新角色
      return await this.prisma.characterProfile.create({
        data: {
          projectId,
          name: data.name,
          profileConfirmed: false,
        },
      })
    } catch (error) {
      if (error instanceof CharacterServiceError) {
        throw error
      }
      // 处理 Prisma 唯一约束错误
      const prismaError = error as { code?: string; message?: string }
      if (prismaError.code === 'P2002') {
        throw new CharacterServiceError(
          'DUPLICATE_CHARACTER',
          `项目中的角色 "${data.name}" 已存在`,
          { projectId, name: data.name }
        )
      }
      throw new CharacterServiceError(
        'DATABASE_ERROR',
        `保存角色档案失败: ${prismaError.message}`,
        { projectId, name: data.name, originalError: error }
      )
    }
  }

  /**
   * 批量创建/更新角色档案
   * 使用事务确保原子性，全部成功或全部失败
   */
  async batchUpsertCharacterProfiles(
    projectId: string,
    profiles: Array<Partial<CharacterProfile> & { name: string }>
  ): Promise<CharacterProfile[]> {
    if (!profiles || profiles.length === 0) {
      return []
    }

    // 验证所有输入
    for (const profile of profiles) {
      validateCharacterData(profile)
    }

    // 检查重复名称
    const names = profiles.map((p) => p.name)
    const uniqueNames = new Set(names)
    if (names.length !== uniqueNames.size) {
      throw new CharacterServiceError(
        'DUPLICATE_NAMES_IN_BATCH',
        '批量操作中的角色名称不能重复'
      )
    }

    try {
      // 使用事务确保原子性
      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const results: CharacterProfile[] = []

        for (const profile of profiles) {
          const existing = await tx.characterProfile.findUnique({
            where: {
              projectId_name: {
                projectId,
                name: profile.name,
              },
            },
          })

          if (existing) {
            const updated = await tx.characterProfile.update({
              where: { id: existing.id },
              data: {
                ...profile,
                updatedAt: new Date(),
              },
            })
            results.push(updated)
          } else {
            const created = await tx.characterProfile.create({
              data: {
                projectId,
                name: profile.name,
                profileConfirmed: false,
              },
            })
            results.push(created)
          }
        }

        return results
      })
    } catch (error) {
      if (error instanceof CharacterServiceError) {
        throw error
      }
      throw new CharacterServiceError(
        'BATCH_OPERATION_FAILED',
        '批量保存角色档案失败',
        { projectId, count: profiles.length, originalError: error }
      )
    }
  }

  /**
   * 获取项目的所有角色档案
   * @param projectId - 项目 ID
   * @param options - 查询选项
   */
  async getCharacterProfiles(
    projectId: string,
    options?: {
      includeDeleted?: boolean
      confirmedOnly?: boolean
      limit?: number
      offset?: number
    }
  ): Promise<CharacterProfile[]> {
    const where: { projectId: string; deletedAt?: null; profileConfirmed?: boolean } = { projectId }

    // 软删除过滤
    if (!options?.includeDeleted) {
      where.deletedAt = null
    }

    // 只返回已确认的角色
    if (options?.confirmedOnly) {
      where.profileConfirmed = true
    }

    return this.prisma.characterProfile.findMany({
      where,
      include: {
        appearances: {
          orderBy: { appearanceIndex: 'asc' },
        },
      },
      take: options?.limit,
      skip: options?.offset,
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
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

    // 默认返回所有未删除角色的初始形象 (appearanceIndex=1)
    const whereClause: { deletedAt: null; id?: { in: string[] } } = {
      deletedAt: null,
      ...(characterIds ? { id: { in: characterIds } } : {}),
    }

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
      (character.roleLevel === CharacterRoleLevel.S || character.roleLevel === CharacterRoleLevel.A) &&
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
    if (
      character.costumeTier &&
      character.costumeTier >= this.validationConfig.luxuryThreshold
    ) {
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
    return this.validationConfig.shoesKeywords.some((keyword) =>
      prompt.includes(keyword)
    )
  }

  /**
   * 检查提示词是否包含奢华关键词
   */
  private hasLuxuryKeywords(prompt: string): boolean {
    return this.validationConfig.luxuryKeywords.some((keyword) =>
      prompt.includes(keyword)
    )
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
      where: {
        deletedAt: null,
        ...(characterIds ? { id: { in: characterIds } } : {}),
      },
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
      .map((char: CharacterProfile & { appearances: CharacterAppearance[] }) => {
        const appearanceIndex = appearanceMap[char.id] || 1
        const appearance = char.appearances.find(
          (a: CharacterAppearance) => a.appearanceIndex === appearanceIndex
        )
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
 * 验证角色输入数据（向后兼容的包装函数）
 * @param data - 角色数据
 * @throws CharacterServiceError 验证失败时抛出
 */
export function validateCharacterData(data: Partial<CharacterProfile> & { name: string }): void {
  const result = helpers.validateCharacterData(data)
  if (!result.valid) {
    throw new CharacterServiceError(result.code || 'INVALID_DATA', result.error!)
  }
}

/**
 * 验证场景输入数据（向后兼容的包装函数）
 * @param data - 场景数据
 * @throws CharacterServiceError 验证失败时抛出
 */
export function validateLocationData(data: Partial<LocationProfile> & { name: string }): void {
  const result = helpers.validateLocationData(data)
  if (!result.valid) {
    throw new CharacterServiceError('INVALID_NAME', result.error!)
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
    // 输入验证
    validateLocationData(data)

    try {
      const existing = await this.prisma.locationProfile.findUnique({
        where: {
          projectId_name: {
            projectId,
            name: data.name,
          },
        },
      })

      if (existing) {
        return await this.prisma.locationProfile.update({
          where: { id: existing.id },
          data: {
            ...data,
            updatedAt: new Date(),
          },
        })
      }

      return await this.prisma.locationProfile.create({
        data: {
          projectId,
          name: data.name,
          locationConfirmed: false,
        },
      })
    } catch (error) {
      if (error instanceof CharacterServiceError) {
        throw error
      }
      // 处理 Prisma 唯一约束错误
      const prismaError = error as { code?: string; message?: string }
      if (prismaError.code === 'P2002') {
        throw new CharacterServiceError(
          'DUPLICATE_LOCATION',
          `项目中的场景 "${data.name}" 已存在`,
          { projectId, name: data.name }
        )
      }
      throw new CharacterServiceError(
        'DATABASE_ERROR',
        `保存场景档案失败: ${prismaError.message}`,
        { projectId, name: data.name, originalError: error }
      )
    }
  }

  /**
   * 批量创建/更新场景档案
   */
  async batchUpsertLocationProfiles(
    projectId: string,
    profiles: Array<Partial<LocationProfile> & { name: string }>
  ): Promise<LocationProfile[]> {
    if (!profiles || profiles.length === 0) {
      return []
    }

    // 验证所有输入
    for (const profile of profiles) {
      validateLocationData(profile)
    }

    // 检查重复名称
    const names = profiles.map((p) => p.name)
    const uniqueNames = new Set(names)
    if (names.length !== uniqueNames.size) {
      throw new CharacterServiceError(
        'DUPLICATE_NAMES_IN_BATCH',
        '批量操作中的场景名称不能重复'
      )
    }

    try {
      // 使用事务确保原子性
      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const results: LocationProfile[] = []

        for (const profile of profiles) {
          const existing = await tx.locationProfile.findUnique({
            where: {
              projectId_name: {
                projectId,
                name: profile.name,
              },
            },
          })

          if (existing) {
            const updated = await tx.locationProfile.update({
              where: { id: existing.id },
              data: {
                ...profile,
                updatedAt: new Date(),
              },
            })
            results.push(updated)
          } else {
            const created = await tx.locationProfile.create({
              data: {
                projectId,
                name: profile.name,
                locationConfirmed: false,
              },
            })
            results.push(created)
          }
        }

        return results
      })
    } catch (error) {
      if (error instanceof CharacterServiceError) {
        throw error
      }
      throw new CharacterServiceError(
        'BATCH_OPERATION_FAILED',
        '批量保存场景档案失败',
        { projectId, count: profiles.length, originalError: error }
      )
    }
  }

  /**
   * 获取项目的所有场景档案
   */
  async getLocationProfiles(projectId: string): Promise<LocationProfile[]> {
    return this.prisma.locationProfile.findMany({
      where: { projectId, deletedAt: null },
    })
  }

  /**
   * 构建场景介绍字符串
   * @deprecated 请使用 helpers/buildLocationsIntroduction
   */
  buildLocationsIntroduction(locations: LocationProfile[]): string {
    return helpers.buildLocationsIntroduction(locations)
  }
}
