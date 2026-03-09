# 架构审查报告

**审查日期：** 2026-03-09
**审查范围：** 提示词架构 + 角色一致性系统
**项目：** ai-drama-studio

---

## 一、提示词架构审查

### 1.1 架构概览

```
packages/prompt-system/
├── src/
│   ├── types.ts           # 类型定义
│   ├── prompt-ids.ts      # Prompt IDs 常量
│   ├── catalog.ts         # 目录注册表
│   ├── template-store.ts  # 模板存储
│   ├── renderer.ts        # 渲染引擎
│   └── index.ts           # 统一导出
├── templates/
│   ├── character-reference/  (4 个文件)
│   └── novel-promotion/      (50 个文件)
└── package.json
```

### 1.2 优点 ✅

| 方面 | 评价 | 说明 |
|------|------|------|
| **类型安全** | ✅ 优秀 | `PromptId` 联合类型，编译时检查 |
| **模板管理** | ✅ 优秀 | 外部 `.txt` 文件，支持 i18n |
| **变量验证** | ✅ 优秀 | 三层验证（占位符/声明/提供） |
| **缓存机制** | ✅ 良好 | Map 缓存，支持预加载 |
| **代码复用** | ✅ 优秀 | 从 waoowaoo 完整迁移 |

### 1.3 待改进项 ⚠️

| 问题 | 严重性 | 建议 |
|------|--------|------|
| `template-store.ts` 第 138 行使用 `@ts-ignore` | 🟡 中 | 改用可变引用或配置对象 |
| `renderer.ts` 中 `buildCharactersIntroduction` 等辅助函数与核心逻辑混合 | 🟢 低 | 可提取到单独的 `helpers.ts` |
| 缺少模板热重载支持 | 🟢 低 | 开发环境可添加文件监听 |

### 1.4 核心 API 审查

```typescript
// ✅ 设计良好：类型安全的 buildPrompt
export function buildPrompt(input: BuildPromptInput): string {
  const { promptId, locale, variables = {} } = input
  // ... 验证 + 渲染逻辑
}

// 使用示例
import { buildPrompt, PROMPT_IDS } from '@ai-drama-studio/prompt-system'

const prompt = buildPrompt({
  promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
  locale: 'zh',
  variables: { user_input: '创建角色' },
})
```

**评价：** API 设计简洁，类型安全，与 waoowaoo 完全兼容。

---

## 二、角色一致性系统审查

### 2.1 架构概览

```
packages/
├── db/
│   └── prisma/
│       └── schema.prisma    # 数据模型
└── core/
    └── src/services/
        └── character.service.ts  # 角色服务
```

### 2.2 Prisma Schema 审查

#### 核心模型

| 模型 | 用途 | 评价 |
|------|------|------|
| `CharacterProfile` | 角色档案 | ✅ 字段完整 |
| `CharacterAppearance` | 外观形态 | ✅ 支持多形态 |
| `LocationProfile` | 场景档案 | ✅ 结构清晰 |
| `Episode` | 剧集 | ✅ 含 `characterAppearanceMap` |

#### 关键字段设计

```prisma
// ✅ 优秀：角色外观映射（JSON 存储）
model Episode {
  characterAppearanceMap Json? @default(null)
  // 格式：{ characterId: appearanceIndex }
}

// ✅ 优秀：角色档案完整字段
model CharacterProfile {
  roleLevel           CharacterRoleLevel?  // S/A/B/C/D
  costumeTier         Int?                 // 1-5
  primaryIdentifier   String?              // 辨识标志
  expectedAppearances Json?                // [{ id, change_reason }]
  appearances         CharacterAppearance[]
}
```

#### 待改进项 ⚠️

| 问题 | 严重性 | 建议 |
|------|--------|------|
| `TaskType` 枚举缺少部分类型 | 🟡 中 | 添加 `NOVEL_ANALYZE`, `SCRIPT_MODIFY` 等 |
| `CharacterProfile` 的 JSON 字段缺少类型约束 | 🟢 低 | 可考虑用 Prisma 视图或应用层验证 |

### 2.3 CharacterProfileService 审查

#### 核心方法

