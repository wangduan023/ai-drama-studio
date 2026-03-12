# AI Drama Studio - 数据库设计文档

> **最后更新:** 2026-03-12
> **版本:** 0.1.0
> **ORM:** Prisma 6.1.0
> **数据库:** MySQL 8.0 / SQLite

---

## 1. 数据库概览

### 1.1 实体关系图 (ERD)

```
┌─────────────────┐
│     User        │
│─────────────────│
│ id              │
│ email           │
│ name            │
│ role            │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐       1:N       ┌─────────────────┐
│    Project      │────────────────▶│    Episode      │
│─────────────────│                 │─────────────────│
│ id              │                 │ id              │
│ name            │                 │ number          │
│ userId          │                 │ novelText       │
│ status          │                 │ projectId       │
└────────┬────────┘                 └────────┬────────┘
         │                                   │
         │ 1:N                               │ 1:1
         ▼                                   ▼
┌─────────────────┐                 ┌─────────────────┐
│ CharacterProfile│                 │     Script      │
│─────────────────│                 │─────────────────│
│ id              │                 │ id              │
│ projectId       │                 │ episodeId       │
│ name            │                 │ content         │
│ gender          │                 └─────────────────┘
│ roleLevel       │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│CharacterAppearance│
│─────────────────│
│ id              │
│ characterId     │
│ appearanceIndex │
│ description     │
└─────────────────┘

┌─────────────────┐
│   AiProvider    │       1:N       ┌─────────────────┐
│─────────────────│────────────────▶│    AiModel      │
│ id              │                 │─────────────────│
│ name            │                 │ providerId      │
│ baseUrl         │                 │ modelId         │
│ apiKey          │                 │ type            │
│ priority        │                 │ inputCost       │
└─────────────────┘                 └─────────────────┘

┌─────────────────┐
│     AiProxy     │
│─────────────────│
│ id              │
│ host            │
│ port            │
│ isHealthy       │
└─────────────────┘

┌─────────────────┐
│  AiUsageLog     │
│─────────────────│
│ id              │
│ providerId      │
│ action          │
│ cost            │
│ status          │
└─────────────────┘

┌─────────────────┐
│     Task        │       1:N       ┌─────────────────┐
│─────────────────│────────────────▶│   TaskEvent     │
│ id              │                 │─────────────────│
│ projectId       │                 │ taskId          │
│ type            │                 │ eventType       │
│ status          │                 │ payload         │
│ progress        │                 └─────────────────┘
└─────────────────┘
```

---

## 2. 核心数据表

### 2.1 用户表 (users)

存储系统用户账户信息。

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  avatar    String?
  role      UserRole @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // 关联
  projects     Project[]
  usageCosts   UsageCost[]
  refreshTokens RefreshToken[]

  @@index([email])
  @@map("users")
}

enum UserRole {
  USER
  ADMIN
  SUPER_ADMIN
}
```

**字段说明:**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| email | String | 邮箱（唯一） |
| name | String? | 昵称 |
| avatar | String? | 头像 URL |
| role | UserRole | 角色权限 |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

---

### 2.2 刷新令牌表 (refresh_tokens)

存储 JWT 刷新令牌，用于用户会话管理。

```prisma
model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
  @@map("refresh_tokens")
}
```

---

### 2.3 项目表 (projects)

项目聚合根，管理剧集、角色、场景等资源。

```prisma
model Project {
  id          String   @id @default(uuid())
  name        String
  description String?
  userId      String
  status      ProjectStatus @default(DRAFT)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // 软删除
  deletedAt   DateTime?
  deletedBy   String?

  // 乐观锁
  version     Int      @default(1)

  // 关联
  episodes    Episode[]
  characterProfiles CharacterProfile[]
  locationProfiles  LocationProfile[]
  assets            Asset[] @relation(name: "ProjectAssets")
  tasks       Task[]
  usageCosts  UsageCost[]

  user        User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, status])
  @@index([userId, deletedAt])
  @@index([deletedAt])
  @@map("projects")
}

