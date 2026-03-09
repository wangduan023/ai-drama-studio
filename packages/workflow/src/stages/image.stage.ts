/**
 * 图片生成阶段处理器
 *
 * 职责:
 * - 根据分镜描述生成提示词
 * - 调用文生图 API 生成图片
 * - 处理图片生成失败和重试
 */

import { StageProcessor } from '../stage'
import type {
  StageExecuteOptions,
  PipelineContext,
  StoryboardPanel,
  GeneratedImage,
  StageConfig,
} from '../types'
import { PipelineError } from '../types'

/**
 * 图片生成输入
 */
export interface ImageGenerationInput {
  /** 分镜面板列表 */
  panels: StoryboardPanel[]
  /** 角色外观参考 */
  characterReferences?: Record<string, {
    name: string
    imageUrl?: string | null
    description?: string | null
  }>
  /** 场景参考图片 */
  locationReferences?: Record<string, {
    name: string
    imageUrl?: string | null
    description?: string | null
  }>
  /** 生成配置 */
  generationConfig?: {
    /** 图片宽度 */
    width?: number
    /** 图片高度 */
    height?: number
    /** 生成模型 */
    model?: string
    /** 每面板生成数量 */
    imagesPerPanel?: number
  }
}

/**
 * 图片生成输出
 */
export interface ImageGenerationOutput {
  /** 生成的图片列表 */
  images: GeneratedImage[]
  /** 生成统计 */
  stats: {
    /** 总面板数 */
    totalPanels: number
    /** 成功生成图片的面板数 */
    successfulPanels: number
    /** 失败的面板数 */
    failedPanels: number
  }
}

/**
 * 图片生成阶段处理器
 */
export class ImageGenerationStage extends StageProcessor<ImageGenerationInput, ImageGenerationOutput> {
  readonly stageType = 'image'

  override config: StageConfig = {
    maxRetries: 2,
    timeoutMs: 600_000,
    skippable: false,
    failPipeline: true,
  }

  /**
   * 验证前置条件
   */
  async validate(context: PipelineContext): Promise<void> {
    const storyboardData = context.stageData.storyboard as { panels?: StoryboardPanel[] } | undefined

    if (!storyboardData?.panels || storyboardData.panels.length === 0) {
      throw new PipelineError(
        'No storyboard panels available. Run storyboard stage first.',
        'IMAGE_NO_STORYBOARD',
        this.stageType,
        null,
        false
      )
    }

    if (!this.aiExecutor) {
      throw new PipelineError(
        'AI executor not configured',
        'IMAGE_NO_AI_EXECUTOR',
        this.stageType,
        null,
        false
      )
    }
  }

