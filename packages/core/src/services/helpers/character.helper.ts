/**
 * 角色服务辅助函数
 */

import type { CharacterProfile } from '../../types'

/** 验证结果接口 */
export interface ValidationResult {
  valid: boolean
  error?: string
  code?: string
}

/**
 * 验证角色输入数据
 * @param data - 角色数据
 * @returns 验证结果
 */
export function validateCharacterData(
  data: Partial<CharacterProfile> & { name: string }
): ValidationResult {
  if (!data.name || data.name.trim().length === 0) {
    return { valid: false, error: '角色名称不能为空', code: 'INVALID_NAME' }
  }
  if (data.name.length > 100) {
    return { valid: false, error: '角色名称不能超过 100 个字符', code: 'INVALID_NAME' }
  }
  if (data.costumeTier != null && (data.costumeTier < 1 || data.costumeTier > 5)) {
    return { valid: false, error: '服装华丽度必须在 1-5 之间', code: 'INVALID_COSTUME_TIER' }
  }
  return { valid: true }
}

/**
 * 验证角色名称格式
 * @param name - 角色名称
 * @returns 验证结果
 */
export function validateCharacterName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: '角色名称不能为空', code: 'INVALID_NAME' }
  }
  if (name.length > 100) {
    return { valid: false, error: '角色名称不能超过 100 个字符', code: 'INVALID_NAME' }
  }
  // 检查非法字符
  const invalidChars = /[<>\"'&]/
  if (invalidChars.test(name)) {
    return { valid: false, error: '角色名称包含非法字符', code: 'INVALID_NAME' }
  }
  return { valid: true }
}

/**
 * 格式化角色显示名称
 * @param character - 角色档案
 * @returns 格式化后的字符串
 */
export function formatCharacterDisplay(character: CharacterProfile): string {
  const parts: string[] = [character.name]

  if (character.roleLevel) {
    parts.push(`[${character.roleLevel}级]`)
  }

  if (character.primaryIdentifier) {
    parts.push(`(${character.primaryIdentifier})`)
  }

  return parts.join(' ')
}

/**
 * 构建角色简介
 * @param character - 角色档案
 * @returns 简介文本
 */
export function buildCharacterIntroduction(character: CharacterProfile): string {
  const parts: string[] = [`${character.name}`]

  if (character.primaryIdentifier) {
    parts.push(`辨识标志：${character.primaryIdentifier}`)
  }

  if (character.costumeTier) {
    parts.push(`服装华丽度：${character.costumeTier}/5`)
  }

  if (character.personalityTags && character.personalityTags.length > 0) {
    parts.push(`性格标签：${character.personalityTags.join('、')}`)
  }

  return parts.join(' | ')
}
