/**
 * AI 生成任务处理器索引
 *
 * 导出所有 AI 生成相关的任务处理器
 */

// 剧本生成处理器
export {
  handleScriptGenerate,
  type ScriptGenerateResult,
} from './scriptGenerateHandler'

// 角色生成处理器
export {
  handleCharacterGenerate,
  handleBatchCharacterGenerate,
  type CharacterGenerateResult,
  type CharacterGenerateConfig,
} from './characterGenerateHandler'

// 场景生成处理器
export {
  handleSceneGenerate,
  type SceneGenerateResult,
  type SceneGenerateConfig,
} from './sceneGenerateHandler'

// 图片生成处理器
export {
  handleImageGenerate,
  handleBatchImageGenerate,
  type ImageGenerateResult,
  type ImageGenerateConfig,
} from './imageGenerateHandler'

// 视频生成处理器
export {
  handleVideoGenerate,
  handleVideoComposition,
  type VideoGenerateResult,
  type VideoGenerateConfig,
} from './videoGenerateHandler'
