# AI Drama Studio - 项目架构文档

> **最后更新:** 2026-03-12
> **版本:** 0.1.0

---

## 1. 项目概述

AI Drama Studio 是一个 **AI 驱动的短剧/漫剧生成平台**，通过多阶段工作流将小说/剧本自动转换为视频内容。

### 1.1 核心功能

- **小说 → 剧本转换**: AI 自动分析小说文本，生成结构化剧本
- **剧本 → 分镜生成**: 根据剧本自动生成可视化分镜
- **分镜 → 图像/视频**: 调用多模型 AI 生成图像和视频
- **多轨道剪辑**: 集成 CutOS AI 剪辑器，支持对话式剪辑
- **团队协作**: 支持多人协作项目和评论系统

### 1.2 技术栈总览

| 层级 | 技术 |
|------|------|
| **前端** | Next.js 15, React 19, TypeScript, TailwindCSS 4, Shadcn UI |
| **后端** | Next.js API Routes, Express (Worker) |
| **数据库** | MySQL 8 + Prisma ORM |
| **缓存/队列** | Redis 7 + BullMQ |
| **AI 框架** | Vercel AI SDK + 自研多账户负载均衡器 |
| **实时通信** | SSE (Server-Sent Events), Socket.IO |
| **认证** | NextAuth.js + JWT |

---

## 2. 项目结构

```
ai-drama-studio/
├── apps/                          # 应用程序
│   ├── web/                       # Next.js Web 应用
│   │   ├── app/                   # Next.js 15 App Router
│   │   │   ├── api/               # API 路由 (Route Handlers)
│   │   │   ├── (auth)/            # 认证页面组
│   │   │   ├── projects/          # 项目管理页面
│   │   │   └── layout.tsx         # 根布局
│   │   ├── components/            # React 组件
│   │   │   ├── ui/                # 基础 UI 组件 (Shadcn)
│   │   │   ├── collaboration/     # 协作功能组件
│   │   │   ├── generation/        # AI 生成组件
│   │   │   └── storyboard/        # 分镜组件
│   │   ├── lib/                   # 工具库
│   │   │   ├── api/               # API 客户端
│   │   │   ├── auth/              # 认证工具
│   │   │   └── query/             # React Query 配置
│   │   └── hooks/                 # 自定义 Hooks
│   │
│   └── worker/                    # BullMQ Worker 应用
│       ├── index.ts               # Worker 入口
│       └── processors/            # 任务处理器 (在 queue 包中)
│
├── packages/                      # 共享包 (Monorepo)
│   ├── db/                        # 数据库层
│   │   ├── prisma/
│   │   │   └── schema.prisma      # Prisma 数据模型
│   │   ├── src/
│   │   │   ├── client.ts          # Prisma 客户端
│   │   │   ├── repositories/      # 数据访问层
│   │   │   ├── schemas/           # Zod 验证 Schema
│   │   │   └── utils/             # 工具函数 (加密等)
│   │   └── __tests__/             # 测试
│   │
│   ├── ai-client/                 # AI 客户端抽象层
│   │   ├── src/
│   │   │   ├── clients/           # 各厂商客户端 (OpenAI, Anthropic, 豆包等 25+)
│   │   │   ├── providers/         # Provider 适配层
│   │   │   ├── config/            # AI 配置管理
│   │   │   ├── types/             # 类型定义
│   │   │   ├── factory.ts         # AI 客户端工厂
│   │   │   ├── loadbalancer-enhanced.ts  # 增强负载均衡器
│   │   │   └── multi-account-balancer.ts # 多账户轮询器
│   │   └── __tests__/
│   │
│   ├── core/                      # 核心业务逻辑
│   │   ├── src/
│   │   │   ├── domain/            # 领域模型
│   │   │   ├── services/          # 领域服务
│   │   │   └── events/            # 领域事件
│   │   └── __tests__/
│   │
│   ├── workflow/                  # 工作流编排引擎
│   │   ├── src/
│   │   │   ├── pipeline.ts        # Pipeline 引擎
│   │   │   ├── stage.ts           # 阶段定义
│   │   │   └── stages/            # 具体阶段实现
│   │   └── __tests__/
│   │
│   ├── queue/                     # BullMQ 队列系统
│   │   ├── src/
│   │   │   ├── queues.ts          # 队列定义
│   │   │   ├── processors.ts      # 任务处理器
│   │   │   └── types.ts           # 队列类型
│   │   └── __tests__/
│   │
│   ├── prompt-system/             # 提示词管理系统
│   │   ├── src/
│   │   │   ├── template-store.ts  # 提示词模板存储
│   │   │   ├── renderer.ts        # 提示词渲染器
│   │   │   └── catalog.ts         # 提示词目录
│   │   └── __tests__/
│   │
│   └── sse/                       # SSE 实时推送系统
│       ├── src/
│       │   ├── emitter.ts         # 事件发射器
│       │   ├── publisher.ts       # 发布者
│       │   ├── redis.ts           # Redis 发布订阅
│       │   └── react/             # React Hooks
│       └── __tests__/
│
├── docker/                        # Docker 配置
│   ├── Dockerfile.web             # Web 服务镜像
│   └── Dockerfile.worker          # Worker 服务镜像
│
├── docker-compose.yml             # Docker Compose 配置
├── package.json                   # 根包配置 (Monorepo)
└── tsconfig.json                  # TypeScript 配置
```

