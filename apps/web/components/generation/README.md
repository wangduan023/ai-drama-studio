# Generation Components

AI Drama Studio 实时进度更新系统组件

## 组件列表

### GenerationProgress

显示 AI 生成任务的实时进度面板，包括总体进度条、各阶段进度、日志输出等。

```tsx
import { GenerationProgress } from '@/components/generation'

function MyComponent() {
  return (
    <GenerationProgress
      taskId="task-123"
      projectId="project-456"
      episodeId="episode-789" // 可选
      onComplete={(result) => console.log('完成:', result)}
      onError={(error) => console.error('错误:', error)}
      onCancel={() => console.log('用户取消')}
      showLog={true} // 是否显示日志面板
    />
  )
}
```

### GenerationLog

显示任务生成过程的日志消息，支持不同级别、时间戳、自动滚动等。

```tsx
import { GenerationLog, useSSE } from '@/components/generation'

function MyComponent() {
  const { events } = useSSE({ projectId: 'project-456' })
  
  return (
    <GenerationLog 
      events={events} 
      maxHeight={300}
      showTimestamp={true}
      autoScroll={true}
    />
  )
}
```

## 使用 SSE Hook

### 基础用法

```tsx
import { useSSE } from '@/hooks/useSSE'

function MyComponent() {
  const { 
    connected, 
    connecting,
    events, 
    lastEvent,
    reconnectAttempts,
    error,
    reconnect,
    disconnect 
  } = useSSE({
    projectId: 'project-123',
    episodeId: 'episode-456', // 可选
    enabled: true,
    onEvent: (event) => console.log('收到事件:', event),
    onConnected: () => console.log('SSE 已连接'),
    onDisconnected: () => console.log('SSE 已断开'),
    onError: (error) => console.error('SSE 错误:', error),
    reconnect: {
      enabled: true,
      maxAttempts: 10,
      interval: 3000,
    }
  })

  return (
    <div>
      <span>{connected ? '已连接' : '已断开'}</span>
      {reconnectAttempts > 0 && <span>重试次数: {reconnectAttempts}</span>}
      <button onClick={reconnect}>手动重连</button>
      <button onClick={disconnect}>断开连接</button>
    </div>
  )
}
```

### 流式输出

```tsx
import { useSSEStream } from '@/hooks/useSSE'

function StreamComponent() {
  const { connected, streamContent } = useSSEStream({
    projectId: 'project-123',
    taskId: 'task-456',
    onChunk: (chunk) => console.log('收到块:', chunk),
    onComplete: () => console.log('流式输出完成'),
  })

  return (
    <div>
      <div>{streamContent}</div>
    </div>
  )
}
```

## Worker 中使用

```typescript
import { 
  publishTaskProgress, 
  publishTaskComplete, 
  publishTaskFailed,
  createProgressReporter 
} from '@/utils/sse'

// 方式1: 直接发布事件
await publishTaskProgress(
  taskId,
  projectId,
  userId,
  50, // 进度 50%
  '正在处理中...'
)

await publishTaskComplete(
  taskId,
  projectId,
  userId,
  { result: '完成结果' }
)

await publishTaskFailed(
  taskId,
  projectId,
  userId,
  '处理失败',
  'ERROR_CODE',
  true // 是否可重试
)

// 方式2: 使用 Progress Reporter
const reporter = createProgressReporter(taskId, projectId, userId)

await reporter.start('processing', '开始处理')
await reporter.report(25, '步骤 1 完成')
await reporter.report(50, '步骤 2 完成')
await reporter.report(75, '步骤 3 完成')
await reporter.complete({ result: '成功' })
// 或 await reporter.fail('错误信息')
```

## API 路由

### SSE 端点

```
GET /api/sse?projectId={projectId}&episodeId={episodeId}&lastEventId={lastEventId}

Headers:
  Authorization: Bearer {JWT_TOKEN}
```

特性:
- JWT Token 认证
- 项目权限验证
- 历史事件回放 (支持 lastEventId)
- 自动心跳保活
- 自动重连支持

## 事件类型

### Lifecycle 事件

- `task.created` - 任务创建
- `task.processing` - 开始处理
- `task.progress` - 进度更新
- `task.completed` - 任务完成
- `task.failed` - 任务失败

### Stream 事件

- `task.stream` - LLM 流式输出

### 连接事件

- `connected` - SSE 连接建立
- `heartbeat` - 心跳
- `error` - 连接错误
