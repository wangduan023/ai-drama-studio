/**
 * 场景生成处理器
 *
 * 处理场景生成任务，包括：
 * - 生成场景档案
 * - 生成场景视觉描述
 * - 可选: 生成场景参考图
 * - 保存到 LocationProfile
 */

import type { Job } from 'bullmq'
import type { TaskJobData } from '@ai-drama-studio/queue'
import { prisma, TaskStatus, LocationType } from '@ai-drama-studio/db'
import { createAIClient } from '@ai-drama-studio/ai-client'
import { reportProgress, reportStage, reportSuccess, reportFailure } from '../utils/progress'

/**
 * 场景生成结果
 */
export interface SceneGenerateResult {
  locationId: string
  projectId: string
  name: string
  hasImage: boolean
  status: 'completed' | 'failed'
}

/**
 * 场景生成配置
 */
export interface SceneGenerateConfig {
  /** 是否生成参考图 */
  generateImage?: boolean
  /** 场景类型 */
  locationType?: LocationType
  /** 自定义提示词 */
  customPrompt?: string
}

/**
 * 场景生成处理器
 *
 * @param job - BullMQ 任务
 * @returns 生成结果
 */
export async function handleSceneGenerate(job: Job<TaskJobData>): Promise<SceneGenerateResult> {
  const startTime = Date.now()
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const projectId = job.data.projectId
  const taskId = job.data.taskId

  // 解析配置
  const config: SceneGenerateConfig = {
    generateImage: payload.generateImage === true,
    locationType: (payload.locationType as LocationType) || LocationType.INDOOR,
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
    const locationName = typeof payload.locationName === 'string' ? payload.locationName : ''
    const description = typeof payload.description === 'string' ? payload.description : ''
    const eraPeriod = typeof payload.eraPeriod === 'string' ? payload.eraPeriod : ''

    if (!locationName && !description) {
      throw new Error('Location name or description is required')
    }

    await reportStage(job, 'prepare', 100, {
      projectId,
      locationName: locationName || 'Auto-generated',
    })

    // ===== Stage 2: 生成场景档案 (10-40%) =====
    await reportStage(job, 'generate_profile', 0, { locationName })

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

    // 构建场景生成提示词
    const profilePrompt = buildLocationProfilePrompt({
      name: locationName,
      description,
      eraPeriod,
      locationType: config.locationType,
      customPrompt: config.customPrompt,
    })

    // 调用 AI 生成场景档案
    const profileResult = await client.generateText({
      messages: [
        {
          role: 'system',
          content: '你是一个专业的场景设计助手。根据提供的信息，生成详细的场景档案。',
        },
        {
          role: 'user',
          content: profilePrompt,
        },
      ],
      temperature: 0.8,
      maxTokens: 3000,
    })

    // 解析场景档案
    const locationProfile = parseLocationProfile(profileResult.text, locationName)

    await reportStage(job, 'generate_profile', 100, {
      locationName: locationProfile.name,
    })

    // ===== Stage 3: 生成视觉描述 (40-60%) =====
    await reportStage(job, 'generate_visual', 0, { locationName: locationProfile.name })

    // 构建视觉生成提示词
    const visualPrompt = buildLocationVisualPrompt(locationProfile)

    const visualResult = await client.generateText({
      messages: [
        {
          role: 'system',
          content: '你是一个专业的场景视觉设计助手。根据场景档案，生成详细的视觉描述。',
        },
        {
          role: 'user',
          content: visualPrompt,
        },
      ],
      temperature: 0.7,
      maxTokens: 2000,
    })

    const visualDescription = visualResult.text.trim()

    await reportStage(job, 'generate_visual', 100, {
      descriptionLength: visualDescription.length,
    })

    // ===== Stage 4: 保存到数据库 (60-80%) =====
    await reportStage(job, 'save_profile', 0, { locationName: locationProfile.name })

    // 创建场景档案
    const location = await prisma.locationProfile.create({
      data: {
        projectId,
        name: locationProfile.name,
        description: locationProfile.description || visualDescription,
        eraPeriod: locationProfile.eraPeriod || eraPeriod,
        locationType: config.locationType,
        moodColor: locationProfile.moodColor,
        keyElements: locationProfile.keyElements
          ? JSON.stringify(locationProfile.keyElements)
          : null,
        locationConfirmed: false,
      },
    })

    await reportStage(job, 'save_profile', 100, {
      locationId: location.id,
    })

    // ===== Stage 5: 可选 - 生成参考图 (80-95%) =====
    let hasImage = false

    if (config.generateImage) {
      await reportStage(job, 'generate_image', 0, { locationId: location.id })

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
          const imagePrompt = buildLocationImagePrompt(locationProfile, visualDescription)

          const imageResult = await imageClient.generateImage({
            prompt: imagePrompt,
            aspectRatio: '16:9',
            n: 1,
          })

          if (imageResult.success && imageResult.imageUrl) {
            hasImage = true

            // 创建资产记录
            await prisma.asset.create({
              data: {
                projectId,
                type: 'LOCATION_SHEET',
                url: imageResult.imageUrl,
                name: `${locationProfile.name} - 场景参考图`,
                description: visualDescription.slice(0, 200),
                metadata: {
                  locationId: location.id,
                  generationPrompt: imagePrompt,
                },
              },
            })
          }
        }
      } catch (imageError) {
        console.warn(`[SceneGenerate] Image generation failed for ${location.id}:`, imageError)
        // 图片生成失败不影响整体任务
      }

      await reportStage(job, 'generate_image', 100, { hasImage })
    }

    // ===== Stage 6: 完成 (95-100%) =====
    const result: SceneGenerateResult = {
      locationId: location.id,
      projectId,
      name: location.name,
      hasImage,
      status: 'completed',
    }

    await reportSuccess(job, result)

    console.log(`[SceneGenerate] Task ${taskId} completed in ${Date.now() - startTime}ms`, {
      locationId: location.id,
      name: location.name,
      hasImage,
    })

    return result
  } catch (error) {
    console.error(`[SceneGenerate] Task ${taskId} failed:`, error)
    await reportFailure(job, error, error instanceof Error ? error.name : 'GENERATION_ERROR')
    throw error
  }
}

