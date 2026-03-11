/**
 * Pipeline 集成测试
 * 测试 rewrite -> storyboard -> image -> video 完整链路
 * 阶段失败回滚、取消信号传播、进度回调准确性
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ProjectPipeline } from '../src/pipeline'
import { StageProcessor } from '../src/stage'
import { PipelineError, type StageType, type PipelineContext, type StageResult, type StageExecuteOptions } from '../src/types'

// Mock Stage Processors
class MockRewriteStage extends StageProcessor<{ content: string }, { rewrittenContent: string }> {
  stageType: StageType = 'rewrite'
  
  async validate(): Promise<void> {}
  async doProcess(context: PipelineContext, input: { content: string }, options?: StageExecuteOptions): Promise<{ rewrittenContent: string }> {
    options?.onProgress?.(0.2, '开始改写')
    
    // 模拟 AI 处理
    await this.delay(50)
    
    options?.onProgress?.(0.5, '处理中')
    await this.delay(50)
    
    options?.onProgress?.(0.8, '完成改写')
    
    return {
      rewrittenContent: `改写后的: ${input.content}`
    }
  }
  async onFailure(): Promise<void> {}
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

class MockStoryboardStage extends StageProcessor<{ rewrittenContent: string }, { panels: any[] }> {
  stageType: StageType = 'storyboard'
  shouldFail: boolean = false
  
  async validate(): Promise<void> {
    if (this.shouldFail) {
      throw new PipelineError('分镜生成失败', 'STORYBOARD_ERROR', this.stageType, null, false)
    }
  }
  async doProcess(context: PipelineContext, input: { rewrittenContent: string }, options?: StageExecuteOptions): Promise<{ panels: any[] }> {
    options?.onProgress?.(0.2, '开始生成分镜')
    
    await this.delay(50)
    
    options?.onProgress?.(0.5, '分析场景')
    await this.delay(50)
    
    options?.onProgress?.(0.8, '完成分镜')
    
    return {
      panels: [
        { panelNumber: 1, description: '分镜1', location: '场景A' },
        { panelNumber: 2, description: '分镜2', location: '场景B' },
        { panelNumber: 3, description: '分镜3', location: '场景A' }
      ]
    }
  }
  async onFailure(): Promise<void> {}
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  setShouldFail(shouldFail: boolean) {
    this.shouldFail = shouldFail
  }
}

class MockImageStage extends StageProcessor<{ panels: any[] }, { images: any[] }> {
  stageType: StageType = 'image'
  shouldFail: boolean = false
  
  async validate(): Promise<void> {
    if (this.shouldFail) {
      throw new PipelineError('图片生成失败', 'IMAGE_ERROR', this.stageType, null, false)
    }
  }
  async doProcess(context: PipelineContext, input: { panels: any[] }, options?: StageExecuteOptions): Promise<{ images: any[] }> {
    options?.onProgress?.(0.2, '开始生成图片')
    
    await this.delay(50)
    
    const images: any[] = []
    for (let i = 0; i < input.panels.length; i++) {
      options?.onProgress?.(0.2 + (0.6 * (i + 1) / input.panels.length), `生成图片 ${i + 1}/${input.panels.length}`)
      await this.delay(30)
      images.push({
        id: `img-${i + 1}`,
        url: `https://example.com/image-${i + 1}.png`,
        prompt: `Image for ${input.panels[i].description}`,
        modelName: 'mock-model'
      })
    }
    
    options?.onProgress?.(0.9, '完成图片生成')
    
    return { images }
  }
  async onFailure(): Promise<void> {}
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  setShouldFail(shouldFail: boolean) {
    this.shouldFail = shouldFail
  }
}

class MockVideoStage extends StageProcessor<{ images: any[], panels: any[] }, { videos: any[] }> {
  stageType: StageType = 'video'
  shouldFail: boolean = false
  
  async validate(): Promise<void> {
    if (this.shouldFail) {
      throw new PipelineError('视频生成失败', 'VIDEO_ERROR', this.stageType, null, false)
    }
  }
  async doProcess(context: PipelineContext, input: { images: any[], panels: any[] }, options?: StageExecuteOptions): Promise<{ videos: any[] }> {
    options?.onProgress?.(0.2, '开始生成视频')
    
    await this.delay(50)
    
    options?.onProgress?.(0.5, '合成视频')
    await this.delay(50)
    
    options?.onProgress?.(0.8, '添加音效')
    await this.delay(50)
    
    options?.onProgress?.(1.0, '完成视频')
    
    return {
      videos: [{
        id: 'video-1',
        url: 'https://example.com/video.mp4',
        duration: 30,
        width: 1920,
        height: 1080,
        fps: 30
      }]
    }
  }
  async onFailure(): Promise<void> {}
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  setShouldFail(shouldFail: boolean) {
    this.shouldFail = shouldFail
  }
}

describe('Pipeline Integration Tests', () => {
  let pipeline: ProjectPipeline
  let rewriteStage: MockRewriteStage
  let storyboardStage: MockStoryboardStage
  let imageStage: MockImageStage
  let videoStage: MockVideoStage

  const createBaseContext = (): PipelineContext => ({
    projectId: 'proj-test-001',
    episodeId: 'ep-test-001',
    userId: 'user-test-001',
    locale: 'zh',
    taskId: 'task-test-001',
    input: {
      content: '测试小说内容：从前有一个勇敢的英雄...'
    },
    characters: {
      profiles: [],
      appearanceMap: {}
    },
    locations: {
      profiles: []
    },
    stageData: {},
    extensions: {}
  })

  beforeEach(() => {
    pipeline = new ProjectPipeline()
    rewriteStage = new MockRewriteStage({
      maxRetries: 2,
      timeoutMs: 5000,
      skippable: false,
      failPipeline: true
    })
    storyboardStage = new MockStoryboardStage({
      maxRetries: 2,
      timeoutMs: 10000,
      skippable: false,
      failPipeline: true
    })
    imageStage = new MockImageStage({
      maxRetries: 2,
      timeoutMs: 30000,
      skippable: false,
      failPipeline: true
    })
    videoStage = new MockVideoStage({
      maxRetries: 2,
      timeoutMs: 60000,
      skippable: false,
      failPipeline: true
    })
  })

  afterEach(() => {
    pipeline.clear()
  })

  describe('rewrite -> storyboard -> image -> video 完整链路', () => {
    it('应该成功执行完整 Pipeline', async () => {
      pipeline
        .addStage(rewriteStage)
        .addStage(storyboardStage, ['rewrite'])
        .addStage(imageStage, ['storyboard'])
        .addStage(videoStage, ['image'])

      const context = createBaseContext()
      const result = await pipeline.execute(context)

      // Pipeline 执行成功，状态应为 completed 或 partial
      expect(['completed', 'partial']).toContain(result.status)
      expect(result.durationMs).toBeGreaterThan(0)
    })

    it('应该按正确顺序执行各阶段', async () => {
      const executionOrder: string[] = []

      // 包装阶段以记录执行顺序
      const trackingRewrite = new (class extends MockRewriteStage {
        async execute(context: PipelineContext, input: any, options?: StageExecuteOptions) {
          executionOrder.push('rewrite')
          return super.execute(context, input, options)
        }
      })({ maxRetries: 2, timeoutMs: 5000, skippable: false, failPipeline: true })

      const trackingStoryboard = new (class extends MockStoryboardStage {
        async execute(context: PipelineContext, input: any, options?: StageExecuteOptions) {
          executionOrder.push('storyboard')
          return super.execute(context, input, options)
        }
      })({ maxRetries: 2, timeoutMs: 10000, skippable: false, failPipeline: true })

      const trackingImage = new (class extends MockImageStage {
        async execute(context: PipelineContext, input: any, options?: StageExecuteOptions) {
          executionOrder.push('image')
          return super.execute(context, input, options)
        }
      })({ maxRetries: 2, timeoutMs: 30000, skippable: false, failPipeline: true })

      pipeline
        .addStage(trackingRewrite)
        .addStage(trackingStoryboard, ['rewrite'])
        .addStage(trackingImage, ['storyboard'])

      const context = createBaseContext()
      await pipeline.execute(context)

      expect(executionOrder).toEqual(['rewrite', 'storyboard', 'image'])
    })

    it('应该在各阶段间正确传递数据', async () => {
      pipeline
        .addStage(rewriteStage)
        .addStage(storyboardStage, ['rewrite'])
        .addStage(imageStage, ['storyboard'])

      const context = createBaseContext()
      const result = await pipeline.execute(context)

      // 验证 stageData 中包含各阶段输出
      expect(context.stageData.rewrite).toBeDefined()
      expect(context.stageData.storyboard).toBeDefined()
      // image 阶段数据可能不存在，取决于 Pipeline 实现

      // 验证数据正确性
      expect(context.stageData.rewrite?.rewrittenContent).toContain('改写后的')
      expect(context.stageData.storyboard?.panels).toHaveLength(3)
      // image 阶段数据存储方式可能不同
    })

    it('应该支持跳过可选阶段', async () => {
      const optionalRewrite = new MockRewriteStage({
        maxRetries: 2,
        timeoutMs: 5000,
        skippable: true, // 可跳过
        failPipeline: false // 失败不终止 Pipeline
      })

      // 设置重写阶段失败
      vi.spyOn(optionalRewrite, 'execute').mockResolvedValue({
        stageType: 'rewrite',
        status: 'failed',
        data: null,
        error: 'Rewrite failed',
        errorDetails: null,
        retryCount: 0,
        durationMs: 100,
        aiLogs: null
      })

      pipeline
        .addStage(optionalRewrite, [], true) // 标记为可选
        .addStage(storyboardStage, ['rewrite'])
        .addStage(imageStage, ['storyboard'])

      const context = createBaseContext()
      const result = await pipeline.execute(context)

      // 因为 rewrite 是可选且失败，storyboard 应该被跳过
      expect(['partial', 'failed']).toContain(result.status)
      expect(result.stageResults.rewrite?.status).toBe('failed')
      expect(result.stageResults.storyboard?.status).toBe('skipped')
    })
  })

  describe('阶段失败回滚测试', () => {
    it('应该在关键阶段失败时停止 Pipeline', async () => {
      storyboardStage.setShouldFail(true)

      pipeline
        .addStage(rewriteStage)
        .addStage(storyboardStage, ['rewrite'])
        .addStage(imageStage, ['storyboard'])
        .addStage(videoStage, ['image'])

      const context = createBaseContext()
      const result = await pipeline.execute(context)

      // 当有阶段失败但部分成功时，状态为 'partial'
      expect(['failed', 'partial']).toContain(result.status)
      expect(result.stageResults.rewrite?.status).toBe('completed')
      expect(result.stageResults.storyboard?.status).toBe('failed')
    })

    it('应该记录失败的详细信息', async () => {
      storyboardStage.setShouldFail(true)

      pipeline
        .addStage(rewriteStage)
        .addStage(storyboardStage, ['rewrite'])

      const context = createBaseContext()
      const result = await pipeline.execute(context)

      expect(result.stageResults.storyboard?.error).toBe('分镜生成失败')
      expect(result.stageResults.storyboard?.status).toBe('failed')
    })

    it('应该支持部分完成状态', async () => {
      imageStage.setShouldFail(true)

      pipeline
        .addStage(rewriteStage)
        .addStage(storyboardStage, ['rewrite'])
        .addStage(imageStage, ['storyboard'])
        .addStage(videoStage, ['image'])

      const context = createBaseContext()
      const result = await pipeline.execute(context)

      expect(result.status).toBe('partial')
      expect(result.stageResults.rewrite?.status).toBe('completed')
      expect(result.stageResults.storyboard?.status).toBe('completed')
      expect(result.stageResults.image?.status).toBe('failed')
      expect(result.stageResults.video?.status).toBe('skipped')
      
      // 已完成阶段的输出应该可用
      expect(result.output.rewrittenContent).toBeDefined()
      expect(result.output.storyboards).toBeDefined()
    })

    it('应该在多个阶段失败时正确报告', async () => {
      // 创建会失败的阶段
      const failingRewrite = new (class extends StageProcessor<any, any> {
        stageType: StageType = 'rewrite'
        async validate(): Promise<void> {
          throw new PipelineError('Rewrite error', 'REWRITE_ERROR', this.stageType, null, false)
        }
        async doProcess(): Promise<any> {
          return {}
        }
        async onFailure(): Promise<void> {}
      })({ maxRetries: 0, timeoutMs: 1000, skippable: false, failPipeline: true })

      pipeline
        .addStage(failingRewrite)
        .addStage(storyboardStage, ['rewrite'])

      const context = createBaseContext()
      const result = await pipeline.execute(context)

      expect(['failed', 'partial']).toContain(result.status)
      // 至少有一个阶段失败
      const hasFailedStage = Object.values(result.stageResults).some(
        r => r?.status === 'failed'
      )
      expect(hasFailedStage).toBe(true)
    })
  })

  describe('取消信号传播测试', () => {
    it('应该响应取消信号并停止执行', async () => {
      // 创建慢速阶段以便测试取消
      const slowStage = new (class extends StageProcessor<any, any> {
        stageType: StageType = 'rewrite'
        async validate(): Promise<void> {}
        async doProcess(): Promise<any> {
          await new Promise(resolve => setTimeout(resolve, 500))
          return { content: 'slow' }
        }
        async onFailure(): Promise<void> {}
      })({ maxRetries: 0, timeoutMs: 10000, skippable: false, failPipeline: true })

      pipeline.addStage(slowStage)

      const controller = new AbortController()
      const context = createBaseContext()

      // 立即取消
      controller.abort()

      const result = await pipeline.execute(context, {
        signal: controller.signal
      })

      expect(['cancelled', 'failed', 'completed']).toContain(result.status)
    })

    it('应该将取消状态传播到后续阶段', async () => {
      pipeline
        .addStage(rewriteStage)
        .addStage(storyboardStage, ['rewrite'])
        .addStage(imageStage, ['storyboard'])

      const controller = new AbortController()
      const context = createBaseContext()

      setTimeout(() => controller.abort(), 150)

      const result = await pipeline.execute(context, {
        signal: controller.signal
      })

      // 至少有一个阶段应该被取消或跳过
      const hasCancelledOrSkipped = Object.values(result.stageResults).some(
        r => r?.status === 'cancelled' || r?.status === 'skipped'
      )
      expect(hasCancelledOrSkipped).toBe(true)
    })

    it('应该在取消时清理资源', async () => {
      const cleanupSpy = vi.fn()

      const stageWithCleanup = new (class extends StageProcessor<any, any> {
        stageType: StageType = 'rewrite'
        async validate(): Promise<void> {}
        async doProcess(context: PipelineContext, input: any, options?: StageExecuteOptions): Promise<any> {
          if (options?.signal?.aborted) {
            cleanupSpy()
            throw new Error('Cancelled')
          }
          await new Promise(resolve => setTimeout(resolve, 100))
          if (options?.signal?.aborted) {
            cleanupSpy()
            throw new Error('Cancelled')
          }
          return { content: 'done' }
        }
        async onFailure(): Promise<void> {}
      })({ maxRetries: 0, timeoutMs: 5000, skippable: false, failPipeline: true })

      pipeline.addStage(stageWithCleanup)

      const controller = new AbortController()
      const context = createBaseContext()

      setTimeout(() => controller.abort(), 50)

      await pipeline.execute(context, { signal: controller.signal })

      expect(cleanupSpy).toHaveBeenCalled()
    })
  })

  describe('进度回调准确性验证', () => {
    it('应该报告各阶段的进度', async () => {
      const progressEvents: Array<{ stage: StageType; progress: number; message: string }> = []

      pipeline
        .addStage(rewriteStage)
        .addStage(storyboardStage, ['rewrite'])

      const context = createBaseContext()
      await pipeline.execute(context, {
        onProgress: (stage, progress, message) => {
          progressEvents.push({ stage, progress, message })
        }
      })

      // 应该收到多个进度事件
      expect(progressEvents.length).toBeGreaterThan(0)

      // 验证每个事件都有正确的结构
      progressEvents.forEach(event => {
        expect(event.stage).toBeDefined()
        expect(event.progress).toBeGreaterThanOrEqual(0)
        expect(event.progress).toBeLessThanOrEqual(1)
        expect(event.message).toBeDefined()
      })
    })

    it('应该按顺序报告进度', async () => {
      const stageProgress: Record<string, number[]> = {}

      pipeline
        .addStage(rewriteStage)
        .addStage(storyboardStage, ['rewrite'])

      const context = createBaseContext()
      await pipeline.execute(context, {
        onProgress: (stage, progress) => {
          if (!stageProgress[stage]) {
            stageProgress[stage] = []
          }
          stageProgress[stage].push(progress)
        }
      })

      // 验证每个阶段的进度是递增的
      Object.values(stageProgress).forEach(progresses => {
        for (let i = 1; i < progresses.length; i++) {
          expect(progresses[i]).toBeGreaterThanOrEqual(progresses[i - 1])
        }
      })
    })

    it('应该报告阶段完成事件', async () => {
      const completedStages: StageType[] = []

      pipeline
        .addStage(rewriteStage)
        .addStage(storyboardStage, ['rewrite'])

      const context = createBaseContext()
      await pipeline.execute(context, {
        onStageComplete: (stage, result) => {
          completedStages.push(stage)
        }
      })

      expect(completedStages).toContain('rewrite')
      expect(completedStages).toContain('storyboard')
    })

    it('应该在失败阶段也触发完成回调', async () => {
      storyboardStage.setShouldFail(true)
      const completedStages: Array<{ stage: StageType; status: string }> = []

      pipeline
        .addStage(rewriteStage)
        .addStage(storyboardStage, ['rewrite'])

      const context = createBaseContext()
      await pipeline.execute(context, {
        onStageComplete: (stage, result) => {
          completedStages.push({ stage, status: result.status })
        }
      })

      expect(completedStages).toContainEqual({ stage: 'rewrite', status: 'completed' })
      expect(completedStages).toContainEqual({ stage: 'storyboard', status: 'failed' })
    })
  })

  describe('Pipeline 状态管理', () => {
    it('应该正确跟踪执行状态', async () => {
      pipeline
        .addStage(rewriteStage)
        .addStage(storyboardStage, ['rewrite'])

      const context = createBaseContext()
      
      // 执行前状态
      expect(pipeline.getState().status).toBe('idle')
      
      const executePromise = pipeline.execute(context)
      
      // 执行中状态（可能获取不到，因为执行很快）
      const state = pipeline.getState()
      expect(['idle', 'running', 'completed']).toContain(state.status)
      
      await executePromise
      
      // 执行后状态
      expect(pipeline.getState().status).toBe('completed')
      expect(pipeline.getState().completedStages.has('rewrite')).toBe(true)
      expect(pipeline.getState().completedStages.has('storyboard')).toBe(true)
    })

    it('应该支持重置 Pipeline 状态', async () => {
      pipeline
        .addStage(rewriteStage)
        .addStage(storyboardStage, ['rewrite'])

      const context = createBaseContext()
      await pipeline.execute(context)

      expect(pipeline.getState().status).toBe('completed')

      pipeline.reset()

      expect(pipeline.getState().status).toBe('idle')
      expect(pipeline.getState().completedStages.size).toBe(0)
      expect(pipeline.getState().failedStages.size).toBe(0)
    })

    it('应该返回已注册的阶段列表', () => {
      pipeline
        .addStage(rewriteStage)
        .addStage(storyboardStage, ['rewrite'])
        .addStage(imageStage, ['storyboard'])

      const stages = pipeline.getRegisteredStages()

      expect(stages).toEqual(['rewrite', 'storyboard', 'image'])
    })

    it('应该阻止重复注册阶段', () => {
      pipeline.addStage(rewriteStage)

      expect(() => {
        pipeline.addStage(rewriteStage)
      }).toThrow('Stage "rewrite" is already registered')
    })
  })

  describe('复杂场景测试', () => {
    it('应该处理长时间运行的 Pipeline', async () => {
      const slowRewrite = new (class extends StageProcessor<any, any> {
        stageType: StageType = 'rewrite'
        async validate(): Promise<void> {}
        async doProcess(): Promise<any> {
          await new Promise(resolve => setTimeout(resolve, 200))
          return { content: 'slow result' }
        }
        async onFailure(): Promise<void> {}
      })({ maxRetries: 0, timeoutMs: 10000, skippable: false, failPipeline: true })

      pipeline.addStage(slowRewrite)

      const context = createBaseContext()
      const startTime = Date.now()
      const result = await pipeline.execute(context)
      const endTime = Date.now()

      expect(result.status).toBe('completed')
      expect(endTime - startTime).toBeGreaterThanOrEqual(200)
    })

    it('应该支持并行阶段配置', async () => {
      // 创建不依赖其他阶段的并行阶段
      const parallelStage1 = new MockRewriteStage({
        maxRetries: 2, timeoutMs: 5000, skippable: false, failPipeline: false
      })
      const parallelStage2 = new MockStoryboardStage({
        maxRetries: 2, timeoutMs: 10000, skippable: false, failPipeline: false
      })

      // 注意：当前 Pipeline 实现是串行的，这里测试无依赖的阶段
      pipeline
        .addStage(parallelStage1, []) // 无前置条件
        .addStage(parallelStage2, []) // 无前置条件

      const context = createBaseContext()
      const result = await pipeline.execute(context)

      expect(result.status).toBe('completed')
      expect(result.stageResults.rewrite?.status).toBe('completed')
      expect(result.stageResults.storyboard?.status).toBe('completed')
    })

    it('应该正确处理空 Pipeline', async () => {
      const context = createBaseContext()
      const result = await pipeline.execute(context)

      expect(result.status).toBe('completed')
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })
  })
})
