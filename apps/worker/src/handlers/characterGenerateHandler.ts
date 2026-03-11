/**
 * 角色生成处理器
 *
 * 处理角色生成任务，包括：
 * - 生成角色档案
 * - 生成角色外观描述
 * - 可选: 生成角色参考图
 * - 保存到 CharacterProfile
 */

import type { Job } from 'bullmq'
import type { TaskJobData } from '@ai-drama-studio/queue'
import { prisma, TaskStatus, CharacterRoleLevel } from '@ai-drama-studio/db'
import { createAIClient } from '@ai-drama-studio/ai-client'
import { reportProgress, reportStage, reportSuccess, reportFailure } from '../utils/progress'

/**
 * 角色生成结果
 */
export interface CharacterGenerateResult {
  characterId: string
  projectId: string
  name: string
  hasImage: boolean
  status: 'completed' | 'failed'
}

/**
 * 角色生成配置
 */
export interface CharacterGenerateConfig {
  /** 是否生成参考图 */
  generateImage?: boolean
  /** 角色重要性层级 */
  roleLevel?: CharacterRoleLevel
  /** 自定义提示词 */
  customPrompt?: string
}

/**
 * 角色生成处理器
 *
 * @param job - BullMQ 任务
 * @returns 生成结果
 */
export async function handleCharacterGenerate(job: Job<TaskJobData>): Promise<CharacterGenerateResult> {
  const startTime = Date.now()
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const projectId = job.data.projectId
  const taskId = job.data.taskId

  // 解析配置
  const config: CharacterGenerateConfig = {
    generateImage: payload.generateImage === true,
    roleLevel: (payload.roleLevel as CharacterRoleLevel) || CharacterRoleLevel.B,
    customPrompt: typeof payload.customPrompt === 'string' ? payload.customPrompt : undefined,
  }

  try {
    // ===== Stage 1: 准备阶段 (0-10%) =====
    await reportStage(job, 'prepare', 0, { projectId })

    // 1.1 获取项目信息
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      throw new Error(`Project not found: ${projectId}`)
    }

    // 1.2 获取生成参数
    const characterName = typeof payload.characterName === 'string' ? payload.characterName : ''
    const description = typeof payload.description === 'string' ? payload.description : ''
    const eraPeriod = typeof payload.eraPeriod === 'string' ? payload.eraPeriod : ''

    if (!characterName && !description) {
      throw new Error('Character name or description is required')
    }

    await reportStage(job, 'prepare', 100, {
      projectId,
      characterName: characterName || 'Auto-generated',
    })

    // ===== Stage 2: 生成角色档案 (10-40%) =====
    await reportStage(job, 'generate_profile', 0, { characterName })

    // 获取 AI 模型配置
    const aiModel = await prisma.aiModel.findFirst({
      where: {
        type: 'TEXT',
        isEnabled: true,
      },
      include: {
        provider: true,
      },
    })

    if (!aiModel) {
      throw new Error('No enabled text generation model found')
    }

    // 创建 AI 客户端
    const client = createAIClient({
      provider: aiModel.provider.name as any,
      modelId: aiModel.modelId,
      apiKey: aiModel.provider.apiKey || '',
      baseURL: aiModel.provider.baseUrl,
    })

    // 构建角色生成提示词
    const profilePrompt = buildCharacterProfilePrompt({
      name: characterName,
      description,
      eraPeriod,
      roleLevel: config.roleLevel,
      customPrompt: config.customPrompt,
    })

    // 调用 AI 生成角色档案
    const profileResult = await client.generateText({
      messages: [
        {
          role: 'system',
          content: '你是一个专业的角色设计助手。根据提供的信息，生成详细的角色档案。',
        },
        {
          role: 'user',
          content: profilePrompt,
        },
      ],
      temperature: 0.8,
      maxTokens: 4000,
    })

    // 解析角色档案
    const characterProfile = parseCharacterProfile(profileResult.text, characterName)

    await reportStage(job, 'generate_profile', 100, {
      characterName: characterProfile.name,
    })

    // ===== Stage 3: 生成外观描述 (40-60%) =====
    await reportStage(job, 'generate_appearance', 0, { characterName: characterProfile.name })

    // 构建外观生成提示词
    const appearancePrompt = buildCharacterAppearancePrompt(characterProfile)

    const appearanceResult = await client.generateText({
      messages: [
        {
          role: 'system',
          content: '你是一个专业的角色视觉设计助手。根据角色档案，生成详细的外观描述。',
        },
        {
          role: 'user',
          content: appearancePrompt,
        },
      ],
      temperature: 0.7,
      maxTokens: 3000,
    })

    const appearanceDescription = appearanceResult.text.trim()

    await reportStage(job, 'generate_appearance', 100, {
      descriptionLength: appearanceDescription.length,
    })

    // ===== Stage 4: 保存到数据库 (60-80%) =====
    await reportStage(job, 'save_profile', 0, { characterName: characterProfile.name })

    // 创建角色档案
    const character = await prisma.characterProfile.create({
      data: {
        projectId,
        name: characterProfile.name,
        aliases: characterProfile.aliases ? JSON.stringify(characterProfile.aliases) : null,
        introduction: characterProfile.introduction,
        gender: characterProfile.gender,
        ageRange: characterProfile.ageRange,
        roleLevel: config.roleLevel,
        archetype: characterProfile.archetype,
        personalityTags: characterProfile.personalityTags
          ? JSON.stringify(characterProfile.personalityTags)
          : null,
        eraPeriod: characterProfile.eraPeriod || eraPeriod,
        socialClass: characterProfile.socialClass,
        occupation: characterProfile.occupation,
        costumeTier: characterProfile.costumeTier,
        suggestedColors: characterProfile.suggestedColors
          ? JSON.stringify(characterProfile.suggestedColors)
          : null,
        primaryIdentifier: characterProfile.primaryIdentifier,
        visualKeywords: characterProfile.visualKeywords
          ? JSON.stringify(characterProfile.visualKeywords)
          : null,
        profileConfirmed: false,
      },
    })

    // 创建外观形态
    await prisma.characterAppearance.create({
      data: {
        characterId: character.id,
        appearanceIndex: 1,
        changeReason: '初始形象',
        description: appearanceDescription,
        descriptions: JSON.stringify([appearanceDescription]),
      },
    })

    await reportStage(job, 'save_profile', 100, {
      characterId: character.id,
    })

    // ===== Stage 5: 可选 - 生成参考图 (80-95%) =====
    let hasImage = false

    if (config.generateImage) {
      await reportStage(job, 'generate_image', 0, { characterId: character.id })

      try {
        // 获取图像生成模型
        const imageModel = await prisma.aiModel.findFirst({
          where: {
            type: 'IMAGE',
            isEnabled: true,
          },
          include: {
            provider: true,
          },
        })

        if (imageModel) {
          const imageClient = createAIClient({
            provider: imageModel.provider.name as any,
            modelId: imageModel.modelId,
            apiKey: imageModel.provider.apiKey || '',
            baseURL: imageModel.provider.baseUrl,
          })

          // 构建图像生成提示词
          const imagePrompt = buildCharacterImagePrompt(characterProfile, appearanceDescription)

          const imageResult = await imageClient.generateImage({
            prompt: imagePrompt,
            aspectRatio: '3:4',
            n: 1,
          })

          if (imageResult.success && imageResult.imageUrl) {
            // 更新外观形态，添加图片 URL
            await prisma.characterAppearance.update({
              where: {
                characterId_appearanceIndex: {
                  characterId: character.id,
                  appearanceIndex: 1,
                },
              },
              data: {
                imageUrls: JSON.stringify([imageResult.imageUrl]),
              },
            })

            hasImage = true

            // 创建资产记录
            await prisma.asset.create({
              data: {
                projectId,
                type: 'CHARACTER_SHEET',
                url: imageResult.imageUrl,
                name: `${characterProfile.name} - 角色参考图`,
                description: appearanceDescription.slice(0, 200),
                metadata: {
                  characterId: character.id,
                  appearanceIndex: 1,
                  generationPrompt: imagePrompt,
                },
              },
            })
          }
        }
      } catch (imageError) {
        console.warn(`[CharacterGenerate] Image generation failed for ${character.id}:`, imageError)
        // 图片生成失败不影响整体任务
      }

      await reportStage(job, 'generate_image', 100, { hasImage })
    }

    // ===== Stage 6: 完成 (95-100%) =====
    const result: CharacterGenerateResult = {
      characterId: character.id,
      projectId,
      name: character.name,
      hasImage,
      status: 'completed',
    }

    await reportSuccess(job, result)

    console.log(`[CharacterGenerate] Task ${taskId} completed in ${Date.now() - startTime}ms`, {
      characterId: character.id,
      name: character.name,
      hasImage,
    })

    return result
  } catch (error) {
    console.error(`[CharacterGenerate] Task ${taskId} failed:`, error)
    await reportFailure(job, error, error instanceof Error ? error.name : 'GENERATION_ERROR')
    throw error
  }
}

