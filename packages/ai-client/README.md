# @ai-drama-studio/ai-client

AI Client Abstraction Layer - AI 客户端抽象层

基于 waoowaoo 项目架构，提供统一的 AI 模型调用抽象层。

## 功能特性

- **统一接口**: 所有 AI 提供商使用相同的接口
- **多提供商支持**: 支持 20+ 国内外主流 AI 模型
- **负载均衡**: 支持轮询、权重、最少负载策略
- **重试机制**: 指数退避重试逻辑
- **流式输出**: 完整的 SSE 流式支持
- **类型安全**: 完整的 TypeScript 类型定义

## 安装

```bash
npm install @ai-drama-studio/ai-client
```

## 快速开始

### 创建客户端

```typescript
import { createAIClient } from '@ai-drama-studio/ai-client'

// 创建 OpenAI 客户端
const openaiClient = createAIClient({
  provider: 'openai',
  modelId: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
})

// 创建 Anthropic 客户端
const anthropicClient = createAIClient({
  provider: 'anthropic',
  modelId: 'claude-3-7-sonnet-20250219',
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// 创建豆包客户端 (ARK API)
const doubaoClient = createAIClient({
  provider: 'doubao',
  modelId: 'doubao-seedance-1-0-pro-fast-251015',
  apiKey: process.env.DOUBAO_API_KEY,
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
})

// 创建 DeepSeek 客户端
const deepseekClient = createAIClient({
  provider: 'deepseek',
  modelId: 'deepseek-v3',
  apiKey: process.env.DEEPSEEK_API_KEY,
})

// 创建 Qwen 客户端 (阿里云)
const qwenClient = createAIClient({
  provider: 'qwen',
  modelId: 'qwen2.5-72b-instruct',
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
})

// 创建 Ollama 客户端 (本地服务)
const ollamaClient = createAIClient({
  provider: 'ollama',
  modelId: 'llama3.1:8b',
  baseURL: 'http://localhost:11434/api',
})

// 创建 ComfyUI 客户端 (本地服务)
const comfyuiClient = createAIClient({
  provider: 'comfyui',
  baseURL: 'http://localhost:8188',
})

// 创建百度文心一言客户端
const baiduClient = createAIClient({
  provider: 'baidu',
  modelId: 'ernie-4.0-turbo-8k',
  apiKey: process.env.BAIDU_API_KEY, // 格式：apiKey:secretKey
})

// 创建腾讯混元客户端
const tencentClient = createAIClient({
  provider: 'tencent',
  modelId: 'hunyuan-pro',
  apiKey: process.env.TENCENT_API_KEY, // 格式：SecretId:SecretKey
})

// 创建科大讯飞星火客户端
const iflytekClient = createAIClient({
  provider: 'iflytek',
  modelId: 'spark-3.5',
  apiKey: process.env.IFLYTEK_API_KEY, // 格式：APIKey:APISecret
})

// 创建智谱 AI 客户端
const zhipuClient = createAIClient({
  provider: 'zhipu',
  modelId: 'glm-4',
  apiKey: process.env.ZHIPU_API_KEY,
})

// 创建月之暗面 Kimi 客户端
const moonshotClient = createAIClient({
  provider: 'moonshot',
  modelId: 'kimi-latest',
  apiKey: process.env.MOONSHOT_API_KEY,
})

// 创建 MiniMax 客户端
const minimaxClient = createAIClient({
  provider: 'minimax',
  modelId: 'abab6.5-chat',
  apiKey: process.env.MINIMAX_API_KEY,
})

// 创建零一万物客户端
const lingyiClient = createAIClient({
  provider: 'lingyi',
  modelId: 'yi-large',
  apiKey: process.env.LINGYI_API_KEY,
})

// 创建百川智能客户端
const baichuanClient = createAIClient({
  provider: 'baichuan',
  modelId: 'Baichuan4',
  apiKey: process.env.BAICHUAN_API_KEY,
})

// 创建商汤科技客户端
const sensetimeClient = createAIClient({
  provider: 'sensetime',
  modelId: 'sensechat-5',
  apiKey: process.env.SENSETIME_API_KEY, // 格式：APIKey:SecretKey
})

// 创建阶跃星辰客户端
const stepfunClient = createAIClient({
  provider: 'stepfun',
  modelId: 'step-1v',
  apiKey: process.env.STEPFUN_API_KEY,
})

// 创建可灵 Kling 客户端
const klingClient = createAIClient({
  provider: 'kling',
  modelId: 'kling-v1',
  apiKey: process.env.KLING_API_KEY,
})
```