  /**
   * 执行图片生成核心逻辑
   */
  async doProcess(
    context: PipelineContext,
    input: ImageGenerationInput,
    options: StageExecuteOptions
  ): Promise<ImageGenerationOutput> {
    if (!this.aiExecutor) {
      throw new PipelineError('AI executor not configured', 'NO_AI_EXECUTOR', this.stageType)
    }

    const config = {
      width: input.generationConfig?.width || 1024,
      height: input.generationConfig?.height || 1024,
      model: input.generationConfig?.model || 'stable-diffusion-xl',
      imagesPerPanel: input.generationConfig?.imagesPerPanel || 1,
    }

    const images: GeneratedImage[] = []
    let successfulPanels = 0
    const failedPanelsSet = new Set<number>()

    // 为每个分镜面板生成图片
    for (let i = 0; i < input.panels.length; i++) {
      const panel = input.panels[i]
      const panelNumber = panel.panelNumber || i + 1

      try {
        // 检查取消信号
        if (options.signal?.aborted) {
          break
        }

        // 构建图片生成提示词
        const imagePrompt = this.buildImagePrompt(panel, input)

        if (!imagePrompt || imagePrompt.trim() === '') {
          console.warn(`[ImageStage] Panel ${panelNumber}: Empty image prompt, skipping`)
          failedPanelsSet.add(panelNumber)
          continue
        }

        // 调用 AI 生成图片 (这里模拟调用，实际需要接入文生图 API)
        const generatedImages = await this.generateImages(
          context,
          imagePrompt,
          panel,
          config,
          options
        )

        images.push(...generatedImages)
        successfulPanels++

        // 报告进度
        options.onProgress?.(
          Math.round(((i + 1) / input.panels.length) * 100),
          `生成图片 ${i + 1}/${input.panels.length}`
        )
      } catch (error) {
        console.error(
          `[ImageStage] Panel ${panelNumber}: Generation failed:`,
          error instanceof Error ? error.message : String(error)
        )
        failedPanelsSet.add(panelNumber)
      }
    }

    return {
      images,
      stats: {
        totalPanels: input.panels.length,
        successfulPanels,
        failedPanels: failedPanelsSet.size,
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
      `[ImageStage] Attempt ${attempt} failed for project ${context.projectId}:`,
      error.message
    )

    context.extensions.imageError = {
      attempt,
      errorCode: error.code,
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * 构建图片生成提示词
   */
  private buildImagePrompt(
    panel: StoryboardPanel,
    input: ImageGenerationInput
  ): string {
    const parts: string[] = []

    // 画面描述
    if (panel.description) {
      parts.push(panel.description)
    }

    // 角色描述
    if (panel.characters && panel.characters.length > 0) {
      const charDescriptions = panel.characters
        .map(charName => {
          const charRef = input.characterReferences?.[charName]
          if (charRef?.description) {
            return `${charName}: ${charRef.description}`
          }
          return charName
        })
        .join(', ')
      parts.push(`Characters: ${charDescriptions}`)
    }

    // 场景描述
    if (panel.location) {
      const locationRef = input.locationReferences?.[panel.location]
      if (locationRef?.description) {
        parts.push(`Location: ${locationRef.description}`)
      } else {
        parts.push(`Location: ${panel.location}`)
      }
    }

    // 摄影方案
    if (panel.photographyPlan) {
      const photoParts: string[] = []
      if (panel.photographyPlan.composition) {
        photoParts.push(`Composition: ${panel.photographyPlan.composition}`)
      }
      if (panel.photographyPlan.lighting) {
        photoParts.push(`Lighting: ${panel.photographyPlan.lighting}`)
      }
      if (panel.photographyPlan.colorPalette) {
        photoParts.push(`Color palette: ${panel.photographyPlan.colorPalette}`)
      }
      if (panel.photographyPlan.atmosphere) {
        photoParts.push(`Atmosphere: ${panel.photographyPlan.atmosphere}`)
      }
      if (photoParts.length > 0) {
        parts.push(photoParts.join(', '))
      }
    }

    // 运镜方式
    if (panel.shotType) {
      parts.push(`Shot type: ${panel.shotType}`)
    }
    if (panel.cameraMove) {
      parts.push(`Camera movement: ${panel.cameraMove}`)
    }

    // 如果已有 imagePrompt，直接使用或追加
    if (panel.imagePrompt) {
      // 将已有提示词与生成的提示词结合
      return `${panel.imagePrompt}. ${parts.join('. ')}`.trim()
    }

    return parts.join('. ')
  }

  /**
   * 生成图片 (模拟实现，实际需接入文生图 API)
   */
  private async generateImages(
    context: PipelineContext,
    prompt: string,
    panel: StoryboardPanel,
    config: { width: number; height: number; model: string; imagesPerPanel: number },
    options: StageExecuteOptions
  ): Promise<GeneratedImage[]> {
    // TODO: 接入实际的文生图 API
    // 这里提供一个模拟实现的框架

    const images: GeneratedImage[] = []

    for (let i = 0; i < config.imagesPerPanel; i++) {
      // 检查取消信号
      if (options.signal?.aborted) {
        break
      }

      // 调用 AI 执行器生成图片提示词优化 (可选)
      let optimizedPrompt = prompt
      if (this.aiExecutor) {
        try {
          const optimizationResult = await this.aiExecutor({
            userId: context.userId,
            model: context.extensions.imagePromptModel as string || 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are an expert at optimizing prompts for AI image generation. Enhance the following prompt for better visual results.',
              },
              { role: 'user', content: prompt },
            ],
            reasoning: false,
            projectId: context.projectId,
            action: 'optimize_image_prompt',
            meta: { panelNumber: panel.panelNumber },
          })
          optimizedPrompt = optimizationResult.text
        } catch (error) {
          console.warn('[ImageStage] Failed to optimize prompt, using original:', error)
        }
      }

      // 生成图片记录 (实际应调用 API 并等待结果)
      const image: GeneratedImage = {
        id: `img_${context.projectId}_${panel.panelNumber}_${i + 1}`,
        url: '',  // 实际 API 返回的图片 URL
        prompt: optimizedPrompt,
        modelName: config.model,
        params: {
          width: config.width,
          height: config.height,
          steps: 30,
          guidance_scale: 7.5,
          seed: Math.floor(Math.random() * 1000000),
        },
      }

      // TODO: 调用实际 API 后填充 url
      // const apiResult = await imageGenerationApi.generate(optimizedPrompt, config)
      // image.url = apiResult.imageUrl

      images.push(image)
    }

    return images
  }

  /**
   * 转换输出数据 (将图片关联到分镜)
   */
  protected async transform(
    output: ImageGenerationOutput,
    context: PipelineContext
  ): Promise<ImageGenerationOutput> {
    // 记录生成的图片到上下文
    context.extensions.generatedImages = output.images.map(img => ({
      id: img.id,
      url: img.url,
      prompt: img.prompt,
    }))

    return output
  }
}
