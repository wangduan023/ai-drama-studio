/**
 * 文案改写阶段处理器
 *
 * 职责:
 * - 将小说/剧本原文改写为适合视频生成的格式
 * - 提取关键情节和场景信息
 * - 为后续分镜生成做准备
 */

import { StageProcessor } from '../stage'
import type {
  StageExecuteOptions,
  PipelineContext,
  StageConfig,
} from '../types'
import { PipelineError } from '../types'
import { getPromptTemplate, PROMPT_IDS, type Locale } from '@ai-drama-studio/prompt-system'

/**
 * 文案改写输入
 */
export interface RewriteInput {
  /** 原文内容 */
  content: string
  /** 基础角色列表 */
  baseCharacters?: string[] | null
  /** 基础场景列表 */
  baseLocations?: string[] | null
  /** 角色介绍 */
  characterIntroductions?: Array<{ name: string; introduction?: string | null }> | null
}

/**
 * 文案改写输出
 */
export interface RewriteOutput {
  /** 改写后的内容 */
  content: string
  /** 分析出的角色列表 */
  analyzedCharacters: Array<{
    name: string
    gender?: string | null
    ageRange?: string | null
    personality?: string | null
    introduction?: string | null
  }>
  /** 分析出的场景列表 */
  analyzedLocations: Array<{
    name: string
    description?: string | null
    locationType?: string | null
  }>
  /** 改写说明 */
  summary?: string | null
}

/**
 * 文案改写阶段处理器
 */
export class RewriteStage extends StageProcessor<RewriteInput, RewriteOutput> {
  readonly stageType = 'rewrite'

  override config: StageConfig = {
    maxRetries: 3,
    timeoutMs: 180_000,
    skippable: false,
    failPipeline: true,
  }

  /**
   * 验证前置条件
   */
  async validate(context: PipelineContext): Promise<void> {
    if (!context.input.content || context.input.content.trim().length === 0) {
      throw new PipelineError(
        'Input content is empty',
        'REWRITE_EMPTY_INPUT',
        this.stageType,
        null,
        false
      )
    }

    if (!this.aiExecutor) {
      throw new PipelineError(
        'AI executor not configured',
        'REWRITE_NO_AI_EXECUTOR',
        this.stageType,
        null,
        false
      )
    }
  }

  /**
   * 执行文案改写核心逻辑
   */
  async doProcess(
    context: PipelineContext,
    input: RewriteInput,
    options: StageExecuteOptions
  ): Promise<RewriteOutput> {
    if (!this.aiExecutor) {
      throw new PipelineError('AI executor not configured', 'NO_AI_EXECUTOR', this.stageType)
    }

    const prompt = await this.buildRewritePrompt(context, input)

    const result = await this.aiExecutor({
      userId: context.userId,
      model: this.getModelName(context),
      messages: [
        { role: 'system', content: '你是一个专业的剧本改编专家，擅长将小说/剧本改写为适合视频生成的格式。' },
        { role: 'user', content: prompt },
      ],
      reasoning: true,
      projectId: context.projectId,
      action: 'rewrite_content',
      meta: {
        stageType: this.stageType,
        attempt: options.attempt,
        taskId: context.taskId,
      },
    })

    return this.parseRewriteResponse(result.text, context)
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
      `[RewriteStage] Attempt ${attempt} failed for project ${context.projectId}:`,
      error.message
    )