| 方法 | 用途 | 评价 |
|------|------|------|
| `upsertCharacterProfile` | 创建/更新 | ✅ 支持批量 |
| `confirmCharacterProfile` | 确认角色 | ✅ 事务安全 |
| `buildAppearanceMap` | 构建外观映射 | ✅ 智能默认 |
| `validateConsistency` | 一致性验证 | ✅ 多维度检查 |
| `prepareCharactersForStoryboard` | 分镜准备 | ✅ 上下文传递 |

#### 一致性验证逻辑

```typescript
validateConsistency(prompt, character): ConsistencyValidationResult {
  // ✅ 检查 1: S/A 级角色必须有 primary_identifier
  if (roleLevel === 'S' || 'A' && !primaryIdentifier) {
    violations.push({ type: 'missing_identifier', severity: 'error' })
  }

  // ✅ 检查 2: primary_identifier 是否在提示词中体现
  if (primaryIdentifier && !prompt.includes(primaryIdentifier)) {
    violations.push({ type: 'missing_identifier', severity: 'warning' })
  }

  // ✅ 检查 3: 鞋子描述必填
  if (!hasShoesKeywords(prompt)) {
    violations.push({ type: 'missing_shoes', severity: 'warning' })
  }

  // ✅ 检查 4: 服装华丽度匹配
  if (costumeTier >= 4 && !hasLuxuryKeywords(prompt)) {
    violations.push({ type: 'costume_mismatch', severity: 'warning' })
  }
}
```

**评价：** 验证逻辑完整，符合业务规则。

#### 待改进项 ⚠️

| 问题 | 严重性 | 建议 |
|------|--------|------|
| 鞋子/奢华关键词硬编码 | 🟢 低 | 提取到配置文件 |
| 缺少外观漂移检测 | 🟡 中 | 添加跨分镜外观对比 |
| `LocationProfileService` 功能较少 | 🟢 低 | 可扩展场景验证逻辑 |

---

## 三、整体评价

### 3.1 架构质量

| 维度 | 评分 | 说明 |
|------|------|------|
| **类型安全** | ⭐⭐⭐⭐⭐ | TypeScript 类型完备 |
| **可维护性** | ⭐⭐⭐⭐ | 模块化清晰，少量改进空间 |
| **可扩展性** | ⭐⭐⭐⭐ | 支持新 Prompt ID 和模板 |
| **性能** | ⭐⭐⭐⭐ | 模板缓存机制有效 |
| **一致性保证** | ⭐⭐⭐⭐ | 多维度验证，支持多形态 |

### 3.2 与 waoowaoo 对比

| 方面 | waoowaoo | ai-drama-studio | 改进 |
|------|----------|-----------------|------|
| 代码结构 | `src/lib/prompt-i18n/` | `packages/prompt-system/` | ✅ monorepo 分离 |
| 类型定义 | 分散 | 集中在 `types.ts` | ✅ 更清晰 |
| 数据模型 | 依赖现有 Schema | 独立设计 | ✅ 更完整 |
| 角色服务 | 分散在 handlers | 集中在 `CharacterProfileService` | ✅ 更统一 |

---

## 四、建议的后续工作

### 4.1 高优先级 🔴

1. **完成 Prisma Schema 生成**
   ```bash
   cd packages/db
   npx prisma generate
   ```

2. **补充缺失的 TaskType**
   ```prisma
   enum TaskType {
     // 新增
     NOVEL_ANALYZE
     SCRIPT_MODIFY
     LOCATION_ANALYZE
   }
   ```

### 4.2 中优先级 🟡

3. **添加集成测试**
   - `buildPrompt` 函数测试
   - `validateConsistency` 测试
   - 角色服务 CRUD 测试

4. **配置 Docker Compose**
   - MySQL + Redis 容器
   - Worker 容器
   - Web 容器

### 4.3 低优先级 🟢

5. **代码优化**
   - 提取硬编码关键词到配置
   - 添加模板热重载支持
   - 改进 `setTemplateRoot` 实现

---

## 五、结论

**整体评价：✅ 通过**

提示词架构和角色一致性系统设计合理，完整迁移了 waoowaoo 的核心功能，并在以下方面有所改进：

1. ✅ monorepo 结构更清晰
2. ✅ 类型定义更完整
3. ✅ 角色服务更统一
4. ✅ 数据模型更完整

**建议：** 先完成 Prisma Schema 生成和 Docker 配置，然后可以开始实现 Pipeline 工作流引擎和 AI 客户端抽象层。
