/**
 * AI Provider Schema Tests
 * 验证 AI 渠道和模型配置的 Zod schemas
 */
import { describe, it, expect } from 'vitest'
import {
  AiProviderNameSchema,
  AiProviderMetadataSchema,
  CreateAiProviderSchema,
  UpdateAiProviderSchema,
  AiModelTypeSchema,
  AiModelMetadataSchema,
  CreateAiModelSchema,
  UpdateAiModelSchema,
  AiUsageStatusSchema,
  CreateAiUsageLogSchema,
} from '../../src/schemas/ai-provider.schema'

describe('AiProviderNameSchema', () => {
  it('应该验证支持的渠道商名称', () => {
    const validProviders = [
      'openai',
      'anthropic',
      'google',
      'doubao',
      'deepseek',
      'qwen',
      'ollama',
      'comfyui',
      'kling',
      'vidu',
      'baidu',
      'tencent',
      'zhipu',
      'iflytek',
      'moonshot',
      'minimax',
      'lingyi',
    ]

    validProviders.forEach((provider) => {
      const result = AiProviderNameSchema.safeParse(provider)
      expect(result.success).toBe(true)
    })
  })

  it('应该拒绝不支持的渠道商名称', () => {
    const invalidProvider = 'unknown-provider'
    const result = AiProviderNameSchema.safeParse(invalidProvider)
    expect(result.success).toBe(false)
  })
})

