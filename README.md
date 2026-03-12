# AI Drama Studio

> **AI 驱动的短剧/漫剧生成平台**
>
> 版本：0.1.0 | 最后更新：2026-03-12

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)

---

## 🎬 项目简介

AI Drama Studio 是一个企业级 AI 短剧/漫剧生成平台，通过多阶段 AI 工作流将小说/剧本自动转换为视频内容。

### 核心能力

- 📝 **小说 → 剧本**: AI 自动分析小说文本，生成结构化剧本
- 🎞️ **剧本 → 分镜**: 根据剧本自动生成可视化分镜
- 🎨 **分镜 → 图像**: 调用多模型 AI 生成角色和场景图像
- 🎬 **图像 → 视频**: 生成动态视频片段
- 🎙️ **配音 + 字幕**: 自动添加语音配音和字幕
- ✂️ **多轨道剪辑**: 集成 CutOS AI 剪辑器，支持对话式剪辑

### 技术亮点

- 🔄 **多阶段一致性**: 角色/场景跨阶段一致性保证
- ⚖️ **AI 负载均衡**: 25+ AI 厂商支持，自动故障转移
- 📊 **实时进度追踪**: SSE 流式推送任务进度
- 🔐 **团队协作**: 多用户协作项目，评论系统
- 💰 **用量计费**: 详细的 AI 使用量统计和计费

---

## 🏗️ 项目架构

```
┌─────────────────────────────────────────────────────────────┐
│                        AI Drama Studio                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Next.js   │  │  BullMQ     │  │   MySQL     │         │
│  │   Web App   │  │   Worker    │  │  Database   │         │
│  │   (3000)    │  │  (Background)│  │  (13306)    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│         │                │                  │                │
│         └────────────────┼──────────────────┘                │
│                          │                                   │
│              ┌───────────┴───────────┐                       │
│              │     Redis (16379)     │                       │
│              │  Cache + Queue + SSE  │                       │
│              └───────────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### Monorepo 结构

```
ai-drama-studio/
├── apps/
│   ├── web/           # Next.js 15 Web 应用
│   └── worker/        # BullMQ 任务处理器
├── packages/
│   ├── db/            # Prisma ORM 数据访问层
│   ├── ai-client/     # AI 客户端抽象 (25+ 厂商)
│   ├── core/          # 核心业务逻辑
│   ├── workflow/      # Pipeline 工作流引擎
│   ├── queue/         # BullMQ 队列管理
│   ├── prompt-system/ # 提示词模板系统
│   └── sse/           # SSE 实时推送
└── docker/            # Docker 部署配置
```

---

## 🚀 快速开始

### 方式一：Docker 部署（推荐）

```bash
# 1. 启动所有服务
docker-compose up -d

# 2. 初始化数据库
docker-compose exec web npx prisma db push

# 3. 访问应用
# Web: http://localhost:3000
# Bull Board: http://localhost:3010/admin/queues
```

### 方式二：本地开发

```bash
# 1. 克隆项目
git clone https://github.com/your-org/ai-drama-studio.git
cd ai-drama-studio

# 2. 安装依赖
pnpm install

# 3. 生成 Prisma 客户端
pnpm db:generate

# 4. 配置环境变量
cp apps/web/.env.example apps/web/.env.local
# 编辑 .env.local 配置数据库和 AI API Keys

# 5. 启动开发服务
pnpm dev

