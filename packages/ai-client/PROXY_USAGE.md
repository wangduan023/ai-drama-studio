# HTTP 代理使用指南

本文档介绍如何在国内使用 HTTP 代理访问国外 AI API。

## 问题背景

由于网络限制，中国大陆地区用户无法直接访问部分国外 AI 服务 API，包括：
- OpenAI (api.openai.com)
- Anthropic (api.anthropic.com)
- Google Gemini (generativelanguage.googleapis.com)
- Mistral AI
- Cohere
- Groq
- Stability AI
- Fal.ai
- Runway ML
- ElevenLabs
- Luma AI
- Hugging Face

## 解决方案

### 方案 1: 使用 HTTP 代理（推荐）

通过配置 HTTP 代理服务器，让 AI 客户端的请求通过代理服务器转发。

#### 步骤 1: 准备代理服务器

你可以使用以下任一种方式：

**本地代理软件:**
- ClashX / Clash for Windows (默认端口：7890)
- Shadowsocks
- Surge
- V2Ray

**云代理服务:**
- 自建反向代理服务器
- 第三方代理服务

#### 步骤 2: 配置环境变量

复制 `.env.example` 到 `.env`，然后配置代理：

```bash
# HTTP 代理配置
HTTP_PROXY_HOST="127.0.0.1"     # 代理服务器地址
HTTP_PROXY_PORT=7890            # 代理端口
HTTP_PROXY_USERNAME=""          # 用户名 (可选，如果代理需要认证)
HTTP_PROXY_PASSWORD=""          # 密码 (可选)
```

#### 步骤 3: 创建带代理的客户端

```typescript
import { createAIClient, createProxyFromEnv } from '@ai-drama-studio/ai-client'

// 从环境变量读取代理配置
const proxy = createProxyFromEnv()

// 创建 OpenAI 客户端 (带代理)
const openaiClient = createAIClient({
  provider: 'openai',
  modelId: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
  proxy,  // 传入代理配置
})

// 创建 Anthropic 客户端 (带代理)
const anthropicClient = createAIClient({
  provider: 'anthropic',
  modelId: 'claude-3-7-sonnet-20250219',
  apiKey: process.env.ANTHROPIC_API_KEY,
  proxy,
})

// 创建 Google 客户端 (带代理)
const geminiClient = createAIClient({
  provider: 'google',
  modelId: 'gemini-2.0-flash',
  apiKey: process.env.GOOGLE_API_KEY,
  proxy,
})
```

#### 步骤 4: 使用客户端

```typescript
// 使用示例
const result = await openaiClient.generateText({
  messages: [{ role: 'user', content: 'Hello!' }],
})
console.log(result.text)
```

### 方案 2: 使用国内云服务的中转 API

国内多家云厂商提供 AI API 的国内中转服务：

| 原始厂商 | 国内中转服务 |
|---------|-------------|
| OpenAI | 火山引擎、阿里云百炼、硅基流动 |
| Anthropic | 部分云厂商中转 |
| Google | 部分云厂商中转 |

**优点**: 合法合规、低延迟、稳定性高
**缺点**: 可能需要额外费用

### 方案 3: 优先使用国内 AI 厂商

本项目已集成 33+ 个 AI 厂商，其中国内厂商的 API 可直接访问：

#### 文本生成
- **百度文心一言** (`baidu`)
- **腾讯混元** (`tencent`)
- **科大讯飞星火** (`iflytek`)
- **智谱 AI/GLM** (`zhipu`)
- **月之暗面/Kimi** (`moonshot`)
- **MiniMax/海螺 AI** (`minimax`)
- **零一万物/Yi** (`lingyi`)
- **百川智能** (`baichuan`)
- **阶跃星辰/跃问** (`stepfun`)
- **商汤科技** (`sensetime`)

#### 图像生成
- **阿里通义万相** (`wanxiang`)
- **腾讯混元图像** (`hunyuan-image`)
- **百度文心一格** (`gewang`)

#### 视频生成
- **可灵 AI** (`kling`) - 快手
- **Vidu** - 生数科技

#### 语音合成
- **科大讯飞** - 业界领先
- **百度** - 多音色支持
- **腾讯** - 情感化语音

## 代码示例

