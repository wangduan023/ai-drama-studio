/**
 * 分镜生成阶段处理器
 *
 * 职责:
 * - 根据改写后的文案生成分镜脚本
 * - 规划每个镜头的画面描述、运镜方式
 * - 生成摄影方案和演技指导
 */

import { StageProcessor } from '../stage'
import type {
  StageExecuteOptions,
  PipelineContext,
  StoryboardPanel,
  PhotographyPlan,
  StageConfig,
} from '../types'
import { PipelineError } from '../types'
import { getPromptTemplate, PROMPT_IDS, type Locale } from '@ai-drama-studio/prompt-system'

/**
 * 分镜生成输入
 */
export interface StoryboardInput {
  /** 改写后的内容 */
  content: string
  /** 角色外观映射 */
  characterAppearanceMap: Record<string, {
    name: string
    description?: string | null
    appearances?: Array<{
      changeReason?: string | null
      descriptions?: string[] | null
      selectedIndex?: number | null
    }>
  }>
  /** 场景列表 */
  locations: Array<{
    name: string
    description?: string | null
    images?: Array<{ description?: string | null; isSelected?: boolean }>
  }>
}

/**
 * 分镜生成输出
 */
export interface StoryboardOutput {
  /** 分镜面板列表 */
  panels: StoryboardPanel[]
  /** 生成说明 */
  summary?: string | null
}

/**
 * 分镜生成阶段处理器
 *
 * 参考 waoowaoo 项目的多阶段分镜生成架构:
 * Phase 1: 基础分镜规划
 * Phase 2: 摄影规则生成
 * Phase 2-Acting: 演技指导生成
 * Phase 3: 补充细节和 video_prompt
 */
export class StoryboardStage extends StageProcessor<StoryboardInput, StoryboardOutput> {
  readonly stageType = 'storyboard'

  override config: StageConfig = {
    maxRetries: 2,
    timeoutMs: 300_000,
    skippable: false,
    failPipeline: true,
  }

  /**
   * 验证前置条件
   */
  async validate(context: PipelineContext): Promise<void> {
    const rewriteData = context.stageData.rewrite as { content?: string } | undefined

    if (!rewriteData?.content || rewriteData.content.trim().length === 0) {
      throw new PipelineError(
        'No content available for storyboard generation. Run rewrite stage first.',
        'STORYBOARD_NO_INPUT',
        this.stageType,
        null,
        false
      )
    }

    if (!this.aiExecutor) {
      throw new PipelineError(
        'AI executor not configured',
        'STORYBOARD_NO_AI_EXECUTOR',
        this.stageType,
        null,
        false
      )
    }
  }

