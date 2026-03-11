/**
 * 图片生成处理器
 *
 * 处理图片生成任务，包括：
 * - 根据提示词生成图片
 * - 上传到存储
 * - 保存 URL 到数据库
 */

import type { Job } from 'bullmq'
import type { TaskJobData } from '@ai-drama-studio/queue'
import { prisma, TaskStatus, AssetType } from '@ai-drama-studio/db'
import { createAIClient } from '@ai-drama-studio/ai-client'
import { reportProgress, reportStage, reportSuccess, reportFailure } from '../utils/progress'

/**
 * 图片生成结果
 */
export interface ImageGenerateResult {
  assetId: string
  url: string
  thumbnailUrl?: string
  width?: number
  height?: number
  status: 'completed' | 'failed'
}

/**
 * 图片生成配置
 */
export interface ImageGenerateConfig {
  /** 图片类型 */
  imageType?: 'character' | 'location' | 'scene' | 'panel' | 'custom'
  /** 生成图片数量 */
  count?: number
  /** 宽高比 */
  aspectRatio?: string
  /** 分辨率 */
  resolution?: string
  /** 负向提示词 */
  negativePrompt?: string
  /** 参考图片 URLs */
  referenceImages?: string[]
  /** 风格预设 */
  style?: string
}

/**
 * 图片生成处理器
 *
 * @param job - BullMQ 任务
 * @returns 生成结果
 */
export async function handleImageGenerate(job: Job<TaskJobData>): Promise<ImageGenerateResult> {
  const startTime = Date.now()
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const projectId = job.data.projectId
  const taskId = job.data.taskId

  // 解析配置
  const config: ImageGenerateConfig = {
    imageType: (payload.imageType as ImageGenerateConfig['imageType']) || 'custom',
    count: typeof payload.count === 'number' ? payload.count : 1,
    aspectRatio: typeof payload.aspectRatio === 'string' ? payload.aspectRatio : '16:9',
    resolution: typeof payload.resolution === 'string' ? payload.resolution : undefined,
    negativePrompt: typeof payload.negativePrompt === 'string' ? payload.negativePrompt : undefined,
    referenceImages: Array.isArray(payload.referenceImages) ? payload.referenceImages : undefined,
    style: typeof payload.style === 'string' ? payload.style : undefined,
  }

  const prompt = typeof payload.prompt === 'string' ? payload.prompt : ''

  if (!prompt.trim()) {
    throw new Error('Image generation prompt is required')
  }

  try {
    // ===== Stage 1: 准备阶段 (0-15%) =====
    await reportStage(job, 'prepare', 0, { imageType: config.imageType })

    // 1.1 验证项目存在
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      throw new Error(`Project not found: ${projectId}`)
    }

    // 1.2 获取图像生成模型
    const aiModel = await prisma.aiModel.findFirst({
      where: {
        type: 'IMAGE',
        isEnabled: true,
      },
      include: {
        provider: true,
      },
    })

    if (!aiModel) {
      throw new Error('No enabled image generation model found')
    }

    await reportStage(job, 'prepare', 100, {
      modelId: aiModel.modelId,
      provider: aiModel.provider.name,
    })

    // ===== Stage 2: 优化提示词 (15-30%) =====
    await reportStage(job, 'optimize_prompt', 0, { originalLength: prompt.length })

    // 根据图片类型和风格优化提示词
    const optimizedPrompt = optimizeImagePrompt(prompt, config)

    await reportStage(job, 'optimize_prompt', 100, {
      optimizedLength: optimizedPrompt.length,
    })

    // ===== Stage 3: 调用 AI 生成图片 (30-80%) =====
    await reportStage(job, 'generate', 0, { prompt: optimizedPrompt.slice(0, 100) + '...' })

    // 创建 AI 客户端
    const client = createAIClient({
      provider: aiModel.provider.name as any,
      modelId: aiModel.modelId,
      apiKey: aiModel.provider.apiKey || '',
      baseURL: aiModel.provider.baseUrl,
    })

    // 调用 AI 生成图片
    const imageResult = await client.generateImage({
      prompt: optimizedPrompt,
      negativePrompt: config.negativePrompt,
      aspectRatio: config.aspectRatio,
      resolution: config.resolution,
      n: Math.min(config.count || 1, 4), // 限制最大数量
      referenceImages: config.referenceImages,
    })

    if (!imageResult.success) {
      throw new Error(imageResult.error || 'Image generation failed')
    }

    // 处理异步生成结果
    if (imageResult.async && imageResult.externalId) {
      await reportStage(job, 'generate', 50, {
        async: true,
        externalId: imageResult.externalId,
      })

      // 轮询异步任务（简化实现）
      const maxRetries = 60 // 最多等待 10 分钟
      const retryInterval = 10000 // 10 秒

      for (let i = 0; i < maxRetries; i++) {
        await new Promise((resolve) => setTimeout(resolve, retryInterval))

        // 这里可以调用具体客户端的异步查询方法
        // 简化起见，假设异步任务最终会返回结果

        await reportStage(job, 'generate', 50 + Math.floor((i / maxRetries) * 50), {
          polling: true,
          attempt: i + 1,
        })
      }

      throw new Error('Async image generation timeout')
    }

    if (!imageResult.imageUrl) {
      throw new Error('No image URL returned from generation')
    }

    await reportStage(job, 'generate', 100, {
      imageUrl: imageResult.imageUrl.slice(0, 50) + '...',
    })

    // ===== Stage 4: 上传到存储 (80-90%) =====
    await reportStage(job, 'upload', 0, { imageUrl: imageResult.imageUrl.slice(0, 50) + '...' })

    // 获取图片尺寸信息（如果可用）
    const dimensions = await getImageDimensions(imageResult.imageUrl).catch(() => null)

    // 生成缩略图 URL（这里假设有缩略图服务）
    const thumbnailUrl = imageResult.imageUrl
      ? `${imageResult.imageUrl}?thumbnail=true&size=300`
      : undefined

    await reportStage(job, 'upload', 100, {
      width: dimensions?.width,
      height: dimensions?.height,
    })

    // ===== Stage 5: 保存到数据库 (90-100%) =====
    await reportStage(job, 'save', 0, {})

    // 确定资产类型
    const assetType = mapImageTypeToAssetType(config.imageType)

    // 创建资产记录
    const asset = await prisma.asset.create({
      data: {
        projectId,
        type: assetType,
        url: imageResult.imageUrl,
        thumbnailUrl,
        name: generateAssetName(config.imageType, prompt),
        description: prompt.slice(0, 500),
        metadata: {
          generationPrompt: optimizedPrompt,
          negativePrompt: config.negativePrompt,
          aspectRatio: config.aspectRatio,
          resolution: config.resolution,
          style: config.style,
          modelId: aiModel.modelId,
          provider: aiModel.provider.name,
          requestId: imageResult.requestId,
          referenceImages: config.referenceImages,
        },
        width: dimensions?.width,
        height: dimensions?.height,
      },
    })

    await reportStage(job, 'save', 100, { assetId: asset.id })

    // ===== Stage 6: 完成 =====
    const result: ImageGenerateResult = {
      assetId: asset.id,
      url: asset.url,
      thumbnailUrl: asset.thumbnailUrl || undefined,
      width: asset.width || undefined,
      height: asset.height || undefined,
      status: 'completed',
    }

    await reportSuccess(job, result)

    console.log(`[ImageGenerate] Task ${taskId} completed in ${Date.now() - startTime}ms`, {
      assetId: asset.id,
      url: asset.url.slice(0, 50) + '...',
    })

    return result
  } catch (error) {
    console.error(`[ImageGenerate] Task ${taskId} failed:`, error)
    await reportFailure(job, error, error instanceof Error ? error.name : 'GENERATION_ERROR')
    throw error
  }
}

