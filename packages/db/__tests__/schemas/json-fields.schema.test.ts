/**
 * JSON Fields Schema Tests
 * 验证 Prisma JSON 字段的 Zod schemas
 */
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  CharacterAppearanceSchema,
  CreateCharacterAppearanceSchema,
  ExpectedAppearanceSchema,
  CharacterProfileJsonSchema,
  LocationProfileJsonSchema,
  CharacterAppearanceMapSchema,
  ScriptContentSchema,
  AssetMetadataSchema,
  TaskPayloadSchema,
  TextGenerationPayloadSchema,
  ImageGenerationPayloadSchema,
  VideoGenerationPayloadSchema,
} from '../../src/schemas/json-fields.schema'

describe('CharacterAppearanceSchema', () => {
  it('应该验证有效的外观数据', () => {
    const validData = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      change_reason: '角色换装',
    }

    const result = CharacterAppearanceSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('应该允许 descriptions 为可选', () => {
    const dataWithoutDescriptions = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      change_reason: '角色换装',
    }

    const result = CharacterAppearanceSchema.safeParse(dataWithoutDescriptions)
    expect(result.success).toBe(true)
  })

  it('应该允许 descriptions 为数组', () => {
    const dataWithDescriptions = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      change_reason: '角色换装',
      descriptions: ['穿着红色衣服', '戴着帽子'],
    }

    const result = CharacterAppearanceSchema.safeParse(dataWithDescriptions)
    expect(result.success).toBe(true)
  })

  it('应该拒绝无效的 UUID', () => {
    const invalidData = {
      id: 'invalid-uuid',
      change_reason: '角色换装',
    }

    const result = CharacterAppearanceSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('应该拒绝缺少 change_reason 的数据', () => {
    const invalidData = {
      id: '550e8400-e29b-41d4-a716-446655440000',
    }

    const result = CharacterAppearanceSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})

describe('CreateCharacterAppearanceSchema', () => {
  it('应该验证有效的创建数据', () => {
    const validData = {
      change_reason: '角色换装',
    }

    const result = CreateCharacterAppearanceSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('应该拒绝空的 change_reason', () => {
    const invalidData = {
      change_reason: '',
    }

    const result = CreateCharacterAppearanceSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
    expect((result as any).error.errors[0].message).toBe('变化原因不能为空')
  })

  it('应该拒绝缺少 change_reason 的数据', () => {
    const invalidData = {}

    const result = CreateCharacterAppearanceSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})

describe('ExpectedAppearanceSchema', () => {
  it('应该验证有效的外观预期数据（无 ID）', () => {
    const validData = {
      change_reason: '新造型',
      descriptions: ['穿着现代服装'],
    }

    const result = ExpectedAppearanceSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('应该验证有效的外观预期数据（有 ID）', () => {
    const validData = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      change_reason: '新造型',
      descriptions: ['穿着现代服装'],
    }

    const result = ExpectedAppearanceSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('应该验证 imageUrls 和 previousImageUrls', () => {
    const validData = {
      change_reason: '新造型',
      descriptions: ['穿着现代服装'],
      imageUrls: ['https://example.com/image1.jpg'],
      previousImageUrls: ['https://example.com/image2.jpg'],
    }

    const result = ExpectedAppearanceSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('应该拒绝无效的 URL', () => {
    const invalidData = {
      change_reason: '新造型',
      descriptions: ['穿着现代服装'],
      imageUrls: ['not-a-url'],
    }

    const result = ExpectedAppearanceSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('应该拒绝空的 descriptions', () => {
    const invalidData = {
      change_reason: '新造型',
      descriptions: [],
    }

    const result = ExpectedAppearanceSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})

describe('CharacterProfileJsonSchema', () => {
  it('应该验证空对象', () => {
    const result = CharacterProfileJsonSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('应该验证完整的角色档案数据', () => {
    const validData = {
      aliases: ['张三', '小张'],
      personalityTags: ['开朗', '乐观'],
      suggestedColors: ['#FF0000', '#00FF00'],
      visualKeywords: ['短发', '高个子'],
      expectedAppearances: [
        {
          change_reason: '初始造型',
          descriptions: ['穿着休闲装'],
        },
      ],
    }

    const result = CharacterProfileJsonSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('应该拒绝无效的 expectedAppearances', () => {
    const invalidData = {
      expectedAppearances: [
        {
          descriptions: [], // 空的 descriptions
        },
      ],
    }

    const result = CharacterProfileJsonSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})

describe('LocationProfileJsonSchema', () => {
  it('应该验证空对象', () => {
    const result = LocationProfileJsonSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('应该验证完整的场景档案数据', () => {
    const validData = {
      keyElements: ['沙发', '茶几', '落地窗'],
    }

    const result = LocationProfileJsonSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })
})

describe('CharacterAppearanceMapSchema', () => {
  it('应该验证角色外观映射', () => {
    const validData = {
      'char-1': 'appearance-1',
      'char-2': 'appearance-2',
    }

    const result = CharacterAppearanceMapSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('应该验证空对象', () => {
    const result = CharacterAppearanceMapSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('应该拒绝非字符串值', () => {
    const invalidData = {
      'char-1': 123,
    }

    const result = CharacterAppearanceMapSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})

describe('ScriptContentSchema', () => {
  it('应该验证有效的剧本内容', () => {
    const validData = {
      scenes: [
        {
          number: 1,
          location: '室内 - 客厅',
          description: '角色 A 坐在沙发上',
          characters: ['角色 A', '角色 B'],
          dialogue: [
            {
              character: '角色 A',
              content: '你好',
            },
          ],
        },
      ],
    }

    const result = ScriptContentSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('应该验证没有 dialogue 的场景', () => {
    const validData = {
      scenes: [
        {
          number: 1,
          location: '室内 - 客厅',
          description: '角色 A 坐在沙发上',
          characters: ['角色 A'],
        },
      ],
    }

    const result = ScriptContentSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('应该验证带有 action 的场景', () => {
    const validData = {
      scenes: [
        {
          number: 1,
          location: '室内 - 客厅',
          description: '角色 A 坐在沙发上',
          characters: ['角色 A'],
          action: '角色 A 站起来走向窗户',
        },
      ],
    }

    const result = ScriptContentSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('应该拒绝无效的 scene 数据', () => {
    const invalidData = {
      scenes: [
        {
          number: 'one', // 应该是 number
          location: '室内 - 客厅',
        },
      ],
    }

    const result = ScriptContentSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})

describe('AssetMetadataSchema', () => {
  it('应该验证空对象', () => {
    const result = AssetMetadataSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('应该验证完整的资产元数据', () => {
    const validData = {
      provider: 'openai',
      model: 'dall-e-3',
      prompt: '一只可爱的猫咪',
      negativePrompt: '模糊',
      seed: 12345,
      steps: 50,
      guidance: 7.5,
      width: 1024,
      height: 1024,
      cost: 0.04,
      currency: 'USD',
      extra: { customField: 'value' },
    }

    const result = AssetMetadataSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('应该验证部分资产元数据', () => {
    const validData = {
      provider: 'openai',
      model: 'dall-e-3',
    }

    const result = AssetMetadataSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })
})

describe('TaskPayloadSchema', () => {
  it('应该验证文本生成任务 payload', () => {
    const validData = {
      prompt: '写一首诗',
      modelId: 'gpt-4',
      providerId: 'openai',
      messages: [
        { role: 'user' as const, content: '写一首诗' },
        { role: 'assistant' as const, content: '好的' },
      ],
      maxTokens: 1000,
      temperature: 0.7,
    }

    const result = TextGenerationPayloadSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('应该验证图像生成任务 payload', () => {
    const validData = {
      prompt: '一只可爱的猫咪',
      modelId: 'dall-e-3',
      aspectRatio: '1:1' as const,
      resolution: '1024x1024' as const,
      n: 1,
    }

    const result = ImageGenerationPayloadSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('应该拒绝无效的 aspectRatio', () => {
    const invalidData = {
      prompt: '一只可爱的猫咪',
      aspectRatio: 'invalid',
    }

    const result = ImageGenerationPayloadSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('应该验证视频生成任务 payload', () => {
    const validData = {
      prompt: '一只猫咪在玩耍',
      imageUrl: 'https://example.com/cat.jpg',
      duration: 10,
      resolution: '1080p' as const,
    }

    const result = VideoGenerationPayloadSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('应该拒绝无效的 duration 范围', () => {
    const invalidData = {
      prompt: '一只猫咪在玩耍',
      duration: 100, // 超过最大值 60
    }

    const result = VideoGenerationPayloadSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('应该验证基础任务 payload', () => {
    const validData = {
      prompt: '通用任务',
      modelId: 'model-123',
      providerId: 'provider-456',
      params: { custom: 'param' },
    }

    const result = TaskPayloadSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })
})

describe('Schema Type Helpers', () => {
  it('应该正确推断类型', () => {
    // 这个测试主要验证 TypeScript 类型推断是否正常工作
    // 在编译时会检查类型是否正确
    type TestAppearance = z.infer<typeof CharacterAppearanceSchema>
    type TestScript = z.infer<typeof ScriptContentSchema>
    type TestAsset = z.infer<typeof AssetMetadataSchema>

    // 这些类型应该可以被正确使用
    const _testAppearance: TestAppearance = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      change_reason: 'test',
    }

    const _testScript: TestScript = {
      scenes: [
        {
          number: 1,
          location: 'test',
          description: 'test',
          characters: [],
        },
      ],
    }

    const _testAsset: TestAsset = {
      provider: 'test',
    }

    expect(true).toBe(true)
  })
})
