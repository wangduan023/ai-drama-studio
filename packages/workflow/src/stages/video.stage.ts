/**
 * 视频生成阶段处理器
 *
 * 职责:
 * - 根据分镜和生成的图片生成视频
 * - 调用图生视频 API
 * - 处理视频生成队列和轮询
 */

import { StageProcessor } from '../stage'
import type {
  StageExecuteOptions,
  PipelineContext,
  StoryboardPanel,
  GeneratedImage,
  GeneratedVideo,
  StageConfig,
} from '../types'
import { PipelineError } from '../types'

/**
 * 视频生成输入
 */
export interface VideoGenerationInput {
  /** 分镜面板列表 (包含关联的图片) */
  panels: Array<StoryboardPanel & {
    generatedImages?: GeneratedImage[]
  }>
  /** 生成的图片列表 */
  images: GeneratedImage[]
  /** 生成配置 */
  generationConfig?: {
    /** 视频时长 (秒) */
    duration?: number
    /** 帧率 */
    fps?: number
    /** 生成模型 */
    model?: string
    /** 运镜类型 */
    motionType?: 'static' | 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'tilt_up' | 'tilt_down'
    /** 运动强度 */
    motionStrength?: number
  }
}

/**
 * 视频生成输出
 */
export interface VideoGenerationOutput {
  /** 生成的视频列表 */
  videos: GeneratedVideo[]
  /** 生成统计 */
  stats: {
    /** 总面板数 */
    totalPanels: number
    /** 成功生成视频的面板数 */
    successfulPanels: number
    /** 失败的面板数 */
    failedPanels: number
    /** 总时长 (秒) */
    totalDuration: number
  }
}

/**
 * 视频生成阶段处理器
 */
export class VideoGenerationStage extends StageProcessor<VideoGenerationInput, VideoGenerationOutput> {
  readonly stageType = 'video'

  override config: StageConfig = {
    maxRetries: 3,
    timeoutMs: 900_000,
    skippable: true,
    failPipeline: false,
  }

  /**
   * 验证前置条件
   */
  async validate(context: PipelineContext): Promise<void> {
    const imageData = context.stageData.image as { images?: GeneratedImage[] } | undefined

    if (!imageData?.images || imageData.images.length === 0) {
      throw new PipelineError(
        'No generated images available. Run image generation stage first.',
        'VIDEO_NO_IMAGES',
        this.stageType,
        null,
        false
      )
    }

    if (!this.aiExecutor) {
      throw new PipelineError(
        'AI executor not configured',
        'VIDEO_NO_AI_EXECUTOR',
        this.stageType,
        null,
        false
      )
    }
  }

  /**
   * 执行视频生成核心逻辑
   */
  async doProcess(
    context: PipelineContext,
    input: VideoGenerationInput,
    options: StageExecuteOptions
  ): Promise<VideoGenerationOutput> {
    if (!this.aiExecutor) {
      throw new PipelineError('AI executor not configured', 'NO_AI_EXECUTOR', this.stageType)
    }

    const config = {
      duration: input.generationConfig?.duration || 5,
      fps: input.generationConfig?.fps || 24,
      model: input.generationConfig?.model || 'runway-gen2',
      motionType: input.generationConfig?.motionType || 'static',
      motionStrength: input.generationConfig?.motionStrength || 5,
    }

    const videos: GeneratedVideo[] = []
    let successfulPanels = 0
    const failedPanelsSet = new Set<number>()
    let totalDuration = 0

    // 为每个分镜面板生成视频
    for (let i = 0; i < input.panels.length; i++) {
      const panel = input.panels[i]
      const panelNumber = panel.panelNumber || i + 1

      try {
        // 检查取消信号
        if (options.signal?.aborted) {
          break
        }

        // 获取关联的图片
        const panelImages = panel.generatedImages ||
          input.images.filter(img => img.id.includes(`_${panelNumber}_`))

        if (panelImages.length === 0) {
          console.warn(`[VideoStage] Panel ${panelNumber}: No images found, skipping`)
          failedPanelsSet.add(panelNumber)
          continue
        }

        // 使用第一张图片作为关键帧
        const keyframeImage = panelImages[0]

        // 构建视频生成提示词
        const videoPrompt = this.buildVideoPrompt(panel, keyframeImage)

        if (!videoPrompt || videoPrompt.trim() === '') {
          console.warn(`[VideoStage] Panel ${panelNumber}: Empty video prompt, skipping`)
          failedPanelsSet.add(panelNumber)
          continue
        }

        // 调用 AI 生成视频
        const generatedVideo = await this.generateVideo(
          context,
          keyframeImage,
          videoPrompt,
          panel,
          config,
          options
        )

        if (generatedVideo) {
          videos.push(generatedVideo)
          successfulPanels++
          totalDuration += generatedVideo.duration

          // 报告进度
          options.onProgress?.(
            Math.round(((i + 1) / input.panels.length) * 100),
            `生成视频 ${i + 1}/${input.panels.length}`
          )
        } else {
          failedPanelsSet.add(panelNumber)
        }
      } catch (error) {
        console.error(
          `[VideoStage] Panel ${panelNumber}: Generation failed:`,
          error instanceof Error ? error.message : String(error)
        )
        failedPanelsSet.add(panelNumber)
      }
    }

    return {
      videos,
      stats: {
        totalPanels: input.panels.length,
        successfulPanels,
        failedPanels: failedPanelsSet.size,
        totalDuration,
      },
    }
  }

