/**
 * 提示词渲染器
 * 基于 waoowaoo 项目迁移
 */

import { PROMPT_CATALOG } from './catalog'
import { PromptError } from './types'
import { getPromptTemplate, getPromptTemplateAsync } from './template-store'
import type { BuildPromptInput } from './types'

const SINGLE_PLACEHOLDER_PATTERN = /\{([A-Za-z0-9_]+)\}/g
const DOUBLE_PLACEHOLDER_PATTERN = /\{\{([A-Za-z0-9_]+)\}\}/g

/**
 * 提取模板中的所有占位符
 */
function extractPlaceholders(template: string): string[] {
  const keys = new Set<string>()

  for (const match of template.matchAll(SINGLE_PLACEHOLDER_PATTERN)) {
    if (match[1]) keys.add(match[1])
  }
  for (const match of template.matchAll(DOUBLE_PLACEHOLDER_PATTERN)) {
    if (match[1]) keys.add(match[1])
  }

  return Array.from(keys)
}

/**
 * 转义字符串用于 RegExp
 */
function escapeRegex(raw: string): string {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 替换模板中的所有占位符
 */
function replaceAllPlaceholders(template: string, key: string, value: string): string {
  const escaped = escapeRegex(key)
  const pattern = new RegExp(`\\{\\{${escaped}\\}\\}|\\{${escaped}\\}`, 'g')
  return template.replace(pattern, value)
}

/**
 * 构建提示词主函数
 * @param input - 渲染输入
 * @returns 渲染后的提示词字符串
 */
export function buildPrompt(input: BuildPromptInput): string {
  const { promptId, locale, variables = {} } = input
  const entry = PROMPT_CATALOG[promptId]

  if (!entry) {
    throw new PromptError(
      'PROMPT_ID_UNREGISTERED',
      promptId,
      `提示词 ID 未注册：${promptId}`
    )
  }

  const template = getPromptTemplate(promptId, locale)
  const templatePlaceholders = extractPlaceholders(template)
  const declaredKeys = new Set(entry.variableKeys)

  // 验证：模板占位符必须都在声明中
  for (const key of templatePlaceholders) {
    if (!declaredKeys.has(key)) {
      throw new PromptError(
        'PROMPT_PLACEHOLDER_MISMATCH',
        promptId,
        `模板占位符未在目录中声明：${key}`,
        { key }
      )
    }
  }

  // 验证：提供的变量必须都已声明
  const providedKeys = Object.keys(variables)
  for (const key of providedKeys) {
    if (!declaredKeys.has(key)) {
      throw new PromptError(
        'PROMPT_VARIABLE_UNEXPECTED',
        promptId,
        `未声明的提示词变量：${key}`,
        { key }
      )
    }
    if (typeof variables[key] !== 'string') {
      throw new PromptError(
        'PROMPT_VARIABLE_VALUE_INVALID',
        promptId,
        `提示词变量值必须是字符串：${key}`,
        { key, type: typeof variables[key] }
      )
    }
  }

  // 验证：所有声明的变量都必须提供
  for (const key of entry.variableKeys) {
    if (!(key in variables)) {
      throw new PromptError(
        'PROMPT_VARIABLE_MISSING',
        promptId,
        `缺少必需的提示词变量：${key}`,
        { key }
      )
    }
  }

  // 替换占位符
  let rendered = template
  for (const key of entry.variableKeys) {
    rendered = replaceAllPlaceholders(rendered, key, variables[key] || '')
  }

  return rendered
}

/**
 * 构建提示词主函数（异步版本）
 * 推荐使用，避免阻塞事件循环
 * @param input - 渲染输入
 * @returns 渲染后的提示词字符串
 */
export async function buildPromptAsync(input: BuildPromptInput): Promise<string> {
  const { promptId, locale, variables = {} } = input
  const entry = PROMPT_CATALOG[promptId]

  if (!entry) {
    throw new PromptError(
      'PROMPT_ID_UNREGISTERED',
      promptId,
      `提示词 ID 未注册：${promptId}`
    )
  }

  const template = await getPromptTemplateAsync(promptId, locale)
  const templatePlaceholders = extractPlaceholders(template)
  const declaredKeys = new Set(entry.variableKeys)

  // 验证：模板占位符必须都在声明中
  for (const key of templatePlaceholders) {
    if (!declaredKeys.has(key)) {
      throw new PromptError(
        'PROMPT_PLACEHOLDER_MISMATCH',
        promptId,
        `模板占位符未在目录中声明：${key}`,
        { key }
      )
    }
  }

  // 验证：提供的变量必须都已声明
  const providedKeys = Object.keys(variables)
  for (const key of providedKeys) {
    if (!declaredKeys.has(key)) {
      throw new PromptError(
        'PROMPT_VARIABLE_UNEXPECTED',
        promptId,
        `未声明的提示词变量：${key}`,
        { key }
      )
    }
    if (typeof variables[key] !== 'string') {
      throw new PromptError(
        'PROMPT_VARIABLE_VALUE_INVALID',
        promptId,
        `提示词变量值必须是字符串：${key}`,
        { key, type: typeof variables[key] }
      )
    }
  }

  // 验证：所有声明的变量都必须提供
  for (const key of entry.variableKeys) {
    if (!(key in variables)) {
      throw new PromptError(
        'PROMPT_VARIABLE_MISSING',
        promptId,
        `缺少必需的提示词变量：${key}`,
        { key }
      )
    }
  }

  // 替换占位符
  let rendered = template
  for (const key of entry.variableKeys) {
    rendered = replaceAllPlaceholders(rendered, key, variables[key] || '')
  }

  return rendered
}

/**
 * 构建角色介绍字符串（用于发送给 AI，帮助理解角色关系）
 * @param characters - 角色列表
 * @returns 格式化的角色介绍字符串
 */
export function buildCharactersIntroduction(
  characters: Array<{ name: string; introduction?: string | null }>
): string {
  if (!characters || characters.length === 0) return '暂无角色介绍'

  const introductions = characters
    .filter((c) => c.introduction && c.introduction.trim())
    .map((c) => `- ${c.name}：${c.introduction}`)

  if (introductions.length === 0) return '暂无角色介绍'

  return introductions.join('\n')
}

/**
 * 构建场景介绍字符串
 */
export function buildLocationsIntroduction(
  locations: Array<{ name: string; description?: string | null }>
): string {
  if (!locations || locations.length === 0) return '暂无场景介绍'

  const introductions = locations
    .filter((l) => l.description && l.description.trim())
    .map((l) => `- ${l.name}：${l.description}`)

  if (introductions.length === 0) return '暂无场景介绍'

  return introductions.join('\n')
}