enum ProjectStatus {
  DRAFT       // 草稿
  PROCESSING  // 处理中
  COMPLETED   // 已完成
  FAILED      // 失败
  PAUSED      // 暂停
}
```

**字段说明:**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | String | 项目名称 |
| description | String? | 项目描述 |
| userId | UUID | 创建者 ID |
| status | ProjectStatus | 项目状态 |
| deletedAt | DateTime? | 软删除时间 |
| deletedBy | String? | 删除者 ID |
| version | Int | 乐观锁版本号 |

---

### 2.4 剧集表 (episodes)

工作流执行单元，每集包含剧本、分镜、镜头等。

```prisma
model Episode {
  id          String   @id @default(uuid())
  projectId   String
  number      Int      // 集数（从 1 开始）
  name        String
  novelText   String?   // 原始小说文本
  script      Script?           // 剧本
  storyboards Storyboard[]      // 分镜
  clips       Clip[]            // 镜头/片段

  // 任务追踪
  tasks       Task[] @relation(name: "EpisodeTasks")

  // 角色外观映射（用于多阶段一致性）
  characterAppearanceMap Json?

  // 软删除
  deletedAt   DateTime?
  deletedBy   String?

  // 乐观锁
  version     Int      @default(1)

  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, number])
  @@index([projectId])
  @@index([projectId, deletedAt])
  @@map("episodes")
}
```

**字段说明:**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| projectId | UUID | 所属项目 ID |
| number | Int | 集数序号 |
| name | String | 剧集名称 |
| novelText | String? | 原始小说文本 |
| characterAppearanceMap | Json? | 角色外观映射 `{characterId: appearanceId}` |
| deletedAt | DateTime? | 软删除时间 |
| version | Int | 乐观锁版本号 |

---

### 2.5 剧本表 (scripts)

存储 AI 生成的剧本内容。

```prisma
model Script {
  id            String    @id @default(uuid())
  episodeId     String    @unique
  content       String     // 剧本内容（JSON 或纯文本）
  characters    Json?               // 角色列表缓存
  scenes        Json?               // 场景列表缓存
  status        ProcessStatus @default(PENDING)
  createdAt     DateTime  @default(now())

  episode       Episode   @relation(fields: [episodeId], references: [id], onDelete: Cascade)

  @@index([episodeId])
  @@map("scripts")
}

enum ProcessStatus {
  PENDING    // 待处理
  PROCESSING // 处理中
  COMPLETED  // 已完成
  FAILED     // 失败
}
```

---

### 2.6 分镜表 (storyboards)

存储分镜描述和生成的图像/视频 URL。

```prisma
model Storyboard {
  id            String   @id @default(uuid())
  episodeId     String
  clipId        String?
  sequence      Int      // 分镜序号
  description   String    // 分镜描述
  imagePrompt   String?   // 图片生成提示词
  imageUrl      String?           // 生成的图片 URL
  videoPrompt   String?   // 视频生成提示词
  videoUrl      String?           // 生成的视频 URL
  duration      Float?            // 时长（秒）
  status        ProcessStatus @default(PENDING)
  createdAt     DateTime @default(now())

  episode       Episode  @relation(fields: [episodeId], references: [id], onDelete: Cascade)
  clip          Clip?    @relation(fields: [clipId], references: [id], onDelete: SetNull)

  @@index([episodeId, sequence])
  @@map("storyboards")
}
```

---

### 2.7 镜头表 (clips)

镜头/片段，用于多轨道剪辑。

```prisma
model Clip {
  id          String   @id @default(uuid())
  episodeId   String
  sequence    Int      // 镜头序号
  description String
  duration    Float?
  status      ProcessStatus @default(PENDING)

  storyboards Storyboard[]

  episode     Episode  @relation(fields: [episodeId], references: [id], onDelete: Cascade)

  @@index([episodeId, sequence])
  @@map("clips")
}
```

---

## 3. 角色与场景

### 3.1 角色档案表 (character_profiles)

**多阶段一致性核心数据模型**，存储角色基本信息和外观形态。

```prisma
model CharacterProfile {
  id                  String   @id @default(uuid())
  projectId           String

  // 基本信息
  name                String
  aliases             String?   // JSON 数组：["别名 1", "别名 2"]
  introduction        String?   // 角色介绍

  // 属性
  gender              String?           // "男" | "女"
  ageRange            String?           // "约二十五岁"
  roleLevel           CharacterRoleLevel?
  archetype           String?           // 角色原型
  personalityTags     String?  // JSON 数组：["高冷", "腹黑"]
  eraPeriod           String?           // 时代/时期
  socialClass         String?           // 社会阶层
  occupation          String?           // 职业
  costumeTier         Int?              // 服装华丽度 1-5
  suggestedColors     String?  // JSON 数组：["深蓝", "金色"]
  primaryIdentifier   String?  // 主要辨识标志
  visualKeywords      String?  // JSON 数组：["精英气质", "禁欲系"]

  // 外观形态（多形态支持）
  expectedAppearances Json?  // [{ id, change_reason, descriptions: [] }]

  // 确认状态
  profileConfirmed    Boolean  @default(false)

  // 软删除
  deletedAt           DateTime?
  deletedBy           String?

  // 乐观锁
  version             Int      @default(1)

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  // 关联
  appearances         CharacterAppearance[]
  project             Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, name])
  @@index([projectId])
  @@index([projectId, deletedAt])
  @@map("character_profiles")
}

