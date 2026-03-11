# AI Drama Studio Worker

AI Drama Studio 的任务队列处理器，基于 BullMQ 实现。

## 功能特性

### 任务处理器

#### 1. 剧本生成处理器 (`scriptGenerateHandler`)

生成剧集剧本：

```typescript
import { addTaskJob, TASK_TYPE } from '@ai-drama-studio/queue'

await addTaskJob({
  taskId: 'uuid',
  type: TASK_TYPE.SCRIPT_GENERATE,
  userId: 'user-uuid',
  projectId: 'project-uuid',
  episodeId: 'episode-uuid',
  targetType: 'episode',
  targetId: 'episode-uuid',
  payload: {
    episodeId: 'episode-uuid',
  },
})
```

#### 2. 角色生成处理器 (`characterGenerateHandler`)

生成角色档案和外观描述：

```typescript
await addTaskJob({
  taskId: 'uuid',
  type: TASK_TYPE.CHARACTER_GENERATE,
  userId: 'user-uuid',
  projectId: 'project-uuid',
  targetType: 'project',
  targetId: 'project-uuid',
  payload: {
    characterName: '角色名称',
    description: '角色描述',
    eraPeriod: '古代',
    roleLevel: 'A',
    generateImage: true, // 是否生成参考图
  },
})
```

#### 3. 场景生成处理器 (`sceneGenerateHandler`)

生成场景档案和视觉描述：

```typescript
await addTaskJob({
  taskId: 'uuid',
  type: TASK_TYPE.SCENE_GENERATE,
  userId: 'user-uuid',
  projectId: 'project-uuid',
  targetType: 'project',
  targetId: 'project-uuid',
  payload: {
    locationName: '场景名称',
    description: '场景描述',
    locationType: 'INDOOR',
    generateImage: true,
  },
})
```

#### 4. 图片生成处理器 (`imageGenerateHandler`)

生成图片资源：

```typescript
await addTaskJob({
  taskId: 'uuid',
  type: TASK_TYPE.IMAGE_GENERATE,
  userId: 'user-uuid',
  projectId: 'project-uuid',
  targetType: 'asset',
  targetId: 'asset-uuid',
  payload: {
    prompt: '图片生成提示词',
    imageType: 'character', // character | location | scene | panel | custom
    aspectRatio: '16:9',
    count: 1,
    style: '写实风格',
  },
})
```

#### 5. 视频生成处理器 (`videoGenerateHandler`)

生成视频片段：

```typescript
await addTaskJob({
  taskId: 'uuid',
  type: TASK_TYPE.VIDEO_GENERATE,
  userId: 'user-uuid',
  projectId: 'project-uuid',
  episodeId: 'episode-uuid',
  targetType: 'storyboard',
  targetId: 'storyboard-uuid',
  payload: {
    storyboardId: 'storyboard-uuid',
    videoType: 'panel', // panel | scene | clip | full
    duration: 5,
    motionIntensity: 'medium', // low | medium | high
    cameraMotion: 'slow pan left',
  },
})
```

## 项目结构

```
apps/worker/
├── index.ts                    # Worker 入口
├── workers/
│   ├── index.ts               # Worker 配置和启动
│   ├── llm.worker.ts          # LLM 任务处理器
│   ├── image.worker.ts        # 图片任务处理器
│   ├── video.worker.ts        # 视频任务处理器
│   └── voice.worker.ts        # 语音任务处理器
├── src/
│   ├── handlers/              # AI 生成任务处理器
│   │   ├── index.ts
│   │   ├── scriptGenerateHandler.ts
│   │   ├── characterGenerateHandler.ts
│   │   ├── sceneGenerateHandler.ts
│   │   ├── imageGenerateHandler.ts
│   │   └── videoGenerateHandler.ts
│   └── utils/                 # 工具函数
│       ├── index.ts
│       ├── progress.ts        # 进度报告工具
│       ├── retry.ts           # 重试和错误处理
│       └── sse.ts             # SSE 事件发布
└── package.json
```