### 完整示例 (Next.js/Express)

```typescript
// lib/ai-client.ts
import { createAIClient, createProxyFromEnv } from '@ai-drama-studio/ai-client'

// 创建代理配置 (从环境变量)
const proxy = createProxyFromEnv()

// 创建多个客户端
export const clients = {
  openai: createAIClient({
    provider: 'openai',
    modelId: 'gpt-4o',
    apiKey: process.env.OPENAI_API_KEY,
    proxy,
  }),

  anthropic: createAIClient({
    provider: 'anthropic',
    modelId: 'claude-3-7-sonnet-20250219',
    apiKey: process.env.ANTHROPIC_API_KEY,
    proxy,
  }),

  // 国内客户端不需要代理
  zhipu: createAIClient({
    provider: 'zhipu',
    modelId: 'glm-4-flash',
    apiKey: process.env.ZHIPU_API_KEY,
  }),
}
```

### 条件代理（仅国外 API 使用代理）

```typescript
import { createAIClient, createProxyFromEnv } from '@ai-drama-studio/ai-client'

const proxy = createProxyFromEnv()

// 判断是否需要代理
const needsProxy = (provider: string) => {
  const foreignProviders = [
    'openai', 'anthropic', 'google', 'mistral', 'cohere',
    'groq', 'stability', 'fal', 'runway', 'elevenlabs', 'luma', 'huggingface'
  ]
  return foreignProviders.includes(provider)
}

export function createClient(provider: string, config: any) {
  return createAIClient({
    ...config,
    provider,
    proxy: needsProxy(provider) ? proxy : undefined,
  })
}
```

### 动态代理切换

```typescript
import { createAIClient, createProxyFromEnv, getProxyUrl } from '@ai-drama-studio/ai-client'

// 多个代理配置
const proxies = [
  createProxyFromEnv(),
  { host: 'proxy2.example.com', port: 8080 },
  // ...
]

// 轮询使用不同代理
let currentProxyIndex = 0

export function createClientWithRotation(config: any) {
  const proxy = proxies[currentProxyIndex % proxies.length]
  currentProxyIndex++

  console.log(`使用代理：${getProxyUrl(proxy)}`)

  return createAIClient({
    ...config,
    proxy,
  })
}
```

## 故障排查

### 测试代理是否可用

```bash
# 测试代理连接
curl -x http://127.0.0.1:7890 https://api.openai.com/v1/models
```

### 检查代理配置

```typescript
import { isValidProxyConfig, createProxyFromEnv } from '@ai-drama-studio/ai-client'

const proxy = createProxyFromEnv()

if (!isValidProxyConfig(proxy)) {
  console.warn('代理配置无效，将直接连接 API')
} else {
  console.log('代理配置有效:', proxy)
}
```

### 常见错误

| 错误 | 原因 | 解决方法 |
|-----|------|---------|
| `NETWORK_ERROR` | 代理服务器未启动 | 检查代理软件是否运行 |
| `TIMEOUT` | 代理响应慢 | 增加 `timeout` 配置或更换代理 |
| `AUTH_ERROR` | API Key 无效 | 检查 API Key 配置 |
| 连接被拒绝 | 代理端口错误 | 检查 `HTTP_PROXY_PORT` 配置 |

## 环境变量参考

```bash
# 必需配置
HTTP_PROXY_HOST="127.0.0.1"   # 代理服务器地址
HTTP_PROXY_PORT=7890          # 代理端口

# 可选配置（代理认证）
HTTP_PROXY_USERNAME="user"    # 用户名
HTTP_PROXY_PASSWORD="pass"    # 密码

# AI API 配置
OPENAI_API_KEY="sk-xxx"
ANTHROPIC_API_KEY="sk-ant-xxx"
GOOGLE_API_KEY="xxx"
```

## 注意事项

1. **代理稳定性**: 建议使用稳定的代理服务，避免频繁断连
2. **延迟问题**: 代理会增加请求延迟，建议适当增加 `timeout` 配置
3. **费用**: 部分代理服务需要付费，请根据需求选择
4. **合规性**: 使用代理服务请遵守相关法律法规

## 相关资源

- [AI Client API 文档](./packages/ai-client/README.md)
- [环境变量配置示例](./.env.example)