enum CharacterRoleLevel {
  S  // 绝对主角
  A  // 核心配角
  B  // 重要配角
  C  // 次要角色
  D  // 群众演员
}
```

**字段说明:**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| projectId | UUID | 所属项目 ID |
| name | String | 角色名称 |
| aliases | String? | 别名列表 JSON |
| introduction | String? | 角色介绍 |
| gender | String? | 性别 |
| ageRange | String? | 年龄段描述 |
| roleLevel | CharacterRoleLevel? | 角色重要性 |
| personalityTags | String? | 性格标签 JSON |
| expectedAppearances | Json? | 预期外观形态列表 |
| profileConfirmed | Boolean | 档案是否已确认 |
| version | Int | 乐观锁版本号 |

---

### 3.2 角色外观表 (character_appearances)

存储角色的不同外观形态（用于换装、造型变化）。

```prisma
model CharacterAppearance {
  id              String   @id @default(uuid())
  characterId     String

  appearanceIndex Int      @default(1)  // 外观序号，1=初始形象
  changeReason    String                 // 变化原因
  description     String       // 外观描述
  descriptions    String?      // JSON 数组：多段描述
  imageUrls       String?      // JSON 数组：生成的图片 URL
  previousImageUrls String?    // JSON 数组：参考图片 URL

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  character       CharacterProfile @relation(fields: [characterId], references: [id], onDelete: Cascade)

  @@unique([characterId, appearanceIndex])
  @@index([characterId])
  @@map("character_appearances")
}
```

---

### 3.3 场景档案表 (location_profiles)

存储场景的基本信息和视觉特征。

```prisma
model LocationProfile {
  id              String   @id @default(uuid())
  projectId       String

  // 基本信息
  name            String
  description     String?   // 场景描述

  // 属性
  eraPeriod       String?           // 时代/时期
  locationType    LocationType?     // 场景类型
  moodColor       String?           // 氛围色调
  keyElements     String?  // JSON 数组：关键视觉元素

  // 确认状态
  locationConfirmed Boolean @default(false)

  // 软删除
  deletedAt       DateTime?
  deletedBy       String?

  // 乐观锁
  version         Int      @default(1)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  project         Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, name])
  @@index([projectId])
  @@index([projectId, deletedAt])
  @@map("location_profiles")
}