---

## 3. 核心模块详解

### 3.1 数据库层 (@ai-drama-studio/db)

**职责:** 数据持久化、数据访问层、数据验证

#### 核心数据模型

| 模型 | 说明 |
|------|------|
| `User` | 用户账户、角色权限 |
| `Project` | 项目聚合根 |
| `Episode` | 剧集 (工作流执行单元) |
| `Script` | 剧本 |
| `Storyboard` | 分镜 |
| `Clip` | 镜头/片段 |
| `CharacterProfile` | 角色档案 (多阶段一致性核心) |
| `CharacterAppearance` | 角色外观形态 |
| `LocationProfile` | 场景档案 |
| `AiProvider` | AI 渠道商配置 |
| `AiModel` | AI 模型配置 |
| `AiProxy` | HTTP 代理池 |
| `AiUsageLog` | AI API 调用记录 |
| `Task` | 任务追踪 |
| `TaskEvent` | 任务事件 (SSE 回放) |
| `Asset` | 资产库 (图片/视频/音频) |

#### Repositories

```
repositories/
├── base.repository.ts           # 基础仓库 (泛型 CRUD)
├── project.repository.ts        # 项目仓库
├── episode.repository.ts        # 剧集仓库
├── character.repository.ts      # 角色仓库
├── location.repository.ts       # 场景仓库
├── ai-provider.repository.ts    # AI 渠道仓库
├── ai-model.repository.ts       # AI 模型仓库
├── ai-usage.repository.ts       # AI 使用记录仓库
└── proxy.repository.ts          # 代理仓库
```

### 3.2 AI 客户端层 (@ai-drama-studio/ai-client)

**职责:** 统一 AI API 调用接口、多厂商适配、负载均衡、故障转移

#### 支持的 AI 厂商 (25+)

| 类别 | 厂商 |
|------|------|
| **国际大模型** | OpenAI, Anthropic, Google (Gemini) |
| **中国大模型** | 阿里通义千问 (Qwen), 百度文心一言，腾讯混元，讯飞星火，智谱 AI，月之暗面 (Kimi), MiniMax, 零一万物 (Yi), 百川智能，商汤日日新 |
| **视频生成** | Kling (可灵), Luma, Runway, Stepfun (阶跃) |
| **图像生成** | Stability AI, Fal.ai, HuggingFace, ComfyUI |
| **语音合成** | ElevenLabs |
| **其他** | Groq, Cohere, Mistral, Ollama (本地), DeepSeek, 豆包 |

#### 核心组件

```
src/
├── base.ts                      # AI 客户端基类
├── factory.ts                   # 客户端工厂 (根据 Provider 创建实例)
├── load-balancer.ts             # 基础负载均衡器
├── loadbalancer-enhanced.ts     # 增强负载均衡器 (支持健康检查)
├── multi-account-balancer.ts    # 多账户轮询器 (支持 quota 管理)
├── errors.ts                    # 统一错误处理
└── validation.ts                # 参数验证
```

#### AI 客户端接口

```typescript
interface AIClient {
  // 文本生成
  generateText(prompt: string, options: TextOptions): Promise<TextResult>

  // 图像生成
  generateImage(prompt: string, options: ImageOptions): Promise<ImageResult>

  // 视频生成
  generateVideo(prompt: string, options: VideoOptions): Promise<VideoResult>

  // 语音合成
  generateAudio(text: string, options: AudioOptions): Promise<AudioResult>
}
```

### 3.3 工作流引擎 (@ai-drama-studio/workflow)