  /**
   * 执行分镜生成核心逻辑
   */
  async doProcess(
    context: PipelineContext,
    input: StoryboardInput,
    options: StageExecuteOptions
  ): Promise<StoryboardOutput> {
    if (!this.aiExecutor) {
      throw new PipelineError('AI executor not configured', 'NO_AI_EXECUTOR', this.stageType)
    }

    const rewriteData = context.stageData.rewrite as {
      content?: string
      analyzedCharacters?: unknown[]
      analyzedLocations?: unknown[]
    } | undefined

    // 构建角色介绍
    const characterIntro = this.buildCharacterIntroduction(
      input.characterAppearanceMap,
      context
    )

    // 构建场景描述
    const locationsDescription = this.buildLocationsDescription(input.locations)

    // 构建提示词
    const prompt = await this.buildStoryboardPrompt(
      context,
      rewriteData?.content || input.content,
      characterIntro,
      locationsDescription
    )

    // 调用 AI 生成分镜
    const result = await this.aiExecutor({
      userId: context.userId,
      model: this.getModelName(context),
      messages: [
        {
          role: 'system',
          content: '你是一个专业的分镜师，擅长将剧本转换为详细的分镜脚本，包含画面描述、运镜方式、摄影方案等。',
        },
        { role: 'user', content: prompt },
      ],
      reasoning: true,
      projectId: context.projectId,
      action: 'generate_storyboard',
      meta: {
        stageType: this.stageType,
        attempt: options.attempt,
        taskId: context.taskId,
      },
    })

    // 解析响应
    const panels = this.parseStoryboardResponse(result.text, context)

    return {
      panels,
      summary: `生成了 ${panels.length} 个分镜镜头`,
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
      `[StoryboardStage] Attempt ${attempt} failed for project ${context.projectId}:`,
      error.message
    )

    // 记录失败日志
    context.extensions.storyboardError = {
      attempt,
      errorCode: error.code,
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * 构建角色介绍
   */
  private buildCharacterIntroduction(
    appearanceMap: Record<string, StoryboardInput['characterAppearanceMap'][string]>,
    context: PipelineContext
  ): string {
    const entries = Object.entries(appearanceMap)
    if (entries.length === 0) {
      // 从上下文获取角色档案
      if (context.characters?.profiles?.length > 0) {
        return context.characters.profiles
          .map((c, i) => `${i + 1}. 【${c.name}】${c.introduction || '无描述'}`)
          .join('\n')
      }
      return '无角色信息'
    }

    return entries
      .map(([charId, charData], index) => {
        const appearances = charData.appearances || []
        const selectedAppearance = appearances.find(app => app.selectedIndex === 0) || appearances[0]
        const descriptions = selectedAppearance?.descriptions || []
        const description = descriptions.length > 0
          ? descriptions.join('; ')
          : (charData.description || '无外观描述')

        return `${index + 1}. 【${charData.name}】${description}`
      })
      .join('\n')
  }

  /**
   * 构建场景描述
   */
  private buildLocationsDescription(
    locations: StoryboardInput['locations']
  ): string {
    if (locations.length === 0) {
      return '无场景信息'
    }

    return locations
      .map((loc, index) => {
        const selectedImage = loc.images?.find(img => img.isSelected) || loc.images?.[0]
        const description = selectedImage?.description || loc.description || '无描述'
        return `${index + 1}. 【${loc.name}】${description}`
      })
      .join('\n')
  }

  /**
   * 构建分镜生成提示词
   */
  private async buildStoryboardPrompt(
    context: PipelineContext,
    content: string,
    characterIntro: string,
    locationsDescription: string
  ): Promise<string> {
    const locale = context.locale

    // 尝试使用提示词系统
    let template: string
    try {
      // 使用分镜规划模板
      template = getPromptTemplate(PROMPT_IDS.NP_AGENT_STORYBOARD_PLAN, locale)
    } catch {
      // 回退到默认模板
      template = this.getDefaultStoryboardTemplate(locale)
    }

    // 构建内容 JSON
    const contentJson = JSON.stringify({
      content: content,
      summary: '待分镜',
    }, null, 2)

    return template
      .replace('{characters_introduction}', characterIntro)
      .replace('{locations_description}', locationsDescription)
      .replace('{clip_content}', content)
      .replace('{clip_json}', contentJson)
      .replace('{characters_lib_name}', '角色库')
      .replace('{locations_lib_name}', '场景库')
      .replace('{characters_appearance_list}', characterIntro)
      .replace('{characters_full_description}', characterIntro)
  }

  /**
   * 解析分镜响应
   */
  private parseStoryboardResponse(
    responseText: string,
    context: PipelineContext
  ): StoryboardPanel[] {
    // 提取 JSON
    const jsonText = this.extractJsonArrayFromResponse(responseText)

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      console.warn('[StoryboardStage] Failed to parse JSON response, using fallback')
      return this.createFallbackPanels(responseText, context)
    }

    if (!Array.isArray(parsed)) {
      console.warn('[StoryboardStage] Response is not an array, using fallback')
      return this.createFallbackPanels(responseText, context)
    }

    return parsed
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((panel, index) => this.normalizeStoryboardPanel(panel, index + 1))
      .filter(panel => panel.description !== '无' && panel.location !== '无')
  }

  /**
   * 标准化分镜面板
   */
  private normalizeStoryboardPanel(
    raw: Record<string, unknown>,
    defaultPanelNumber: number
  ): StoryboardPanel {
    return {
      panelNumber: this.extractNumber(raw.panel_number) ?? defaultPanelNumber,
      description: this.extractString(raw.description) || '无',
      location: this.extractString(raw.location) || '无',
      sourceText: this.extractString(raw.source_text),
      characters: this.extractStringArray(raw.characters),
      shotType: this.extractString(raw.shot_type),
      cameraMove: this.extractString(raw.camera_move),
      photographyPlan: this.extractPhotographyPlan(raw.photographyPlan || raw.photography_plan),
      actingNotes: raw.actingNotes || raw.acting_notes || null,
      imagePrompt: this.extractString(raw.image_prompt),
      videoPrompt: this.extractString(raw.video_prompt),
      duration: this.extractNumber(raw.duration),
    }
  }

  /**
   * 提取摄影方案
   */
  private extractPhotographyPlan(value: unknown): PhotographyPlan | null {
    if (typeof value !== 'object' || value === null) {
      return null
    }

    const obj = value as Record<string, unknown>
    return {
      composition: this.extractString(obj.composition),
      lighting: this.extractString(obj.lighting),
      colorPalette: this.extractString(obj.color_palette) || this.extractString(obj.colorPalette),
      atmosphere: this.extractString(obj.atmosphere),
      technicalNotes: this.extractString(obj.technical_notes) || this.extractString(obj.technicalNotes),
    }
  }

  /**
   * 创建回退分镜
   */
  private createFallbackPanels(responseText: string, context: PipelineContext): StoryboardPanel[] {
    // 将响应文本按段落分割为简单的分镜
    const paragraphs = responseText
      .split(/\n\n+/)
      .filter(p => p.trim().length > 20)
      .slice(0, 10)  // 最多 10 个分镜

    return paragraphs.map((paragraph, index) => ({
      panelNumber: index + 1,
      description: paragraph.trim().substring(0, 500),
      location: '默认场景',
      sourceText: null,
      characters: null,
      shotType: 'medium_shot',
      cameraMove: 'static',
      photographyPlan: null,
      actingNotes: null,
      imagePrompt: paragraph.trim(),
      videoPrompt: null,
      duration: 5,
    }))
  }

  /**
   * 从响应中提取 JSON 数组
   */
  private extractJsonArrayFromResponse(text: string): string {
    let cleaned = text.trim()

    // 移除 markdown 代码块标记
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '')

    // 提取第一个数组
    const firstBracket = cleaned.indexOf('[')
    const lastBracket = cleaned.lastIndexOf(']')
    if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
      return cleaned.slice(firstBracket, lastBracket + 1)
    }