### 文本生成

```typescript
// 非流式
const result = await client.generateText({
  messages: [
    { role: 'system', content: '你是一个助手' },
    { role: 'user', content: '你好' },
  ],
  temperature: 0.7,
  maxTokens: 1000,
})

console.log(result.text)
console.log(result.usage) // Token 使用统计

// 流式
const streamResult = await client.generateText(
  {
    messages: [{ role: 'user', content: '写一首诗' }],
    stream: true,
  },
  (event) => {
    if (event.type === 'text') {
      process.stdout.write(event.content)
    } else if (event.type === 'done') {
      console.log('\n完成，Token 使用:', event.usage)
    }
  }
)
```

### 图像生成

```typescript
const imageResult = await client.generateImage({
  prompt: '一只可爱的猫咪',
  aspectRatio: '16:9',
  resolution: '4K',
  n: 1,
})

console.log(imageResult.imageUrl)
```

### 视频生成

```typescript
const videoResult = await client.generateVideo({
  imageUrl: 'https://example.com/image.jpg',
  prompt: '让图片动起来',
  duration: 5,
  resolution: '720p',
  aspectRatio: '16:9',
})

// 异步任务
if (videoResult.async) {
  console.log('任务 ID:', videoResult.requestId)
  console.log('外部 ID:', videoResult.externalId)
}
```

### 负载均衡（多模型）

```typescript
import { createLoadBalancer } from '@ai-drama-studio/ai-client'

// 创建负载均衡器（不同提供商）
const loadBalancer = createLoadBalancer([
  {
    name: 'primary',
    provider: 'openai',
    modelId: 'gpt-4o',
    apiKey: process.env.OPENAI_API_KEY,
    weight: 2,
  },
  {
    name: 'backup',
    provider: 'anthropic',
    modelId: 'claude-3-7-sonnet-20250219',
    apiKey: process.env.ANTHROPIC_API_KEY,
    weight: 1,
  },
], 'weighted')

// 获取客户端
const client = loadBalancer.getClient()
if (client) {
  const result = await client.generateText({
    messages: [{ role: 'user', content: '你好' }],
  })
}

// 查看状态
console.log(loadBalancer.getStatus())
```

### 多账号轮询（同一渠道）

```typescript
import { createMultiAccountBalancer } from '@ai-drama-studio/ai-client'

// 创建多账号负载均衡器（同一渠道多个 API Key）
const balancer = createMultiAccountBalancer({
  provider: 'openai',
  modelId: 'gpt-4o',
  accounts: [
    { apiKey: 'sk-xxx1', name: 'account-1' },
    { apiKey: 'sk-xxx2', name: 'account-2' },
    { apiKey: 'sk-xxx3', name: 'account-3' },
  ],
  strategy: 'round-robin', // 'round-robin' | 'weighted' | 'least-loaded'
})

// 生成文本（自动轮询账号）
const result = await balancer.generateText({
  messages: [{ role: 'user', content: '你好' }],
})

// 生成图片（自动轮询账号）
const imageResult = await balancer.generateImage({
  prompt: '一只可爱的猫咪',
  aspectRatio: '16:9',
  resolution: '4K',
})

// 获取账号使用统计
console.log(balancer.getUsageStats())

// 输出:
// [
//   {
//     name: 'account-1',
//     apiKey: 'sk...xx1',
//     isAvailable: true,
//     currentLoad: 2,
//     totalRequests: 100,
//     successRate: 98.5,
//     consecutiveFailures: 0,
//   },
//   ...
// ]
```

### 多账号高级用法

