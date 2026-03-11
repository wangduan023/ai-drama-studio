# AI Drama Studio - 测试计划清单

## 概述
本文档详细列出前端自动化测试的完整计划，实现无需人工辅助的全自动化测试流程。

---

## 1. 测试架构

### 1.1 测试金字塔
```
┌─────────────────────────────────────────┐
│  E2E 测试 (10%)   - Playwright          │
│  真实浏览器测试，验证完整用户流程        │
├─────────────────────────────────────────┤
│  集成测试 (30%)   - Vitest + RTL        │
│  组件渲染和交互测试                      │
├─────────────────────────────────────────┤
│  单元测试 (60%)   - Vitest              │
│  工具函数、Hooks、业务逻辑测试           │
└─────────────────────────────────────────┘
```

### 1.2 技术栈
| 测试类型 | 工具 | 用途 |
|---------|------|------|
| 单元测试 | Vitest | 工具函数、hooks、业务逻辑 |
| 组件测试 | Vitest + React Testing Library | UI 组件渲染、交互 |
| E2E 测试 | Playwright | 完整用户流程 |
| Mock | MSW | API 请求拦截 |
| 覆盖率 | v8 | 代码覆盖率报告 |

---

## 2. 文件结构

```
apps/web/
├── __tests__/
│   ├── unit/                    # 单元测试
│   │   ├── hooks/              # Hooks 测试
│   │   ├── utils/              # 工具函数测试
│   │   └── lib/                # 库函数测试
│   ├── integration/             # 集成测试
│   │   ├── components/         # 组件测试
│   │   └── pages/              # 页面测试
│   └── e2e/                     # E2E 测试
│       ├── projects.spec.ts    # 项目流程测试
│       ├── characters.spec.ts  # 角色流程测试
│       └── auth.spec.ts        # 认证流程测试
├── test/
│   ├── setup.ts                # 测试环境配置
│   ├── global-setup.ts         # E2E 全局 Setup
│   ├── global-teardown.ts      # E2E 全局 Teardown
│   ├── utils.tsx               # 测试工具函数
│   └── mocks/
│       ├── data.ts             # Mock 数据
│       └── handlers.ts         # MSW API Mock
├── vitest.config.ts            # Vitest 配置
└── playwright.config.ts        # Playwright 配置
```

---

## 3. 测试用例清单

### 3.1 单元测试

#### Hooks 测试
- [x] `useProject` - 项目数据获取
- [ ] `useProjectList` - 项目列表获取
- [x] `useCreateProject` - 创建项目
- [x] `useUpdateProject` - 更新项目
- [x] `useDeleteProject` - 删除项目
- [x] `useCharacter` - 角色数据获取
- [x] `useEpisode` - 剧集数据获取
- [x] `useLocation` - 地点数据获取
- [x] `useSSE` - SSE 连接测试

#### 工具函数测试
- [x] `formatDate` - 日期格式化
- [x] `formatDuration` - 时长格式化
- [x] `cn` - className 合并
- [ ] `debounce` - 防抖函数
- [ ] `throttle` - 节流函数
- [ ] `localStorage` 操作

#### API 客户端测试
- [x] `api.get` - GET 请求
- [x] `api.post` - POST 请求
- [x] `api.put` - PUT 请求
- [ ] `api.patch` - PATCH 请求
- [x] `api.delete` - DELETE 请求
- [x] 错误处理
- [ ] 请求拦截
- [ ] 响应拦截

### 3.2 集成测试

#### 组件测试
- [x] `Button` - 按钮组件
- [x] `Input` - 输入框组件
- [x] `Select` - 选择框组件
- [x] `Dialog` - 对话框组件
- [x] `DropdownMenu` - 下拉菜单
- [x] `Card` - 卡片组件
- [x] `Badge` - 徽章组件
- [x] `Toast` - 提示组件
- [x] `ThemeToggle` - 主题切换

#### 页面级组件测试
- [x] `ProjectCard` - 项目卡片
- [x] `CharacterCard` - 角色卡片
- [x] `EpisodeCard` - 剧集卡片
- [x] `LocationCard` - 地点卡片
- [x] `ProjectList` - 项目列表
- [x] `EmptyState` - 空状态
- [x] `ErrorState` - 错误状态
- [x] `LoadingState` - 加载状态

#### 表单测试
- [x] 项目创建表单
- [x] 角色创建表单
- [x] 剧集创建表单
- [ ] 表单验证
- [ ] 表单提交

### 3.3 E2E 测试

#### 项目流程
- [x] 访问项目列表页
- [x] 搜索项目
- [x] 筛选项目状态
- [x] 切换视图模式（网格/列表）
- [x] 创建新项目
- [x] 查看项目详情
- [x] 编辑项目
- [x] 删除项目

#### 角色流程
- [x] 访问角色列表
- [x] 创建角色
- [x] 编辑角色信息
- [x] 删除角色
- [x] 角色筛选

#### 剧集流程
- [x] 访问剧集列表
- [x] 创建剧集
- [x] 编辑剧集
- [x] 删除剧集