enum LocationType {
  INDOOR    // 室内
  OUTDOOR   // 室外
  NATURE    // 自然
  BUILDING  // 建筑
  FANTASY   // 幻想
}
```

---

## 4. AI 配置表

### 4.1 AI 渠道商表 (ai_providers)

存储 AI API 渠道商配置。

```prisma
model AiProvider {
  id          String   @id @default(uuid())
  name        String   @unique // openai, anthropic, qwen, doubao...
  baseUrl     String   // API 基础地址
  apiKey      String?  // API Key
  isActive    Boolean  @default(true)
  priority    Int      @default(0)     // 优先级（越小越高）
  weight      Int      @default(1)     // 权重（负载均衡）

  // 代理配置
  proxyMode   String   @default("auto") // auto | manual | disabled
  proxyId     String?  // 手动指定的代理 ID

  // 速率限制
  rateLimit   Int?     // 每分钟请求数
  quotaDaily  Int?     // 每日配额

  // 元数据
  metadata    Json?    // 额外配置
  description String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // 关联
  models      AiModel[]
  proxy       AiProxy? @relation(fields: [proxyId], references: [id])

  @@index([isActive])
  @@index([priority])
  @@index([name])
  @@map("ai_providers")
}
```

**字段说明:**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | String | 渠道商名称（唯一） |
| baseUrl | String | API 基础地址 |
| apiKey | String? | API Key |
| isActive | Boolean | 是否启用 |
| priority | Int | 优先级 |
| weight | Int | 权重 |
| proxyMode | String | 代理模式 |
| rateLimit | Int? | 速率限制 |
| metadata | Json? | 额外配置 |

---

### 4.2 AI 模型表 (ai_models)

存储具体 AI 模型配置。

```prisma
model AiModel {
  id          String   @id @default(uuid())
  providerId  String
  modelId     String   // gpt-4o, claude-3-7-sonnet, qwen-max...
  name        String   // 显示名称
  type        AiModelType  // text, image, video, voice

  // 能力配置
  isEnabled   Boolean  @default(true)
  isDefault   Boolean  @default(false)

  // 模型参数
  maxTokens   Int?     // 最大 token 数
  contextWindow Int?   // 上下文窗口

  // 成本配置
  inputCost   Float?   // 输入成本（每 1000 tokens）
  outputCost  Float?   // 输出成本
  imageCost   Float?   // 单图成本
  videoCost   Float?   // 单视频成本
  currency    String   @default("USD")

  // 速率限制
  rateLimit   Int?     // 每分钟请求数
  rpm         Int?     // 每分钟轮询数
  tpm         Int?     // 每分钟 token 数

  // 元数据
  metadata    Json?    // 额外配置
  description String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  provider    AiProvider @relation(fields: [providerId], references: [id], onDelete: Cascade)

  @@unique([providerId, modelId])
  @@index([type])
  @@index([isEnabled])
  @@index([type, isDefault])
  @@map("ai_models")
}

enum AiModelType {
  TEXT      // 文本生成
  IMAGE     // 图像生成
  VIDEO     // 视频生成
  VOICE     // 语音合成
  EMBEDDING // 嵌入模型
}
```

---

### 4.3 HTTP 代理表 (ai_proxies)

代理池管理，用于突破网络限制。

```prisma
model AiProxy {
  id          String   @id @default(uuid())
  name        String   @unique

  // 代理连接信息
  host        String   // 代理服务器地址
  port        Int      // 代理端口
  protocol    String   @default("http") // http | https | socks5
  username    String?  // 认证用户名
  password    String?  // 认证密码

  // 状态管理
  isActive    Boolean  @default(true)
  isHealthy   Boolean? // 健康状态
  isSystem    Boolean  @default(false)

  // 健康检查
  lastCheckAt DateTime?
  checkLatency Int?    // 最后检测延迟（ms）
  checkError  String?  // 最后检测错误
  consecutiveFailures Int @default(0)

  // 使用统计
  totalRequests Int    @default(0)
  failedRequests Int   @default(0)
  lastUsedAt  DateTime?

  // 并发控制
  maxConcurrent Int    @default(10)
  currentConcurrent Int @default(0)

  // 元数据
  location    String?  // 地理位置
  provider    String?  // 代理服务提供商
  metadata    Json?

  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // 关联
  usedByProviders AiProvider[]

  @@index([isActive])
  @@index([isHealthy])
  @@index([lastCheckAt])
  @@map("ai_proxies")
}
```

---

### 4.4 AI 使用记录表 (ai_usage_logs)

记录 AI API 调用详情。

```prisma
model AiUsageLog {
  id          String   @id @default(uuid())
  providerId  String
  modelId     String?

  // 调用信息
  action      String   // generate_text, generate_image...
  requestId   String?  // 外部 API 返回的请求 ID
  externalId  String?  // 外部任务 ID

  // 用量统计
  inputTokens  Int?    // 输入 token 数
  outputTokens Int?    // 输出 token 数
  imageCount   Int?    // 生成图片数量
  videoCount   Int?    // 生成视频数量
  duration     Float?  // 视频时长（秒）

  // 成本
  cost        Float    // 实际成本
  currency    String   @default("USD")

  // 状态
  status      AiUsageStatus @default(SUCCESS)
  errorCode   String?
  errorMessage String?

  // 关联
  projectId   String?
  episodeId   String?
  taskId      String?
  userId      String?

  // 响应时间
  latency     Int?     // 响应时间（ms）
  createdAt   DateTime @default(now())

  @@index([providerId])
  @@index([status])
  @@index([projectId])
  @@index([createdAt])
  @@index([taskId])
  @@index([providerId, createdAt])
  @@index([projectId, createdAt])
  @@index([userId, createdAt])
  @@index([status, createdAt])
  @@index([action, createdAt])
  @@map("ai_usage_logs")
}