    return cleaned
  }

  /**
   * 提取字符串字段
   */
  private extractString(value: unknown): string | null {
    if (typeof value === 'string') return value.trim()
    return null
  }

  /**
   * 提取数字字段
   */
  private extractNumber(value: unknown): number | null {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10)
      return isNaN(parsed) ? null : parsed
    }
    return null
  }

  /**
   * 提取字符串数组
   */
  private extractStringArray(value: unknown): string[] | null {
    if (typeof value === 'string') {
      // 尝试解析 JSON 数组
      try {
        const parsed = JSON.parse(value)
        if (Array.isArray(parsed)) {
          return parsed.filter((item): item is string => typeof item === 'string')
        }
      } catch {
        // 按逗号分割
        return value.split(',').map(s => s.trim()).filter(Boolean)
      }
    }
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === 'string')
    }
    return null
  }

  /**
   * 获取模型名称
   */
  private getModelName(context: PipelineContext): string {
    return (context.extensions.storyboardModel as string) || 'gpt-4o'
  }

  /**
   * 默认分镜模板
   */
  private getDefaultStoryboardTemplate(locale: Locale): string {
    if (locale === 'en') {
      return `You are a professional storyboard artist. Please convert the following script/content into detailed storyboard panels.

Characters:
{characters_introduction}

Locations:
{locations_description}

Content:
{clip_content}

Please output an array of storyboard panels in JSON format:
[
  {
    "panel_number": 1,
    "description": "visual description of the shot",
    "location": "location name",
    "source_text": "original text reference",
    "characters": ["character names"],
    "shot_type": "close_up|medium_shot|long_shot|extreme_long_shot",
    "camera_move": "static|pan|tilt|zoom|dolly|track",
    "duration": 5
  }
]`
    }

    // 中文默认模板
    return `你是一个专业的分镜师，请将以下内容转换为详细的分镜镜头。

角色信息:
{characters_introduction}

场景信息:
{locations_description}

内容:
{clip_content}

请输出分镜数组，JSON 格式:
[
  {
    "panel_number": 1,
    "description": "画面描述",
    "location": "场景名称",
    "source_text": "原文参考",
    "characters": ["角色名"],
    "shot_type": "close_up|medium_shot|long_shot|extreme_long_shot",
    "camera_move": "static|pan|tilt|zoom|dolly|track",
    "duration": 5
  }
]`
  }
}
