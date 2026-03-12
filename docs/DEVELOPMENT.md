# AI Drama Studio - 开发指南

> **最后更新:** 2026-03-12
> **版本:** 0.1.0

---

## 1. 开发环境设置

### 1.1 前置要求

| 工具 | 版本 | 用途 |
|------|------|------|
| Node.js | >= 20.0.0 | 运行时 |
| pnpm | >= 8.0.0 | 包管理器 |
| Git | >= 2.30 | 版本控制 |
| MySQL | 8.0+ | 数据库（可用 Docker） |
| Redis | 7.0+ | 缓存/队列（可用 Docker） |
| Docker | 20.10+ | 容器化（可选） |

### 1.2 克隆项目

```bash
git clone https://github.com/your-org/ai-drama-studio.git
cd ai-drama-studio
```

### 1.3 安装依赖

```bash
# 启用 pnpm
corepack enable

# 安装所有依赖
pnpm install

# 生成 Prisma 客户端
pnpm db:generate
```

### 1.4 配置环境变量

```bash
# 复制示例文件
cp apps/web/.env.example apps/web/.env.local

# 编辑环境变量
vim apps/web/.env.local
```

**最小配置:**

```bash
# 数据库（使用 Docker MySQL）
DATABASE_URL="mysql://root:aidrama123@localhost:13306/ai_drama_studio"

# Redis（使用 Docker Redis）
REDIS_HOST="localhost"
REDIS_PORT="6379"

# 认证
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-secret-key-not-for-production"

# AI API（至少配置一个）
OPENAI_API_KEY="sk-xxx"
```

### 1.5 启动基础设施

```bash
# 使用 Docker 启动 MySQL 和 Redis
docker-compose up -d mysql redis

# 等待服务就绪
sleep 5

# 验证连接
docker-compose ps
```

### 1.6 数据库初始化

```bash
# 推送数据库结构
pnpm db:push

# (可选) 插入种子数据
pnpm db:seed
```

---

## 2. 开发工作流

### 2.1 启动开发服务

```bash
# 方式 1: 同时启动 Web 和 Worker（推荐）
pnpm dev

# 方式 2: 分别启动
# 终端 1 - Web
pnpm dev:web

# 终端 2 - Worker
pnpm dev:worker
```

### 2.2 访问地址

| 服务 | URL | 说明 |
|------|-----|------|
| Web 应用 | http://localhost:3000 | 主应用 |
| API | http://localhost:3000/api | API 接口 |
| Bull Board | http://localhost:3010/admin/queues | 队列管理 |

### 2.3 热重载

- **Web**: Next.js 支持文件变更自动重载
- **Worker**: tsx watch 模式自动重启
- **Packages**: 修改后自动生效（无需重新构建）

---

## 3. 项目结构详解

### 3.1 Monorepo 布局

```
ai-drama-studio/
├── apps/              # 应用程序
│   ├── web/           # Next.js Web 应用
│   └── worker/        # BullMQ Worker
│
├── packages/          # 共享包
│   ├── db/            # 数据库层 (Prisma)
│   ├── ai-client/     # AI 客户端
│   ├── core/          # 核心业务
│   ├── workflow/      # 工作流引擎
│   ├── queue/         # 队列系统
│   ├── prompt-system/ # 提示词系统
│   └── sse/           # SSE 推送
│
└── docker/            # Docker 配置
```

### 3.2 包依赖关系

```
web ─┬─► db
     ├─► ai-client
     ├─► core
     ├─► sse
     └─► queue

worker ─┬─► db
        ├─► ai-client
        ├─► workflow
        ├─► queue
        └─► prompt-system

core ─┬─► db
      └─► prompt-system

workflow ─► prompt-system

ai-client ─► db

queue ─► (无内部依赖)

sse ─► (无内部依赖)

db ─► (无内部依赖)
```

---

## 4. 代码规范

### 4.1 TypeScript 配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### 4.2 代码风格

**命名规范:**

