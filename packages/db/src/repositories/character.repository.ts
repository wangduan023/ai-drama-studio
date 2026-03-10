/**
 * Character Repository
 * 角色档案仓储层，封装角色相关的数据库操作
 */
import type { Prisma, PrismaClient, CharacterRoleLevel, CharacterProfile, CharacterAppearance } from '@prisma/client'
import { BaseRepository } from './base.repository'
import { prisma } from '../client'

export interface CreateCharacterInput {
  projectId: string
  name: string
  aliases?: string[]
  introduction?: string
  gender?: string
  ageRange?: string
  roleLevel?: CharacterRoleLevel
  archetype?: string
  personalityTags?: string[]
  eraPeriod?: string
  socialClass?: string
  occupation?: string
  costumeTier?: number
  suggestedColors?: string[]
  primaryIdentifier?: string
  visualKeywords?: string[]
  expectedAppearances?: Record<string, unknown>[]
}

export interface UpdateCharacterInput {
  aliases?: string[]
  introduction?: string
  gender?: string
  ageRange?: string
  roleLevel?: CharacterRoleLevel
  archetype?: string
  personalityTags?: string[]
  eraPeriod?: string
  socialClass?: string
  occupation?: string
  costumeTier?: number
  suggestedColors?: string[]
  primaryIdentifier?: string
  visualKeywords?: string[]
  expectedAppearances?: Record<string, unknown>[]
  profileConfirmed?: boolean
  deletedAt?: Date | null
  deletedBy?: string
}

export interface FindCharacterOptions {
  includeAppearances?: boolean
  withDeleted?: boolean
}

export class CharacterRepository extends BaseRepository<'characterProfile', CharacterProfile> {
  protected readonly modelName = 'characterProfile' as const

  constructor(prismaInstance?: PrismaClient) {
    super(prismaInstance)
  }

  /**
   * 根据 ID 查找角色
   */
  async findById(
    id: string,
    options: FindCharacterOptions = {}
  ): Promise<CharacterProfile | null> {
    const include: Prisma.CharacterProfileInclude = {}

    if (options.includeAppearances) include.appearances = true

    if (!options.withDeleted) {
      return this.prisma.characterProfile.findFirst({
        where: { id, deletedAt: null },
        include,
      })
    }

    return this.prisma.characterProfile.findUnique({
      where: { id },
      include,
    })
  }

  /**
   * 根据项目 ID 查找所有角色
   */
  async findByProjectId(
    projectId: string,
    options: FindCharacterOptions = {}
  ): Promise<CharacterProfile[]> {
    const include: Prisma.CharacterProfileInclude = {}

    if (options.includeAppearances) include.appearances = true

    const where: Prisma.CharacterProfileWhereInput = {
      projectId,
      ...(options.withDeleted ? {} : { deletedAt: null }),
    }

    return this.prisma.characterProfile.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * 根据项目和名称查找
   */
  async findByProjectAndName(
    projectId: string,
    name: string,
    options: FindCharacterOptions = {}
  ): Promise<CharacterProfile | null> {
    const include: Prisma.CharacterProfileInclude = {}

    if (options.includeAppearances) include.appearances = true

    return this.prisma.characterProfile.findUnique({
      where: {
        projectId_name: {
          projectId,
          name,
        },
      },
      include,
    })
  }

  /**
   * 创建角色
   */
  async create(input: CreateCharacterInput): Promise<CharacterProfile> {
    const data: Prisma.CharacterProfileCreateInput = {
      project: { connect: { id: input.projectId } },
      name: input.name,
      aliases: input.aliases ? JSON.stringify(input.aliases) : null,
      introduction: input.introduction,
      gender: input.gender,
      ageRange: input.ageRange,
      roleLevel: input.roleLevel,
      archetype: input.archetype,
      personalityTags: input.personalityTags ? JSON.stringify(input.personalityTags) : null,
      eraPeriod: input.eraPeriod,
      socialClass: input.socialClass,
      occupation: input.occupation,
      costumeTier: input.costumeTier,
      suggestedColors: input.suggestedColors ? JSON.stringify(input.suggestedColors) : null,
      primaryIdentifier: input.primaryIdentifier,
      visualKeywords: input.visualKeywords ? JSON.stringify(input.visualKeywords) : null,
      expectedAppearances: input.expectedAppearances ? JSON.stringify(input.expectedAppearances) : undefined,
    }

    return this.prisma.characterProfile.create({ data })
  }

  /**
   * 更新角色
   */
  async update(id: string, input: UpdateCharacterInput): Promise<CharacterProfile> {
    const data: Prisma.CharacterProfileUpdateInput = {}

    if (input.aliases !== undefined) data.aliases = input.aliases ? JSON.stringify(input.aliases) : null
    if (input.introduction !== undefined) data.introduction = input.introduction
    if (input.gender !== undefined) data.gender = input.gender
    if (input.ageRange !== undefined) data.ageRange = input.ageRange
    if (input.roleLevel !== undefined) data.roleLevel = input.roleLevel
    if (input.archetype !== undefined) data.archetype = input.archetype
    if (input.personalityTags !== undefined) data.personalityTags = input.personalityTags ? JSON.stringify(input.personalityTags) : null
    if (input.eraPeriod !== undefined) data.eraPeriod = input.eraPeriod
    if (input.socialClass !== undefined) data.socialClass = input.socialClass
    if (input.occupation !== undefined) data.occupation = input.occupation
    if (input.costumeTier !== undefined) data.costumeTier = input.costumeTier
    if (input.suggestedColors !== undefined) data.suggestedColors = input.suggestedColors ? JSON.stringify(input.suggestedColors) : null
    if (input.primaryIdentifier !== undefined) data.primaryIdentifier = input.primaryIdentifier
    if (input.visualKeywords !== undefined) data.visualKeywords = input.visualKeywords ? JSON.stringify(input.visualKeywords) : null
    if (input.expectedAppearances !== undefined) {
      data.expectedAppearances = input.expectedAppearances
        ? { set: input.expectedAppearances as Prisma.InputJsonValue }
        : { set: null }
    }
    if (input.profileConfirmed !== undefined) data.profileConfirmed = input.profileConfirmed
    if (input.deletedAt !== undefined) data.deletedAt = input.deletedAt
    if (input.deletedBy !== undefined) data.deletedBy = input.deletedBy

    return this.prisma.characterProfile.update({
      where: { id },
      data,
    })
  }

  // 注意：软删除、恢复、硬删除功能继承自 BaseRepository

  /**
   * 确认角色档案
   */
  async confirmProfile(id: string): Promise<CharacterProfile> {
    return this.prisma.characterProfile.update({
      where: { id },
      data: { profileConfirmed: true },
    })
  }

  /**
   * 添加或更新角色外观
   */
  async addAppearance(
    characterId: string,
    appearanceIndex: number,
    changeReason: string,
    description: string,
    descriptions?: string[],
    imageUrls?: string[]
  ): Promise<CharacterAppearance> {
    return this.prisma.characterAppearance.create({
      data: {
        characterId,
        appearanceIndex,
        changeReason,
        description,
        descriptions: descriptions ? JSON.stringify(descriptions) : null,
        imageUrls: imageUrls ? JSON.stringify(imageUrls) : null,
      },
    })
  }

  /**
   * 获取角色的所有外观
   */
  async getAppearances(characterId: string): Promise<CharacterAppearance[]> {
    return this.prisma.characterAppearance.findMany({
      where: { characterId },
      orderBy: { appearanceIndex: 'asc' },
    })
  }
}