```typescript
import { createMultiAccountBalancer } from '@ai-drama-studio/ai-client'

// 加权轮询（API Key 有不同的配额/速率限制）
const balancer = createMultiAccountBalancer({
  provider: 'openai',
  modelId: 'gpt-4o',
  accounts: [
    { apiKey: 'sk-xxx1', name: 'premium', weight: 3, rateLimit: 100 },
    { apiKey: 'sk-xxx2', name: 'standard', weight: 1, rateLimit: 50 },
  ],
  strategy: 'weighted',
})

// 手动控制账号状态
balancer.disableAccount('account-1') // 手动禁用
balancer.enableAccount('account-1')  // 手动启用
balancer.resetAccount('account-1')   // 重置状态

// 获取可用账号数量
console.log(`可用账号：${balancer.getAvailableCount()} / ${balancer.getTotalCount()}`)
```

### 自动失败切换

多账号负载均衡器内置自动失败切换功能：

- **速率限制**: 当账号返回 `429 Rate Limit` 时，自动切换到下一个账号
- **连续失败**: 连续失败 3 次的账号会暂时禁用（1 分钟后恢复）
- **认证失败**: 返回 `401 Unauthorized` 的账号会被禁用（需要人工介入）
- **自动重试**: 失败时自动尝试其他账号，直到成功或所有账号都失败

```typescript
const balancer = createMultiAccountBalancer({
  provider: 'openai',
  modelId: 'gpt-4o',
  accounts: [
    { apiKey: 'sk-xxx1' },
    { apiKey: 'sk-xxx2' },
    { apiKey: 'sk-xxx3' },
  ],
})

try {
  // 如果 account-1 失败，自动尝试 account-2, account-3
  const result = await balancer.generateText({
    messages: [{ role: 'user', content: '你好' }],
  })
  console.log('成功生成文本')
} catch (error) {
  // 所有账号都失败
  console.error('所有账号都失败:', error)

  // 查看哪个账号失败了
  console.log(balancer.getUsageStats())
}
```

## 支持的提供商

### 国际厂商

| 提供商 | 文本 | 图像 | 视频 | 语音 | 说明 |
|--------|------|------|------|------|------|
| OpenAI | ✓ | ✓ (DALL-E 3) | ✗ | ✓ (TTS) | GPT-4o, o1 等 |
| Anthropic | ✓ | ✗ | ✗ | ✗ | Claude 3.5/3.7 Sonnet |
| Google Gemini | ✓ | ✓ (Imagen) | ✗ | ✗ | Gemini Pro/Flash |

### 国内厂商 - 文本/多模态

| 提供商 | 文本 | 图像 | 视频 | 语音 | 说明 |
|--------|------|------|------|------|------|
| 豆包 (Doubao) | ✓ | ✓ (Seedream) | ✓ (Seedance) | ✓ | 字节跳动 ARK API |
| DeepSeek | ✓ | ✗ | ✗ | ✗ | DeepSeek-V3/R1 |
| Qwen (阿里云) | ✓ | ✓ (通义万相) | ✗ | ✗ | 通义千问 DashScope |
| 百度文心一言 | ✓ | ✓ (文心一格) | ✗ | ✗ | 千帆大模型平台 |
| 腾讯混元 | ✓ | ✓ (混元图像) | ✗ | ✗ | 腾讯云 API |
| 科大讯飞星火 | ✓ | ✗ | ✗ | ✗ | Spark AI |
| 智谱 AI | ✓ | ✓ (CogView) | ✗ | ✗ | GLM-4 |
| 月之暗面 Kimi | ✓ | ✗ | ✗ | ✗ | 200 万字长文本 |
| MiniMax | ✓ | ✗ | ✓ | ✗ | abab6.5/5.5 |
| 零一万物 | ✓ | ✗ | ✗ | ✗ | Yi 系列模型 |
| 可灵 Kling | ✗ | ✓ | ✓ | ✗ | 快手可灵大模型 |
| 阶跃星辰 | ✓ | ✗ | ✗ | ✗ | 跃问 StepFun |
| 百川智能 | ✓ | ✗ | ✗ | ✗ | Baichuan2/3/4 |
| 商汤科技 | ✓ | ✓ (日日新) | ✗ | ✗ | SenseNova |