/**
 * 构建角色档案生成提示词
 */
function buildCharacterProfilePrompt(params: {
  name: string
  description: string
  eraPeriod: string
  roleLevel?: CharacterRoleLevel
  customPrompt?: string
}): string {
  const { name, description, eraPeriod, roleLevel, customPrompt } = params

  let prompt = '# 角色档案生成任务\n\n'

  if (name) {
    prompt += `## 角色名称\n${name}\n\n`
  }

  if (description) {
    prompt += `## 角色描述\n${description}\n\n`
  }

  if (eraPeriod) {
    prompt += `## 时代背景\n${eraPeriod}\n\n`
  }

  if (roleLevel) {
    prompt += `## 角色重要性\n${roleLevel} 级\n\n`
  }

  if (customPrompt) {
    prompt += `## 额外要求\n${customPrompt}\n\n`
  }

  prompt += `## 输出格式
请以 JSON 格式输出角色档案：
{
  "name": "角色名称",
  "aliases": ["别名1", "别名2"],
  "introduction": "角色简介，包括身份、背景、关系等",
  "gender": "男/女",
  "ageRange": "约二十五岁",
  "archetype": "角色原型，如：悲情英雄、反派角色等",
  "personalityTags": ["高冷", "腹黑", "善良"],
  "eraPeriod": "时代/时期",
  "socialClass": "社会阶层",
  "occupation": "职业",
  "costumeTier": 3,
  "suggestedColors": ["深蓝", "金色"],
  "primaryIdentifier": "主要辨识标志，如：独眼、伤疤等",
  "visualKeywords": ["精英气质", "禁欲系", "军人风范"]
}

请确保 JSON 格式正确，字段完整。`

  return prompt
}