**职责:** Pipeline 编排、阶段管理、状态流转

#### Pipeline 阶段

```
小说文本
   │
   ▼
┌─────────────────┐
│  Phase 1:       │
│  小说 → 剧本    │
│  (Script)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Phase 2:       │
│  剧本 → 分镜    │
│  (Storyboard)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Phase 3:       │
│  分镜 → 图像    │
│  (Image Gen)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Phase 4:       │
│  图像 → 视频    │
│  (Video Gen)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Phase 5:       │
│  配音 + 字幕    │
│  (Post Prod)    │
└─────────────────┘
```

### 3.4 队列系统 (@ai-drama-studio/queue)

**职责:** BullMQ 队列管理、任务分发、并发控制

#### 队列定义

```typescript
// 队列配置
const QUEUES = {
  IMAGE: 'drama:image:generate',      // 图像生成队列
  VIDEO: 'drama:video:generate',      // 视频生成队列
  VOICE: 'drama:voice:generate',      // 语音合成队列
  TEXT: 'drama:text:generate',        // 文本生成队列
}

// 并发配置
const CONCURRENCY = {
  IMAGE: 50,   // 图像生成并发数
  VIDEO: 50,   // 视频生成并发数
  VOICE: 20,   // 语音合成并发数
  TEXT: 50,    // 文本生成并发数
}
```

#### 任务处理器

```
processors/
├── image.processor.ts           # 图像生成处理器
├── video.processor.ts           # 视频生成处理器
├── voice.processor.ts           # 语音合成处理器
└── text.processor.ts            # 文本生成处理器
```

### 3.5 提示词系统 (@ai-drama-studio/prompt-system)

**职责:** 提示词模板管理、动态渲染、版本控制

#### 核心功能

```typescript
// 模板存储
interface TemplateStore {
  getTemplate(name: string): PromptTemplate
  render(template: string, context: Record<string, any>): string
}

// 提示词目录
interface PromptCatalog {
  categories: PromptCategory[]
  getPromptByTask(taskType: TaskType): PromptTemplate
}
```

### 3.6 SSE 实时推送 (@ai-drama-studio/sse)

**职责:** 实时任务进度推送、事件持久化、客户端重连回放

#### 架构

```
┌──────────────┐     Redis Pub/Sub     ┌──────────────┐
│   Worker     │ ────────────────────▶ │  SSE Server  │
│  (Publisher) │                       │  (Broadcaster)│
└──────────────┘                       └───────┬───────┘
                                               │
                                               │ SSE Stream
                                               ▼
                                       ┌──────────────┐
                                       │  React Client│
                                       │  (Subscriber)│
                                       └──────────────┘
```

#### 事件类型

```typescript
enum TaskEventType {
  TASK_CREATED = 'task.created',
  TASK_PROGRESS = 'task.progress',
  TASK_COMPLETED = 'task.completed',
  TASK_FAILED = 'task.failed',
  TASK_STREAM = 'task.stream',
}
```

---

## 4. API 接口说明

### 4.1 认证 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/auth/local/register` | POST | 用户注册 |
| `/api/auth/local/login` | POST | 用户登录 |
| `/api/auth/local/logout` | POST | 用户登出 |
| `/api/auth/me` | GET | 获取当前用户信息 |
| `/api/auth/password/reset` | POST | 密码重置 |
| `/api/auth/password/change` | POST | 密码修改 |

### 4.2 项目 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/projects` | GET/POST | 获取项目列表/创建项目 |
| `/api/projects/[id]` | GET/PUT/DELETE | 获取/更新/删除项目 |
| `/api/projects/[id]/members` | GET/POST | 获取成员/邀请成员 |
| `/api/projects/[id]/members/[userId]` | DELETE | 移除成员 |
| `/api/projects/[id]/comments` | GET/POST | 获取评论/发表评论 |
| `/api/projects/[id]/activity` | GET | 获取活动记录 |

### 4.3 角色/场景 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/characters` | GET/POST | 获取角色列表/创建角色 |
| `/api/characters/[id]` | GET/PUT/DELETE | 获取/更新/删除角色 |
| `/api/locations` | GET/POST | 获取场景列表/创建场景 |
| `/api/locations/[id]` | GET/PUT/DELETE | 获取/更新/删除场景 |

### 4.4 剧集 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/episodes` | GET/POST | 获取剧集列表/创建剧集 |
| `/api/episodes/[id]` | GET/PUT/DELETE | 获取/更新/删除剧集 |