### 本地部署

| 提供商 | 文本 | 图像 | 视频 | 语音 | 说明 |
|--------|------|------|------|------|------|
| Ollama | ✓ | ✗ | ✗ | ✗ | 本地 LLM 运行器 |
| ComfyUI | ✗ | ✓ (SD/Flux) | ✓ (SVD) | ✗ | 工作流图像生成 |

### 图像生成专用

| 提供商 | 文本 | 图像 | 视频 | 语音 | 说明 |
|--------|------|------|------|------|------|
| 通义万相 | ✗ | ✓ | ✗ | ✗ | 阿里通义万相 |
| 混元图像 | ✗ | ✓ | ✗ | ✗ | 腾讯混元图像 |
| 文心一格 | ✗ | ✓ | ✗ | ✗ | 百度文心一格 |

## 重试配置

```typescript
import { createAIClient, DEFAULT_RETRY_CONFIG } from '@ai-drama-studio/ai-client'

const client = createAIClient({
  provider: 'openai',
  modelId: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
})

// 自定义重试配置
const result = await client.generateText({
  messages: [{ role: 'user', content: '你好' }],
}, undefined, {
  maxRetries: 5,
  initialDelayMs: 500,
  maxDelayMs: 10000,
  backoffFactor: 2,
})
```

## 错误处理

```typescript
import { toAIError, isRetryableError } from '@ai-drama-studio/ai-client'

try {
  const result = await client.generateText({
    messages: [{ role: 'user', content: '你好' }],
  })
} catch (error) {
  const aiError = toAIError(error, { provider: 'openai' })

  console.log('错误码:', aiError.code)
  console.log('错误消息:', aiError.message)
  console.log('可重试:', aiError.retryable)

  if (isRetryableError(aiError)) {
    // 可以重试
  }
}
```

## 与 Prompt System 集成

```typescript
import { createAIClient } from '@ai-drama-studio/ai-client'
import { buildPrompt } from '@ai-drama-studio/prompt-system'

const client = createAIClient({
  provider: 'anthropic',
  modelId: 'claude-3-7-sonnet-20250219',
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// 使用提示词模板
const prompt = buildPrompt({
  promptId: 'np_agent_character_profile',
  locale: 'zh',
  variables: {
    novelName: '斗破苍穹',
    characterName: '萧炎',
  },
})

const result = await client.generateText({
  messages: [{ role: 'user', content: prompt }],
})
```

## API 参考

### API 参考

### 类型

- `AIProvider` - 支持的 AI 提供商
- `AIModelConfig` - 模型配置
- `TextGenerateParams` - 文本生成参数
- `ImageGenerateParams` - 图像生成参数
- `VideoGenerateParams` - 视频生成参数
- `AudioGenerateParams` - 语音生成参数
- `AIError` - AI 错误
- `StreamEvent` - 流式事件
- `AccountConfig` - 多账号配置
- `MultiAccountBalancerConfig` - 多账号负载均衡器配置

### 类

- `BaseAIClient` - 抽象基类
- `OpenAIClient` - OpenAI 客户端
- `AnthropicClient` - Anthropic 客户端
- `GeminiClient` - Google Gemini 客户端
- `DoubaoClient` - 豆包客户端
- `DeepSeekClient` - DeepSeek 客户端
- `QwenClient` - Qwen 客户端
- `OllamaClient` - Ollama 客户端
- `ComfyUIClient` - ComfyUI 客户端
- `LoadBalancer` - 负载均衡器（多模型）
- `MultiAccountBalancer` - 多账号负载均衡器（同渠道多账号）

### 工厂函数

- `createAIClient()` - 创建单个客户端
- `createAIClients()` - 批量创建客户端
- `createClientPool()` - 创建客户端池
- `createLoadBalancer()` - 创建负载均衡器（多模型）
- `createMultiAccountBalancer()` - 创建多账号负载均衡器（同渠道多账号）

## 许可证

MIT
