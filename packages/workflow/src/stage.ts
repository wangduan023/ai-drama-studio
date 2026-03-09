/**
 * StageProcessor 抽象基类
 * 采用模板方法模式，定义阶段执行的标准流程
 */

import type {
  StageType,
  StageStatus,
  StageResult,
  StageConfig,
  StageExecuteOptions,
  PipelineContext,
  AiExecutor,
} from './types'
import { PipelineError } from './types'

/**
 * 阶段处理器抽象基类
 *
 * 使用模板方法模式定义执行流程:
 * 1. validate() - 验证前置条件
 * 2. doProcess() - 执行核心逻辑 (抽象方法)
 * 3. transform() - 转换输出数据
 *
 * 失败处理:
 * - onFailure() - 处理失败场景 (抽象方法)
 * - 自动重试逻辑
 */
export abstract class StageProcessor<TInput, TOutput> {
  /** 阶段类型 (由子类定义) */
  abstract readonly stageType: StageType

  /** 阶段配置 */
  readonly config: StageConfig = {
    maxRetries: 3,
    timeoutMs: 300_000,  // 5 分钟
    skippable: false,
    failPipeline: true,
  }

  /** AI 执行器 (由外部注入) */
  protected aiExecutor: AiExecutor | null = null

  /**
   * 设置 AI 执行器
   */
  setAiExecutor(executor: AiExecutor): void {
    this.aiExecutor = executor
  }

  /**
   * 验证阶段前置条件
   * @param context Pipeline 上下文
   * @returns 验证是否通过
   * @throws PipelineError 验证失败时抛出
   */
  abstract validate(context: PipelineContext): Promise<void>

  /**
   * 执行阶段核心逻辑 (由子类实现)
   * @param context Pipeline 上下文
   * @param input 阶段输入数据
   * @param options 执行选项
   * @returns 阶段输出数据
   */
  abstract doProcess(
    context: PipelineContext,
    input: TInput,
    options: StageExecuteOptions
  ): Promise<TOutput>

  /**
   * 处理失败场景 (由子类实现)
   * @param context Pipeline 上下文
   * @param error 错误信息
   * @param attempt 当前重试次数
   */
  abstract onFailure(
    context: PipelineContext,
    error: PipelineError,
    attempt: number
  ): Promise<void>

  /**
   * 执行阶段 (模板方法)
   *
   * 标准流程:
   * 1. 设置状态为 running
   * 2. 创建超时控制
   * 3. 调用 validate() 验证前置条件
   * 4. 调用 doProcess() 执行核心逻辑
   * 5. 调用 transform() 转换输出
   * 6. 返回 StageResult
   *
   * @param context Pipeline 上下文
   * @param input 阶段输入数据
   * @param options 执行选项
   * @returns 阶段执行结果
   */
  async execute(
    context: PipelineContext,
    input: TInput,
    options?: StageExecuteOptions
  ): Promise<StageResult<TOutput>> {
    const startTime = Date.now()
    const maxRetries = this.config.maxRetries
    let lastError: PipelineError | null = null

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        // 检查取消信号
        if (options?.signal?.aborted) {
          return this.createResult(
            'cancelled',
            null,
            'Pipeline cancelled',
            attempt - 1,
            Date.now() - startTime
          )
        }

        // 验证前置条件
        await this.validate(context)

        // 执行核心逻辑
        const rawData = await this.executeWithTimeout(
          () => this.doProcess(context, input, { ...options, attempt }),
          this.config.timeoutMs
        )

        // 转换输出数据
        const data = await this.transform(rawData, context)

        return this.createResult(
          'completed',
          data,
          null,
          attempt - 1,
          Date.now() - startTime
        )
      } catch (error) {
        const pipelineError = this.normalizeError(error, attempt)
        lastError = pipelineError

        // 调用失败处理
        await this.onFailure(context, pipelineError, attempt)

        // 判断是否可重试
        const canRetry = attempt <= maxRetries && pipelineError.retryable
        if (!canRetry) {
          // 不可重试或已达最大重试次数
          return this.createResult(
            'failed',
            null,
            pipelineError.message,
            attempt - 1,
            Date.now() - startTime,
            pipelineError
          )
        }

        // 指数退避
        const delayMs = this.computeRetryDelay(attempt)
        await this.sleep(delayMs)
      }
    }

    // 理论上不会执行到这里
    return this.createResult(
      'failed',
      null,
      lastError?.message || 'Unknown error',
      maxRetries,
      Date.now() - startTime,
      lastError || undefined
    )
  }

  /**
   * 转换输出数据 (子类可重写)
   * @param data 原始输出数据
   * @param context Pipeline 上下文
   * @returns 转换后的数据
   */
  protected async transform(data: TOutput, context: PipelineContext): Promise<TOutput> {
    // 默认直接返回，子类可按需实现转换逻辑
    return data
  }

  /**
   * 执行带超时的任务
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new PipelineError(
          `Stage execution timeout after ${timeoutMs}ms`,
          'STAGE_TIMEOUT',
          this.stageType,
          null,
          false  // 超时不重试
        ))
      }, timeoutMs)
    })

    return Promise.race([fn(), timeoutPromise])
  }

  /**
   * 标准化错误
   */
  private normalizeError(error: unknown, attempt: number): PipelineError {
    if (error instanceof PipelineError) {
      return error
    }
    const message = error instanceof Error ? error.message : String(error)
    return new PipelineError(
      message,
      error instanceof Error ? error.name : 'UNKNOWN_ERROR',
      this.stageType,
      error,
      true  // 默认都可重试
    )
  }

  /**
   * 计算重试延迟 (指数退避 + jitter)
   */
  private computeRetryDelay(attempt: number): number {
    const baseDelay = 1000 * Math.pow(2, attempt - 1)  // 1s, 2s, 4s, ...
    const maxDelay = 10_000  // 最大 10 秒
    const jitter = Math.floor(Math.random() * 300)  // 0-300ms 随机抖动
    return Math.min(baseDelay, maxDelay) + jitter
  }

  /**
   * 睡眠辅助函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 创建 StageResult
   */
  private createResult(
    status: StageStatus,
    data: TOutput | null,
    error: string | null,
    retryCount: number,
    durationMs: number,
    pipelineError?: PipelineError
  ): StageResult<TOutput> {
    const result: StageResult<TOutput> = {
      stageType: this.stageType,
      status,
      data: status === 'completed' ? data : null,
      error,
      errorDetails: pipelineError ? {
        code: pipelineError.code,
        retryable: pipelineError.retryable,
        cause: pipelineError.cause instanceof Error ? pipelineError.cause.message : undefined,
      } : null,
      retryCount,
      durationMs,
    }

    return result
  }

  /**
   * 获取阶段配置 (子类可重写)
   */
  getConfig(): StageConfig {
    return { ...this.config }
  }

  /**
   * 更新阶段配置
   */
  updateConfig(overrides: Partial<StageConfig>): void {
    Object.assign(this.config, overrides)
  }
}