### 4.5 生成 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/generate/script` | POST | 生成剧本 |
| `/api/generate/scene` | POST | 生成分镜 |
| `/api/generate/character` | POST | 生成角色设计 |
| `/api/generate/video` | POST | 生成视频 |
| `/api/generate/audio` | POST | 生成音频 |
| `/api/generate/status/[taskId]` | GET | 获取任务状态 |

### 4.6 任务 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/tasks/[id]/stream` | GET | 流式获取任务进度 |
| `/api/tasks/[id]/progress` | GET | 获取任务进度快照 |

### 4.7 其他 API

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/credits` | GET/POST | 获取积分/充值 |
| `/api/sse` | GET | SSE 连接端点 |
| `/api/socket` | GET | Socket.IO 连接端点 |
| `/api/invite/[token]` | GET | 邀请链接处理 |

---

## 5. 基础设施

### 5.1 Docker 服务

```yaml
服务组件:
  - MySQL 8.0    (端口：13306:3306)
  - Redis 7      (端口：16379:6379)
  - Web (Next.js) (端口：3000)
  - Worker (BullMQ) (端口：无，后台服务)
  - Bull Board   (端口：3010/admin/queues)
```

### 5.2 环境变量

```bash
# 数据库
DATABASE_URL=mysql://root:aidrama123@localhost:13306/ai_drama_studio

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# 认证
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# AI API Keys
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
GOOGLE_API_KEY=xxx

# 存储
STORAGE_TYPE=local
STORAGE_LOCAL_PATH=./data/uploads
```

---

## 6. 开发规范

### 6.1 Monorepo 结构

- 使用 `pnpm` 作为包管理器
- 使用 `workspace:*` 进行内部包依赖
- 根目录统一运行测试和构建

### 6.2 命名规范

| 类型 | 规范 |
|------|------|
| 包名 | `@ai-drama-studio/<name>` |
| 数据库表 | 复数形式，snake_case (e.g., `character_profiles`) |
| 模型类 | PascalCase (e.g., `CharacterProfile`) |
| API 路由 | kebab-case (e.g., `/api/character-profiles`) |

### 6.3 测试规范

```bash
# 运行所有测试
npm run test

# 运行覆盖率测试
npm run test:coverage

# 运行 E2E 测试
npm run test:e2e
```

---

## 7. 部署说明

### 7.1 Docker 部署

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 数据库初始化
docker-compose exec web npx prisma db push

# 停止服务
docker-compose down
```

### 7.2 本地开发

```bash
# 安装依赖
pnpm install

# 生成 Prisma 客户端
pnpm db:generate

# 启动开发服务
pnpm dev

# 构建
pnpm build

# 生产启动
pnpm start
```

---

## 8. 安全考虑

### 8.1 认证安全

- JWT + Refresh Token 双令牌机制
- 密码 bcrypt 加密存储
- 敏感 API 端点需要认证中间件

### 8.2 数据安全

- API Key 加密存储 (AES-256)
- 敏感字段数据库加密
- 软删除支持数据恢复

### 8.3 速率限制

- 基于 Redis 的速率限制
- 多账户轮询避免单点限流
- AI Provider 配额管理

---

## 9. 性能优化

### 9.1 数据库优化

- Prisma 查询优化
- 复合索引覆盖常用查询
- 读写分离准备

### 9.2 缓存策略

- Redis 缓存热点数据
- LRU Cache 用于 Prompt 模板
- SSE 事件持久化支持重连回放

### 9.3 队列优化

- 分队列并发控制
- 任务优先级调度
- 失败重试机制

---

## 10. 监控与日志

### 10.1 日志配置

```bash
LOG_LEVEL=INFO
LOG_FORMAT=json
LOG_SERVICE=ai-drama-studio
```

### 10.2 监控指标

- AI API 调用成功率
- 任务队列积压数量
- 平均响应时间
- 代理健康状态

---

## 附录

### A. 依赖版本

```json
{
  "next": "^15.5.7",
  "react": "^19.1.0",
  "prisma": "^6.1.0",
  "@prisma/client": "^6.1.0",
  "bullmq": "^5.67.0",
  "ioredis": "^5.4.1",
  "ai": "^4.2.0"
}
```

### B. 相关文档

- [API 详细文档](./docs/API.md) - 待创建
- [数据库设计文档](./docs/DATABASE.md) - 待创建
- [部署指南](./docs/DEPLOYMENT.md) - 待创建
- [开发指南](./docs/DEVELOPMENT.md) - 待创建
