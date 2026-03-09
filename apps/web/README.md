# AI Drama Studio - Web 应用

Next.js 15 前端应用，为 AI 短剧生成平台提供用户界面。

## 技术栈

- **框架**: Next.js 15 (App Router)
- **语言**: TypeScript 5
- **样式**: Tailwind CSS 4
- **状态管理**: React Query (@tanstack/react-query)
- **图标**: Lucide React

## 目录结构

```
apps/web/
├── app/                      # Next.js App Router 页面
│   ├── globals.css          # 全局样式
│   ├── layout.tsx           # 根布局
│   ├── page.tsx             # 首页
│   └── projects/            # 项目相关页面
│       ├── page.tsx         # 项目列表
│       ├── [id]/page.tsx    # 项目详情
│       └── [id]/episodes/
│           └── [episodeId]/page.tsx  # 剧集编辑
├── components/              # React 组件
│   ├── cards/              # 卡片组件
│   │   ├── ProjectCard.tsx
│   │   ├── CharacterList.tsx
│   │   ├── LocationList.tsx
│   │   ├── StoryboardPanel.tsx
│   │   └── ProgressTracker.tsx
│   ├── layout/             # 布局组件
│   │   └── Navbar.tsx
│   └── providers/          # Provider 组件
│       └── QueryProvider.tsx
├── hooks/                   # React Hooks
│   ├── useProject.ts        # 项目管理钩子
│   ├── useEpisode.ts        # 剧集管理钩子
│   └── useSSE.ts            # SSE 连接钩子
├── lib/                     # 工具库
│   ├── api/
│   │   └── client.ts        # API 客户端
│   ├── query/
│   │   └── client.ts        # React Query 配置
│   ├── api.ts               # API 导出
│   └── utils.ts             # 工具函数
├── types/                   # TypeScript 类型定义
│   └── index.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 类型检查
npm run type-check

# 构建
npm run build

# 生产启动
npm start
```

## 环境变量

复制 `.env.example` 到 `.env.local` 并配置：

```bash
# API 地址
NEXT_PUBLIC_API_URL=http://localhost:3001

# 应用配置
NEXT_PUBLIC_APP_NAME=AI Drama Studio
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 功能特性

- [x] 项目列表和详情页
- [x] 剧集编辑页面
- [x] 分镜面板组件
- [x] 角色和场景管理
- [x] 实时进度追踪 (SSE)
- [x] React Query 数据管理
- [x] 响应式设计
- [x] 深色模式支持

## API 集成

使用 `lib/api/client.ts` 中的 API 客户端进行数据请求：

```typescript
import { api } from '@/lib/api'

// GET 请求
const projects = await api.get<Project[]>('/api/projects')

// POST 请求
const project = await api.post<Project>('/api/projects', { title: '新项目' })

// PUT 请求
const updated = await api.put<Project>(`/api/projects/${id}`, { title: '更新后' })

// DELETE 请求
await api.delete(`/api/projects/${id}`)
```

## Hooks 使用

```typescript
// 获取项目列表
const { data: projects, isLoading } = useProjectList()

// 获取项目详情
const { data: project } = useProject(id)

// 创建项目
const createProject = useCreateProject()
await createProject.mutateAsync({ title: '新项目' })

// 获取剧集列表
const { data: episodes } = useEpisodesByProject(projectId)

// 获取分镜列表
const { data: storyboards } = useStoryboards(episodeId)
```

## SSE 实时推送

```typescript
const { connected, events, lastEvent } = useSSE({
  projectId,
  episodeId,
  enabled: true,
  onEvent: (event) => {
    console.log('收到事件:', event)
  },
})
```
