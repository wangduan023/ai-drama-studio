/**
 * 服务辅助函数入口
 */

export * from './location.helper'
export * from './character.helper'

// 重新导出类型
export type { ValidationResult } from './character.helper'
export type { ValidationResult as LocationValidationResult } from './location.helper'
