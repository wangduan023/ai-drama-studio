/**
 * Pipeline 编排器
 * 负责按顺序执行各个 StageProcessor，管理阶段链和错误处理
 */

import type {
  StageType,
  StageStatus,
  StageResult,
  PipelineContext,
  PipelineResult,
  PipelineExecuteOptions,
  AiExecutor,
  StoryboardPanel,
  GeneratedImage,
  GeneratedVideo,
} from './types'
import { PipelineError } from './types'
import { StageProcessor } from './stage'

/**
 * Pipeline 阶段注册项
 */
interface StageRegistration {
  /** 阶段类型 */
  stageType: StageType
  /** 阶段处理器实例 */
  processor: StageProcessor<unknown, unknown>
  /** 前置阶段类型列表 */
  prerequisites: StageType[]
  /** 是否可选 */
  optional: boolean
}

/**
 * Pipeline 执行状态
 */
interface PipelineState {
  /** 当前状态 */
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled' | 'partial'
  /** 当前阶段 */
  currentStage: StageType | null
  /** 已完成阶段 */
  completedStages: Set<StageType>
  /** 已失败阶段 */
  failedStages: Set<StageType>
  /** 已跳过阶段 */
  skippedStages: Set<StageType>
}

/**
 * Pipeline 编排器
 *
 * 支持:
 * - 链式添加阶段
 * - 并行/串行执行
 * - 阶段依赖管理
 * - 错误处理和降级
 * - 超时控制
 * - 取消执行
 */
export class ProjectPipeline {
  /** 注册的阶段 */
  private readonly stages: Map<StageType, StageRegistration> = new Map()

  /** 阶段执行顺序 */
  private readonly executionOrder: StageType[] = []

  /** AI 执行器 */
  private aiExecutor: AiExecutor | null = null

  /** 执行状态 */
  private state: PipelineState = {
    status: 'idle',
    currentStage: null,
    completedStages: new Set(),
    failedStages: new Set(),
    skippedStages: new Set(),
  }

  /**
   * 设置 AI 执行器 (会传递给所有阶段)
   */
  setAiExecutor(executor: AiExecutor): this {
    this.aiExecutor = executor
    // 传递给所有已注册的阶段
    for (const registration of this.stages.values()) {
      registration.processor.setAiExecutor(executor)
    }
    return this
  }

  /**
   * 添加阶段到 Pipeline
   *
   * @param processor 阶段处理器
   * @param prerequisites 前置阶段 (可选)
   * @param optional 是否可选阶段 (失败不影响后续)
   * @returns this (支持链式调用)
   */
  addStage<TInput, TOutput>(
    processor: StageProcessor<TInput, TOutput>,
    prerequisites: StageType[] = [],
    optional: boolean = false
  ): this {
    const stageType = processor.stageType

    if (this.stages.has(stageType)) {
      throw new Error(`Stage "${stageType}" is already registered`)
    }

    // 验证前置阶段是否存在
    for (const prereq of prerequisites) {
      if (!this.stages.has(prereq) && !this.executionOrder.includes(prereq)) {
        // 前置阶段还未注册，记录警告
        console.warn(`[Pipeline] Prerequisite stage "${prereq}" for "${stageType}" is not yet registered`)
      }
    }

    const registration: StageRegistration = {
      stageType,
      processor: processor as StageProcessor<unknown, unknown>,
      prerequisites,
      optional,
    }

    this.stages.set(stageType, registration)
    this.executionOrder.push(stageType)

    // 如果已设置 AI 执行器，传递给新阶段
    if (this.aiExecutor) {
      processor.setAiExecutor(this.aiExecutor)
    }

    return this
  }

  /**
   * 执行 Pipeline
   *
   * @param context Pipeline 上下文
   * @param options 执行选项
   * @returns Pipeline 执行结果
   */
  async execute(
    context: PipelineContext,
    options?: PipelineExecuteOptions
  ): Promise<PipelineResult> {
    const startTime = Date.now()
    this.state = {
      status: 'running',
      currentStage: null,
      completedStages: new Set(),
      failedStages: new Set(),
      skippedStages: new Set(),
    }

    const stageResults: Partial<Record<StageType, StageResult>> = {}
    let hasCriticalFailure = false

    try {
      // 按顺序执行各阶段
      for (const stageType of this.executionOrder) {
        if (hasCriticalFailure) {
          // 有关键失败，跳过后续阶段
          this.state.skippedStages.add(stageType)
          stageResults[stageType] = this.createSkippedResult(stageType)
          continue
        }

        // 检查取消信号
        if (options?.signal?.aborted) {
          this.state.status = 'cancelled'
          stageResults[stageType] = this.createCancelledResult(stageType)
          hasCriticalFailure = true
          continue
        }

        const registration = this.stages.get(stageType)
        if (!registration) {
          console.warn(`[Pipeline] Stage "${stageType}" not found, skipping`)
          continue
        }

        // 检查前置阶段是否完成
        const prerequisitesMet = registration.prerequisites.every(prereq =>
          this.state.completedStages.has(prereq)
        )

        if (!prerequisitesMet) {
          // 前置条件未满足
          this.state.skippedStages.add(stageType)
          stageResults[stageType] = this.createSkippedResult(stageType, 'Prerequisites not met')
          hasCriticalFailure = !registration.optional
          continue
        }

        // 执行阶段
        this.state.currentStage = stageType
        const result = await this.executeStage(stageType, registration.processor, context, options)
        stageResults[stageType] = result

        // 处理执行结果
        if (result.status === 'completed') {
          this.state.completedStages.add(stageType)
          await options?.onStageComplete?.(stageType, result)
        } else if (result.status === 'failed') {
          this.state.failedStages.add(stageType)
          if (!registration.optional) {
            hasCriticalFailure = true
          }
          await options?.onStageComplete?.(stageType, result)
        }
      }

      // 确定最终状态
      if (this.state.failedStages.size === 0) {
        this.state.status = 'completed'
      } else if (this.state.completedStages.size > 0) {
        this.state.status = 'partial'
      } else {
        this.state.status = 'failed'
      }
    } catch (error) {
      this.state.status = 'failed'
      console.error('[Pipeline] Unexpected error:', error)
    } finally {
      this.state.currentStage = null
    }

    // 构建输出数据
    const output = this.buildOutput(stageResults)

    return {
      status: this.state.status,
      stageResults: stageResults as Record<StageType, StageResult | undefined>,
      output,
      durationMs: Date.now() - startTime,
      error: this.state.failedStages.size > 0 ? 'One or more stages failed' : null,
    }
  }

