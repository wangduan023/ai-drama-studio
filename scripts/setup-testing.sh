#!/bin/bash

# AI Drama Studio - 测试环境安装脚本

set -e

echo "🧪 设置测试环境..."

# 安装测试依赖
echo "📦 安装测试依赖..."
pnpm add -D vitest @vitest/ui @vitest/coverage-v8 \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  jsdom msw @playwright/test

# 安装 Playwright 浏览器
echo "🎭 安装 Playwright 浏览器..."
pnpm exec playwright install chromium firefox webkit

# 生成 Prisma Client
echo "🔄 生成 Prisma Client..."
pnpm db:generate

echo "✅ 测试环境设置完成！"
echo ""
echo "可用命令:"
echo "  pnpm test              - 运行所有测试"
echo "  pnpm test:unit         - 运行单元测试"
echo "  pnpm test:e2e          - 运行 E2E 测试"
echo "  pnpm test:coverage     - 运行测试并生成覆盖率报告"
echo "  pnpm test:ui           - 打开 Vitest UI"
