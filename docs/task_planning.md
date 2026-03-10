# AI Drama Studio 任务规划文档

> 规划日期: 2026-03-10
> 规划版本: v1.0
> 规划周期: 3-4 周

---

## 📋 任务概览

| 任务 | 优先级 | 预估工期 | 依赖 | 负责人建议 |
|------|--------|----------|------|-----------|
| **#3 添加核心功能集成测试** | 🟡 中 | 3-4 天 | 无 | 测试工程师 |
| **#6 开发前端用户界面** | 🟡 中 | 1-2 周 | #3（部分）| 前端工程师 |

---

## 任务 #3: 添加核心功能集成测试

### 🎯 目标
建立完整的集成测试覆盖，确保 prompt-system、character-service、workflow 等核心模块的功能稳定性。

### 📊 现状分析
- **测试框架**: Vitest 已配置
- **覆盖率工具**: v8 覆盖率已集成
- **现有测试**:
  - `packages/core/__tests__/` - 6 个测试文件 ✅
  - `packages/prompt-system/__tests__/` - 9 个测试文件 ✅
  - `packages/workflow/__tests__/` - 8 个测试文件 ✅
- **覆盖率缺口**:
  - `prompt-system/renderer.ts`: 5.03%
  - `prompt-system/template-store.ts`: 31.49%
  - `core/character.service.ts`: 部分分支未覆盖

### 📝 子任务分解

#### 阶段 1: Prompt-System 集成测试 (1 天)

**1.1 buildPrompt 完整流程测试**
```typescript
// packages/prompt-system/__tests__/build-prompt.integration.test.ts
- 测试模板加载 -> 变量验证 -> 渲染的完整流程
- 测试多语言模板切换
- 测试嵌套变量和条件渲染
- 测试错误处理和回退机制
```

**1.2 Template Store 高级功能测试**
```typescript
// packages/prompt-system/__tests__/template-store-advanced.test.ts
- 测试热重载功能（模拟文件变化）
- 测试 LRU 缓存淘汰策略
- 测试多并发加载场景
- 测试模板根目录动态切换
```

**1.3 Renderer 边界情况测试**
```typescript
// packages/prompt-system/__tests__/renderer-edge.test.ts
- 测试嵌套条件渲染（3+ 层）
- 测试特殊字符转义
- 测试超长变量值处理
- 测试循环渲染性能
```

#### 阶段 2: Character Service 深度测试 (1-1.5 天)

**2.1 validateConsistency 核心逻辑测试**
```typescript
// packages/core/__tests__/consistency-validation.test.ts
测试场景:
✓ S/A 级角色缺少 primary_identifier 的检测
✓ 鞋子描述缺失检测
✓ 奢侈品关键词检测
✓ 多阶段外观一致性检测
✓ 角色服装变化合理性验证
```

**2.2 角色服务 CRUD 集成测试**
```typescript
// packages/core/__tests__/character-crud.integration.test.ts
测试流程:
✓ 创建角色 -> 查询 -> 更新 -> 删除完整流程
✓ 批量创建角色（10+ 角色）
✓ 事务回滚测试（模拟数据库错误）
✓ 并发操作测试（同时更新同一角色）
```

**2.3 外观映射和变化追踪测试**
```typescript
// packages/core/__tests__/appearance-tracking.test.ts
测试场景:
✓ 外观索引映射（appearanceIndex）正确性
✓ 多阶段外观变化追踪
✓ 外观变化原因记录验证
✓ 外观选择持久化测试
```

#### 阶段 3: Workflow 端到端测试 (1-1.5 天)

**3.1 完整 Pipeline 执行测试**
```typescript
// packages/workflow/__tests__/pipeline-e2e.test.ts
测试流程:
✓ rewrite -> storyboard -> image -> video 完整链路
✓ 阶段失败回滚测试
✓ 取消信号传播测试
✓ 进度回调准确性验证
```

**3.2 阶段处理器集成测试**
```typescript
// packages/workflow/__tests__/stages/integration.test.ts
测试内容:
✓ RewriteStage 与 AI 客户端集成
✓ StoryboardStage JSON 解析鲁棒性
✓ ImageGenerationStage 取消处理
✓ VideoGenerationStage 轮询逻辑
```

**3.3 错误恢复和重试测试**
```typescript
// packages/workflow/__tests__/resilience.test.ts
测试场景:
✓ 网络超时后的重试机制
✓ 数据库连接失败处理
✓ AI 服务限流处理
✓ 部分阶段失败后的数据一致性
```

