/**
 * 场景服务辅助函数
 */

import type { LocationProfile } from '../../types'

/** 验证结果接口 */
export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * 构建场景介绍字符串
 * @param locations - 场景列表
 * @returns 场景介绍文本
 */
export function buildLocationsIntroduction(locations: LocationProfile[]): string {
  if (locations.length === 0) return '暂无场景介绍'

  const introductions = locations
    .filter((l) => l.description)
    .map((l) => `- ${l.name}：${l.description}`)

  return introductions.length > 0
    ? introductions.join('\n')
    : '暂无场景介绍'
}

/**
 * 构建场景介绍字符串（英文版）
 * @param locations - 场景列表
 * @returns 场景介绍文本
 */
export function buildLocationsIntroductionEn(locations: LocationProfile[]): string {
  if (locations.length === 0) return 'No location introductions available'

  const introductions = locations
    .filter((l) => l.description)
    .map((l) => `- ${l.name}: ${l.description}`)

  return introductions.length > 0
    ? introductions.join('\n')
    : 'No location introductions available'
}

/**
 * 验证场景名称
 * @param name - 场景名称
 * @returns 验证结果
 */
export function validateLocationName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: '场景名称不能为空' }
  }
  if (name.length > 100) {
    return { valid: false, error: '场景名称不能超过 100 个字符' }
  }
  return { valid: true }
}

/**
 * 验证场景输入数据
 * @param data - 场景数据
 * @returns 验证结果
 */
export function validateLocationData(data: Partial<LocationProfile> & { name: string }): ValidationResult {
  return validateLocationName(data.name)
}

/**
 * 格式化场景数据用于显示
 * @param location - 场景档案
 * @returns 格式化后的字符串
 */
export function formatLocationDisplay(location: LocationProfile): string {
  const parts: string[] = [location.name]
  
  if (location.description) {
    parts.push(`(${location.description})`)
  }
  
  if (location.locationType) {
    parts.push(`[${location.locationType}]`)
  }
  
  return parts.join(' ')
}
