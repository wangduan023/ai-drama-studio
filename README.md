# AI Drama Studio

AI Drama Studio 是一个 AI 驱动的短剧/漫剧生成平台，支持用户通过简单的提示词快速生成完整的剧本、人物设定、场景设置等内容，并提供团队协作功能。

## 项目特性

### AI 生成核心功能
- 集成多种 AI 模型（OpenAI、Anthropic、Google）
- 剧本自动生成
- 角色档案和场景档案智能生成
- AI 图片和视频生成

### 团队协作功能
- **项目权限管理**：支持 OWNER、EDITOR、VIEWER 三级权限
- **邀请系统**：通过邮箱邀请团队成员
- **实时协作编辑**：多人同时编辑项目内容
- **评论和反馈**：针对项目内容进行讨论
- **在线状态追踪**：显示团队成员在线情况
- **活动日志**：记录项目中发生的所有操作
- **资源锁定**：防止多人同时编辑同一内容产生冲突

### 积分系统
- 完整的积分交易记录
- 积分扣除、增加、退款机制
- 积分流水查询
- 事务安全的积分操作

## 技术栈

- **前端**：Next.js 15, React, TypeScript, Tailwind CSS
- **后端**：Next.js API Routes, Prisma ORM
- **数据库**：MySQL
- **缓存**：Redis
- **实时通信**：Socket.io
- **AI 集成**：Anthropic Claude, OpenAI, Google Gemini

## API 接口

### 项目管理
- `GET /api/projects` - 获取项目列表
- `POST /api/projects` - 创建新项目
- `GET /api/projects/[id]` - 获取项目详情
- `PUT /api/projects/[id]` - 更新项目
- `DELETE /api/projects/[id]` - 删除项目

### 团队协作
- `GET /api/projects/[id]/members` - 获取项目成员列表
- `POST /api/projects/[id]/members` - 邀请新成员
- `PUT /api/projects/[id]/members/[userId]` - 修改成员角色
- `DELETE /api/projects/[id]/members/[userId]` - 移除成员
- `GET /api/projects/[id]/members/me` - 获取当前用户角色
- `POST /api/projects/[id]/invite` - 发送邀请
- `GET /api/projects/[id]/comments` - 获取评论
- `POST /api/projects/[id]/comments` - 发表评论
- `PUT/DELETE /api/projects/[id]/comments/[commentId]` - 编辑/删除评论
- `GET /api/projects/[id]/activity` - 获取活动日志

### AI 生成
- `POST /api/generate/script` - 生成剧本
- `POST /api/generate/character` - 生成角色档案
- `POST /api/generate/location` - 生成场景档案
- `POST /api/generate/image` - 生成图片
- `POST /api/generate/video` - 生成视频

## 安装部署

1. 克隆仓库
2. 安装依赖：`pnpm install`
3. 配置环境变量：复制 `.env.docker.example` 为 `.env` 并填写相应配置
4. 启动数据库和 Redis 服务
5. 运行迁移：`pnpm db:migrate`
6. 启动应用：`pnpm dev`

## 核心贡献

此版本完成了 Phase 2（AI 生成）和 Phase 3（团队协作）的核心功能开发，实现了：
- AI 驱动的内容生成流水线
- 完整的团队协作功能
- 实时编辑和评论系统
- 健壮的权限管理系统
- 完善的积分经济系统

## 许可证

MIT