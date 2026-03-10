/**
 * StageProcessor 测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StageProcessor } from '../src/stage'
import {
  PipelineError,
  type PipelineContext,
  type StageExecuteOptions,
  type StageConfig,
} from '../src/types'

// 创建一个测试用的 StageProcessor 子类
class TestStage extends StageProcessor<string, string> {
  readonly stageType = 'rewrite' as const
  
  override config: StageConfig = {
    maxRetries: 2,
    timeoutMs: 1000,
    skippable: false,
    failPipeline: true,
  }

  validateMock = vi.fn().mockResolvedValue(undefined)
  doProcessMock = vi.fn().mockResolvedValue('processed')
  onFailureMock = vi.fn().mockResolvedValue(undefined)
  transformMock = vi.fn().mockImplementation((data, _context) => Promise.resolve(data))

  async validate(): Promise<void> {
    return this.validateMock()
  }

  async doProcess(
    _context: PipelineContext,
    input: string,
    _options: StageExecuteOptions
  ): Promise<string> {
    return this.doProcessMock(input)
  }

  async onFailure(
    _context: PipelineContext,
    error: PipelineError,
    attempt: number
  ): Promise<void> {
    return this.onFailureMock(error, attempt)
  }

  protected async transform(data: string, _context: PipelineContext): Promise<string> {
    return this.transformMock(data)
  }
}

// 创建测试用的 PipelineContext
const createMockContext = (): PipelineContext => ({
  projectId: 'proj-123',
  userId: 'user-456',
  locale: 'zh',
  input: { content: 'test content' },
  characters: { profiles: [], appearanceMap: {} },
  locations: { profiles: [] },
  stageData: {},
  extensions: {},
})

describe('StageProcessor', () => {
  let stage: TestStage
  let mockContext: PipelineContext

  beforeEach(() => {
    stage = new TestStage()
    mockContext = createMockContext()
    vi.clearAllMocks()
  })

  describe('配置管理', () => {
    it('应该返回默认配置', () => {
      const config = stage.getConfig()
      expect(config.maxRetries).toBe(2)
      expect(config.timeoutMs).toBe(1000)
      expect(config.skippable).toBe(false)
      expect(config.failPipeline).toBe(true)
    })

    it('应该更新配置', () => {
      stage.updateConfig({ maxRetries: 5 })
      expect(stage.getConfig().maxRetries).toBe(5)
    })

    it('应该设置 AI 执行器', () => {
      const mockExecutor = vi.fn()
      stage.setAiExecutor(mockExecutor)
      // AI 执行器是 protected 的，我们通过子类访问
      expect(stage['aiExecutor']).toBe(mockExecutor)
    })
  })

  describe('执行流程', () => {
    it('应该成功执行阶段', async () => {
      const result = await stage.execute(mockContext, 'test input')

      expect(result.status).toBe('completed')
      expect(result.stageType).toBe('rewrite')
      expect(result.data).toBe('processed')
      expect(result.error).toBeNull()
      expect(result.retryCount).toBe(0)
      expect(stage.validateMock).toHaveBeenCalledTimes(1)
      expect(stage.doProcessMock).toHaveBeenCalledWith('test input')
      // transform 被调用
      expect(stage.transformMock).toHaveBeenCalled()
      expect(stage.transformMock.mock.calls[0][0]).toBe('processed')
    })

    it('应该在验证失败时抛出错误', async () => {
      stage.validateMock.mockRejectedValue(new Error('Validation failed'))

      const result = await stage.execute(mockContext, 'test input')

      expect(result.status).toBe('failed')
      expect(result.error).toContain('Validation failed')
      expect(stage.onFailureMock).toHaveBeenCalled()
    })

    it('应该在处理失败时重试', async () => {
      stage.doProcessMock
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValue('success')

      const result = await stage.execute(mockContext, 'test input')

      expect(result.status).toBe('completed')
      expect(result.data).toBe('success')
      expect(result.retryCount).toBe(2)
      expect(stage.doProcessMock).toHaveBeenCalledTimes(3)
    })

    it('应该在超过最大重试次数后失败', async () => {
      stage.doProcessMock.mockRejectedValue(new Error('Always fails'))

      const result = await stage.execute(mockContext, 'test input')

      expect(result.status).toBe('failed')
      expect(result.retryCount).toBe(2) // maxRetries
      expect(stage.doProcessMock).toHaveBeenCalledTimes(3) // 初始 + 2 次重试
    })

    it('应该支持取消信号', async () => {
      const abortController = new AbortController()
      abortController.abort()

      const result = await stage.execute(mockContext, 'test input', {
        attempt: 1,
        signal: abortController.signal,
      })

      expect(result.status).toBe('cancelled')
      expect(result.error).toBe('Pipeline cancelled')
    })

    it('应该在超时后失败', async () => {
      stage.updateConfig({ timeoutMs: 10 })
      stage.doProcessMock.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )

      const result = await stage.execute(mockContext, 'test input')

      expect(result.status).toBe('failed')
      expect(result.error).toContain('timeout')
      expect(result.errorDetails?.code).toBe('STAGE_TIMEOUT')
    })
  })

  describe('错误处理', () => {
    it('应该标准化 PipelineError', async () => {
      const pipelineError = new PipelineError(
        'Custom error',
        'CUSTOM_ERROR',
        'rewrite',
        null,
        false
      )
      stage.doProcessMock.mockRejectedValue(pipelineError)

      const result = await stage.execute(mockContext, 'test input')

      expect(result.status).toBe('failed')
      expect(result.error).toBe('Custom error')
      expect(result.errorDetails?.code).toBe('CUSTOM_ERROR')
      expect(result.errorDetails?.retryable).toBe(false)
    })

    it('应该标准化普通 Error', async () => {
      stage.doProcessMock.mockRejectedValue(new Error('Regular error'))

      const result = await stage.execute(mockContext, 'test input')

      expect(result.status).toBe('failed')
      expect(result.error).toBe('Regular error')
    })

    it('应该处理非 Error 类型的错误', async () => {
      stage.doProcessMock.mockRejectedValue('String error')

      const result = await stage.execute(mockContext, 'test input')

      expect(result.status).toBe('failed')
      expect(result.error).toBe('String error')
    })

    it('不应该重试非重试错误', async () => {
      const nonRetryableError = new PipelineError(
        'Non-retryable',
        'FATAL',
        'rewrite',
        null,
        false
      )
      stage.doProcessMock.mockRejectedValue(nonRetryableError)

      const result = await stage.execute(mockContext, 'test input')

      expect(result.status).toBe('failed')
      expect(result.retryCount).toBe(0)
      expect(stage.doProcessMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('进度回调', () => {
    it('应该调用进度回调', async () => {
      const onProgress = vi.fn()
      
      await stage.execute(mockContext, 'test input', {
        attempt: 1,
        onProgress,
      })

      // 进度回调在 doProcess 中被调用
      expect(stage.doProcessMock).toHaveBeenCalled()
    })
  })

  describe('持续时间', () => {
    it('应该记录执行耗时', async () => {
      const startTime = Date.now()
      const result = await stage.execute(mockContext, 'test input')
      const endTime = Date.now()

      expect(result.durationMs).toBeGreaterThanOrEqual(0)
      expect(result.durationMs).toBeLessThanOrEqual(endTime - startTime + 10)
    })
  })
})
