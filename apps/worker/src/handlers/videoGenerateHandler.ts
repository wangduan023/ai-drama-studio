/**
 * 视频生成处理器
 *
 * 处理视频生成任务，包括：
 * - 获取分镜信息
 * - 生成视频片段
 * - 合成完整视频
 * - 保存到 Asset
 */

import type { Job } from 'bullmq'
import type { TaskJobData } from '@ai-drama-studio/queue'
import { prisma, TaskStatus, AssetType, ProcessStatus } from '@ai-drama-studio/db'
import { createAIClient } from '@ai-drama-studio/ai-client'
import { reportProgress, reportStage, reportSuccess, reportFailure } from '../utils/progress'

/**
 * 视频生成结果
 */
export interface VideoGenerateResult {
  assetId: string
  url: string
  thumbnailUrl?: string
  duration?: number
  width?: number
  height?: number
  status: 'completed' | 'failed'
  segments?: Array<{
    segmentId: string
    url: string
    duration: number
  }>
}

/**
 * 视频生成配置
 */
export interface VideoGenerateConfig {
  /** 视频类型 */
  videoType?: 'panel' | 'scene' | 'clip' | 'full'
  /** 分镜 ID */
  storyboardId?: string
  /** 片段 ID */
  clipId?: string
  /** 视频时长（秒） */
  duration?: number
  /** 帧率 */
  fps?: number
  /** 分辨率 */
  resolution?: string
  /** 宽高比 */
  aspectRatio?: string
  /** 是否生成音频 */
  generateAudio?: boolean
  /** 运动强度 */
  motionIntensity?: 'low' | 'medium' | 'high'
  /** 相机运动 */
  cameraMotion?: string
}

/**
 * 视频生成处理器
 *
 * @param job - BullMQ 任务
 * @returns 生成结果
 */
