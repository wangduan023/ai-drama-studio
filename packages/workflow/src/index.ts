/**
 * @ai-drama-studio/workflow
 *
 * Pipeline 工作流引擎
 * 用于编排 AI 短剧生成的多阶段工作流
 *
 * @packageDocumentation
 */

import { ProjectPipeline } from './pipeline'
import { RewriteStage } from './stages/rewrite.stage'
import { StoryboardStage } from './stages/storyboard.stage'
import { ImageGenerationStage } from './stages/image.stage'
import { VideoGenerationStage } from './stages/video.stage'

// ========== 类型导出 ==========
export type {
  // 基础类型
  StageType,
  StageStatus,
  StageConfig,
  StageExecuteOptions,

  // Pipeline 类型
  PipelineContext,
  PipelineResult,
  PipelineExecuteOptions,
  PipelineError as PipelineErrorClass,

  // 阶段结果类型
  StageResult,

  // 数据类型
  CharacterAppearanceMap,
  LocationInfo,
  StoryboardPanel,
  PhotographyPlan,
  GeneratedImage,
  GeneratedVideo,

  // AI 执行器类型
  AiExecuteInput,
  AiExecuteOutput,
  AiExecutor,
} from './types'

// ========== 错误类导出 ==========
export { PipelineError } from './types'

// ========== 核心类导出 ==========
export { StageProcessor } from './stage'
export { ProjectPipeline, isRetryableError, createTimeoutError } from './pipeline'

// ========== 阶段处理器导出 ==========
export {
  RewriteStage,
  type RewriteInput,
  type RewriteOutput,
} from './stages/rewrite.stage'

export {
  StoryboardStage,
  type StoryboardInput,
  type StoryboardOutput,
} from './stages/storyboard.stage'

export {
  ImageGenerationStage,
  type ImageGenerationInput,
  type ImageGenerationOutput,
} from './stages/image.stage'

export {
  VideoGenerationStage,
  type VideoGenerationInput,
  type VideoGenerationOutput,
} from './stages/video.stage'

// ========== 预定义 Pipeline 模板 ==========

/**
 * 创建完整的短剧生成 Pipeline
 *
 * 包含所有阶段：文案改写 → 分镜生成 → 图片生成 → 视频生成
 */
export function createFullPipeline(): ProjectPipeline {
  const pipeline = new ProjectPipeline()

  const rewriteStage = new RewriteStage()
  const storyboardStage = new StoryboardStage()
  const imageStage = new ImageGenerationStage()
  const videoStage = new VideoGenerationStage()

  return pipeline
    .addStage(rewriteStage)                    // 1. 文案改写
    .addStage(storyboardStage, ['rewrite'])    // 2. 分镜生成 (依赖改写)
    .addStage(imageStage, ['storyboard'])      // 3. 图片生成 (依赖分镜)
    .addStage(videoStage, ['image'], true)     // 4. 视频生成 (依赖图片，可选)
}

/**
 * 创建精简 Pipeline (仅分镜生成)
 *
 * 适用于已有文案，只需要生成分镜的场景
 */
export function createStoryboardOnlyPipeline(): ProjectPipeline {
  const pipeline = new ProjectPipeline()
  const storyboardStage = new StoryboardStage()

  return pipeline.addStage(storyboardStage)
}

/**
 * 创建图片生成 Pipeline
 *
 * 适用于已有分镜，只需要生成图片的场景
 */
export function createImageOnlyPipeline(): ProjectPipeline {
  const pipeline = new ProjectPipeline()
  const imageStage = new ImageGenerationStage()

  return pipeline.addStage(imageStage)
}
