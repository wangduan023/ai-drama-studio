# 提示词命名对照表

## waoowaoo → ai-drama-studio 命名映射

### 1. Prompt IDs 对照表

| waoowaoo (原名) | ai-drama-studio (新名) | 说明 |
|-----------------|------------------------|------|
| `CHARACTER_IMAGE_TO_DESCRIPTION` | `CHARACTER_IMAGE_TO_DESCRIPTION` | ✅ 保持不变 |
| `CHARACTER_REFERENCE_TO_SHEET` | `CHARACTER_REFERENCE_TO_SHEET` | ✅ 保持不变 |
| `NP_AGENT_ACTING_DIRECTION` | `NP_AGENT_ACTING_DIRECTION` | ✅ 保持不变 |
| `NP_AGENT_CHARACTER_PROFILE` | `NP_AGENT_CHARACTER_PROFILE` | ✅ 保持不变 |
| `NP_AGENT_CHARACTER_VISUAL` | `NP_AGENT_CHARACTER_VISUAL` | ✅ 保持不变 |
| `NP_AGENT_CINEMATOGRAPHER` | `NP_AGENT_CINEMATOGRAPHER` | ✅ 保持不变 |
| `NP_AGENT_CLIP` | `NP_AGENT_CLIP` | ✅ 保持不变 |
| `NP_AGENT_SHOT_VARIANT_ANALYSIS` | `NP_AGENT_SHOT_VARIANT_ANALYSIS` | ✅ 保持不变 |
| `NP_AGENT_SHOT_VARIANT_GENERATE` | `NP_AGENT_SHOT_VARIANT_GENERATE` | ✅ 保持不变 |
| `NP_AGENT_STORYBOARD_DETAIL` | `NP_AGENT_STORYBOARD_DETAIL` | ✅ 保持不变 |
| `NP_AGENT_STORYBOARD_INSERT` | `NP_AGENT_STORYBOARD_INSERT` | ✅ 保持不变 |
| `NP_AGENT_STORYBOARD_PLAN` | `NP_AGENT_STORYBOARD_PLAN` | ✅ 保持不变 |
| `NP_CHARACTER_CREATE` | `NP_CHARACTER_CREATE` | ✅ 保持不变 |
| `NP_CHARACTER_DESCRIPTION_UPDATE` | `NP_CHARACTER_DESCRIPTION_UPDATE` | ✅ 保持不变 |
| `NP_CHARACTER_MODIFY` | `NP_CHARACTER_MODIFY` | ✅ 保持不变 |
| `NP_CHARACTER_REGENERATE` | `NP_CHARACTER_REGENERATE` | ✅ 保持不变 |
| `NP_EPISODE_SPLIT` | `NP_EPISODE_SPLIT` | ✅ 保持不变 |
| `NP_IMAGE_PROMPT_MODIFY` | `NP_IMAGE_PROMPT_MODIFY` | ✅ 保持不变 |
| `NP_LOCATION_CREATE` | `NP_LOCATION_CREATE` | ✅ 保持不变 |
| `NP_LOCATION_DESCRIPTION_UPDATE` | `NP_LOCATION_DESCRIPTION_UPDATE` | ✅ 保持不变 |
| `NP_LOCATION_MODIFY` | `NP_LOCATION_MODIFY` | ✅ 保持不变 |
| `NP_LOCATION_REGENERATE` | `NP_LOCATION_REGENERATE` | ✅ 保持不变 |
| `NP_SCREENPLAY_CONVERSION` | `NP_SCREENPLAY_CONVERSION` | ✅ 保持不变 |
| `NP_SELECT_LOCATION` | `NP_SELECT_LOCATION` | ✅ 保持不变 |
| `NP_SINGLE_PANEL_IMAGE` | `NP_SINGLE_PANEL_IMAGE` | ✅ 保持不变 |
| `NP_STORYBOARD_EDIT` | `NP_STORYBOARD_EDIT` | ✅ 保持不变 |
| `NP_VOICE_ANALYSIS` | `NP_VOICE_ANALYSIS` | ✅ 保持不变 |

**结论：** Prompt IDs 完全保留 waoowaoo 的命名，无需修改代码中的引用。

---

### 2. 模板文件路径对照表

| waoowaoo (原路径) | ai-drama-studio (新路径) |
|-------------------|--------------------------|
| `lib/prompts/character-reference/*.txt` | `packages/prompt-system/templates/character-reference/*.txt` |
| `lib/prompts/novel-promotion/*.txt` | `packages/prompt-system/templates/novel-promotion/*.txt` |

