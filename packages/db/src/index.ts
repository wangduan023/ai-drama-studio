/**
 * Database Layer 统一导出
 *
 * @package @ai-drama-studio/db
 */

// Prisma Client 单例
export { prisma, disconnect, healthCheck, withRetry, withTransaction, queryRaw } from './client'

// 导出所有 Model 类型
export type {
  // 核心模型
  User,
  RefreshToken,
  Config,
  Asset,
  Project,
  Episode,
  Script,
  Storyboard,
  Clip,
  CharacterProfile,
  CharacterAppearance,
  LocationProfile,
  Task,
  TaskEvent,
  UsageCost,
  // AI 渠道相关
  AiProvider,
  AiModel,
  AiUsageLog,
} from '@prisma/client'

// 导出枚举类型
export {
  UserRole,
  ProjectStatus,
  ProcessStatus,
  TaskType,
  TaskStatus,
  CharacterRoleLevel,
  LocationType,
  AssetType,
  // AI 渠道枚举
  AiModelType,
  AiUsageStatus,
} from '@prisma/client'

// Repository 层导出
export { ProjectRepository } from './repositories/project.repository'
export { EpisodeRepository } from './repositories/episode.repository'
export { CharacterRepository } from './repositories/character.repository'
export { LocationRepository } from './repositories/location.repository'
export { AiProviderRepository } from './repositories/ai-provider.repository'
export { AiModelRepository } from './repositories/ai-model.repository'
export { AiUsageRepository } from './repositories/ai-usage.repository'

// Base Repository 导出
export {
  BaseRepository,
  NOT_DELETED,
  OptimisticLockError,
  UniqueConstraintError,
  ForeignKeyConstraintError,
  RecordNotFoundError,
  PrismaErrorCode,
  type IRepository,
  type FindManyParams,
  type VersionedEntity,
  type PrismaModelMap,
} from './repositories/base.repository'

// Schemas 导出
export * from './schemas'

// 工具函数
export { encrypt, decrypt, encryptFields, decryptFields } from './utils/crypto'