/**
 * 构建场景档案生成提示词
 */
function buildLocationProfilePrompt(params: {
  name: string
  description: string
  eraPeriod: string
  locationType?: LocationType
  customPrompt?: string
}): string {
  const { name, description, eraPeriod, locationType, customPrompt } = params

  let prompt = '# 场景档案生成任务\n\n'

  if (name) {
    prompt += `## 场景名称\n${name}\n\n`
  }

  if (description) {
    prompt += `## 场景描述\n${description}\n\n`
  }

  if (eraPeriod) {
    prompt += `## 时代背景\n${eraPeriod}\n\n`
  }

  if (locationType) {
    prompt += `## 场景类型\n${locationType}\n\n`
  }

  if (customPrompt) {
    prompt += `## 额外要求\n${customPrompt}\n\n`
  }

  prompt += `## 输出格式
请以 JSON 格式输出场景档案：
{
  "name": "场景名称",
  "description": "场景详细描述，包括布局、氛围、关键元素等",
  "eraPeriod": "时代/时期",
  "locationType": "INDOOR/OUTDOOR/NATURE/BUILDING/FANTASY",
  "moodColor": "氛围色调，如：暖黄色、冷蓝色等",
  "keyElements": ["关键视觉元素1", "关键视觉元素2", "关键视觉元素3"]
}

请确保 JSON 格式正确，字段完整。`

  return prompt
}

/**
 * 构建场景视觉生成提示词
 */
function buildLocationVisualPrompt(locationProfile: ReturnType<typeof parseLocationProfile>): string {
  return `# 场景视觉描述生成任务

## 场景信息
名称：${locationProfile.name}
描述：${locationProfile.description || '无'}
类型：${locationProfile.locationType || '未指定'}
氛围色调：${locationProfile.moodColor || '未指定'}
关键元素：${locationProfile.keyElements?.join(', ') || '无'}

## 任务
请生成详细的场景视觉描述，包括：
1. 整体布局和构图
2. 光线和阴影效果
3. 色彩方案和氛围
4. 关键视觉元素的具体位置和外观
5. 远近景层次感

请以流畅的段落形式输出描述，字数在 200-400 字之间。`
}

/**
 * 构建场景图像生成提示词
 */
function buildLocationImagePrompt(
  locationProfile: ReturnType<typeof parseLocationProfile>,
  visualDescription: string
): string {
  const keyElements = locationProfile.keyElements?.join(', ') || ''
  const mood = locationProfile.moodColor || ''

  return `Environment concept art, ${locationProfile.name}, ${visualDescription.slice(0, 300)}, ${keyElements}, ${mood} lighting, high quality, detailed, cinematic composition, establishing shot, architectural visualization`
}

/**
 * 解析场景档案
 */
function parseLocationProfile(text: string, fallbackName: string): {
  name: string
  description?: string
  eraPeriod?: string
  locationType?: string
  moodColor?: string
  keyElements?: string[]
} {
  try {
    // 尝试提取 JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        name: parsed.name || fallbackName || '未命名场景',
        description: parsed.description,
        eraPeriod: parsed.eraPeriod,
        locationType: parsed.locationType,
        moodColor: parsed.moodColor,
        keyElements: parsed.keyElements,
      }
    }
  } catch (e) {
    console.warn('[SceneGenerate] Failed to parse JSON profile:', e)
  }

  // 如果 JSON 解析失败，尝试从文本中提取关键信息
  const lines = text.split('\n')
  const profile: any = { name: fallbackName || '未命名场景' }

  for (const line of lines) {
    const trimmed = line.trim()

    // 匹配各种字段
    if (trimmed.includes('名称') || trimmed.includes('名字')) {
      const match = trimmed.match(/[:：]\s*(.+)/)
      if (match) profile.name = match[1].trim()
    }
    if (trimmed.includes('描述')) {
      const match = trimmed.match(/[:：]\s*(.+)/)
      if (match) profile.description = match[1].trim()
    }
    if (trimmed.includes('时代')) {
      const match = trimmed.match(/[:：]\s*(.+)/)
      if (match) profile.eraPeriod = match[1].trim()
    }
    if (trimmed.includes('色调')) {
      const match = trimmed.match(/[:：]\s*(.+)/)
      if (match) profile.moodColor = match[1].trim()
    }
  }

  return profile
}
