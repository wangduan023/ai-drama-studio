# Playwright 控制台错误监控与自动修复

自动捕获浏览器控制台错误、分析原因并尝试修复的完整方案。

## 功能特性

- 🔍 **自动捕获** - 实时监控控制台 error/warning
- 🧠 **智能分析** - 自动分类并诊断错误原因
- 🔧 **自动修复** - 针对常见错误自动修复
- 📝 **详细报告** - 生成 Markdown/JSON 错误报告
- 🔌 **MCP 集成** - 与 Kimi Code CLI 无缝集成

## 快速开始

### 1. 独立运行

```bash
cd apps/web

# 安装依赖
pnpm add -D @playwright/test

# 启动监控
npx tsx scripts/error-monitor/index.ts
```

浏览器会自动打开，你在页面上操作时所有错误都会被捕获。

### 2. MCP 集成

在 `.kimi/mcp.json` 中添加：

```json
{
  "mcpServers": {
    "error-monitor": {
      "command": "npx",
      "args": ["tsx", "apps/web/scripts/error-monitor/mcp-server.ts"]
    }
  }
}
```

然后你可以使用以下工具：

| 工具 | 功能 |
|------|------|
| `start_monitoring` | 启动浏览器监控 |
| `get_errors` | 获取捕获的错误列表 |
| `analyze_error` | 分析指定错误 |
| `fix_error` | 尝试自动修复 |
| `generate_fix_report` | 生成完整报告 |
| `stop_monitoring` | 停止监控 |

## 使用示例

### CLI 模式

```bash
# 基础监控
npx tsx scripts/error-monitor/index.ts

# 指定 URL
MONITOR_URL=http://localhost:3000 npx tsx scripts/error-monitor/index.ts

# 开启自动修复
AUTO_FIX=true npx tsx scripts/error-monitor/index.ts

# 监控 60 秒后自动停止
MONITOR_DURATION=60000 npx tsx scripts/error-monitor/index.ts
```

### MCP 模式

```
启动浏览器监控，打开 http://localhost:3333
```

等待用户操作后：

```
获取所有捕获的错误
```

分析特定错误：

```
分析错误消息包含 "undefined" 的错误
```

自动修复：

```
修复 ID 为 err_xxx 的错误
```

生成报告：

```
生成错误修复报告
```

## 错误分类

| 类别 | 严重程度 | 自动修复 |
|------|----------|----------|
| React Hydration | High | ✅ 抑制警告 |
| React Key | Medium | ❌ 代码建议 |
| Network | High | ✅ 重试/刷新 |
| CORS | High | ❌ 需服务端配置 |
| Null Reference | Critical | ❌ 代码建议 |
| Type Error | High | ❌ 代码建议 |
| Module | Critical | ❌ 需手动安装 |
| Resource Loading | Medium | ✅ 刷新页面 |
| Code Splitting | High | ✅ 重新加载 |
| Storage | Medium | ✅ 清理过期数据 |
| WebSocket | High | ❌ 需检查服务 |
| Permission | High | ❌ 需检查权限 |
| Memory | Critical | ❌ 需优化代码 |
| Performance | Medium | ❌ 需优化代码 |

## 配置文件

创建 `error-monitor.config.ts`：

```typescript
export default {
  // 监控配置
  url: 'http://localhost:3333',
  duration: 0, // 0 = 无限
  
  // 自动修复
  autoFix: true,
  
  // 过滤器
  ignorePatterns: [
    /deprecated/i,
    /Third-party cookie/i
  ],
  
  // 通知
  onError: (error) => {
    // 发送到 Slack/钉钉
    console.log('新错误:', error.message)
  },
  
  // 自定义修复策略
  customStrategies: [
    {
      name: 'MyFix',
      canHandle: (error) => error.message.includes('xxx'),
      fix: async (error, page) => {
        // 自定义修复逻辑
        return { success: true, message: '已修复' }
      }
    }
  ]
}
```

## 自定义修复策略

```typescript
import { FixStrategy } from './fixer'

class MyCustomStrategy implements FixStrategy {
  name = 'MyCustom'
  
  canHandle(error: CapturedError): boolean {
    return error.message.includes('特定错误')
  }
  
  async fix(error: CapturedError, page: Page): Promise<FixResult> {
    // 你的修复逻辑
    await page.evaluate(() => {
      // 清理状态、重置数据等
    })
    
    return {
      success: true,
      message: '已应用自定义修复',
      action: 'custom_fix'
    }
  }
}
```

## 输出示例

```
🚀 启动控制台错误监控服务...
📍 目标: http://localhost:3333
🔧 自动修复: 开启
✅ 监控已启动，请在浏览器中操作...

[ERROR] Cannot read property 'name' of undefined
  📍 http://localhost:3333/src/components/Profile.tsx:23
  🔍 分析错误中...
  📊 分类: Null Reference
  ⚠️  严重程度: critical
  💭 可能原因: 访问了 undefined 或 null 对象的属性
  💡 建议修复: 添加空值检查或使用可选链操作符 ?.
  🔧 尝试自动修复...
  ⚠️  修复失败: 需要手动应用代码修复
  
📊 监控报告
==================================================
总计错误: 3
  Null Reference: 2
  Network: 1
自动修复: 1/3
📝 报告已保存: error-report-1234567890.json
```

## 与 CI/CD 集成

```yaml
# .github/workflows/error-monitor.yml
name: Console Error Check

on: [push]

jobs:
  monitor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Start server
        run: npm run dev &
      - name: Wait for server
        run: npx wait-on http://localhost:3333
      - name: Run error monitor
        run: |
          npx tsx scripts/error-monitor/index.ts &
          sleep 30
          curl http://localhost:3333  # 触发一些页面操作
          kill %1
      - name: Check errors
        run: |
          if grep -q "critical" error-report-*.json; then
            echo "发现关键错误!"
            exit 1
          fi
```

## 工作原理

```
┌─────────────────────────────────────────────────────────────┐
│                      用户操作浏览器                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Playwright 监听层                         │
│  ├─ page.on('console')     → 捕获 console.error/warn        │
│  ├─ page.on('pageerror')   → 捕获未捕获异常                  │
│  └─ page.on('requestfailed') → 捕获请求失败                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     错误分析引擎                             │
│  ├─ 模式匹配 → 分类错误类型                                  │
│  ├─ 堆栈解析 → 定位源文件                                    │
│  └─ 严重程度评估 → critical/high/medium/low                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     自动修复引擎                             │
│  ├─ 网络错误 → 重试/刷新                                     │
│  ├─ 存储错误 → 清理过期数据                                  │
│  ├─ Hydration → 抑制警告                                     │
│  └─ 代码错误 → 生成修复建议                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     报告生成                                 │
│  ├─ 统计汇总                                                │
│  ├─ 分类统计                                                │
│  ├─ 修复状态                                                │
│  └─ 代码修改建议                                            │
└─────────────────────────────────────────────────────────────┘
```

## 注意事项

1. **生产环境** - 建议在开发/测试环境使用，生产环境使用专门的错误监控服务
2. **性能影响** - 监控本身对页面性能影响极小
3. **隐私** - 不会捕获用户输入内容，只捕获错误信息
4. **误报** - 某些第三方脚本错误可以配置忽略

## 依赖

```json
{
  "@playwright/test": "^1.40.0",
  "tsx": "^4.0.0",
  "@modelcontextprotocol/sdk": "^1.0.0" // MCP 模式需要
}
```

## License

MIT