/**
 * 优化图片生成提示词
 */
function optimizeImagePrompt(originalPrompt: string, config: ImageGenerateConfig): string {
  let optimized = originalPrompt

  // 根据类型添加风格提示
  switch (config.imageType) {
    case 'character':
      optimized += ', character portrait, detailed face, high quality, cinematic lighting'
      break
    case 'location':
      optimized += ', landscape, environment concept art, detailed background, atmospheric'
      break
    case 'scene':
      optimized += ', cinematic scene, dramatic lighting, movie still, high production value'
      break
    case 'panel':
      optimized += ', storyboard panel, film composition, cinematic framing'
      break
  }

  // 添加风格提示
  if (config.style) {
    optimized += `, ${config.style} style`
  }

  // 添加质量提示
  optimized += ', best quality, highly detailed, 8k uhd'

  return optimized
}

/**
 * 映射图片类型到资产类型
 */
function mapImageTypeToAssetType(imageType?: string): AssetType {
  switch (imageType) {
    case 'character':
      return AssetType.CHARACTER_SHEET
    case 'location':
      return AssetType.LOCATION_SHEET
    default:
      return AssetType.IMAGE
  }
}

/**
 * 生成资产名称
 */
function generateAssetName(imageType?: string, prompt?: string): string {
  const typeMap: Record<string, string> = {
    character: '角色图',
    location: '场景图',
    scene: '场景图',
    panel: '分镜图',
    custom: '图片',
  }

  const typeName = typeMap[imageType || 'custom'] || '图片'
  const promptPreview = prompt?.slice(0, 30) || ''
  const timestamp = Date.now()

  return `${typeName} - ${promptPreview}... (${timestamp})`
}

/**
 * 获取图片尺寸
 */
async function getImageDimensions(url: string): Promise<{ width: number; height: number } | null> {
  try {
    // 这里可以实现实际的图片尺寸获取逻辑
    // 例如：使用 sharp 库或请求图片头信息
    // 简化起见，返回 null
    return null
  } catch (error) {
    console.warn('[ImageGenerate] Failed to get image dimensions:', error)
    return null
  }
}

/**
 * 批量图片生成处理器
 *
 * 用于同时生成多张图片
 */
export async function handleBatchImageGenerate(
  job: Job<TaskJobData>
): Promise<ImageGenerateResult[]> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const prompts = Array.isArray(payload.prompts) ? payload.prompts : []

  if (prompts.length === 0) {
    throw new Error('No prompts provided for batch generation')
  }

  const results: ImageGenerateResult[] = []
  const total = prompts.length

  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i]
    if (typeof prompt !== 'string') continue

    // 更新进度
    const progress = Math.floor((i / total) * 100)
    await reportProgress(job, progress, `Generating image ${i + 1}/${total}`)

    // 创建子任务数据
    const subJob = {
      ...job,
      data: {
        ...job.data,
        payload: {
          ...payload,
          prompt,
          count: 1,
        },
      },
    } as Job<TaskJobData>

    try {
      const result = await handleImageGenerate(subJob)
      results.push(result)
    } catch (error) {
      console.error(`[BatchImageGenerate] Failed to generate image ${i + 1}:`, error)
      // 继续生成其他图片
    }
  }

  return results
}