enum AiUsageStatus {
  SUCCESS
  FAILED
  RATE_LIMITED
  TIMEOUT
  CANCELLED
}
```

**索引说明:**

| 索引 | 用途 |
|------|------|
| providerId | 按渠道商查询 |
| status | 按状态查询 |
| projectId | 按项目查询 |
| createdAt | 按时间排序 |
| providerId, createdAt | 渠道商时间范围查询 |
| projectId, createdAt | 项目时间范围查询 |

---

## 5. 任务追踪

### 5.1 任务表 (tasks)

追踪所有 AI 生成任务。

```prisma
model Task {
  id           String      @id @default(uuid())
  projectId    String
  episodeId    String?
  userId       String      // 任务所属用户
  type         TaskType
  targetType   String      // 目标类型
  targetId     String      // 目标 ID
  status       TaskStatus  @default(QUEUED)
  progress     Int         @default(0)  // 0-100
  attempt      Int         @default(0)  // 重试次数
  payload      Json?                   // 任务负载
  result       Json?                   // 任务结果
  errorCode    String?
  errorMessage String?
  queuedAt     DateTime    @default(now())
  startedAt    DateTime?
  updatedAt    DateTime    @updatedAt
  finishedAt   DateTime?

  project      Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  episode      Episode?    @relation(fields: [episodeId], references: [id], onDelete: SetNull, name: "EpisodeTasks")
  events       TaskEvent[]

  @@index([status, type])
  @@index([projectId])
  @@index([episodeId])
  @@index([userId])
  @@index([projectId, status])
  @@index([userId, status])
  @@index([targetId, targetType])
  @@index([status, queuedAt])
  @@map("tasks")
}

enum TaskType {
  // 生成类
  SCRIPT_GENERATE
  SCRIPT_EDIT
  SCRIPT_REGENERATE
  STORYBOARD_GENERATE
  STORYBOARD_EDIT
  STORYBOARD_REGENERATE
  IMAGE_GENERATE
  IMAGE_REGENERATE
  VIDEO_GENERATE
  VIDEO_REGENERATE
  VOICE_GENERATE
  VOICE_REGENERATE

  // 分析类
  CHARACTER_PROFILE_ANALYZE
  CHARACTER_VISUAL_GENERATE
  CHARACTER_VISUAL_REGENERATE
  LOCATION_ANALYZE
  LOCATION_VISUAL_GENERATE
  LOCATION_VISUAL_REGENERATE

  // 其他
  EPISODE_EXPORT
  PROJECT_ARCHIVE
}

enum TaskStatus {
  QUEUED     // 已入队
  PROCESSING // 处理中
  COMPLETED  // 已完成
  FAILED     // 失败
  RETRYING   // 重试中
}
```

---

### 5.2 任务事件表 (task_events)

用于 SSE 事件持久化和重连回放。

```prisma
model TaskEvent {
  id        Int       @id @default(autoincrement())
  taskId    String
  projectId String
  userId    String
  eventType String    // task.created, task.progress, task.completed...
  payload   Json?
  createdAt DateTime  @default(now())

  task      Task      @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@index([taskId])
  @@index([projectId, createdAt])
  @@index([userId, createdAt])
  @@map("task_events")
}
```

**事件类型:**

| 事件类型 | 说明 |
|----------|------|
| `task.created` | 任务创建 |
| `task.progress` | 任务进度更新 |
| `task.completed` | 任务完成 |
| `task.failed` | 任务失败 |
| `task.stream` | 流式输出 |

---

## 6. 资产与计费

### 6.1 资产表 (assets)

通用的图片/视频/音频资产管理。

```prisma
model Asset {
  id          String   @id @default(uuid())
  projectId   String?
  type        AssetType
  url         String
  thumbnailUrl String?
  name        String
  description String?
  tags        String?   // JSON 数组
  metadata    Json?    // 生成参数、模型信息
  size        Int?     // 文件大小（字节）
  duration    Float?   // 视频时长（秒）
  width       Int?     // 宽度
  height      Int?     // 高度
  status      ProcessStatus @default(COMPLETED)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // 软删除
  deletedAt   DateTime?
  deletedBy   String?

  project     Project? @relation(fields: [projectId], references: [id], onDelete: SetNull, name: "ProjectAssets")

  @@index([projectId])
  @@index([type])
  @@index([deletedAt])
  @@map("assets")
}