## 任务队列配置

### 队列类型

| 队列 | 任务类型 | 并发度 |
|------|----------|--------|
| LLM | script:generate, character:generate, scene:generate | 50 |
| Image | image:generate, image:generate:batch | 50 |
| Video | video:generate, video:compose | 5 |
| Voice | audio:generate | 20 |

### 任务类型

```typescript
export const TASK_TYPE = {
  // AI 生成任务
  SCRIPT_GENERATE: 'script:generate',
  CHARACTER_GENERATE: 'character:generate',
  CHARACTER_GENERATE_BATCH: 'character:generate:batch',
  SCENE_GENERATE: 'scene:generate',
  IMAGE_GENERATE: 'image:generate',
  IMAGE_GENERATE_BATCH: 'image:generate:batch',
  VIDEO_GENERATE: 'video:generate',
  VIDEO_COMPOSE: 'video:compose',
  AUDIO_GENERATE: 'audio:generate',

  // 原有任务类型...
}
```

## 进度报告

处理器通过 SSE 实时报告任务进度：

```typescript
import { reportStage, reportProgress } from './src/utils/progress'

// 报告阶段完成
await reportStage(job, 'prepare', 100, { metadata: 'value' })

// 报告具体进度
await reportProgress(job, 50, 'Processing...', { immediate: true })
```

进度报告包含以下阶段：
- `prepare` - 准备阶段
- `build_prompt` - 构建提示词
- `generate` - AI 生成阶段
- `parse_save` - 解析和保存
- `post_process` - 后处理
- `upload` - 上传到存储
- `save` - 保存到数据库

## 错误处理和重试

### 指数退避重试

```typescript
import { withRetry, calculateBackoffDelay } from './src/utils/retry'

await withRetry(
  async (attempt) => {
    return await someAsyncOperation()
  },
  {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffFactor: 2,
  }
)
```

### 错误分类

```typescript
import { categorizeError, ErrorCategory } from './src/utils/retry'

const category = categorizeError(error)
// ErrorCategory.RETRYABLE - 可重试的临时错误
// ErrorCategory.PERMANENT - 不可重试的永久错误
// ErrorCategory.CONFIGURATION - 配置错误
// ErrorCategory.VALIDATION - 验证错误
// ErrorCategory.NOT_FOUND - 资源不存在
// ErrorCategory.PERMISSION - 权限错误
```

## 环境变量

```bash
# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 队列并发度配置
QUEUE_CONCURRENCY_LLM=50
QUEUE_CONCURRENCY_IMAGE=50
QUEUE_CONCURRENCY_VIDEO=5
QUEUE_CONCURRENCY_VOICE=20

# 数据库配置
DATABASE_URL="file:./prisma/dev.db"
```

## 启动 Worker

```bash
# 开发模式
pnpm dev

# 生产模式
pnpm start
```

## 开发指南

### 添加新的任务处理器

1. 在 `src/handlers/` 创建处理器文件：

```typescript
// src/handlers/myHandler.ts
import type { Job } from 'bullmq'
import type { TaskJobData } from '@ai-drama-studio/queue'
import { reportStage, reportSuccess, reportFailure } from '../utils/progress'

export async function handleMyTask(job: Job<TaskJobData>): Promise<Record<string, unknown>> {
  try {
    await reportStage(job, 'prepare', 0)
    // ... 处理逻辑
    await reportStage(job, 'prepare', 100)
    
    const result = { status: 'completed' }
    await reportSuccess(job, result)
    return result
  } catch (error) {
    await reportFailure(job, error)
    throw error
  }
}
```

2. 在 `src/handlers/index.ts` 导出处理器

3. 在 `packages/queue/src/types.ts` 添加新的任务类型

4. 在 `packages/queue/src/queues.ts` 将任务类型映射到队列

5. 在对应的 worker 文件中添加任务处理分支