  /**
   * 处理失败场景
   */
  async onFailure(
    context: PipelineContext,
    error: PipelineError,
    attempt: number
  ): Promise<void> {
    console.error(
      `[VideoStage] Attempt ${attempt} failed for project ${context.projectId}:`,
      error.message
    )

    context.extensions.videoError = {
      attempt,
      errorCode: error.code,
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * 构建视频生成提示词
   */
  private buildVideoPrompt(
    panel: StoryboardPanel,
    keyframeImage: GeneratedImage
  ): string {
    const parts: string[] = []

    // 使用分镜描述作为基础
    if (panel.description) {
      parts.push(panel.description)
    }

    // 如果有专门的 videoPrompt，优先使用
    if (panel.videoPrompt) {
      return panel.videoPrompt
    }

    // 运镜方式
    if (panel.cameraMove) {
      const motionDescriptions: Record<string, string> = {
        'static': 'No camera movement, static shot',
        'zoom': 'Slow zoom effect',
        'pan': 'Camera panning movement',
        'tilt': 'Camera tilt movement',
        'dolly': 'Dolly movement towards or away from subject',
        'track': 'Tracking shot following the subject',
      }
      const motionDesc = motionDescriptions[panel.cameraMove.toLowerCase()] ||
        `Camera movement: ${panel.cameraMove}`
      parts.push(motionDesc)
    }

    // 时长提示
    if (panel.duration) {
      parts.push(`Duration: ${panel.duration} seconds`)
    }

    // 氛围
    if (panel.photographyPlan?.atmosphere) {
      parts.push(`Atmosphere: ${panel.photographyPlan.atmosphere}`)
    }

    return parts.join('. ')
  }

  /**
   * 生成视频 (模拟实现，实际需接入图生视频 API)
   */
  private async generateVideo(
    context: PipelineContext,
    keyframeImage: GeneratedImage,
    videoPrompt: string,
    panel: StoryboardPanel,
    config: {
      duration: number
      fps: number
      model: string
      motionType: string
      motionStrength: number
    },
    options: StageExecuteOptions
  ): Promise<GeneratedVideo | null> {
    // TODO: 接入实际的图生视频 API (如 Runway, Pika, 可灵等)

    // 模拟 API 调用流程:
    // 1. 提交视频生成任务
    // 2. 轮询任务状态
    // 3. 获取生成的视频 URL

    const videoId = `vid_${context.projectId}_${panel.panelNumber}`

    // 模拟任务提交
    const taskId = await this.submitVideoTask(context, keyframeImage, videoPrompt, config)

    // 轮询任务状态 (模拟)
    const videoUrl = await this.pollVideoTask(context, taskId, options)

    if (!videoUrl) {
      return null
    }

    return {
      id: videoId,
      url: videoUrl,
      thumbnailUrl: keyframeImage.url,  // 使用关键帧作为封面
      duration: config.duration,
      width: 1024,
      height: 1024,
      fps: config.fps,
      params: {
        model: config.model,
        motionType: config.motionType,
        motionStrength: config.motionStrength,
        prompt: videoPrompt,
        sourceImageId: keyframeImage.id,
      },
    }
  }

  /**
   * 提交视频生成任务 (模拟)
   */
  private async submitVideoTask(
    context: PipelineContext,
    keyframeImage: GeneratedImage,
    videoPrompt: string,
    config: Record<string, unknown>
  ): Promise<string> {
    // TODO: 调用实际 API
    // const response = await fetch(videoApiUrl, {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     image_url: keyframeImage.url,
    //     prompt: videoPrompt,
    //     duration: config.duration,
    //     ...config
    //   })
    // })
    // const data = await response.json()
    // return data.task_id

    console.log(`[VideoStage] Submitting video task for project ${context.projectId}`)
    return `task_${context.projectId}_${Date.now()}`
  }

  /**
   * 轮询视频任务状态 (模拟)
   */
  private async pollVideoTask(
    context: PipelineContext,
    taskId: string,
    options: StageExecuteOptions
  ): Promise<string | null> {
    const maxPollAttempts = 60  // 最多轮询 60 次 (5 分钟，每 5 秒一次)
    const pollInterval = 5000  // 5 秒

    for (let attempt = 1; attempt <= maxPollAttempts; attempt++) {
      // 检查取消信号
      if (options.signal?.aborted) {
        return null
      }

      // TODO: 调用实际 API 查询任务状态
      // const response = await fetch(`${videoApiUrl}/tasks/${taskId}`, {
      //   headers: { 'Authorization': `Bearer ${apiKey}` }
      // })
      // const data = await response.json()

      // 模拟任务状态 - 简化为仅 processing 和 completed
      const status: 'processing' | 'completed' = attempt >= maxPollAttempts ? 'completed' : 'processing'

      if (status === 'completed') {
        // 返回视频 URL
        return `https://example.com/videos/${taskId}.mp4`
      }

      // 等待下次轮询
      if (attempt < maxPollAttempts) {
        await VideoGenerationStage.sleepStatic(pollInterval)
      }
    }

    throw new PipelineError(
      `Video generation task ${taskId} timed out`,
      'VIDEO_TASK_TIMEOUT',
      this.stageType,
      null,
      false
    )
  }

  /**
   * 睡眠辅助函数 (静态版本，避免与基类冲突)
   */
  private static sleepStatic(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 转换输出数据
   */
  protected async transform(
    output: VideoGenerationOutput,
    context: PipelineContext
  ): Promise<VideoGenerationOutput> {
    // 记录生成的视频到上下文
    context.extensions.generatedVideos = output.videos.map(vid => ({
      id: vid.id,
      url: vid.url,
      thumbnailUrl: vid.thumbnailUrl,
      duration: vid.duration,
    }))

    return output
  }
}
