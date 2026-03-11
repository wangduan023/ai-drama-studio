# AI Drama Studio - 前端自动化测试方案

## 测试架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                     测试金字塔                               │
├─────────────────────────────────────────────────────────────┤
│  E2E 测试 (10%)    │  Playwright → 真实浏览器测试          │
│  集成测试 (30%)    │  Vitest + RTL → 组件/Hook 测试       │
│  单元测试 (60%)    │  Vitest → 工具函数/业务逻辑测试       │
└─────────────────────────────────────────────────────────────┘
```

## 技术栈

| 测试类型 | 工具 | 用途 |
|---------|------|------|
| 单元测试 | Vitest | 工具函数、hooks、业务逻辑 |
| 组件测试 | Vitest + React Testing Library | UI 组件渲染、交互 |
| E2E 测试 | Playwright | 完整用户流程 |
| Mock | MSW (Mock Service Worker) | API 请求拦截 |
| 覆盖率 | v8 | 代码覆盖率报告 |

## 目录结构

```
apps/web/
├── __tests__/
│   ├── unit/                 # 单元测试
│   │   ├── utils/           # 工具函数测试
│   │   └── hooks/           # Hooks 测试
│   ├── integration/         # 集成测试
│   │   ├── components/      # 组件测试
│   │   └── pages/           # 页面级测试
│   └── e2e/                 # E2E 测试
│       ├── projects.spec.ts
│       └── characters.spec.ts
├── test/
│   ├── setup.ts             # 测试环境配置
│   ├── mocks/               # Mock 数据
│   │   ├── handlers.ts      # MSW handlers
│   │   └── data.ts          # 测试数据
│   └── fixtures/            # 测试夹具
└── playwright.config.ts     # Playwright 配置
```

## 运行命令

```bash
# 运行所有测试
pnpm test

# 单元测试（Vitest）
pnpm test:unit

# E2E 测试（Playwright）
pnpm test:e2e

# 带覆盖率报告
pnpm test:coverage

# UI 模式（调试）
pnpm test:ui
```

## CI/CD 集成

- PR 自动运行测试
- 覆盖率阈值：80%
- 测试失败阻止合并