### 🏗️ 技术方案

#### 测试环境配置
```typescript
// vitest.config.integration.ts
export default defineConfig({
  test: {
    name: 'integration',
    include: ['**/__tests__/**/*.integration.test.ts'],
    setupFiles: ['./tests/setup.integration.ts'],
    globalSetup: './tests/global-setup.ts',
    // 集成测试需要真实数据库
    env: {
      DATABASE_URL: 'file:./test.db',
      REDIS_URL: 'redis://localhost:6379/1',
    },
  },
})
```

#### Mock 策略
```typescript
// tests/mocks/ai-client.mock.ts
export const createMockAIExecutor = () => {
  return vi.fn().mockImplementation(async (params) => {
    // 根据 action 类型返回不同模拟响应
    switch (params.action) {
      case 'generate_storyboard':
        return { text: JSON.stringify(mockStoryboardResponse) }
      case 'rewrite_script':
        return { text: JSON.stringify(mockRewriteResponse) }
      default:
        return { text: 'mock response' }
    }
  })
}
```

#### 测试数据工厂
```typescript
// tests/factories/character.factory.ts
export const createTestCharacter = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  roleLevel: 'A' as const,
  introduction: faker.lorem.paragraph(),
  primaryIdentifier: faker.lorem.sentence(),
  ...overrides,
})
```

### ✅ 验收标准

| 指标 | 目标值 | 当前值 |
|------|--------|--------|
| Prompt-System 语句覆盖率 | ≥ 80% | 51.32% |
| Core 服务语句覆盖率 | ≥ 85% | - |
| Workflow 语句覆盖率 | ≥ 85% | 90.76% |
| 集成测试数量 | ≥ 30 个 | ~15 个 |
| 平均测试执行时间 | < 60 秒 | - |

### 📅 时间规划

```
Day 1 (4h): Prompt-System 集成测试
  - 2h: buildPrompt 流程测试
  - 1h: Template Store 高级功能
  - 1h: Renderer 边界测试

Day 2 (6h): Character Service 深度测试
  - 2h: validateConsistency 核心逻辑
  - 2h: CRUD 集成测试
  - 2h: 外观映射追踪测试

Day 3 (6h): Workflow 端到端测试
  - 2h: Pipeline 完整链路
  - 2h: 阶段处理器集成
  - 2h: 错误恢复测试

Day 4 (4h): 修复和优化
  - 修复发现的 Bug
  - 补充边界情况测试
  - 优化测试执行速度
```

---

## 任务 #6: 开发前端用户界面

### 🎯 目标
构建完整的 Next.js 前端应用，提供项目/剧本管理、角色编辑、场景设置等核心功能的用户界面。

### 📊 现状分析
- **框架**: Next.js 15 + React 19 + TypeScript
- **样式**: Tailwind CSS 已配置
- **状态管理**: TanStack Query (React Query) 已集成
- **已有页面**:
  - `/` - 首页
  - `/projects` - 项目列表
  - `/projects/[id]` - 项目详情
  - `/projects/[id]/episodes/[episodeId]` - 剧集详情
- **已有组件**:
  - `ProjectCard`, `CharacterList`, `LocationList`
  - `StoryboardPanel`, `ProgressTracker`
  - `Navbar`

### 🏗️ 前端架构规划

#### 技术栈确认
```
框架: Next.js 15 (App Router)
语言: TypeScript 5.7
样式: Tailwind CSS 4.0
UI 组件: shadcn/ui (建议新增)
状态管理: TanStack Query + Zustand
表单: React Hook Form + Zod
动画: Framer Motion
图标: Lucide React
```

### 📝 子任务分解

#### 阶段 1: 基础架构和布局 (2-3 天)

**1.1 设计系统搭建**
```
src/
├── components/
│   ├── ui/              # shadcn/ui 基础组件
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── select.tsx
│   │   ├── textarea.tsx
│   │   └── ...
│   └── layout/          # 布局组件
│       ├── Sidebar.tsx
│       ├── Breadcrumb.tsx
│       └── PageHeader.tsx
├── lib/
│   └── utils.ts         # cn() 工具函数
└── styles/
    └── globals.css      # 全局样式 + CSS 变量
```

**1.2 全局布局重构**
```typescript
// app/layout.tsx 改进
- 添加 Sidebar 导航（项目、角色库、场景库）
- 添加全局 Toast 通知
- 添加加载状态指示器
- 实现响应式布局（移动端适配）
```