  /**
   * 执行单个阶段
   */
  private async executeStage(
    stageType: StageType,
    processor: StageProcessor<unknown, unknown>,
    context: PipelineContext,
    options?: PipelineExecuteOptions
  ): Promise<StageResult> {
    // 获取阶段输入数据
    const input = this.getStageInput(stageType, context)

    // 执行阶段
    const result = await processor.execute(context, input, {
      attempt: 1,
      signal: options?.signal ?? null,
      onProgress: (progress, message) => {
        options?.onProgress?.(stageType, progress, message)
      },
    })

    // 存储阶段输出到上下文
    if (result.status === 'completed' && result.data) {
      context.stageData[stageType] = result.data
    }

    return result
  }

  /**
   * 获取阶段输入数据
   */
  private getStageInput(stageType: StageType, context: PipelineContext): unknown {
    // 默认返回整个上下文
    // 子类或具体实现可按需重写，提取特定字段
    return context
  }

  /**
   * 构建输出数据
   */
  private buildOutput(stageResults: Partial<Record<StageType, StageResult>>): PipelineResult['output'] {
    const output: PipelineResult['output'] = {
      rewrittenContent: null,
      storyboards: null,
      images: null,
      videos: null,
    }

    // 从各阶段结果提取输出
    const rewriteResult = stageResults.rewrite?.data as { content?: string } | undefined
    if (rewriteResult?.content) {
      output.rewrittenContent = rewriteResult.content
    }

    const storyboardResult = stageResults.storyboard?.data as { panels?: StoryboardPanel[] } | undefined
    if (storyboardResult?.panels) {
      output.storyboards = storyboardResult.panels
    }

    const imageResult = stageResults.image?.data as { images?: GeneratedImage[] } | undefined
    if (imageResult?.images) {
      output.images = imageResult.images
    }

    const videoResult = stageResults.video?.data as { videos?: GeneratedVideo[] } | undefined
    if (videoResult?.videos) {
      output.videos = videoResult.videos
    }

    return output
  }

  /**
   * 创建跳过结果
   */
  private createSkippedResult(stageType: StageType, reason?: string): StageResult {
    return {
      stageType,
      status: 'skipped',
      data: null,
      error: reason || null,
      errorDetails: null,
      retryCount: 0,
      durationMs: 0,
      aiLogs: null,
    }
  }

  /**
   * 创建取消结果
   */
  private createCancelledResult(stageType: StageType): StageResult {
    return {
      stageType,
      status: 'cancelled',
      data: null,
      error: 'Pipeline cancelled',
      errorDetails: null,
      retryCount: 0,
      durationMs: 0,
      aiLogs: null,
    }
  }

  /**
   * 获取当前执行状态
   */
  getState(): PipelineState {
    return { ...this.state }
  }

  /**
   * 获取已注册的阶段列表
   */
  getRegisteredStages(): StageType[] {
    return [...this.executionOrder]
  }

  /**
   * 重置 Pipeline 状态
   */
  reset(): void {
    this.state = {
      status: 'idle',
      currentStage: null,
      completedStages: new Set(),
      failedStages: new Set(),
      skippedStages: new Set(),
    }
  }

  /**
   * 清除所有注册阶段
   */
  clear(): void {
    this.stages.clear()
    this.executionOrder.length = 0
    this.reset()
  }
}

/**
 * Pipeline 错误辅助函数
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof PipelineError) {
    return error.retryable
  }
  // 网络错误、超时等通常可重试
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('rate limit') ||
      message.includes('temporarily')
    )
  }
  return true
}

/**
 * 创建阶段超时错误
 */
export function createTimeoutError(stageType: StageType, timeoutMs: number): PipelineError {
  return new PipelineError(
    `Stage "${stageType}" timed out after ${timeoutMs}ms`,
    'STAGE_TIMEOUT',
    stageType,
    null,
    false
  )
}