/**
 * 构建角色外观生成提示词
 */
function buildCharacterAppearancePrompt(characterProfile: ReturnType<typeof parseCharacterProfile>): string {
  return `# 角色外观描述生成任务

## 角色信息
名称：${characterProfile.name}
简介：${characterProfile.introduction || '无'}
性别：${characterProfile.gender || '未指定'}
年龄：${characterProfile.ageRange || '未指定'}
视觉关键词：${characterProfile.visualKeywords?.join(', ') || '无'}
建议配色：${characterProfile.suggestedColors?.join(', ') || '无'}
主要标识：${characterProfile.primaryIdentifier || '无'}

## 任务
请生成详细的外观描述，包括：
1. 面部特征
2. 发型和发色
3. 服装风格（符合时代背景）
4. 配饰和道具
5. 整体气质

请以流畅的段落形式输出描述，字数在 200-400 字之间。`
}

/**
 * 构建角色图像生成提示词
 */
function buildCharacterImagePrompt(
  characterProfile: ReturnType<typeof parseCharacterProfile>,
  appearanceDescription: string
): string {
  const keywords = characterProfile.visualKeywords?.join(', ') || ''
  const colors = characterProfile.suggestedColors?.join(', ') || ''

  return `Character portrait, ${characterProfile.name}, ${appearanceDescription.slice(0, 300)}, ${keywords}, color palette: ${colors}, high quality, detailed, cinematic lighting, character sheet style`
}