**1.3 路由结构优化**
```
app/
├── (dashboard)/           # 仪表盘布局组
│   ├── layout.tsx         # 侧边栏 + 头部布局
│   ├── page.tsx           # 仪表盘首页
│   ├── projects/
│   │   ├── page.tsx       # 项目列表
│   │   ├── new/
│   │   │   └── page.tsx   # 新建项目
│   │   └── [id]/
│   │       ├── page.tsx   # 项目详情
│   │       ├── layout.tsx # 项目内导航
│   │       ├── settings/
│   │       │   └── page.tsx
│   │       ├── episodes/
│   │       │   └── page.tsx
│   │       ├── characters/
│   │       │   └── page.tsx
│   │       └── locations/
│   │           └── page.tsx
│   └── library/
│       ├── characters/
│       └── locations/
```

#### 阶段 2: 项目/剧本管理模块 (3-4 天)

**2.1 项目列表页 (`/projects`)**
```typescript
功能需求:
✓ 网格/列表视图切换
✓ 搜索和筛选（状态、类型、日期）
✓ 排序（最近更新、创建时间、名称）
✓ 快速操作菜单（编辑、删除、复制）
✓ 分页或无限滚动加载
✓ 空状态引导
```

**2.2 项目创建向导**
```typescript
// app/(dashboard)/projects/new/page.tsx
步骤设计:
1. 基础信息 - 名称、描述、类型（短剧/漫剧）
2. 剧本输入 - 粘贴/上传/选择模板
3. AI 分析设置 - 选择分析模型、语言
4. 确认和提交

技术实现:
- 使用 React Hook Form + Zod 验证
- 步骤条组件 (Stepper)
- 自动保存草稿到 localStorage
```

**2.3 项目详情页改进**
```typescript
// app/(dashboard)/projects/[id]/page.tsx
功能模块:
- 项目概览卡片（进度、统计、状态）
- 剧集列表（表格/时间线视图）
- 快速操作栏（开始生成、暂停、导出）
- 活动日志时间线
- 协作成员管理
```

**2.4 剧集编辑页**
```typescript
// app/(dashboard)/projects/[id]/episodes/[episodeId]/page.tsx
标签页设计:
- 📄 剧本 - 富文本编辑器或 Markdown
- 🎬 分镜 - 分镜编辑器（网格/列表）
- 👤 角色 - 关联角色管理
- 🖼️ 素材 - 图片/视频预览
- ⚙️ 设置 - 生成配置
```

#### 阶段 3: 角色管理模块 (3-4 天)

**3.1 角色库列表 (`/library/characters`)**
```typescript
功能需求:
✓ 卡片/表格视图
✓ 高级筛选（等级、项目、出现次数）
✓ 批量操作（导出、删除）
✓ 角色对比功能（选择2-3个角色对比）
```

**3.2 角色详情/编辑页**
```typescript
// app/(dashboard)/projects/[id]/characters/[characterId]/page.tsx
界面分区:
┌─────────────────────────────────────┐
│  角色头部（头像、名称、等级标签）      │
├─────────────────────────────────────┤
│  基本信息    │  外观描述              │
│  - 角色介绍  │  - 外观列表            │
│  - 关键标识  │  - 变化追踪时间线       │
│  - 角色关系  │                        │
├─────────────────────────────────────┤
│  提示词预览  │  一致性验证结果         │
│              │  - 警告列表            │
└─────────────────────────────────────┘

交互功能:
- 外观编辑器（支持多阶段外观）
- AI 辅助生成角色描述
- 实时一致性验证反馈
```

**3.3 角色创建表单**
```typescript
表单字段:
- 基础信息: 名称、等级(S/A/B/C/D/E)、介绍
- 角色设定: 年龄、性别、职业、性格
- 外观描述: 发型、服装、配饰、鞋子
- 关键标识: 确保一致性的核心特征
- 参考图片: 上传参考图

验证规则:
- S/A 级角色必须填写 primary_identifier
- 鞋子描述必须包含具体款式
- 奢侈品关键词检查
```

#### 阶段 4: 场景管理模块 (2-3 天)

**4.1 场景库列表**
```typescript
类似角色库，支持:
- 场景类型筛选（室内/室外）
- 关联项目筛选
- 缩略图预览
```