describe('AiProviderMetadataSchema', () => {
  it('应该验证空对象', () => {
    const result = AiProviderMetadataSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('应该验证完整的元数据', () => {
    const validData = {
      apiVersion: 'v1',
      features: {
        streaming: true,
        batchSupport: true,
        visionInput: false,
        functionCalling: true,
      },
      rateLimitDetails: {
        requestsPerMinute: 100,
        tokensPerMinute: 10000,
        imagesPerMinute: 50,
        videosPerMinute: 10,
      },
      regions: ['us-east-1', 'eu-west-1'],
      documentationUrl: 'https://example.com/docs',
    }

    const result = AiProviderMetadataSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('应该验证部分元数据', () => {
    const validData = {
      apiVersion: 'v1',
    }

    const result = AiProviderMetadataSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('应该拒绝无效的 URL', () => {
    const invalidData = {
      documentationUrl: 'not-a-url',
    }

    const result = AiProviderMetadataSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('应该拒绝无效的 features 类型', () => {
    const invalidData = {
      features: {
        streaming: 'yes', // 应该是 boolean
      },
    }

    const result = AiProviderMetadataSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})

describe('CreateAiProviderSchema', () => {
  it('应该验证有效的创建数据', () => {
    const validData = {
      name: 'openai' as const,
      baseUrl: 'https://api.openai.com',
      apiKey: 'sk-xxx',
      isActive: true,
      priority: 0,
      weight: 1,
      rateLimit: 100,
      quotaDaily: 1000,
      description: 'OpenAI API',
    }

    const result = CreateAiProviderSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('应该使用默认值', () => {
    const validData = {
      name: 'openai' as const,
      baseUrl: 'https://api.openai.com',
      apiKey: 'sk-xxx',
    }

    const result = CreateAiProviderSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isActive).toBe(true)
      expect(result.data.priority).toBe(0)
      expect(result.data.weight).toBe(1)
      expect(result.data.currency).toBeUndefined()
    }
  })

  it('应该拒绝无效的 URL', () => {
    const invalidData = {
      name: 'openai' as const,
      baseUrl: 'not-a-url',
      apiKey: 'sk-xxx',
    }

    const result = CreateAiProviderSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('应该拒绝空的 apiKey', () => {
    const invalidData = {
      name: 'openai' as const,
      baseUrl: 'https://api.openai.com',
      apiKey: '',
    }

    const result = CreateAiProviderSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('应该拒绝不支持的 name', () => {
    const invalidData = {
      name: 'unknown',
      baseUrl: 'https://api.example.com',
      apiKey: 'key-xxx',
    }

    const result = CreateAiProviderSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('应该拒绝负的 weight', () => {
    const invalidData = {
      name: 'openai' as const,
      baseUrl: 'https://api.openai.com',
      apiKey: 'sk-xxx',
      weight: -1,
    }

    const result = CreateAiProviderSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('应该拒绝过长的 description', () => {
    const invalidData = {
      name: 'openai' as const,
      baseUrl: 'https://api.openai.com',
      apiKey: 'sk-xxx',
      description: 'a'.repeat(501),
    }

    const result = CreateAiProviderSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})

describe('UpdateAiProviderSchema', () => {
  it('应该验证部分更新数据', () => {
    const validData = {
      isActive: false,
    }

    const result = UpdateAiProviderSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('应该验证完整的更新数据', () => {
    const validData = {
      baseUrl: 'https://new-api.example.com',
      apiKey: 'new-key',
      isActive: true,
      priority: 5,
      weight: 2,
      rateLimit: 200,
      quotaDaily: 2000,
      description: 'Updated description',
    }

    const result = UpdateAiProviderSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('应该拒绝无效的更新', () => {
    const invalidData = {
      apiKey: '',
    }

    const result = UpdateAiProviderSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})

describe('AiModelTypeSchema', () => {
  it('应该验证支持的模型类型', () => {
    const validTypes = ['TEXT', 'IMAGE', 'VIDEO', 'VOICE', 'EMBEDDING']

    validTypes.forEach((type) => {
      const result = AiModelTypeSchema.safeParse(type)
      expect(result.success).toBe(true)
    })
  })

  it('应该拒绝不支持的模型类型', () => {
    const invalidType = 'AUDIO'
    const result = AiModelTypeSchema.safeParse(invalidType)
    expect(result.success).toBe(false)
  })
})

describe('AiModelMetadataSchema', () => {
  it('应该验证空对象', () => {
    const result = AiModelMetadataSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('应该验证完整的元数据', () => {
    const validData = {
      supportedParams: ['temperature', 'max_tokens'],
      capabilities: {
        textGeneration: true,
        imageGeneration: false,
        videoGeneration: false,
        voiceGeneration: false,
        functionCalling: true,
        visionInput: false,
        jsonOutput: true,
      },
      version: '1.0.0',
      releaseDate: '2024-01-01',
      deprecationDate: '2025-01-01',
      trainingCutoff: '2024-01-01',
      contextWindowDetails: {
        inputTokens: 128000,
        outputTokens: 4096,
      },
    }

    const result = AiModelMetadataSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('应该验证部分元数据', () => {
    const validData = {
      version: '1.0.0',
    }

    const result = AiModelMetadataSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })
})

describe('CreateAiModelSchema', () => {
  it('应该验证有效的创建数据', () => {
    const validData = {
      providerId: '550e8400-e29b-41d4-a716-446655440000',
      modelId: 'gpt-4',
      name: 'GPT-4',
      type: 'TEXT' as const,
      isEnabled: true,
      isDefault: false,
      maxTokens: 8192,
      contextWindow: 128000,
      inputCost: 0.03,
      outputCost: 0.06,
      currency: 'USD',
      rateLimit: 100,
      rpm: 60,
      tpm: 10000,
      description: 'OpenAI GPT-4 model',
    }

    const result = CreateAiModelSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('应该使用默认值', () => {
    const validData = {
      providerId: '550e8400-e29b-41d4-a716-446655440000',
      modelId: 'gpt-4',
      name: 'GPT-4',
      type: 'TEXT' as const,
    }

    const result = CreateAiModelSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.isEnabled).toBe(true)
      expect(result.data.isDefault).toBe(false)
      expect(result.data.currency).toBe('USD')
    }
  })

  it('应该拒绝无效的 providerId UUID', () => {
    const invalidData = {
      providerId: 'invalid-uuid',
      modelId: 'gpt-4',
      name: 'GPT-4',
      type: 'TEXT' as const,
    }

    const result = CreateAiModelSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('应该拒绝空的 modelId', () => {
    const invalidData = {
      providerId: '550e8400-e29b-41d4-a716-446655440000',
      modelId: '',
      name: 'GPT-4',
      type: 'TEXT' as const,
    }

    const result = CreateAiModelSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('应该拒绝空的名字', () => {
    const invalidData = {
      providerId: '550e8400-e29b-41d4-a716-446655440000',
      modelId: 'gpt-4',
      name: '',
      type: 'TEXT' as const,
    }

    const result = CreateAiModelSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('应该拒绝负的成本值', () => {
    const invalidData = {
      providerId: '550e8400-e29b-41d4-a716-446655440000',
      modelId: 'gpt-4',
      name: 'GPT-4',
      type: 'TEXT' as const,
      inputCost: -0.01,
    }

    const result = CreateAiModelSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('应该拒绝过长的 description', () => {
    const invalidData = {
      providerId: '550e8400-e29b-41d4-a716-446655440000',
      modelId: 'gpt-4',
      name: 'GPT-4',
      type: 'TEXT' as const,
      description: 'a'.repeat(501),
    }

    const result = CreateAiModelSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})

describe('UpdateAiModelSchema', () => {
  it('应该验证部分更新数据', () => {
    const validData = {
      isEnabled: false,
    }

    const result = UpdateAiModelSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('应该验证完整的更新数据', () => {
    const validData = {
      modelId: 'new-model-id',
      name: 'New Model',
      type: 'IMAGE' as const,
      maxTokens: 4096,
    }

    const result = UpdateAiModelSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })
})

describe('AiUsageStatusSchema', () => {
  it('应该验证支持的状态', () => {
    const validStatuses = ['SUCCESS', 'FAILED', 'RATE_LIMITED', 'TIMEOUT', 'CANCELLED']

    validStatuses.forEach((status) => {
      const result = AiUsageStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    })
  })

  it('应该拒绝不支持的状态', () => {
    const invalidStatus = 'PENDING'
    const result = AiUsageStatusSchema.safeParse(invalidStatus)
    expect(result.success).toBe(false)
  })
})

describe('CreateAiUsageLogSchema', () => {
  it('应该验证有效的创建数据', () => {
    const validData = {
      providerId: '550e8400-e29b-41d4-a716-446655440000',
      modelId: 'gpt-4',
      action: 'text.generation',
      requestId: 'req-123',
      externalId: 'ext-456',
      inputTokens: 1000,
      outputTokens: 500,
      cost: 0.05,
      currency: 'USD',
      status: 'SUCCESS' as const,
      projectId: '550e8400-e29b-41d4-a716-446655440001',
      episodeId: '550e8400-e29b-41d4-a716-446655440002',
      taskId: '550e8400-e29b-41d4-a716-446655440003',
      userId: '550e8400-e29b-41d4-a716-446655440004',
      latency: 1500,
    }

    const result = CreateAiUsageLogSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it('应该使用默认值', () => {
    const validData = {
      providerId: '550e8400-e29b-41d4-a716-446655440000',
      action: 'text.generation',
      cost: 0.05,
    }

    const result = CreateAiUsageLogSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('SUCCESS')
      expect(result.data.currency).toBe('USD')
    }
  })

  it('应该拒绝空的操作', () => {
    const invalidData = {
      providerId: '550e8400-e29b-41d4-a716-446655440000',
      action: '',
      cost: 0.05,
    }

    const result = CreateAiUsageLogSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('应该拒绝负的 token 数', () => {
    const invalidData = {
      providerId: '550e8400-e29b-41d4-a716-446655440000',
      action: 'text.generation',
      inputTokens: -100,
      cost: 0.05,
    }

    const result = CreateAiUsageLogSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('应该拒绝负的成本', () => {
    const invalidData = {
      providerId: '550e8400-e29b-41d4-a716-446655440000',
      action: 'text.generation',
      cost: -0.01,
    }

    const result = CreateAiUsageLogSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })
})
