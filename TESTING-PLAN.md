# AI Drama Studio - 自动化测试方案

## 📊 方案概述

本方案实现了**无需人工辅助**的全自动化前端测试，覆盖单元测试、集成测试和 E2E 测试三个层次。

## 🏗️ 架构设计

```
┌────────────────────────────────────────────────────────────┐
│                        CI/CD Pipeline                       │
│                    (GitHub Actions)                         │
└────────────────────┬───────────────────────────────────────┘
                     │
    ┌────────────────┼────────────────┐
    ▼                ▼                ▼
┌─────────┐    ┌──────────┐    ┌──────────┐
│  Lint   │    │  Unit    │    │   E2E    │
│  Check  │    │  Tests   │    │  Tests   │
└─────────┘    └──────────┘    └──────────┘
                     │                │
                     ▼                ▼
              ┌──────────────────────────┐
              │    Coverage Report       │
              │      (80% threshold)     │
              └──────────────────────────┘
```

## 🧪 测试层次

### 1. 单元测试 (60%)
- **工具**: Vitest
- **范围**: 工具函数、Hooks、业务逻辑
- **运行时间**: < 30 秒
- **文件位置**: `apps/web/__tests__/unit/**/*.test.ts`

### 2. 集成测试 (30%)
- **工具**: Vitest + React Testing Library
- **范围**: 组件渲染、页面交互
- **运行时间**: < 60 秒
- **文件位置**: `apps/web/__tests__/integration/**/*.test.tsx`

### 3. E2E 测试 (10%)
- **工具**: Playwright
- **范围**: 完整用户流程、多浏览器测试
- **运行时间**: 2-5 分钟
- **文件位置**: `apps/web/__tests__/e2e/**/*.spec.ts`

## 📁 文件结构

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

## 🚀 运行命令

```bash
# 一键运行所有测试
pnpm test

# 单独运行各层测试
pnpm test:unit        # 单元测试
pnpm test:integration # 集成测试
pnpm test:e2e         # E2E 测试

# 带覆盖率
pnpm test:coverage

# 调试模式
pnpm test:ui          # Vitest UI
pnpm test:e2e:ui      # Playwright UI
```

## 🔧 Mock 系统

### MSW (Mock Service Worker)

自动拦截 API 请求，返回 Mock 数据：

```typescript
// test/mocks/handlers.ts
http.get('/api/projects', () => {
  return HttpResponse.json(mockProjects)
})
```

### 测试数据

- `mockProjects` - 3 个测试项目
- `mockCharacters` - 2 个测试角色
- `mockEpisodes` - 2 个测试剧集
- `mockLocations` - 2 个测试地点

## 🔄 CI/CD 集成

### GitHub Actions 工作流

```yaml
# .github/workflows/test.yml
jobs:
  unit-test:      # 单元测试
  e2e-test:       # E2E 测试
  lint-and-typecheck:  # 代码质量
```

### 自动化流程

1. **Push/PR 触发**
   - 自动运行所有测试
   - 生成覆盖率报告
   - 上传测试报告

2. **质量门禁**
   - 测试通过率 100%
   - 代码覆盖率 ≥ 70%
   - ESLint 零警告
   - TypeScript 零错误

3. **报告生成**
   - HTML 测试报告
   - JUnit XML 报告
   - Playwright 跟踪视频
   - Codecov 覆盖率报告

## 📊 覆盖率阈值

| 指标 | 目标 | 最低 |
|------|------|------|
| Lines | 80% | 70% |
| Functions | 80% | 70% |
| Branches | 70% | 60% |
| Statements | 80% | 70% |

## 🐛 故障排查

### 常见问题

| 问题 | 解决方案 |
|------|----------|
| 测试超时 | 增加 `testTimeout` 配置 |
| 内存溢出 | 减少 `workers` 数量 |
| 浏览器失败 | 重新安装 Playwright 浏览器 |
| 数据库连接失败 | 检查 Docker 服务状态 |

### 调试命令

```bash
# 单文件调试
pnpm vitest run __tests__/unit/hooks/useProject.test.ts

# Playwright 可视化调试
pnpm test:e2e --headed --debug

# 查看测试报告
open apps/web/test-report.html
open apps/web/playwright-report/index.html
```

## 📈 持续改进

1. **定期回顾**
   - 每周检查测试覆盖率
   - 每月更新测试用例

2. **新功能测试**
   - 新功能必须包含测试
   - PR 前测试通过率 100%

3. **性能优化**
   - 并行运行测试
   - 智能缓存依赖
   - 选择性运行测试

## 📝 维护责任

| 角色 | 职责 |
|------|------|
| 开发人员 | 编写单元/集成测试 |
| QA 工程师 | 编写 E2E 测试 |
| Tech Lead | 维护 CI/CD 流程 |

---

**无需人工辅助，提交代码后自动运行完整测试流程！**