/**
 * 解析角色档案
 */
function parseCharacterProfile(text: string, fallbackName: string): {
  name: string
  aliases?: string[]
  introduction?: string
  gender?: string
  ageRange?: string
  archetype?: string
  personalityTags?: string[]
  eraPeriod?: string
  socialClass?: string
  occupation?: string
  costumeTier?: number
  suggestedColors?: string[]
  visualKeywords?: string[]
  primaryIdentifier?: string
} {
  try {
    // 尝试提取 JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        name: parsed.name || fallbackName || '未命名角色',
        aliases: parsed.aliases,
        introduction: parsed.introduction,
        gender: parsed.gender,
        ageRange: parsed.ageRange,
        archetype: parsed.archetype,
        personalityTags: parsed.personalityTags,
        eraPeriod: parsed.eraPeriod,
        socialClass: parsed.socialClass,
        occupation: parsed.occupation,
        costumeTier: parsed.costumeTier,
        suggestedColors: parsed.suggestedColors,
        visualKeywords: parsed.visualKeywords,
        primaryIdentifier: parsed.primaryIdentifier,
      }
    }
  } catch (e) {
    console.warn('[CharacterGenerate] Failed to parse JSON profile:', e)
  }

  // 如果 JSON 解析失败，尝试从文本中提取关键信息
  const lines = text.split('\n')
  const profile: any = { name: fallbackName || '未命名角色' }

  for (const line of lines) {
    const trimmed = line.trim()

    // 匹配各种字段
    if (trimmed.includes('名称') || trimmed.includes('名字')) {
      const match = trimmed.match(/[:：]\s*(.+)/)
      if (match) profile.name = match[1].trim()
    }
    if (trimmed.includes('性别')) {
      const match = trimmed.match(/[:：]\s*(.+)/)
      if (match) profile.gender = match[1].trim()
    }
    if (trimmed.includes('年龄')) {
      const match = trimmed.match(/[:：]\s*(.+)/)
      if (match) profile.ageRange = match[1].trim()
    }
    if (trimmed.includes('简介') || trimmed.includes('介绍')) {
      const match = trimmed.match(/[:：]\s*(.+)/)
      if (match) profile.introduction = match[1].trim()
    }
  }

  return profile
}

/**
 * 批量角色生成处理器
 *
 * 用于同时生成多个角色
 */
export async function handleBatchCharacterGenerate(
  job: Job<TaskJobData>
): Promise<CharacterGenerateResult[]> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const characters = Array.isArray(payload.characters) ? payload.characters : []

  if (characters.length === 0) {
    throw new Error('No characters provided for batch generation')
  }

  const results: CharacterGenerateResult[] = []
  const total = characters.length

  for (let i = 0; i < characters.length; i++) {
    const charData = characters[i]
    if (typeof charData !== 'object' || charData === null) continue

    // 更新进度
    const progress = Math.floor((i / total) * 100)
    await reportProgress(job, progress, `Generating character ${i + 1}/${total}`)

    // 创建子任务数据
    const subJob = {
      ...job,
      data: {
        ...job.data,
        payload: {
          ...payload,
          ...charData,
        },
      },
    } as Job<TaskJobData>

    try {
      const result = await handleCharacterGenerate(subJob)
      results.push(result)
    } catch (error) {
      console.error(`[BatchCharacterGenerate] Failed to generate character ${i + 1}:`, error)
      // 继续生成其他角色
    }
  }

  return results
}
