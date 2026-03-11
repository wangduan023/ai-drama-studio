# AI Drama Studio - 测试快速开始指南

## 📋 测试架构

```
测试金字塔
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  E2E 测试 (10%)     → 用户真实流程
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  集成测试 (30%)     → 组件/页面交互
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  单元测试 (60%)     → 函数/Hooks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🚀 快速开始

### 1. 安装测试依赖

```bash
chmod +x scripts/setup-testing.sh
./scripts/setup-testing.sh
```

### 2. 运行测试

```bash
# 所有测试
pnpm test

# 仅单元测试
pnpm test:unit

# 仅集成测试
pnpm test:integration

# E2E 测试
pnpm test:e2e

# 带覆盖率报告
pnpm test:coverage

# 调试模式
pnpm test:ui              # Vitest UI
pnpm test:e2e:ui          # Playwright UI
```

## 📝 编写测试

### 单元测试示例

```typescript
// __tests__/unit/utils/format.test.ts
import { describe, it, expect } from 'vitest'
import { formatDate } from '@/lib/utils'

describe('formatDate', () => {
  it('应该正确格式化日期', () => {
    const result = formatDate('2024-01-15')
    expect(result).toBe('2024年1月15日')
  })
})
```

### 组件测试示例

```typescript
// __tests__/integration/components/Button.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@/test/utils'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('应该响应点击事件', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>点击我</Button>)
    
    fireEvent.click(screen.getByText('点击我'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### E2E 测试示例

```typescript
// __tests__/e2e/login.spec.ts
import { test, expect } from '@playwright/test'

test('用户登录流程', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('邮箱').fill('test@example.com')
  await page.getByLabel('密码').fill('password')
  await page.getByRole('button', { name: '登录' }).click()
  
  await expect(page).toHaveURL('/dashboard')
})
```

## 🔧 Mock 数据

测试数据位于 `apps/web/test/mocks/data.ts`，包含：

- `mockProjects` - 项目数据
- `mockCharacters` - 角色数据
- `mockEpisodes` - 剧集数据
- `mockLocations` - 地点数据

## 🎯 测试最佳实践

### 1. 测试命名规范

```typescript
// ✅ 好的命名
describe('useProjectList', () => {
  it('应该返回项目列表', async () => {})
  it('应该处理错误状态', async () => {})
  it('应该支持搜索过滤', async () => {})
})

// ❌ 避免
describe('useProjectList', () => {
  it('test1', async () => {})
  it('works correctly', async () => {})
})
```

### 2. 使用 data-testid

```tsx
// 组件中
device-button data-testid="submit-button">提交</button>

// 测试中
screen.getByTestId('submit-button')
```

### 3. 避免测试实现细节

```typescript
// ✅ 测试行为
expect(screen.getByText('项目已创建')).toBeInTheDocument()

// ❌ 避免测试实现
expect(component.state.isOpen).toBe(true)
```

## 📊 覆盖率阈值

| 类型 | 目标 |
|------|------|
| Lines | 70% |
| Functions | 70% |
| Branches | 60% |
| Statements | 70% |

## 🐛 调试技巧

### Vitest 调试

```bash
# 单文件测试
pnpm vitest run __tests__/unit/hooks/useProject.test.ts

# 监视模式
pnpm vitest watch

# UI 模式
pnpm vitest --ui
```

### Playwright 调试

```bash
#  headed 模式（可见浏览器）
pnpm test:e2e --headed

# 单文件测试
pnpm test:e2e __tests__/e2e/projects.spec.ts

# 特定项目（浏览器）
pnpm test:e2e --project=chromium

# 调试模式
pnpm test:e2e --debug
```

## 🔗 相关文档

- [Vitest 文档](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright 文档](https://playwright.dev/)
- [MSW 文档](https://mswjs.io/)