    // 记录失败日志到上下文
    context.extensions.rewriteError = {
      attempt,
      errorCode: error.code,
      message: error.message,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * 构建改写提示词
   */
  private async buildRewritePrompt(
    context: PipelineContext,
    input: RewriteInput
  ): Promise<string> {
    const locale = context.locale
    const characterIntro = this.buildCharacterIntroduction(input.characterIntroductions)

    // 使用提示词系统 (如果可用)
    let template: string
    try {
      template = getPromptTemplate(PROMPT_IDS.NP_AGENT_CLIP, locale)
    } catch {
      // 回退到默认模板
      template = this.getDefaultRewriteTemplate(locale)
    }

    return template
      .replace('{input}', input.content)
      .replace('{characters_lib_name}', input.baseCharacters?.join('、') || '无')
      .replace('{locations_lib_name}', input.baseLocations?.join('、') || '无')
      .replace('{characters_introduction}', characterIntro)
  }

  /**
   * 构建角色介绍
   */
  private buildCharacterIntroduction(
    introductions?: Array<{ name: string; introduction?: string | null }> | null
  ): string {
    if (!introductions || introductions.length === 0) {
      return '暂无角色介绍'
    }

    return introductions
      .map((item, index) => `${index + 1}. 【${item.name}】${item.introduction || '无描述'}`)
      .join('\n')
  }

  /**
   * 解析 AI 响应
   */
  private parseRewriteResponse(responseText: string, context: PipelineContext): RewriteOutput {
    // 尝试解析 JSON 响应
    let parsed: unknown
    try {
      const jsonText = this.extractJsonFromResponse(responseText)
      parsed = JSON.parse(jsonText)
    } catch {
      // 解析失败时，返回原始文本作为改写内容
      return {
        content: responseText.trim(),
        analyzedCharacters: [],
        analyzedLocations: [],
        summary: null,
      }
    }

    const result = parsed as Record<string, unknown>

    return {
      content: this.extractString(result.content) || responseText.trim(),
      analyzedCharacters: this.extractCharacterArray(result.characters || result.analyzedCharacters),
      analyzedLocations: this.extractLocationArray(result.locations || result.analyzedLocations),
      summary: this.extractString(result.summary),
    }
  }

  /**
   * 从响应中提取 JSON
   */
  private extractJsonFromResponse(text: string): string {
    let cleaned = text.trim()

    // 移除 markdown 代码块标记
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '')

    // 提取第一个 JSON 对象/数组
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return cleaned.slice(firstBrace, lastBrace + 1)
    }

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
   * 提取角色数组
   */
  private extractCharacterArray(value: unknown): RewriteOutput['analyzedCharacters'] {
    if (!Array.isArray(value)) return []

    return value
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map(item => ({
        name: this.extractString(item.name) || '',
        gender: this.extractString(item.gender),
        ageRange: this.extractString(item.ageRange),
        personality: this.extractString(item.personality),
        introduction: this.extractString(item.introduction),
      }))
      .filter(item => item.name !== '')
  }

  /**
   * 提取场景数组
   */
  private extractLocationArray(value: unknown): RewriteOutput['analyzedLocations'] {
    if (!Array.isArray(value)) return []

    return value
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map(item => ({
        name: this.extractString(item.name) || '',
        description: this.extractString(item.description),
        locationType: this.extractString(item.locationType),
      }))
      .filter(item => item.name !== '')
  }

  /**
   * 获取模型名称
   */
  private getModelName(context: PipelineContext): string {
    // 从扩展配置中获取，或使用默认模型
    return (context.extensions.rewriteModel as string) || 'gpt-4o'
  }

  /**
   * 默认改写模板
   */
  private getDefaultRewriteTemplate(locale: Locale): string {
    if (locale === 'en') {
      return `You are a professional script adaptation expert. Please rewrite the following novel/script content into a format suitable for video generation.

Requirements:
1. Keep key plot points and scene information
2. Highlight character actions and dialogue
3. Describe scene atmosphere and visual elements
4. Output in JSON format

Characters Library: {characters_lib_name}
Locations Library: {locations_lib_name}
Character Introduction:
{characters_introduction}

Content to rewrite:
{input}

Please output in JSON format:
{
  "content": "rewritten content",
  "characters": [{"name": "...", "gender": "...", "ageRange": "...", "personality": "...", "introduction": "..."}],
  "locations": [{"name": "...", "description": "...", "locationType": "..."}],
  "summary": "brief summary"
}`
    }

    // 中文默认模板
    return `你是一个专业的剧本改编专家，请将以下小说/剧本内容改写为适合视频生成的格式。

要求:
1. 保留关键情节和场景信息
2. 突出角色动作和对话
3. 描述场景氛围和视觉元素
4. 以 JSON 格式输出

角色库：{characters_lib_name}
场景库：{locations_lib_name}
角色介绍:
{characters_introduction}

待改写内容:
{input}

请以 JSON 格式输出:
{
  "content": "改写后的内容",
  "characters": [{"name": "角色名", "gender": "性别", "ageRange": "年龄段", "personality": "性格特点", "introduction": "角色介绍"}],
  "locations": [{"name": "场景名", "description": "场景描述", "locationType": "场景类型"}],
  "summary": "改写说明"
}`
  }
}
