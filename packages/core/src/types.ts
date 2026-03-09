/**
 * Core 包类型定义
 */

/** 角色档案（与 Prisma Schema 对应） */
export interface CharacterProfile {
  id: string
  projectId: string
  name: string
  aliases?: string | null  // JSON array
  introduction?: string | null
  gender?: string | null
  ageRange?: string | null
  roleLevel?: 'S' | 'A' | 'B' | 'C' | 'D' | null
  archetype?: string | null
  personalityTags?: string | null  // JSON array
  eraPeriod?: string | null
  socialClass?: string | null
  occupation?: string | null
  costumeTier?: number | null
  suggestedColors?: string | null  // JSON array
  primaryIdentifier?: string | null
  visualKeywords?: string | null  // JSON array
  expectedAppearances?: any | null  // JSON array
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
  locationType?: 'INDOOR' | 'OUTDOOR' | 'NATURE' | 'BUILDING' | 'FANTASY' | null
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