```typescript
// 文件/目录：kebab-case
// src/services/character-profile.service.ts

// 类/组件：PascalCase
class CharacterProfile { }

// 函数/变量：camelCase
const getCharacter = () => { }

// 常量：UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3

// 类型/接口：PascalCase
interface UserProfile { }
type CharacterRole = 'S' | 'A' | 'B'

// 私有成员：_prefix
private _cache: Map<string, any>
```

**导入顺序:**

```typescript
// 1. 第三方库
import React from 'react'
import { PrismaClient } from '@prisma/client'

// 2. 内部包
import { AIClient } from '@ai-drama-studio/ai-client'
import { ProjectRepository } from '@ai-drama-studio/db'

// 3. 相对路径
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// 4. 类型导入
import type { Project } from '@ai-drama-studio/db'
```

### 4.3 错误处理

```typescript
// 使用自定义错误类
import { AppError, ErrorCode } from '@ai-drama-studio/core'

async function generateScript(episodeId: string) {
  try {
    const episode = await this.episodeRepository.findById(episodeId)

    if (!episode) {
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: '剧集不存在',
        statusCode: 404
      })
    }

    // 处理逻辑...
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    // 包装为系统错误
    throw new AppError({
      code: ErrorCode.INTERNAL_ERROR,
      message: '生成剧本失败',
      cause: error,
      statusCode: 500
    })
  }
}
```

---

## 5. 数据库开发

### 5.1 修改 Schema

编辑 `packages/db/prisma/schema.prisma`:

```prisma
model Project {
  id          String   @id @default(uuid())
  name        String
  // 添加新字段
  tags        String?  // JSON 数组
  isFavorite  Boolean  @default(false)
}
```

### 5.2 创建迁移

```bash
# 开发环境
pnpm db:migrate

# 输入迁移名称
? Enter a name for the new migration: › add_tags_and_favorite_to_project
```

### 5.3 使用 Repository

```typescript
// packages/db/src/repositories/project.repository.ts
export class ProjectRepository extends BaseRepository<Project> {
  constructor(prisma: PrismaService) {
    super(prisma, 'project')
  }

  async findByUser(userId: string): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: {
        userId,
        deletedAt: null
      },
      include: {
        episodes: {
          where: { deletedAt: null },
          select: { id: true, number: true, name: true }
        }
      }
    })
  }

  async updateWithOptimisticLock(
    id: string,
    version: number,
    data: Partial<Project>
  ): Promise<Project> {
    return this.prisma.project.update({
      where: {
        id,
        version  // 乐观锁检查
      },
      data: {
        ...data,
        version: version + 1
      }
    })
  }
}
```

---

## 6. AI 集成开发

### 6.1 配置 AI Provider

```typescript
// 通过数据库配置动态加载
const provider = await prisma.aiProvider.create({
  data: {
    name: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: process.env.OPENAI_API_KEY,
    isActive: true,
    priority: 1
  }
})

// 配置模型
await prisma.aiModel.create({
  data: {
    providerId: provider.id,
    modelId: 'gpt-4o',
    name: 'GPT-4o',
    type: 'TEXT',
    isEnabled: true,
    isDefault: true,
    inputCost: 0.000005,
    outputCost: 0.000015
  }
})
```

### 6.2 使用 AI 客户端

```typescript
import { AIClientFactory } from '@ai-drama-studio/ai-client'

// 获取客户端
const factory = new AIClientFactory(prisma)
const client = await factory.getClient('openai')

// 文本生成
const result = await client.generateText({
  prompt: '请帮我写一个古装剧的开头...',
  options: {
    model: 'gpt-4o',
    maxTokens: 2000,
    temperature: 0.7
  }
})

console.log(result.content)
console.log(result.usage) // { inputTokens: 50, outputTokens: 500 }
```

### 6.3 负载均衡器

```typescript
import { LoadBalancer } from '@ai-drama-studio/ai-client'

const balancer = new LoadBalancer(prisma)

// 自动选择最佳 provider
const provider = await balancer.selectProvider('TEXT')

// 创建客户端
const client = await factory.createClient(provider)

// 或使用便捷方法
const result = await balancer.execute('TEXT', {
  prompt: '...',
  options: { model: 'gpt-4o' }
})
```