**4.2 场景编辑器**
```typescript
// app/(dashboard)/projects/[id]/locations/[locationId]/page.tsx
功能:
- 场景描述编辑器
- 参考图片管理（上传/选择/排序）
- 场景标签系统
- 关联剧集显示
```

#### 阶段 5: 分镜和生成模块 (4-5 天)

**5.1 分镜编辑器（核心功能）**
```typescript
// components/storyboard/StoryboardEditor.tsx
视图模式:
- 网格视图（2-4列自适应）
- 列表视图（详细信息）
- 时间线视图（顺序展示）

分镜卡片组件:
┌────────────────────┐
│  分镜 #1           │
├────────────────────┤
│                    │
│   [图片占位符]      │
│   或实际生成图      │
│                    │
├────────────────────┤
│  场景: 客厅         │
│  镜头: 中景         │
│  运镜: 静态         │
│  时长: 5s          │
├────────────────────┤
│ [生成] [编辑] [⋮]  │
└────────────────────┘

编辑功能:
- 双击编辑描述
- 拖拽排序
- 批量选择操作
- 生成状态指示器
```

**5.2 生成控制面板**
```typescript
// components/generation/GenerationControl.tsx
功能:
- 阶段选择（剧本改写/分镜/图片/视频）
- 模型配置选择
- 生成进度实时监控（SSE）
- 取消/暂停/恢复控制
- 成本估算显示
```

**5.3 实时进度追踪**
```typescript
// hooks/useGenerationProgress.ts
实现:
- SSE 连接管理
- 进度状态机
- 错误重试逻辑
- 自动重连机制
```

#### 阶段 6: 优化和集成 (2-3 天)

**6.1 性能优化**
```typescript
- 图片懒加载和虚拟滚动
- 组件代码分割
- 数据预取和缓存策略
- 构建优化（静态导出配置）
```

**6.2 错误处理**
```typescript
- 全局错误边界
- API 错误统一处理
- 友好错误提示
- 离线状态检测
```

**6.3 响应式适配**
```typescript
- 移动端布局优化
- 触摸手势支持
- 移动端专用导航
```

### ✅ 验收标准

| 验收项 | 标准 |
|--------|------|
| 页面完整性 | 所有规划页面可访问 |
| 功能可用性 | 核心 CRUD 操作正常 |
| 响应式设计 | 支持 320px - 2560px 宽度 |
| 性能指标 | Lighthouse ≥ 80 分 |
| 可访问性 | WCAG 2.1 AA 标准 |
| 浏览器兼容 | Chrome, Safari, Firefox 最新2版 |

### 📅 时间规划

```
Week 1:
  Day 1-2: 设计系统搭建 + 基础布局
  Day 3-4: 项目/剧本管理模块
  Day 5: 角色管理模块（开始）

Week 2:
  Day 1-2: 角色管理模块（完成）
  Day 3: 场景管理模块
  Day 4-5: 分镜编辑器（核心）

Week 3:
  Day 1-2: 生成控制面板 + 实时进度
  Day 3-4: 优化和集成
  Day 5: 测试和 Bug 修复
```

---

## 🔄 任务依赖关系

```
#3 集成测试 ───────────────────┐
     │                         │
     ├── 提供 API 稳定性保证    │
     ├── 定义数据接口规范       │
     └── 发现后端问题          │
                               │
                               ▼
#6 前端界面开发 ◄───────────────┘
     │
     ├── 依赖稳定的 API
     ├── 使用测试定义的数据结构
     └── 验证集成测试场景
```

## 📊 资源需求

| 资源 | #3 集成测试 | #6 前端界面 |
|------|-------------|-------------|
| **人力** | 1 名测试工程师 | 1-2 名前端工程师 |
| **时间** | 3-4 天 | 1.5-2 周 |
| **环境** | 测试数据库 + Redis | Node.js 开发环境 |
| **工具** | Vitest, MSW | VS Code, Chrome DevTools |

---

## 📝 风险和对策

| 风险 | 影响 | 对策 |
|------|------|------|
| 集成测试发现大量 Bug | 延期 | 预留 1 天缓冲时间 |
| 前端组件复杂度超预期 | 延期 | 分阶段交付，MVP 优先 |
| API 不稳定影响前端 | 阻塞 | 使用 MSW 模拟 API |
| 设计资源不到位 | 质量下降 | 使用 shadcn/ui 预设样式 |

---

*本规划由 Kimi Code CLI 制定*
*版本: v1.0*
*日期: 2026-03-10*