---

### 3. TypeScript 类型/函数对照表

| waoowaoo (原名) | ai-drama-studio (新名) | 说明 |
|-----------------|------------------------|------|
| `PromptId` | `PromptId` | ✅ 保持不变 |
| `PromptLocale` | `Locale` | 简化命名 |
| `PromptVariables` | `PromptVariables` | ✅ 保持不变 |
| `PromptCatalogEntry` | `PromptCatalogEntry` | ✅ 保持不变 |
| `BuildPromptInput` | `BuildPromptInput` | ✅ 保持不变 |
| `buildPrompt()` | `buildPrompt()` | ✅ 保持不变 |
| `getPromptTemplate()` | `getPromptTemplate()` | ✅ 保持不变 |
| `PROMPT_CATALOG` | `PROMPT_CATALOG` | ✅ 保持不变 |
| `PROMPT_IDS` | `PROMPT_IDS` | ✅ 保持不变 |
| `PromptI18nError` | `PromptError` | 简化命名 |
| `PromptI18nErrorCode` | `PromptErrorType` | 简化命名 |

---

### 4. 目录结构对照

**waoowaoo:**
```
src/lib/prompt-i18n/
├── build-prompt.ts
├── catalog.ts
├── errors.ts
├── index.ts
├── prompt-ids.ts
├── template-store.ts
└── types.ts

lib/prompts/
├── character-reference/
│   └── *.txt
└── novel-promotion/
    └── *.txt
```

**ai-drama-studio:**
```
packages/prompt-system/src/
├── index.ts
├── types.ts
├── prompt-ids.ts
├── catalog.ts
├── template-store.ts
└── renderer.ts (合并 build-prompt.ts + 辅助函数)

packages/prompt-system/templates/
├── character-reference/
│   └── *.txt
└── novel-promotion/
    └── *.txt
```

---

### 5. 代码迁移示例

**waoowaoo 原代码:**
```typescript
import { buildPrompt, PROMPT_IDS } from '@/lib/prompt-i18n'

const prompt = buildPrompt({
  promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
  locale: 'zh',
  variables: {
    user_input: '创建一个霸道总裁角色',
  },
})
```

**ai-drama-studio 新代码:**
```typescript
import { buildPrompt, PROMPT_IDS } from '@ai-drama-studio/prompt-system'

const prompt = buildPrompt({
  promptId: PROMPT_IDS.NP_CHARACTER_CREATE,
  locale: 'zh',
  variables: {
    user_input: '创建一个霸道总裁角色',
  },
})
```

**变化：** 仅导入路径从 `@/lib/prompt-i18n` 改为 `@ai-drama-studio/prompt-system`

---

### 6. 完整模板文件列表 (56 个)

**character-reference/ (4 个):**
- `character_image_to_description.zh.txt`
- `character_image_to_description.en.txt`
- `character_reference_to_sheet.zh.txt`
- `character_reference_to_sheet.en.txt`

**novel-promotion/ (52 个):**
- `agent_acting_direction.zh/en.txt`
- `agent_character_profile.zh/en.txt`
- `agent_character_visual.zh/en.txt`
- `agent_cinematographer.zh/en.txt`
- `agent_clip.zh/en.txt`
- `agent_shot_variant_analysis.zh/en.txt`
- `agent_shot_variant_generate.zh/en.txt`
- `agent_storyboard_detail.zh/en.txt`
- `agent_storyboard_insert.zh/en.txt`
- `agent_storyboard_plan.zh/en.txt`
- `character_create.zh/en.txt`
- `character_description_update.zh/en.txt`
- `character_modify.zh/en.txt`
- `character_regenerate.zh/en.txt`
- `episode_split.zh/en.txt`
- `image_prompt_modify.zh/en.txt`
- `location_create.zh/en.txt`
- `location_description_update.zh/en.txt`
- `location_modify.zh/en.txt`
- `location_regenerate.zh/en.txt`
- `screenplay_conversion.zh/en.txt`
- `select_location.zh/en.txt`
- `single_panel_image.zh/en.txt`
- `storyboard_edit.zh/en.txt`
- `voice_analysis.zh/en.txt`

---

### 7. 迁移检查清单

- [x] Prompt IDs 常量迁移
- [x] PROMPT_CATALOG 注册表迁移
- [x] 类型定义迁移
- [x] buildPrompt 函数迁移
- [x] 模板文件复制 (56 个)
- [x] 错误类型定义迁移
- [x] 统一导出迁移

**迁移完成度：100%**
