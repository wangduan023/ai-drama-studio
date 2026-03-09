# DB Layer 改进记录

## 本次改进内容

### 1. 软删除支持 (Soft Delete)

为以下核心模型添加了软删除字段：
- `Project`
- `Episode`
- `CharacterProfile`
- `LocationProfile`
- `Asset`

**新增字段:**
- `deletedAt DateTime?` - 删除时间
- `deletedBy String?` - 删除人 ID

**索引优化:**
- 添加了 `@@index([deletedAt])` 优化查询
- 添加了 `@@index([userId, deletedAt])` 复合索引

### 2. TaskType 枚举补充

新增任务类型：
```
// 编辑类
SCRIPT_EDIT
STORYBOARD_EDIT

// 重新生成类
SCRIPT_REGENERATE
STORYBOARD_REGENERATE
IMAGE_REGENERATE
VIDEO_REGENERATE
VOICE_REGENERATE
CHARACTER_VISUAL_REGENERATE
LOCATION_VISUAL_REGENERATE

// 其他
EPISODE_EXPORT
PROJECT_ARCHIVE
```

### 3. AI 渠道配置支持

**新增模型:**

#### AiProvider (AI 渠道商)
- 存储各 AI 厂商的配置（OpenAI、Anthropic、阿里云、豆包等）
- 支持 API Key 管理
- 支持优先级和权重配置
- 支持速率限制

#### AiModel (AI 模型)
- 存储具体模型配置
- 支持模型类型（TEXT, IMAGE, VIDEO, VOICE, EMBEDDING）
- 支持成本配置
- 支持速率限制

#### AiUsageLog (AI 使用记录)
- 记录每次 API 调用
- 统计用量和成本
- 追踪成功/失败状态

### 4. Repository 层封装

**基础 Repository:**
- `BaseRepository` - 提供通用 CRUD 和软删除操作

**核心 Repository:**
- `ProjectRepository` - 项目聚合根
- `EpisodeRepository` - 剧集
- `CharacterRepository` - 角色档案
- `LocationRepository` - 场景档案

**AI 渠道 Repository:**
- `AiProviderRepository` - AI 渠道商
- `AiModelRepository` - AI 模型
- `AiUsageRepository` - AI 使用记录

### 5. Zod Schema 校验

**JSON 字段校验:**
- `CharacterProfileJsonSchema` - 角色档案 JSON 字段
- `LocationProfileJsonSchema` - 场景档案 JSON 字段
- `CharacterAppearanceMapSchema` - 角色外观映射
- `ScriptContentSchema` - 剧本内容
- `AssetMetadataSchema` - 资产元数据
- `TaskPayloadSchema` - 任务负载

**AI 渠道校验:**
- `CreateAiProviderSchema` - 创建渠道商
- `UpdateAiProviderSchema` - 更新渠道商
- `CreateAiModelSchema` - 创建模型
- `UpdateAiModelSchema` - 更新模型
- `CreateAiUsageLogSchema` - 创建使用记录

## 使用方法

### 使用 Repository

```typescript
import {
  ProjectRepository,
  CharacterRepository,
  AiProviderRepository,
  AiModelRepository
} from '@ai-drama-studio/db'

// 项目操作
const projectRepo = new ProjectRepository()
const projects = await projectRepo.findByUserId(userId, {
  includeEpisodes: true,
  includeCharacters: true
})

// 软删除
await projectRepo.softDelete(projectId, userId)

// 恢复
await projectRepo.restore(projectId)

// 角色操作
const characterRepo = new CharacterRepository()
const character = await characterRepo.create({
  projectId,
  name: '萧炎',
  gender: '男',
  roleLevel: 'S',
  personalityTags: ['坚韧', '重情义']
})
```

### 使用 AI 渠道配置

```typescript
import {
  AiProviderRepository,
  AiModelRepository,
  prisma
} from '@ai-drama-studio/db'

const providerRepo = new AiProviderRepository()
const modelRepo = new AiModelRepository()

// 获取所有启用的渠道商
const providers = await providerRepo.findAll({ onlyActive: true })

// 获取文本生成默认模型
const defaultTextModel = await modelRepo.getDefaultModel('TEXT')

// 根据类型获取模型
const textModels = await modelRepo.findByType('TEXT', {
  includeProvider: true,
  onlyEnabled: true
})

// 记录 AI 使用
const { AiUsageRepository } = await import('@ai-drama-studio/db')
const usageRepo = new AiUsageRepository()
await usageRepo.create({
  providerId: provider.id,
  modelId: model.id,
  action: 'generate_text',
  inputTokens: 1000,
  outputTokens: 500,
  cost: 0.005,
  status: 'SUCCESS',
  projectId,
  taskId
})
```

### 使用 Schema 校验

```typescript
import {
  CharacterProfileJsonSchema,
  CreateAiProviderSchema
} from '@ai-drama-studio/db'

// 校验角色 JSON 数据
const validated = CharacterProfileJsonSchema.parse(characterData)

// 校验 AI 渠道商创建
const providerData = CreateAiProviderSchema.parse(input)
```

## 数据库迁移

```bash
# 开发环境
npm run db:migrate

# 生产环境
npm run db:migrate:deploy

# 直接推送 (开发快速迭代)
npm run db:push

# 重新生成 Prisma Client
npm run db:generate
```

## 注意事项

1. **软删除查询**: Repository 默认过滤已删除记录，需要查询已删除的记录时传入 `withDeleted: true`

2. **AI 渠道配置**: 新增的 AI 渠道商默认禁用，需要在数据库填入有效 API Key 后手动启用

3. **数据迁移**: 如果已有生产数据，请先备份再执行迁移
