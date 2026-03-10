/**
 * Core 包类型定义
 */

/** 角色重要性等级 */
export enum CharacterRoleLevel {
  S = 'S',  // 绝对主角
  A = 'A',  // 核心配角
  B = 'B',  // 重要配角
  C = 'C',  // 次要角色
  D = 'D',  // 群众演员
}

/** 场景类型 */
export enum LocationType {
  INDOOR = 'INDOOR',
  OUTDOOR = 'OUTDOOR',
  NATURE = 'NATURE',
  BUILDING = 'BUILDING',
  FANTASY = 'FANTASY',
}

/** 预期外观形态 */
export interface ExpectedAppearance {
  id?: string
  change_reason: string
  descriptions: string[]
}

/** 角色档案（与 Prisma Schema 对应） */
export interface CharacterProfile {
  id: string
  projectId: string
  name: string
  aliases?: string | null  // JSON array
  introduction?: string | null
  gender?: string | null
  ageRange?: string | null
  roleLevel?: CharacterRoleLevel | null
  archetype?: string | null
  personalityTags?: string | null  // JSON array
  eraPeriod?: string | null
  socialClass?: string | null
  occupation?: string | null
  costumeTier?: number | null
  suggestedColors?: string | null  // JSON array
  primaryIdentifier?: string | null
  visualKeywords?: string | null  // JSON array
  expectedAppearances?: ExpectedAppearance[] | null
  profileConfirmed: boolean
  createdAt: Date
  updatedAt: Date
}

/** 角色外观形态 */
export interface CharacterAppearance {
  id: string
  characterId: string
  appearanceIndex: number
  changeReason: string
  description: string
  descriptions?: string | null  // JSON array
  imageUrls?: string | null  // JSON array
  previousImageUrls?: string | null  // JSON array
  createdAt: Date
  updatedAt: Date
}

/** 场景档案 */
export interface LocationProfile {
  id: string
  projectId: string
  name: string
  description?: string | null
  eraPeriod?: string | null
  locationType?: LocationType | null
  moodColor?: string | null
  keyElements?: string | null  // JSON array
  locationConfirmed: boolean
  createdAt: Date
  updatedAt: Date
}

/** Pipeline 上下文 */
export interface PipelineContext {
  projectId: string
  episodeId?: string
  data: Record<string, any>
  characterContext?: {
    characterProfiles: CharacterProfile[]
    appearanceMap: Record<string, number>
  }
  locationContext?: {
    locationProfiles: LocationProfile[]
  }
}
