# AI Drama Studio - 文档索引

> **项目版本:** 0.1.0
> **最后更新:** 2026-03-12

---

## 📚 文档列表

本文档索引整理了 AI Drama Studio 项目的所有技术文档，方便开发者快速查找所需信息。

### 核心文档

| 文档 | 路径 | 说明 | 目标读者 |
|------|------|------|----------|
| [README](./README.md) | `/README.md` | 项目概述、快速开始、技术栈 | 所有人 |
| [架构文档](./ARCHITECTURE.md) | `/ARCHITECTURE.md` | 整体架构、核心模块、技术选型 | 开发/架构师 |
| [API 文档](./docs/API.md) | `/docs/API.md` | 完整 API 接口说明 | 前端/后端开发 |
| [数据库设计](./docs/DATABASE.md) | `/docs/DATABASE.md` | 数据模型、ER 图、索引优化 | 后端/DBA |
| [部署指南](./docs/DEPLOYMENT.md) | `/docs/DEPLOYMENT.md` | Docker/K8s/云平台部署 | DevOps/运维 |
| [开发指南](./docs/DEVELOPMENT.md) | `/docs/DEVELOPMENT.md` | 开发环境、工作流、测试 | 开发工程师 |

---

## 🗺️ 快速导航

### 我想...

| 需求 | 查看文档 |
|------|----------|
| 快速启动项目 | [README](./README.md) - 快速开始 |
| 了解项目架构 | [架构文档](./ARCHITECTURE.md) |
| 开发新功能 | [开发指南](./docs/DEVELOPMENT.md) |
| 调用 API | [API 文档](./docs/API.md) |
| 设计数据库 | [数据库设计](./docs/DATABASE.md) |
| 部署到生产环境 | [部署指南](./docs/DEPLOYMENT.md) |
| 排查问题 | [部署指南](./docs/DEPLOYMENT.md) - 故障排查 |
| 配置 AI 厂商 | [架构文档](./ARCHITECTURE.md) - AI 客户端层 |

---

## 📖 文档详细说明

### 1. [README.md](./README.md)

**项目入口文档**，包含：

- 项目简介和核心能力
- 快速开始（Docker/本地开发）
- 技术栈总览
- Monorepo 结构说明
- API 接口概览
- 开发规范
- 贡献指南

**适合人群:** 新加入的开发者、项目管理者、技术评估人员

---

### 2. [ARCHITECTURE.md](./ARCHITECTURE.md)

**架构设计文档**，包含：

- 项目概述和核心功能
- 完整项目结构
- 核心模块详解（DB, AI Client, Core, Workflow, Queue, Prompt, SSE）
- API 接口详细说明
- 基础设施配置（Docker, 环境变量）
- 开发规范
- 安全考虑
- 性能优化策略

**适合人群:** 架构师、高级工程师、需要深入了解项目的开发者

---

### 3. [docs/API.md](./docs/API.md)

**API 接口文档**，包含：

- 认证说明
- 认证 API（注册/登录/登出/密码管理）
- 项目 API（CRUD/成员/评论/活动）
- 角色 API（CRUD/外观管理）
- 场景 API（CRUD）
- 剧集 API（CRUD）
- 生成 API（剧本/分镜/角色/视频/音频）
- 任务 API（流式进度/状态查询）
- 积分 API
- 实时通信 API（SSE/Socket.IO）
- 邀请 API
- 错误响应格式
- 速率限制

**适合人群:** 前端开发、后端开发、API 消费者

---

### 4. [docs/DATABASE.md](./docs/DATABASE.md)

**数据库设计文档**，包含：

- 数据库概览和 ERD
- 核心数据表详解（User, Project, Episode, Script, Storyboard, Clip...）
- 角色与场景表（CharacterProfile, CharacterAppearance, LocationProfile）
- AI 配置表（AiProvider, AiModel, AiProxy, AiUsageLog）
- 任务追踪表（Task, TaskEvent）
- 资产与计费表（Asset, UsageCost）
- 系统配置表
- 索引优化策略
- 数据迁移指南
- 数据完整性（级联/乐观锁）

**适合人群:** 后端开发、数据库管理员、数据分析师

---

### 5. [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

**部署运维文档**，包含：

- Docker Compose 部署（推荐）
- 本地开发部署
- 生产环境配置
- Kubernetes 部署
- 云平台部署（AWS/Vercel/Railway）
- 监控与日志
- 备份与恢复
- 故障排查
- 扩容策略

**适合人群:** DevOps 工程师、运维人员、部署负责人

---

### 6. [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)

**开发指南文档**，包含：

- 开发环境设置
- 开发工作流
- 项目结构详解
- 代码规范（TypeScript/命名/导入）
- 数据库开发（Schema/迁移/Repository）
- AI 集成开发
- 工作流开发
- 队列任务开发
- SSE 实时推送
- 测试（单元测试/覆盖率）
- 调试技巧
- Git 工作流

**适合人群:** 开发工程师、新加入的团队成员

---

## 🔗 外部资源

### 框架/库文档

| 资源 | 链接 |
|------|------|
| Next.js | https://nextjs.org/docs |
| React | https://react.dev |
| TypeScript | https://www.typescriptlang.org/docs |
| Prisma | https://www.prisma.io/docs |
| BullMQ | https://docs.bullmq.io |
| Tailwind CSS | https://tailwindcss.com/docs |
| Vercel AI SDK | https://sdk.vercel.ai/docs |

### 数据库文档

| 资源 | 链接 |
|------|------|
| MySQL 8.0 | https://dev.mysql.com/doc/refman/8.0/en/ |
| Redis | https://redis.io/docs |

---

## 📝 文档更新记录

| 日期 | 文档 | 更新内容 |
|------|------|----------|
| 2026-03-12 | 所有文档 | 初始版本创建 |

---

## 🤝 贡献文档

如果您发现文档有问题或需要补充，请：

1. 在 GitHub 上提交 Issue
2. 或直接提交 PR 修改文档

---

<div align="center">

**AI Drama Studio Documentation**

[返回 README](./README.md) | [查看架构](./ARCHITECTURE.md) | [API 文档](./docs/API.md)

</div>
