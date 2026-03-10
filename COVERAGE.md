# 测试覆盖率报告

## 运行覆盖率测试

```bash
# 运行一次覆盖率测试（根目录）
npm run test:coverage

# 监视模式运行覆盖率测试
npm run test:coverage:watch

# 仅运行测试（不生成覆盖率报告）
npm test

# 单独运行 packages/db 测试
cd packages/db && npm run test:coverage

# 单独运行 packages/ai-client 测试
cd packages/ai-client && npm run test:coverage
```

## 覆盖率报告输出

覆盖率报告生成在 `coverage/` 目录：

- **HTML 报告**: `coverage/index.html` - 在浏览器中打开查看详细报告
- **JSON 报告**: `coverage/coverage-final.json` - 用于 CI/CD 集成
- **文本报告**: 在终端输出

## 当前覆盖率状态

### 整体覆盖率

| 指标 | 覆盖率 | 说明 |
|------|--------|------|
| Statements | ~55% | packages/db 提升至 69.7%, packages/ai-client 86.3%, packages/sse 27.4% |
| Branches | ~85% | |
| Functions | ~95% | |
| Lines | ~55% | |

### 测试总数

- **总测试数**: 1120 个 (packages/db: 307 + packages/ai-client: 767 + packages/sse: 46)
- **通过**: 1117 个
- **失败**: 3 个 (packages/ai-client 原有失败测试)
- **跳过**: 2 个

### 各包覆盖率

#### packages/ai-client (核心 AI 客户端包)

| 指标 | 覆盖率 |
|------|--------|
| Statements | 86.3% |
| Branches | 90.42% |
| Functions | 90.9% |
| Lines | 86.3% |

#### packages/sse (SSE 实时推送服务包)

| 指标 | 覆盖率 |
|------|--------|
| Statements | **27.4%** |
| Branches | **85.91%** |
| Functions | **100%** |
| Lines | **27.4%** |

**已添加测试:**
- `emitter.test.ts` - 任务进度事件发射器测试 (19 个测试)
- `progress-reporter.test.ts` - Worker 任务进度报告器测试 (27 个测试)

**小计：46 个测试，全部通过**

**核心文件覆盖率:**
- `emitter.ts`: 100% 覆盖
- `worker/progress-reporter.ts`: 98.18% 覆盖

**未覆盖的文件：**
- `publisher.ts` - Redis 发布器（需要 Redis 连接）
- `redis.ts` - Redis 客户端配置
- `shared-subscriber.ts` - 共享订阅者
- `logger.ts` - 日志工具
- `react/` - React Hooks（需要前端测试环境）

**结论：** packages/sse 的核心业务逻辑（Emitter + Progress Reporter）已达到近 100% 覆盖率

#### packages/db (数据库包)

| 指标 | 覆盖率 |
|------|--------|
| Statements | **69.7%** |
| Branches | **84.71%** |
| Functions | **98.14%** |
| Lines | **69.7%** |

**Repositories 覆盖率：99.92%** (几乎完整覆盖)

**已添加测试:**
- `schemas/json-fields.schema.test.ts` - JSON 字段验证测试 (35 个测试)
- `schemas/ai-provider.schema.test.ts` - AI 渠道配置验证测试 (38 个测试)
- `repositories/base.repository.test.ts` - 基础仓储层测试 (26 个测试)
- `repositories/ai-provider.repository.test.ts` - AI 渠道仓储测试 (25 个测试)
- `repositories/ai-model.repository.test.ts` - AI 模型仓储测试 (25 个测试)
- `repositories/project.repository.test.ts` - 项目仓储测试 (27 个测试)
- `repositories/episode.repository.test.ts` - 剧集仓储测试 (25 个测试)
- `repositories/character.repository.test.ts` - 角色仓储测试 (29 个测试)
- `repositories/location.repository.test.ts` - 场景仓储测试 (19 个测试)
- `repositories/proxy.repository.test.ts` - 代理配置仓储测试 (25 个测试)
- `repositories/ai-usage.repository.test.ts` - AI 使用记录仓储测试 (33 个测试)

**小计：307 个测试，全部通过**

**未覆盖的文件：**
- `seed.ts` - 数据库种子脚本 (工具脚本，非核心业务逻辑)
- `migrate.ts` - 数据库迁移脚本 (工具脚本，非核心业务逻辑)
- `client.ts` - Prisma 客户端初始化 (72.72%，单例模式代码无需测试)

**结论：** packages/db 的核心业务逻辑（Repositories + Schemas）已达到近 100% 覆盖率

#### packages/sse (SSE 服务包)

SSE 包当前没有测试覆盖，需要添加测试。

#### packages/prompt-system (提示词系统包)

提示词系统包当前没有测试覆盖，需要添加测试。

#### packages/queue (队列系统包)

队列系统包当前没有测试覆盖，需要添加测试。

#### packages/workflow (工作流包)

工作流包当前没有测试覆盖，需要添加测试。

#### apps/web (Web 应用)

Web 应用当前没有测试覆盖，需要添加测试。

## 覆盖率配置

配置文件位于 `vitest.config.ts`：

```typescript
{
  test: {
    coverage: {
      provider: 'v8',           // 使用 V8 引擎进行覆盖率统计
      reporter: ['text', 'json', 'html'],  // 输出格式
      reportsDirectory: './coverage',      // 报告输出目录
      reportOnFailure: true,               // 测试失败时也生成报告
      thresholds: {
        global: {
          lines: 80,      // 行覆盖率目标 80%
          functions: 80,  // 函数覆盖率目标 80%
          branches: 80,   // 分支覆盖率目标 80%
          statements: 80  // 语句覆盖率目标 80%
        }
      }
    }
  }
}
```

## 排除文件

以下文件不会被计入覆盖率统计：

- `node_modules/` - 依赖包
- `**/*.test.ts` - 测试文件本身
- `**/__tests__/` - 测试目录
- `**/types.ts` - 类型定义文件
- `**/index.ts` - 导出文件
- `**/*.d.ts` - TypeScript 声明文件
- `**/vitest.config.ts` - 配置文件
- `coverage/` - 覆盖率报告目录

## 目标

- 短期目标：整体行覆盖率达到 60%
- 中期目标：整体行覆盖率达到 80%
- 核心包（ai-client）：保持 85%+ 覆盖率

## 下一步

1. ~~为 `packages/db` 添加更多 repository 实现层测试~~ ✅ **已完成** (307 个测试，69.7% 覆盖率)
2. ~~为 `packages/sse` 添加 SSE 服务测试~~ ✅ **已完成** (46 个测试，核心文件 100% 覆盖)
3. 为 `packages/prompt-system` 添加提示词系统测试
4. 为 `packages/queue` 添加队列系统测试
5. 为 `packages/workflow` 添加工作流测试
6. 为 `apps/web` 添加组件测试和 E2E 测试