#### 地点流程
- [x] 访问地点列表
- [x] 创建地点
- [x] 编辑地点
- [x] 删除地点

#### 导航测试
- [x] 侧边栏导航
- [x] 面包屑导航
- [x] 返回按钮
- [x] 页面跳转

#### 主题切换
- [x] 切换亮色模式
- [x] 切换暗色模式
- [x] 跟随系统

---

## 4. Mock 数据

### 4.1 测试数据清单
- [x] `mockProjects` - 3 个项目
- [x] `mockCharacters` - 2 个角色
- [x] `mockEpisodes` - 2 个剧集
- [x] `mockLocations` - 2 个地点

### 4.2 API Mock 清单
- [x] GET /api/projects
- [x] GET /api/projects/:id
- [x] POST /api/projects
- [x] PATCH /api/projects/:id
- [x] DELETE /api/projects/:id
- [x] GET /api/characters
- [x] POST /api/characters
- [x] GET /api/episodes
- [x] GET /api/locations

---

## 5. 覆盖率目标

### 5.1 阈值设置
| 指标 | 目标 | 最低 |
|------|------|------|
| Lines | 80% | 70% |
| Functions | 80% | 70% |
| Branches | 70% | 60% |
| Statements | 80% | 70% |

### 5.2 覆盖范围
- [ ] `app/**/*.tsx` - 页面组件
- [ ] `components/**/*.tsx` - UI 组件
- [ ] `hooks/**/*.ts` - 自定义 Hooks
- [ ] `lib/**/*.ts` - 工具函数

---

## 6. CI/CD 集成

### 6.1 GitHub Actions 工作流
- [ ] `.github/workflows/test.yml`
  - [ ] Lint Check
  - [ ] Type Check
  - [ ] Unit Tests
  - [ ] E2E Tests
  - [ ] Coverage Report

### 6.2 质量门禁
- [ ] 测试通过率 100%
- [ ] 代码覆盖率 ≥ 70%
- [ ] ESLint 零警告
- [ ] TypeScript 零错误

### 6.3 报告生成
- [ ] HTML 测试报告
- [ ] JUnit XML 报告
- [ ] Playwright 跟踪视频
- [ ] Codecov 覆盖率报告

---

## 7. 运行命令

### 7.1 本地开发
```bash
# 运行所有测试
pnpm test

# 单元测试
pnpm test:unit

# 集成测试
pnpm test:integration

# E2E 测试
pnpm test:e2e

# 带覆盖率
pnpm test:coverage

# UI 模式
pnpm test:ui
pnpm test:e2e:ui
```

### 7.2 CI 环境
```bash
# 安装依赖
pnpm install --frozen-lockfile

# 生成 Prisma Client
pnpm db:generate

# 运行测试
pnpm test:unit --coverage
pnpm test:e2e
```

---

## 8. 测试环境配置

### 8.1 环境变量
```bash
# 数据库
DATABASE_URL=mysql://root:aidrama123@localhost:13306/ai_drama_studio

# Redis
REDIS_HOST=localhost
REDIS_PORT=16379

# Playwright
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

### 8.2 服务依赖
- [ ] MySQL (端口 13306)
- [ ] Redis (端口 16379)
- [ ] Next.js 开发服务器 (端口 3000)

---

## 9. 浏览器兼容性测试

### 9.1 桌面端
- [ ] Chrome (Chromium)
- [ ] Firefox
- [ ] Safari (WebKit)

### 9.2 移动端
- [ ] Pixel 5 (Mobile Chrome)
- [ ] iPhone 12 (Mobile Safari)

---

## 10. 维护计划

### 10.1 定期任务
- [ ] 每周检查测试覆盖率
- [ ] 每月更新测试用例
- [ ] 每季度审查测试策略

### 10.2 新功能要求
- [ ] 新功能必须包含测试
- [ ] 测试通过率 100% 才能合并
- [ ] 覆盖率不能下降

### 10.3 责任分工
| 角色 | 职责 |
|------|------|
| 开发人员 | 编写单元/集成测试 |
| QA 工程师 | 编写 E2E 测试 |
| Tech Lead | 维护 CI/CD 流程 |

---

## 附录

### 已完成文件
- [x] `apps/web/vitest.config.ts`
- [x] `apps/web/playwright.config.ts`
- [x] `apps/web/test/setup.ts`
- [x] `apps/web/test/mocks/data.ts`
- [x] `apps/web/test/mocks/handlers.ts`
- [x] `apps/web/test/global-setup.ts`
- [x] `apps/web/test/global-teardown.ts`
- [x] `apps/web/test/utils.tsx`
- [x] `apps/web/__tests__/unit/hooks/useProject.test.ts`
- [x] `apps/web/__tests__/integration/components/ProjectCard.test.tsx`
- [x] `apps/web/__tests__/e2e/projects.spec.ts`
- [x] `.github/workflows/test.yml`
- [x] `docs/TESTING.md`
- [x] `docs/TESTING-GUIDE.md`
- [x] `scripts/setup-testing.sh`

### 相关文档
- [Vitest 文档](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright 文档](https://playwright.dev/)
- [MSW 文档](https://mswjs.io/)