enum AssetType {
  IMAGE
  VIDEO
  AUDIO
  CHARACTER_SHEET
  LOCATION_SHEET
}
```

---

### 6.2 使用量计费表 (usage_costs)

记录项目/用户的 AI 使用成本。

```prisma
model UsageCost {
  id         String   @id @default(uuid())
  projectId  String
  taskId     String?
  userId     String
  model      String
  action     String
  quantity   Float
  unit       String
  cost       Float
  metadata   Json?
  createdAt  DateTime @default(now())

  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([projectId, userId])
  @@index([userId])
  @@map("usage_costs")
}
```

---

## 7. 系统配置

### 7.1 配置表 (configs)

系统配置和特性开关。

```prisma
model Config {
  id          String   @id @default(uuid())
  key         String   @unique
  value       Json
  description String?
  category    String?  // "ai_model", "system", "feature_flag"
  isPublic    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([category])
  @@map("configs")
}
```

---

## 8. 索引优化

### 8.1 高频查询索引

| 表 | 索引字段 | 查询场景 |
|------|----------|----------|
| users | email | 登录查询 |
| projects | userId, status | 用户项目列表 |
| episodes | projectId | 项目剧集列表 |
| character_profiles | projectId | 项目角色列表 |
| tasks | status, type | 任务队列查询 |
| tasks | projectId, status | 项目任务状态 |
| ai_usage_logs | providerId, createdAt | 渠道用量统计 |
| task_events | projectId, createdAt | 活动记录查询 |

### 8.2 复合索引策略

```prisma
// 任务查询优化
@@index([status, type])         // 按类型筛选待处理任务
@@index([projectId, status])     // 项目任务状态分布
@@index([userId, status])        // 用户任务状态分布
@@index([targetId, targetType])  // 目标资源关联任务
@@index([status, queuedAt])      // 队列调度

// AI 用量查询优化
@@index([providerId, createdAt])  // 渠道商用量趋势
@@index([projectId, createdAt])   // 项目用量趋势
@@index([userId, createdAt])      // 用户用量趋势
@@index([status, createdAt])      // 失败率分析
@@index([action, createdAt])      // 操作类型分析
```

---

## 9. 数据迁移

### 9.1 执行迁移

```bash
# 开发环境（创建迁移文件并执行）
pnpm db:migrate

# 生产环境（仅执行已有迁移）
pnpm db:migrate:deploy

# 直接推送变更（开发快速迭代）
pnpm db:push
```

### 9.2 软删除处理

所有核心业务表支持软删除：

```prisma
deletedAt   DateTime?
deletedBy   String?
```

查询时需过滤：

```typescript
const projects = await prisma.project.findMany({
  where: {
    deletedAt: null
  }
})
```

---

## 10. 数据完整性

### 10.1 级联关系

| 关系 | 删除行为 |
|------|----------|
| User → Projects | Cascade（级联删除） |
| Project → Episodes | Cascade |
| Episode → Script | Cascade |
| CharacterProfile → Appearances | Cascade |
| Task → TaskEvents | Cascade |

### 10.2 乐观锁

核心表使用版本号控制并发：

```prisma
version Int @default(1)
```

更新时检查版本号：

```typescript
await prisma.project.update({
  where: {
    id: projectId,
    version: currentVersion
  },
  data: { ... },
}).catch((e) => {
  if (e.code === 'P2025') {
    throw new Error('数据已被其他用户修改')
  }
})
```

---

## 附录

### A. 字段类型映射

| Prisma | MySQL | SQLite |
|--------|-------|--------|
| String | VARCHAR(191) | TEXT |
| Int | INT | INTEGER |
| Float | DOUBLE | REAL |
| Boolean | TINYINT(1) | INTEGER |
| DateTime | DATETIME(3) | DATETIME |
| Json | JSON | TEXT |

### B. 默认值

| 字段 | 默认值 |
|------|--------|
| id | uuid() |
| createdAt | now() |
| updatedAt | now() (auto) |
| status | 对应枚举的第一个值 |
| version | 1 |
