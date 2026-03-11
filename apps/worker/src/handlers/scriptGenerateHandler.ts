/**
 * 剧本生成处理器
 *
 * 处理剧本生成任务，包括：
 * - 从剧集信息构建生成提示词
 * - 调用 AI 生成剧本
 * - 解析并保存剧本到数据库
 * - 更新任务状态
 */

import type { Job } from 'bullmq'
import type { TaskJobData } from '@ai-drama-studio/queue'
import { prisma, TaskStatus, ProcessStatus } from '@ai-drama-studio/db'
import { createAIClient } from '@ai-drama-studio/ai-client'
import { reportProgress, reportStage, reportSuccess, reportFailure } from '../utils/progress'

/**
 * 剧本生成结果
 */
export interface ScriptGenerateResult {
  scriptId: string
  episodeId: string
  content: string
  characters: string[]
  scenes: string[]
  status: 'completed' | 'failed'
}

/**
 * 剧本生成处理器
 *
 * @param job - BullMQ 任务
 * @returns 生成结果
 */
export async function handleScriptGenerate(job: Job<TaskJobData>): Promise<ScriptGenerateResult> {
  const startTime = Date.now()
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const episodeId = typeof payload.episodeId === 'string' ? payload.episodeId : job.data.targetId
  const projectId = job.data.projectId
  const taskId = job.data.taskId

  try {
    // ===== Stage 1: 准备阶段 (0-10%) =====
    await reportStage(job, 'prepare', 0, { episodeId })

    // 1.1 获取剧集信息
    const episode = await prisma.episode.findUnique({
      where: { id: episodeId },
      include: {
        project: true,
        script: true,
      },
    })

    if (!episode) {
      throw new Error(`Episode not found: ${episodeId}`)
    }

    // 1.2 获取项目中的角色档案
    const characterProfiles = await prisma.characterProfile.findMany({
      where: {
        projectId: episode.projectId,
        deletedAt: null,
      },
      include: {
        appearances: true,
      },
    })

    // 1.3 获取场景档案
    const locationProfiles = await prisma.locationProfile.findMany({
      where: {
        projectId: episode.projectId,
        deletedAt: null,
      },
    })

    await reportStage(job, 'prepare', 100, {
      episodeId,
      characterCount: characterProfiles.length,
      locationCount: locationProfiles.length,
    })

    // ===== Stage 2: 构建提示词 (10-20%) =====
    await reportStage(job, 'build_prompt', 0, { episodeId })

    const novelText = episode.novelText || ''
    if (!novelText.trim()) {
      throw new Error('No novel text available for script generation')
    }

    // 构建角色信息提示词
    const characterInfo = characterProfiles.map((char) => ({
      name: char.name,
      introduction: char.introduction,
      gender: char.gender,
      ageRange: char.ageRange,
      personalityTags: char.personalityTags ? JSON.parse(char.personalityTags) : [],
      visualKeywords: char.visualKeywords ? JSON.parse(char.visualKeywords) : [],
    }))

    // 构建场景信息提示词
    const locationInfo = locationProfiles.map((loc) => ({
      name: loc.name,
      description: loc.description,
      locationType: loc.locationType,
      moodColor: loc.moodColor,
    }))

    const prompt = buildScriptGenerationPrompt({
      novelText,
      episodeNumber: episode.number,
      characters: characterInfo,
      locations: locationInfo,
    })

    await reportStage(job, 'build_prompt', 100, {
      promptLength: prompt.length,
      characterCount: characterInfo.length,
      locationCount: locationInfo.length,
    })

    // ===== Stage 3: 调用 AI 生成 (20-80%) =====
    await reportStage(job, 'generate', 0, { episodeId })

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

    // 调用 AI 生成剧本
    const generateResult = await client.generateText({
      messages: [
        {
          role: 'system',
          content: '你是一个专业的剧本生成助手。根据提供的小说内容和角色信息，生成符合标准的剧本格式。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      maxTokens: 8000,
    })

    const generatedContent = generateResult.text

    await reportStage(job, 'generate', 100, {
      contentLength: generatedContent.length,
      usage: generateResult.usage,
    })

    // ===== Stage 4: 解析和保存 (80-95%) =====
    await reportStage(job, 'parse_save', 0, { episodeId })

    // 解析生成的剧本内容
    const parsedScript = parseScriptContent(generatedContent)

    // 保存或更新剧本
    const script = await prisma.script.upsert({
      where: { episodeId },
      create: {
        episodeId,
        content: generatedContent,
        characters: parsedScript.characters as any,
        scenes: parsedScript.scenes as any,
        status: ProcessStatus.COMPLETED,
      },
      update: {
        content: generatedContent,
        characters: parsedScript.characters as any,
        scenes: parsedScript.scenes as any,
        status: ProcessStatus.COMPLETED,
      },
    })

    await reportStage(job, 'parse_save', 100, {
      scriptId: script.id,
      characterCount: parsedScript.characters.length,
      sceneCount: parsedScript.scenes.length,
    })

    // ===== Stage 5: 完成 (95-100%) =====
    const result: ScriptGenerateResult = {
      scriptId: script.id,
      episodeId,
      content: generatedContent.slice(0, 500) + '...', // 只返回部分内容
      characters: parsedScript.characters,
      scenes: parsedScript.scenes,
      status: 'completed',
    }

    await reportSuccess(job, result)

    console.log(`[ScriptGenerate] Task ${taskId} completed in ${Date.now() - startTime}ms`, {
      scriptId: script.id,
      contentLength: generatedContent.length,
    })

    return result
  } catch (error) {
    console.error(`[ScriptGenerate] Task ${taskId} failed:`, error)

    // 记录失败信息到数据库
    await reportFailure(job, error, error instanceof Error ? error.name : 'GENERATION_ERROR')

    // 更新剧本状态为失败
    await prisma.script.updateMany({
      where: { episodeId },
      data: { status: ProcessStatus.FAILED },
    })

    throw error
  }
}

/**
 * 构建剧本生成提示词
 */
function buildScriptGenerationPrompt(params: {
  novelText: string
  episodeNumber: number
  characters: Array<{
    name: string
    introduction?: string | null
    gender?: string | null
    ageRange?: string | null
    personalityTags: string[]
    visualKeywords: string[]
  }>
  locations: Array<{
    name: string
    description?: string | null
    locationType?: string | null
    moodColor?: string | null
  }>
}): string {
  const { novelText, episodeNumber, characters, locations } = params

  let prompt = `# 剧本生成任务

## 任务说明
请将以下小说内容转换为标准剧本格式。这是第 ${episodeNumber} 集的内容。

## 角色信息
`

  if (characters.length > 0) {
    characters.forEach((char, index) => {
      prompt += `${index + 1}. ${char.name}`
      if (char.gender) prompt += ` (${char.gender})`
      if (char.ageRange) prompt += ` - ${char.ageRange}`
      if (char.introduction) prompt += `\n   简介：${char.introduction}`
      if (char.personalityTags.length > 0) {
        prompt += `\n   性格标签：${char.personalityTags.join(', ')}`
      }
      if (char.visualKeywords.length > 0) {
        prompt += `\n   视觉特征：${char.visualKeywords.join(', ')}`
      }
      prompt += '\n'
    })
  } else {
    prompt += '（暂无角色信息，请根据小说内容自行识别）\n'
  }

  prompt += '\n## 场景信息\n'

  if (locations.length > 0) {
    locations.forEach((loc, index) => {
      prompt += `${index + 1}. ${loc.name}`
      if (loc.locationType) prompt += ` [${loc.locationType}]`
      if (loc.description) prompt += `\n   描述：${loc.description}`
      if (loc.moodColor) prompt += `\n   氛围色调：${loc.moodColor}`
      prompt += '\n'
    })
  } else {
    prompt += '（暂无场景信息，请根据小说内容自行识别）\n'
  }

  prompt += `
## 小说内容
${novelText}

## 输出要求
请生成标准剧本格式，包含以下元素：
1. 场景标题（内景/外景 + 地点 + 时间）
2. 动作描述
3. 角色对话（角色名: 对话内容）
4. 转场提示

请以清晰的格式输出剧本内容。`

  return prompt
}

/**
 * 解析剧本内容
 *
 * 从生成的剧本中提取角色列表和场景列表
 */
function parseScriptContent(content: string): {
  characters: string[]
  scenes: string[]
} {
  const characters = new Set<string>()
  const scenes: string[] = []

  // 简单的解析逻辑 - 可以根据需要增强
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmedLine = line.trim()

    // 匹配角色名（格式：角色名: 或 角色名：）
    const characterMatch = trimmedLine.match(/^([\u4e00-\u9fa5a-zA-Z]+)[\s]*[:：]/)
    if (characterMatch && !trimmedLine.startsWith('场景') && !trimmedLine.startsWith('时间')) {
      const charName = characterMatch[1].trim()
      if (charName.length > 1 && charName.length < 20) {
        characters.add(charName)
      }
    }

    // 匹配场景标题（格式：场景、内景/外景 等）
    const sceneMatch = trimmedLine.match(/^(场景|内景|外景|INT\.|EXT\.)[\s]*[.．:：]?\s*(.+)/i)
    if (sceneMatch) {
      scenes.push(trimmedLine)
    }
  }

  return {
    characters: Array.from(characters),
    scenes: scenes.slice(0, 50), // 限制场景数量
  }
}