---

## 7. 工作流开发

### 7.1 Pipeline 阶段

```typescript
// packages/workflow/src/pipeline.ts
export class Pipeline {
  private stages: Stage[] = []

  // 添加阶段
  addStage(stage: Stage): this {
    this.stages.push(stage)
    return this
  }

  // 执行 pipeline
  async execute(context: PipelineContext): Promise<PipelineResult> {
    for (const stage of this.stages) {
      if (context.shouldSkip(stage.name)) {
        continue
      }

      const result = await stage.execute(context)

      if (result.status === 'FAILED') {
        return { status: 'FAILED', stage: stage.name, error: result.error }
      }

      context.merge(result.output)
    }

    return { status: 'SUCCESS', output: context.getAll() }
  }
}
```

### 7.2 创建自定义阶段

```typescript
// packages/workflow/src/stages/script-generate.stage.ts
export class ScriptGenerateStage implements Stage {
  name = 'SCRIPT_GENERATE'

  async execute(context: PipelineContext): Promise<StageResult> {
    const { episodeId, novelText } = context.get('input')

    // 调用 AI 生成剧本
    const aiClient = context.get('aiClient')
    const script = await aiClient.generateText({
      prompt: renderPrompt('script-generate', { novelText })
    })

    // 保存剧本
    await this.scriptRepository.create({
      episodeId,
      content: script.content
    })

    return {
      status: 'SUCCESS',
      output: { scriptId: script.id, content: script.content }
    }
  }
}
```

---

## 8. 队列任务开发

### 9.1 创建任务处理器

```typescript
// packages/queue/src/processors/image.processor.ts
import { Job } from 'bullmq'

export class ImageProcessor {
  async process(job: Job<ImageJobData>): Promise<ImageJobResult> {
    const { episodeId, storyboardId, prompt } = job.data

    // 更新进度
    await job.updateProgress(10)

    // 选择 AI 模型
    const provider = await this.selectProvider('IMAGE')

    // 生成图像
    await job.updateProgress(50)
    const result = await provider.generateImage({ prompt })

    // 保存结果
    await job.updateProgress(80)
    await this.storyboardRepository.update(storyboardId, {
      imageUrl: result.url
    })

    await job.updateProgress(100)

    return {
      success: true,
      imageUrl: result.url,
      model: provider.name
    }
  }
}
```

### 9.2 添加任务到队列

```typescript
// apps/web/app/api/generate/scene/route.ts
import { getQueue } from '@ai-drama-studio/queue'

export async function POST(req: Request) {
  const { episodeId, options } = await req.json()

  const queue = getQueue('drama:image:generate')

  const job = await queue.add('generate-image', {
    episodeId,
    ...options
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    }
  })

  return Response.json({
    taskId: job.id,
    status: 'QUEUED'
  })
}
```

---

## 10. SSE 实时推送

### 10.1 发布事件

```typescript
// packages/sse/src/publisher.ts
import { EventPublisher } from '@ai-drama-studio/sse'

const publisher = new EventPublisher(redis)

// 发布任务进度
await publisher.publishTaskProgress({
  taskId: 'task-123',
  projectId: 'proj-456',
  userId: 'user-789',
  progress: 50,
  message: '正在生成图像...'
})

// 发布任务完成
await publisher.publishTaskCompleted({
  taskId: 'task-123',
  projectId: 'proj-456',
  userId: 'user-789',
  result: { imageUrl: 'https://...' }
})
```

### 10.2 客户端订阅

```typescript
// apps/web/hooks/useTaskStream.ts
import { useSSE } from '@ai-drama-studio/sse/react'

export function useTaskStream(taskId: string) {
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)

  const handler = useSSE('/api/sse', {
    onTaskProgress: (data) => {
      if (data.taskId === taskId) {
        setProgress(data.progress)
      }
    },
    onTaskCompleted: (data) => {
      if (data.taskId === taskId) {
        setResult(data.result)
      }
    }
  })

  return { progress, result, connected: handler.connected }
}
```

