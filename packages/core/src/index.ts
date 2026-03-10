/**
 * Core 包统一导出
 */

// ===== 服务导出 =====
export {
  CharacterProfileService,
  LocationProfileService,
  CharacterServiceError,
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
  ExpectedAppearance,
} from './types'

// ===== 枚举导出 =====
export {
  CharacterRoleLevel,
  LocationType,
} from './types'

// ===== 配置导出 =====
export {
  SHOES_KEYWORDS,
  LUXURY_KEYWORDS,
  DEFAULT_VALIDATION_CONFIG,
  loadValidationConfig,
  type ValidationConfig,
} from './config/validation.config'

// ===== 服务导出（抛出错误的版本） =====
export {
  validateCharacterData,
  validateLocationData,
} from './services/character.service'

// ===== 工具函数导出（从 helpers） =====
export {
  validateCharacterName,
  validateLocationName,
  buildLocationsIntroduction,
  buildLocationsIntroductionEn,
  formatLocationDisplay,
  formatCharacterDisplay,
  buildCharacterIntroduction,
  type ValidationResult,
} from './services/helpers'