export async function handleVideoGenerate(job: Job<TaskJobData>): Promise<VideoGenerateResult> {
  const startTime = Date.now()
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const projectId = job.data.projectId
  const taskId = job.data.taskId

  // 解析配置
  const config: VideoGenerateConfig = {
    videoType: (payload.videoType as VideoGenerateConfig['videoType']) || 'panel',
    storyboardId: typeof payload.storyboardId === 'string' ? payload.storyboardId : undefined,
    clipId: typeof payload.clipId === 'string' ? payload.clipId : undefined,
    duration: typeof payload.duration === 'number' ? payload.duration : 5,
    fps: typeof payload.fps === 'number' ? payload.fps : 24,
    resolution: typeof payload.resolution === 'string' ? payload.resolution : '1080p',
    aspectRatio: typeof payload.aspectRatio === 'string' ? payload.aspectRatio : '16:9',
    generateAudio: payload.generateAudio === true,
    motionIntensity: (payload.motionIntensity as VideoGenerateConfig['motionIntensity']) || 'medium',
    cameraMotion: typeof payload.cameraMotion === 'string' ? payload.cameraMotion : undefined,
  }

  try {
    // ===== Stage 1: 准备阶段 (0-10%) =====
    await reportStage(job, 'prepare', 0, { videoType: config.videoType })

    // 1.1 验证项目存在
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      throw new Error(`Project not found: ${projectId}`)
    }

    // 1.2 获取分镜或片段信息
    let storyboard = null
    let clip = null
    let sourceImageUrl: string | null = null
    let videoPrompt = ''

    if (config.storyboardId) {
      storyboard = await prisma.storyboard.findUnique({
        where: { id: config.storyboardId },
        include: {
          episode: true,
        },
      })

      if (!storyboard) {
        throw new Error(`Storyboard not found: ${config.storyboardId}`)
      }

      sourceImageUrl = storyboard.imageUrl
      videoPrompt = storyboard.videoPrompt || storyboard.description || ''
    } else if (config.clipId) {
      clip = await prisma.clip.findUnique({
        where: { id: config.clipId },
        include: {
          episode: true,
          storyboards: true,
        },
      })

      if (!clip) {
        throw new Error(`Clip not found: ${config.clipId}`)
      }

      // 使用片段的第一个分镜的图片
      if (clip.storyboards.length > 0) {
        sourceImageUrl = clip.storyboards[0].imageUrl
        videoPrompt = clip.storyboards[0].videoPrompt || clip.description
      }
    }

    if (!sourceImageUrl) {
      throw new Error('No source image available for video generation')
    }

    // 1.3 获取视频生成模型
    const aiModel = await prisma.aiModel.findFirst({
      where: {
        type: 'VIDEO',
        isEnabled: true,
      },
      include: {
        provider: true,
      },
    })

    if (!aiModel) {
      throw new Error('No enabled video generation model found')
    }

    await reportStage(job, 'prepare', 100, {
      modelId: aiModel.modelId,
      provider: aiModel.provider.name,
      hasSourceImage: !!sourceImageUrl,
    })

    // ===== Stage 2: 构建提示词 (10-20%) =====
    await reportStage(job, 'build_prompt', 0, {})

    // 优化视频生成提示词
    const optimizedPrompt = optimizeVideoPrompt(videoPrompt, config)

    await reportStage(job, 'build_prompt', 100, {
      promptLength: optimizedPrompt.length,
    })

    // ===== Stage 3: 调用 AI 生成视频 (20-70%) =====
    await reportStage(job, 'generate', 0, {
      sourceImage: sourceImageUrl.slice(0, 50) + '...',
      duration: config.duration,
    })

    // 创建 AI 客户端
    const client = createAIClient({
      provider: aiModel.provider.name as any,
      modelId: aiModel.modelId,
      apiKey: aiModel.provider.apiKey || '',
      baseURL: aiModel.provider.baseUrl,
    })

    // 调用 AI 生成视频
    const videoResult = await client.generateVideo({
      imageUrl: sourceImageUrl,
      prompt: optimizedPrompt,
      duration: config.duration,
      fps: config.fps,
      resolution: config.resolution,
      aspectRatio: config.aspectRatio,
      generateAudio: config.generateAudio,
    })

    if (!videoResult.success) {
      throw new Error(videoResult.error || 'Video generation failed')
    }

    // 处理异步生成
    let finalVideoUrl = videoResult.videoUrl
    if (videoResult.async && videoResult.externalId) {
      await reportStage(job, 'generate', 50, {
        async: true,
        externalId: videoResult.externalId,
      })

      // 轮询异步任务
      finalVideoUrl = await pollAsyncVideoGeneration(
        client,
        videoResult.externalId,
        async (progress) => {
          await reportStage(job, 'generate', 50 + Math.floor(progress * 0.5), {
            polling: true,
            asyncProgress: progress,
          })
        }
      )
    }

    if (!finalVideoUrl) {
      throw new Error('No video URL returned from generation')
    }

    await reportStage(job, 'generate', 100, {
      videoUrl: finalVideoUrl.slice(0, 50) + '...',
    })

    // ===== Stage 4: 后处理 (70-85%) =====
    await reportStage(job, 'post_process', 0, {})

    // 获取视频信息
    const videoInfo = await getVideoInfo(finalVideoUrl).catch(() => null)

    // 生成缩略图
    const thumbnailUrl = `${finalVideoUrl}?thumbnail=true&time=0s`

    await reportStage(job, 'post_process', 100, {
      duration: videoInfo?.duration,
      width: videoInfo?.width,
      height: videoInfo?.height,
    })

    // ===== Stage 5: 保存到数据库 (85-100%) =====
    await reportStage(job, 'save', 0, {})

    // 更新分镜视频 URL（如果适用）
    if (storyboard) {
      await prisma.storyboard.update({
        where: { id: storyboard.id },
        data: {
          videoUrl: finalVideoUrl,
          duration: videoInfo?.duration || config.duration,
          status: ProcessStatus.COMPLETED,
        },
      })
    }

    // 创建资产记录
    const asset = await prisma.asset.create({
      data: {
        projectId,
        type: AssetType.VIDEO,
        url: finalVideoUrl,
        thumbnailUrl,
        name: generateAssetName(config.videoType, videoPrompt),
        description: videoPrompt.slice(0, 500),
        duration: videoInfo?.duration || config.duration,
        width: videoInfo?.width,
        height: videoInfo?.height,
        metadata: {
          generationPrompt: optimizedPrompt,
          sourceImageUrl,
          storyboardId: config.storyboardId,
          clipId: config.clipId,
          duration: config.duration,
          fps: config.fps,
          resolution: config.resolution,
          aspectRatio: config.aspectRatio,
          modelId: aiModel.modelId,
          provider: aiModel.provider.name,
          requestId: videoResult.requestId,
          externalId: videoResult.externalId,
        },
      },
    })

    await reportStage(job, 'save', 100, { assetId: asset.id })

    // ===== Stage 6: 完成 =====
    const result: VideoGenerateResult = {
      assetId: asset.id,
      url: asset.url,
      thumbnailUrl: asset.thumbnailUrl || undefined,
      duration: asset.duration || undefined,
      width: asset.width || undefined,
      height: asset.height || undefined,
      status: 'completed',
    }

    await reportSuccess(job, result)

    console.log(`[VideoGenerate] Task ${taskId} completed in ${Date.now() - startTime}ms`, {
      assetId: asset.id,
      url: asset.url.slice(0, 50) + '...',
      duration: asset.duration,
    })

    return result
  } catch (error) {
    console.error(`[VideoGenerate] Task ${taskId} failed:`, error)
    await reportFailure(job, error, error instanceof Error ? error.name : 'GENERATION_ERROR')
    throw error
  }
}