# 6. 访问应用
# http://localhost:3000
```

---

## 📚 文档导航

| 文档 | 说明 |
|------|------|
| [架构文档](./ARCHITECTURE.md) | 整体架构、技术栈、核心模块详解 |
| [API 文档](./docs/API.md) | 完整 API 接口说明、请求/响应示例 |
| [数据库设计](./docs/DATABASE.md) | 数据模型、ER 图、索引优化 |
| [部署指南](./docs/DEPLOYMENT.md) | Docker/K8s/云平台部署 |
| [开发指南](./docs/DEVELOPMENT.md) | 开发环境设置、工作流、测试 |

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | Next.js 15, React 19, TypeScript 5.7, TailwindCSS 4, Shadcn UI, Framer Motion |
| **后端** | Next.js API Routes, Express, BullMQ |
| **数据库** | MySQL 8.0, Prisma ORM 6.1 |
| **缓存** | Redis 7.0, ioredis |
| **AI** | Vercel AI SDK, 自研多账户负载均衡器 |
| **实时** | SSE (Server-Sent Events), Socket.IO |
| **认证** | NextAuth.js, JWT, bcrypt |

---

## 📦 核心功能模块

### 1. 项目管理

- 多项目并行
- 团队协作（邀请/权限）
- 评论系统
- 活动记录

### 2. 角色系统

- 角色档案（多形态支持）
- 外观一致性保证
- 视觉关键词
- 角色重要性分级

### 3. 场景系统

- 场景档案
- 场景类型分类
- 关键视觉元素
- 氛围色调

### 4. AI 生成

- 25+ AI 厂商支持
- 智能负载均衡
- 故障自动转移
- 多账户轮询

### 5. 任务追踪

- 实时进度推送
- 任务事件回放
- 失败自动重试
- 并发控制

---

## 🔧 配置说明

### 环境变量

```bash
# 数据库
DATABASE_URL=mysql://root:password@localhost:13306/ai_drama_studio

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# 认证
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# AI API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
```

### 支持的 AI 厂商

| 类别 | 厂商 |
|------|------|
| **文本** | OpenAI, Anthropic, Google, Qwen, Baidu, Tencent, iFlytek, Zhipu, Moonshot, MiniMax, Lingyi, Baichuan, Sensetime, Mistral, Cohere, Groq, Ollama, DeepSeek |
| **图像** | DALL-E, Midjourney, Stability AI, Fal.ai, ComfyUI, HuggingFace |
| **视频** | Kling, Luma, Runway, Stepfun, Pika, Vidu |
| **语音** | ElevenLabs, Azure TTS, Google TTS |

---

## 📊 API 接口概览

### 认证
- `POST /api/auth/local/register` - 用户注册
- `POST /api/auth/local/login` - 用户登录
- `POST /api/auth/local/logout` - 用户登出
- `GET /api/auth/me` - 获取当前用户

### 项目
- `GET/POST /api/projects` - 项目列表/创建
- `GET/PUT/DELETE /api/projects/[id]` - 项目详情/更新/删除
- `POST /api/projects/[id]/invite` - 邀请成员
- `GET/POST /api/projects/[id]/comments` - 评论

### 角色/场景
- `GET/POST /api/characters` - 角色列表/创建
- `GET/POST /api/locations` - 场景列表/创建

### 剧集
- `GET/POST /api/episodes` - 剧集列表/创建
- `GET/PUT/DELETE /api/episodes/[id]` - 剧集详情/更新/删除

### AI 生成
- `POST /api/generate/script` - 生成剧本
- `POST /api/generate/scene` - 生成分镜
- `POST /api/generate/character` - 生成角色设计
- `POST /api/generate/video` - 生成视频
- `POST /api/generate/audio` - 生成音频

### 任务
- `GET /api/tasks/[id]/stream` - 流式获取进度
- `GET /api/generate/status/[taskId]` - 获取任务状态

---

## 🧪 测试

```bash
# 运行所有测试
pnpm test

# 运行覆盖率测试
pnpm test:coverage

# 运行 E2E 测试
pnpm test:e2e

# 运行 E2E 测试 UI 模式
pnpm test:e2e:ui
```

---

## 📝 开发规范

### 提交信息规范

```bash
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构代码
test: 测试相关
chore: 构建/工具链相关
```

### 代码审查清单

- [ ] TypeScript 类型检查通过
- [ ] 单元测试覆盖率 > 80%
- [ ] ESLint 检查通过
- [ ] API 文档已更新
- [ ] 环境变量已添加到 .env.example

---

## 🔒 安全考虑

- JWT + Refresh Token 双令牌机制
- 密码 bcrypt 加密存储
- API Key 加密存储 (AES-256)
- 敏感字段数据库加密
- 速率限制（基于 Redis）
- 软删除支持数据恢复

---

## 📈 性能优化

- Prisma 查询优化 + 复合索引
- Redis 缓存热点数据
- LRU Cache 用于 Prompt 模板
- BullMQ 分队列并发控制
- SSE 事件持久化支持重连回放

---

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

## 👥 团队

AI Drama Studio Team

---

## 🙏 致谢

感谢以下开源项目:

- [Next.js](https://nextjs.org/)
- [Prisma](https://www.prisma.io/)
- [BullMQ](https://docs.bullmq.io/)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [Shadcn UI](https://ui.shadcn.com/)

---

## 📞 联系方式

- 项目地址：https://github.com/your-org/ai-drama-studio
- 问题反馈：https://github.com/your-org/ai-drama-studio/issues

---

<div align="center">

**AI Drama Studio** - 让 AI 创作你的短剧

[返回顶部](#ai-drama-studio)

</div>
