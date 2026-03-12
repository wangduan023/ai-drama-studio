# AI 多渠道密钥管理文档

## 概述

本系统实现了统一的 AI 多渠道密钥管理和代理支持，包括以下核心功能：

- **密钥管理**: 支持同一渠道多个 API Key 的自动轮询和负载均衡
- **代理支持**: HTTP/HTTPS/SOCKS5 代理，支持自动选择和指定代理
- **统一 RBAC**: 细粒度的权限控制（系统级 + 项目级）
- **健康监控**: 自动健康检查和故障切换
- **使用统计**: 配额管理、成功率统计、成本追踪

## 架构设计

### 数据库模型

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AiProvider    │────<│    AiApiKey     │>────│     AiProxy     │
│    (渠道商)      │     │    (API密钥)     │     │    (代理服务器)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │
         v                       v
┌─────────────────┐     ┌─────────────────┐
│    AiModel      │     │  Role/Permission │
│    (模型配置)    │     │   (权限系统)     │
└─────────────────┘     └─────────────────┘
```

### 密钥选择策略

1. **能力匹配**: 根据请求类型（TEXT/IMAGE/VIDEO/VOICE）筛选密钥
2. **配额检查**: 排除已用完配额的密钥
3. **优先级排序**: 按 priority (升序) + weight (降序) 排序
4. **代理选择**: 根据 proxyMode (AUTO/SPECIFIC/NONE) 选择代理

### 权限模型

```
系统级角色: SUPER_ADMIN > ADMIN > USER
项目级角色: PROJECT_OWNER > PROJECT_ADMIN > PROJECT_EDITOR > PROJECT_VIEWER

权限格式: resource:action
示例: ai_key:create, ai_proxy:delete, project:manage
```

## API 接口

### AI Key 管理

```
GET    /api/admin/ai-keys          # 获取密钥列表
POST   /api/admin/ai-keys          # 创建密钥
GET    /api/admin/ai-keys/:id      # 获取密钥详情
PUT    /api/admin/ai-keys/:id      # 更新密钥
DELETE /api/admin/ai-keys/:id      # 删除密钥
```

### Proxy 管理

```
GET    /api/admin/proxy            # 获取代理列表
POST   /api/admin/proxy            # 创建代理
GET    /api/admin/proxy/:id        # 获取代理详情
PUT    /api/admin/proxy/:id        # 更新代理
DELETE /api/admin/proxy/:id        # 删除代理
```

### AI 生成服务

```
POST   /api/ai/generate            # 统一生成接口
POST   /api/ai/generate/stream     # 流式生成接口
```

### 健康检查

```
GET    /api/admin/health           # 获取健康状态
POST   /api/admin/health/check     # 执行健康检查
GET    /api/cron/health-check      # 定时任务接口
```

## 使用示例

### 1. 创建 API Key

```typescript
const response = await fetch('/api/admin/ai-keys', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    providerId: 'openai',
    name: 'Production Key 1',
    apiKey: 'sk-xxxxxxxx',
    capabilities: ['TEXT', 'CHAT'],
    priority: 1,
    weight: 10,
    quotaDaily: 1000,
    proxyMode: 'AUTO',
  }),
})
```

### 2. 使用 Unified AI Client

```typescript
import { createUnifiedAIClient } from '@ai-drama-studio/ai-client'

const client = createUnifiedAIClient({
  providerId: 'openai',
  modelId: 'gpt-4o',
  capability: 'CHAT',
  useProxy: true,
})

// 生成文本
const result = await client.generateText({
  messages: [{ role: 'user', content: 'Hello' }],
})

// 生成图片
const image = await client.generateImage({
  prompt: 'A beautiful sunset',
})
```

### 3. 使用 React Hooks

```typescript
import { useAiKeys, useAiGenerate } from '@/hooks'

// 管理密钥
const { keys, createKey, updateKey, deleteKey } = useAiKeys()

// AI 生成
const { generateText, generateTextStream, isGenerating } = useAiGenerate()

// 流式生成
await generateTextStream('openai', 'gpt-4o', params, (event) => {
  if (event.type === 'data') {
    console.log(event.content)
  }
})
```

### 4. 权限检查

```typescript
import { requirePermission, checkPermission } from '@/lib/rbac'

// API 路由中使用
export async function POST(request: NextRequest) {
  const result = await requirePermission(request, 'ai_key', 'create')
  if (!result.success) return result.response
  
  // 继续处理...
}

// 检查项目权限
const hasPermission = await checkPermission(
  userId,
  'project',
  'manage',
  projectId
)
```

## 配置说明

### 环境变量

```bash
# 数据库
DATABASE_URL="mysql://root:password@localhost:3306/ai_drama_studio"

# 加密密钥
ENCRYPTION_KEY="your-encryption-key"

# JWT 密钥
JWT_SECRET="your-jwt-secret"

# Cron 密钥（用于定时任务）
CRON_SECRET="your-cron-secret"

# 告警 Webhook（可选）
ALERT_WEBHOOK_URL="https://hooks.example.com/alert"
```

### 代理配置

```typescript
// 创建代理
await createProxy({
  name: 'US Proxy 1',
  host: 'proxy.example.com',
  port: 8080,
  protocol: 'HTTP', // HTTP | HTTPS | SOCKS5
  username: 'user',
  password: 'pass',
  location: 'US',
  maxConcurrent: 10,
})
```

## 监控和告警

### 健康检查

```bash
# 手动执行健康检查
curl -X POST /api/admin/health/check \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type": "full"}'

# 定时任务（Vercel Cron）
# 配置 vercel.json
{
  "crons": [
    {
      "path": "/api/cron/health-check",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### 监控指标

- **成功率**: 每个 API Key 的成功/失败比率
- **延迟**: 平均响应时间
- **配额使用**: 每日配额消耗情况
- **并发连接**: 代理的并发连接数
- **健康状态**: 资源的健康/故障状态

## 故障排查

### 常见问题

1. **密钥认证失败**
   - 检查 API Key 是否正确
   - 查看密钥的健康状态
   - 检查是否超出配额

2. **代理连接失败**
   - 验证代理配置
   - 检查代理健康状态
   - 确认网络连通性

3. **权限不足**
   - 检查用户角色
   - 验证项目成员权限
   - 查看权限分配

### 日志查询

```typescript
// 查看密钥使用日志
const usage = await prisma.aiUsageLog.findMany({
  where: {
    keyId: 'key-id',
    createdAt: {
      gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
    }
  }
})
```

## 最佳实践

1. **密钥轮换**: 定期轮换 API Key，避免单点故障
2. **配额监控**: 设置配额告警，防止服务中断
3. **健康检查**: 启用自动健康检查和故障切换
4. **权限最小化**: 只授予必要的权限
5. **代理分发**: 根据地理位置选择最优代理

## 相关文档

- [Architecture](./ARCHITECTURE.md) - 系统架构设计
- [RBAC](./RBAC.md) - 权限系统详细文档
- [API Reference](./API.md) - API 参考文档