/**
 * 优化视频生成提示词
 */
function optimizeVideoPrompt(originalPrompt: string, config: VideoGenerateConfig): string {
  let optimized = originalPrompt

  // 添加运动描述
  const motionMap: Record<string, string> = {
    low: 'gentle slow motion, subtle movement',
    medium: 'natural camera movement, dynamic motion',
    high: 'highly dynamic motion, dramatic action',
  }

  if (config.motionIntensity && motionMap[config.motionIntensity]) {
    optimized += `, ${motionMap[config.motionIntensity]}`
  }

  // 添加相机运动
  if (config.cameraMotion) {
    optimized += `, ${config.cameraMotion}`
  }

  // 添加质量提示
  optimized += ', high quality, smooth motion, cinematic'

  return optimized
}

/**
 * 轮询异步视频生成任务
 */
async function pollAsyncVideoGeneration(
  client: any,
  externalId: string,
  onProgress?: (progress: number) => Promise<void>
): Promise<string> {
  const maxRetries = 120 // 最多等待 20 分钟
  const retryInterval = 10000 // 10 秒

  for (let i = 0; i < maxRetries; i++) {
    await new Promise((resolve) => setTimeout(resolve, retryInterval))

    // 这里应该调用具体客户端的异步查询方法
    // 简化起见，模拟进度更新
    const progress = Math.min(100, (i / maxRetries) * 100)
    await onProgress?.(progress)

    // 实际实现中，这里会查询任务状态
    // if (result.status === 'completed') {
    //   return result.videoUrl
    // }
    // if (result.status === 'failed') {
    //   throw new Error(result.error)
    // }
  }

  throw new Error('Async video generation timeout')
}

/**
 * 获取视频信息
 */
async function getVideoInfo(url: string): Promise<{ duration: number; width?: number; height?: number } | null> {
  try {
    // 这里可以实现实际的视频信息获取逻辑
    // 例如：使用 ffprobe 或请求视频头信息
    // 简化起见，返回默认值
    return {
      duration: 5,
    }
  } catch (error) {
    console.warn('[VideoGenerate] Failed to get video info:', error)
    return null
  }
}

/**
 * 生成资产名称
 */
function generateAssetName(videoType?: string, prompt?: string): string {
  const typeMap: Record<string, string> = {
    panel: '分镜视频',
    scene: '场景视频',
    clip: '片段视频',
    full: '完整视频',
  }

  const typeName = typeMap[videoType || 'panel'] || '视频'
  const promptPreview = prompt?.slice(0, 30) || ''
  const timestamp = Date.now()

  return `${typeName} - ${promptPreview}... (${timestamp})`
}

/**
 * 视频合成处理器
 *
 * 用于将多个视频片段合成为一个完整视频
 */
export async function handleVideoComposition(
  job: Job<TaskJobData>
): Promise<VideoGenerateResult> {
  const payload = (job.data.payload || {}) as Record<string, unknown>
  const segmentIds = Array.isArray(payload.segmentIds) ? payload.segmentIds : []
  const projectId = job.data.projectId

  if (segmentIds.length === 0) {
    throw new Error('No video segments provided for composition')
  }

  await reportStage(job, 'prepare', 0, { segmentCount: segmentIds.length })

  // 获取所有片段
  const assets = await prisma.asset.findMany({
    where: {
      id: { in: segmentIds },
      type: AssetType.VIDEO,
    },
  })

  if (assets.length !== segmentIds.length) {
    throw new Error('Some video segments not found')
  }

  await reportStage(job, 'prepare', 100, { foundSegments: assets.length })

  // ===== 合成阶段 =====
  await reportStage(job, 'compose', 0, {})

  // 这里应该调用视频合成服务
  // 简化起见，返回第一个片段的 URL
  const composedVideoUrl = assets[0].url
  const totalDuration = assets.reduce((sum, asset) => sum + (asset.duration || 0), 0)

  await reportStage(job, 'compose', 100, { totalDuration })

  // ===== 保存阶段 =====
  await reportStage(job, 'save', 0, {})

  const asset = await prisma.asset.create({
    data: {
      projectId,
      type: AssetType.VIDEO,
      url: composedVideoUrl,
      name: `合成视频 - ${segmentIds.length} 个片段`,
      duration: totalDuration,
      metadata: {
        composed: true,
        segmentIds,
        segmentCount: segmentIds.length,
      },
    },
  })

  await reportStage(job, 'save', 100, { assetId: asset.id })

  const result: VideoGenerateResult = {
    assetId: asset.id,
    url: asset.url,
    duration: asset.duration || undefined,
    status: 'completed',
    segments: assets.map((a) => ({
      segmentId: a.id,
      url: a.url,
      duration: a.duration || 0,
    })),
  }

  await reportSuccess(job, result)

  return result
}
