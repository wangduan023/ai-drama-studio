/**
 * Index 导出测试
 */
import { describe, it, expect } from 'vitest'
import {
  // 核心类
  ProjectPipeline,
  StageProcessor,
  PipelineError,
  
  // 阶段
  RewriteStage,
  StoryboardStage,
  ImageGenerationStage,
  VideoGenerationStage,
  
  // 工具函数
  isRetryableError,
  createTimeoutError,
  createFullPipeline,
  createStoryboardOnlyPipeline,
  createImageOnlyPipeline,
  
  // 类型
  type StageType,
  type StageStatus,
  type PipelineContext,
  type PipelineResult,
  type StageResult,
} from '../src/index'

describe('Index exports', () => {
  describe('核心类', () => {
    it('应该导出 ProjectPipeline', () => {
      expect(ProjectPipeline).toBeDefined()
      expect(typeof ProjectPipeline).toBe('function')
    })

    it('应该导出 StageProcessor', () => {
      expect(StageProcessor).toBeDefined()
      expect(typeof StageProcessor).toBe('function')
    })

    it('应该导出 PipelineError', () => {
      expect(PipelineError).toBeDefined()
      expect(typeof PipelineError).toBe('function')
    })
  })

  describe('阶段处理器', () => {
    it('应该导出 RewriteStage', () => {
      expect(RewriteStage).toBeDefined()
      expect(typeof RewriteStage).toBe('function')
    })

    it('应该导出 StoryboardStage', () => {
      expect(StoryboardStage).toBeDefined()
      expect(typeof StoryboardStage).toBe('function')
    })

    it('应该导出 ImageGenerationStage', () => {
      expect(ImageGenerationStage).toBeDefined()
      expect(typeof ImageGenerationStage).toBe('function')
    })

    it('应该导出 VideoGenerationStage', () => {
      expect(VideoGenerationStage).toBeDefined()
      expect(typeof VideoGenerationStage).toBe('function')
    })
  })

  describe('工具函数', () => {
    it('应该导出 isRetryableError', () => {
      expect(isRetryableError).toBeDefined()
      expect(typeof isRetryableError).toBe('function')
    })

    it('应该导出 createTimeoutError', () => {
      expect(createTimeoutError).toBeDefined()
      expect(typeof createTimeoutError).toBe('function')
    })

    it('应该导出 createFullPipeline', () => {
      expect(createFullPipeline).toBeDefined()
      expect(typeof createFullPipeline).toBe('function')
    })

    it('应该导出 createStoryboardOnlyPipeline', () => {
      expect(createStoryboardOnlyPipeline).toBeDefined()
      expect(typeof createStoryboardOnlyPipeline).toBe('function')
    })

    it('应该导出 createImageOnlyPipeline', () => {
      expect(createImageOnlyPipeline).toBeDefined()
      expect(typeof createImageOnlyPipeline).toBe('function')
    })
  })

  describe('Pipeline 模板', () => {
    it('createFullPipeline 应该创建完整 Pipeline', () => {
      const pipeline = createFullPipeline()
      expect(pipeline).toBeInstanceOf(ProjectPipeline)
      
      const stages = pipeline.getRegisteredStages()
      expect(stages).toContain('rewrite')
      expect(stages).toContain('storyboard')
      expect(stages).toContain('image')
      expect(stages).toContain('video')
    })

    it('createStoryboardOnlyPipeline 应该只创建分镜阶段', () => {
      const pipeline = createStoryboardOnlyPipeline()
      expect(pipeline).toBeInstanceOf(ProjectPipeline)
      
      const stages = pipeline.getRegisteredStages()
      expect(stages).toEqual(['storyboard'])
    })

    it('createImageOnlyPipeline 应该只创建图片阶段', () => {
      const pipeline = createImageOnlyPipeline()
      expect(pipeline).toBeInstanceOf(ProjectPipeline)
      
      const stages = pipeline.getRegisteredStages()
      expect(stages).toEqual(['image'])
    })
  })
})
