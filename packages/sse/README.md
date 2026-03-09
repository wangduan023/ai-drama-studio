# SSE 实时推送系统

AI Drama Studio 的 Server-Sent Events (SSE) 实时任务进度推送系统。

## 架构概述

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   BullMQ Worker │────▶│  Task Publisher  │────▶│   Redis Pub/Sub │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  React Client   │◀────│   SSE Handler    │◀────│  Redis Channel  │
│  (EventSource)  │     │  (Next.js API)   │     │  (per project)  │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## 核心组件

### 1. 事件发射器 (Emitter)

```typescript
import { taskProgressEmitter, emitTaskProgress } from '@ai-drama-studio/sse'

// 发射任务进度事件
emitTaskProgress({
  taskId: 'task-123',
  projectId: 'project-456',
  userId: 'user-789',
  type: 'task.progress',
  progress: 50,
  stage: 'generating',
  message: 'Generating images...',
})
```

### 2. 事件发布器 (Publisher)

```typescript
import { publishTaskEvent, publishTaskStreamEvent } from '@ai-drama-studio/sse'

// 发布任务生命周期事件
await publishTaskEvent({
  taskId: 'task-123',
  projectId: 'project-456',
  userId: 'user-789',
  type: 'task.progress',
  taskType: 'image_generate',
  payload: {
    progress: 50,
    stage: 'generating',
    message: '50% complete',
  },
})

// 发布流式事件 (LLM streaming)
await publishTaskStreamEvent({
  taskId: 'task-123',
  projectId: 'project-456',
  userId: 'user-789',
  payload: {
    stream: {
      kind: 'text',
      delta: 'Hello',
      seq: 1,
    },
  },
})
```

### 3. Worker 进度上报

```typescript
import { reportTaskProgress, reportTaskStreamChunk } from '@ai-drama-studio/sse/worker'

// 在 BullMQ Worker 中上报进度
await reportTaskProgress(jobData, 50, {
  stage: 'generating',
  message: 'Generating images...',
})

// 上报流式数据
await reportTaskStreamChunk(jobData, {
  kind: 'text',
  delta: 'Generated text...',
  seq: 1,
})
```

### 4. React Hook (前端订阅)

```tsx
import { useTaskProgress } from '@ai-drama-studio/sse/react'

function TaskProgressCard({ taskId, projectId }: { taskId: string, projectId: string }) {
  const { progress, status, isConnected, isComplete, latestEvent } = useTaskProgress({
    projectId,
    taskId,
    autoReconnect: true,
    onEvent: (event) => console.log('New event:', event),
  })

  return (
    <div>
      <div>Status: {status}</div>
      <div>Progress: {progress}%</div>
      <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
      {isComplete && <div>Task completed!</div>}
    </div>
  )
}
```

## API 端点

### SSE 流端点

```
GET /api/sse?projectId={projectId}
Headers:
  - x-user-id: {userId}
  - last-event-id: {optional, for replay}
```

### 任务专用 SSE 端点

```
GET /api/tasks/{taskId}/stream?projectId={projectId}
Headers:
  - x-user-id: {userId}
```

### 任务进度查询 (REST)

```
GET /api/tasks/{taskId}/progress?projectId={projectId}

Response:
{
  "taskId": "task-123",
  "projectId": "project-456",
  "status": "processing",
  "progress": 50,
  "payload": { ... },
  "queuedAt": "2024-01-01T00:00:00Z",
  ...
}
```

## 事件类型

### 生命周期事件

- `task.created` - 任务已创建并入队
- `task.processing` - 任务开始处理
- `task.progress` - 任务进度更新
- `task.completed` - 任务完成
- `task.failed` - 任务失败

### 流式事件

- `task.stream` - LLM 流式输出

## Redis 频道

频道命名格式：`task-events:project:{projectId}`

每个项目有一个独立的 Redis 频道，所有该项目的任务事件都发布到这个频道。

## 环境变量

```bash
# Redis 连接
REDIS_URL=redis://localhost:6379

# SSE 配置
SSE_STREAM_EPHEMERAL_ENABLED=true  # 是否持久化流式事件
NODE_ENV=production                  # 生产环境减少日志输出
```

## 文件结构

```
packages/sse/
├── src/
│   ├── types.ts              # 类型定义
│   ├── emitter.ts            # Node.js EventEmitter
│   ├── publisher.ts          # Redis 发布器
│   ├── shared-subscriber.ts  # 共享订阅者
│   ├── logger.ts             # 日志工具
│   ├── redis.ts              # Redis 客户端
│   ├── worker/
│   │   ├── index.ts
│   │   └── progress-reporter.ts  # Worker 进度上报
│   ├── react/
│   │   ├── index.ts
│   │   └── use-task-progress.ts  # React Hooks
│   └── index.ts            # 统一导出
├── package.json
└── tsconfig.json

apps/web/app/api/
├── sse/
│   └── route.ts            # 通用 SSE 端点
└── tasks/[id]/
    ├── stream/
    │   └── route.ts        # 任务 SSE 端点
    └── progress/
        └── route.ts        # 任务进度查询端点
```

## 特性

- **多客户端订阅**: 支持多个客户端同时订阅同一任务进度
- **心跳保持**: 15 秒心跳间隔保持连接活跃
- **事件回放**: 通过 `last-event-id` 头部支持断线重连后的事件回放
- **类型安全**: 完整的 TypeScript 类型定义
- **Worker 集成**: 与 BullMQ Worker 无缝集成
- **React Hooks**: 开箱即用的 React Hooks

## 使用示例

### 完整 Worker 示例

```typescript
import { Queue, Worker } from 'bullmq'
import { reportTaskProgress } from '@ai-drama-studio/sse/worker'

const imageQueue = new Queue('image', { connection: redisConfig })

const worker = new Worker('image', async (job) => {
  const { taskId, projectId, userId, type } = job.data

  // 报告开始处理
  await reportTaskProgress(job.data, 0, {
    stage: 'received',
    message: 'Task received',
  })

  // 处理中...
  await reportTaskProgress(job.data, 25, {
    stage: 'processing',
    message: 'Processing...',
  })

  // 生成图片
  const imageUrl = await generateImage(job.data.payload)
  await reportTaskProgress(job.data, 75, {
    stage: 'generating',
    imageUrl,
  })

  // 完成
  await reportTaskProgress(job.data, 100, {
    stage: 'completing',
    message: 'Task completed',
  })

  return { imageUrl }
}, { connection: redisConfig })
```

### 完整 React 组件示例

```tsx
'use client'

import { useTaskProgress } from '@ai-drama-studio/sse/react'

export function TaskMonitor({ projectId }: { projectId: string }) {
  const { events, progress, status, isConnected, error } = useTaskProgress({
    projectId,
    autoReconnect: true,
    reconnectDelay: 5000,
    onEvent: (event) => {
      console.log('Event received:', event)
    },
  })

  if (error) {
    return <div className="text-red-500">Error: {error.message}</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-4">
        <div
          className="bg-blue-500 h-4 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="text-sm text-gray-600">
        {events.map((event) => (
          <div key={event.id}>
            [{new Date(event.ts).toLocaleTimeString()}] {event.payload?.message}
          </div>
        ))}
      </div>
    </div>
  )
}
```
