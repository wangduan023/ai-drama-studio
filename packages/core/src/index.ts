/**
 * Core 包统一导出
 */

// ===== 服务导出 =====
export {
  CharacterProfileService,
  LocationProfileService,
  type CharacterServiceOptions,
  type AppearanceMap,
  type ConsistencyValidationResult,
  type ConsistencyViolation,
} from './services/character.service'

// ===== 类型导出 =====
export type {
  CharacterProfile,
  CharacterAppearance,
  LocationProfile,
  PipelineContext,
} from './types'