---

## 11. 测试

### 11.1 单元测试

```typescript
// packages/db/__tests__/repositories/project.repository.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { ProjectRepository } from '../../src/repositories'
import { createTestPrisma } from '../utils/test-prisma'

describe('ProjectRepository', () => {
  let repository: ProjectRepository
  let prisma: PrismaClient

  beforeEach(async () => {
    prisma = await createTestPrisma()
    repository = new ProjectRepository(prisma)
  })

  it('should create a project', async () => {
    const project = await repository.create({
      name: '测试项目',
      userId: 'user-123'
    })

    expect(project).toMatchObject({
      name: '测试项目',
      userId: 'user-123',
      status: 'DRAFT'
    })
  })

  it('should find project by user', async () => {
    await repository.create({
      name: '项目 1',
      userId: 'user-123'
    })

    const projects = await repository.findByUser('user-123')

    expect(projects).toHaveLength(1)
    expect(projects[0].name).toBe('项目 1')
  })
})
```

### 11.2 运行测试

```bash
# 运行所有测试
pnpm test

# 运行覆盖率测试
pnpm test:coverage

# 运行特定包的测试
cd packages/db && pnpm test

# 监听模式
pnpm test:watch

# 运行 E2E 测试
pnpm test:e2e
```

---

## 12. 调试技巧

### 12.1 日志输出

```typescript
import { createLogger } from '@ai-drama-studio/ai-client'

const logger = createLogger('ScriptService')

logger.info('开始生成剧本', { episodeId })
logger.debug('AI 响应', { response })
logger.error('生成失败', { error })
```

### 12.2 VS Code 调试配置

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Web",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev:web"],
      "autoAttachChildProcesses": true
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Worker",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev:worker"],
      "console": "integratedTerminal"
    }
  ]
}
```

---

## 13. Git 工作流

### 13.1 分支策略

```
main          # 生产分支
  ├── develop        # 开发分支
  │     ├── feature/add-character-profile
  │     ├── feature/video-generation
  │     └── fix/api-rate-limit
  └── release/v0.2.0 # 发布分支
```

### 13.2 提交规范

```bash
# 功能
git commit -m "feat: 添加角色外观形态管理"

# 修复
git commit -m "fix: 修复视频生成队列阻塞问题"

# 文档
git commit -m "docs: 更新 API 接口说明"

# 重构
git commit -m "refactor: 重构 AI 客户端工厂"

# 测试
git commit -m "test: 添加项目仓库单元测试"

# 配置
git commit -m "chore: 更新 BullMQ 队列配置"
```

### 13.3 PR 流程

```bash
# 1. 创建功能分支
git checkout -b feature/your-feature develop

# 2. 开发并提交
git add .
git commit -m "feat: 实现功能"

# 3. 推送分支
git push origin feature/your-feature

# 4. 创建 PR (GitHub/GitLab)
# 5. Code Review
# 6. 合并到 develop
```

---

## 附录

### A. 常用命令

```bash
# 开发
pnpm dev              # 启动所有开发服务
pnpm dev:web          # 启动 Web
pnpm dev:worker       # 启动 Worker

# 数据库
pnpm db:generate      # 生成 Prisma 客户端
pnpm db:migrate       # 创建并执行迁移
pnpm db:push          # 直接推送变更
pnpm db:seed          # 插入种子数据
pnpm db:studio        # 打开 Prisma Studio

# 构建
pnpm build            # 构建所有
pnpm build:prisma     # 生成 Prisma

# 测试
pnpm test             # 运行测试
pnpm test:coverage    # 覆盖率测试
pnpm test:e2e         # E2E 测试

# 代码质量
pnpm lint             # ESLint
pnpm typecheck        # TypeScript 检查
```

### B. 故障排查

**问题：pnpm install 失败**

```bash
# 清除缓存
pnpm store prune

# 重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**问题：Prisma 客户端过期**

```bash
pnpm db:generate
```

**问题：端口被占用**

```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>
```
