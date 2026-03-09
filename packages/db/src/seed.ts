#!/usr/bin/env tsx
/**
 * Database Seed Script
 *
 * 初始化数据库基础数据，包括：
 * - 默认系统配置
 * - AI 模型配置模板
 * - 示例用户（开发环境）
 * - AI 渠道商配置
 *
 * 使用方法:
 *   npm run db:seed
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 AI Drama Studio - Database Seeding')
  console.log('======================================')
  console.log('')

  // 1. 创建系统配置
  console.log('📋 Creating system configurations...')

  const aiModelConfigs = [
    {
      key: 'ai_model.text',
      value: {
        provider: 'openai',
        model: 'gpt-4o',
        maxTokens: 4096,
        temperature: 0.7
      },
      description: '文本生成模型配置',
      category: 'ai_model',
      isPublic: false
    },
    {
      key: 'ai_model.image',
      value: {
        provider: 'openai',
        model: 'dall-e-3',
        size: '1024x1024',
        quality: 'standard'
      },
      description: '图像生成模型配置',
      category: 'ai_model',
      isPublic: false
    },
    {
      key: 'ai_model.video',
      value: {
        provider: 'kling',
        model: 'kling-v1',
        duration: 5,
        resolution: '720p'
      },
      description: '视频生成模型配置',
      category: 'ai_model',
      isPublic: false
    },
    {
      key: 'system.features',
      value: {
        enableCharacterConsistency: true,
        enableLocationConsistency: true,
        enableBatchGeneration: true,
        maxConcurrentTasks: 5
      },
      description: '系统功能开关配置',
      category: 'system',
      isPublic: true
    },
    {
      key: 'system.limits',
      value: {
        maxEpisodesPerProject: 100,
        maxStoryboardsPerEpisode: 50,
        maxUploadSizeMB: 100,
        videoMaxDurationSeconds: 300
      },
      description: '系统限制配置',
      category: 'system',
      isPublic: true
    }
  ]

  for (const config of aiModelConfigs) {
    await prisma.config.upsert({
      where: { key: config.key },
      update: config,
      create: config
    })
    console.log(`  ✓ ${config.key}`)
  }

  // 2. 创建示例用户（仅开发环境）
  if (process.env.NODE_ENV !== 'production') {
    console.log('')
    console.log('👤 Creating demo users (development only)...')

    const demoUsers = [
      {
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN' as const
      },
      {
        email: 'user@example.com',
        name: 'Demo User',
        role: 'USER' as const
      }
    ]

    for (const user of demoUsers) {
      await prisma.user.upsert({
        where: { email: user.email },
        update: user,
        create: user
      })
      console.log(`  ✓ ${user.email} (${user.role})`)
    }
  }

  // 3. 创建示例项目模板配置
  console.log('')
  console.log('📁 Creating project templates...')

  const projectTemplates = [
    {
      key: 'template.modern_drama',
      value: {
        name: '现代短剧模板',
        description: '现代都市题材短剧配置',
        settings: {
          episodeDuration: 120,
          aspectRatio: '16:9',
          style: 'realistic'
        }
      },
      description: '现代短剧项目模板',
      category: 'template',
      isPublic: true
    },
    {
      key: 'template.ancient_drama',
      value: {
        name: '古装短剧模板',
        description: '古代题材短剧配置',
        settings: {
          episodeDuration: 120,
          aspectRatio: '16:9',
          style: 'ancient_chinese'
        }
      },
      description: '古装短剧项目模板',
      category: 'template',
      isPublic: true
    }
  ]

  for (const template of projectTemplates) {
    await prisma.config.upsert({
      where: { key: template.key },
      update: template,
      create: template
    })
    console.log(`  ✓ ${template.key}`)
  }

  // 4. 创建 AI 渠道商配置（默认禁用，需要用户填入 API Key）
  console.log('')
  console.log('🤖 Creating AI provider configurations...')

  const aiProviders = [
    // 国际厂商
    {
      name: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '', // 需要用户填入
      isActive: false,
      priority: 1,
      weight: 1,
      description: 'OpenAI - GPT-4, DALL-E 3'
    },
    {
      name: 'anthropic',
      baseUrl: 'https://api.anthropic.com',
      apiKey: '',
      isActive: false,
      priority: 1,
      weight: 1,
      description: 'Anthropic - Claude 系列'
    },
    {
      name: 'google',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: '',
      isActive: false,
      priority: 2,
      weight: 1,
      description: 'Google - Gemini 系列'
    },
    // 国内厂商
    {
      name: 'doubao',
      baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
      apiKey: '',
      isActive: false,
      priority: 1,
      weight: 1,
      description: '字节豆包 - Seedance, Doubao'
    },
    {
      name: 'deepseek',
      baseUrl: 'https://api.deepseek.com',
      apiKey: '',
      isActive: false,
      priority: 1,
      weight: 1,
      description: '深度求索 - DeepSeek V3'
    },
    {
      name: 'qwen',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey: '',
      isActive: false,
      priority: 1,
      weight: 1,
      description: '阿里云 - 通义千问'
    },
    {
      name: 'baidu',
      baseUrl: 'https://qianfan.baidubce.com/v2',
      apiKey: '',
      isActive: false,
      priority: 2,
      weight: 1,
      description: '百度 - 文心一言'
    },
    {
      name: 'tencent',
      baseUrl: 'https://hunyuan.tencentcloudapi.com',
      apiKey: '',
      isActive: false,
      priority: 2,
      weight: 1,
      description: '腾讯 - 混元'
    },
    {
      name: 'zhipu',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      apiKey: '',
      isActive: false,
      priority: 2,
      weight: 1,
      description: '智谱 AI - GLM 系列'
    },
    {
      name: 'iflytek',
      baseUrl: 'https://spark-api-open.xf-yun.com/v1',
      apiKey: '',
      isActive: false,
      priority: 2,
      weight: 1,
      description: '科大讯飞 - 星火'
    },
    {
      name: 'moonshot',
      baseUrl: 'https://api.moonshot.cn/v1',
      apiKey: '',
      isActive: false,
      priority: 2,
      weight: 1,
      description: '月之暗面 - Kimi'
    },
    {
      name: 'minimax',
      baseUrl: 'https://api.minimax.chat/v1',
      apiKey: '',
      isActive: false,
      priority: 3,
      weight: 1,
      description: 'MiniMax'
    },
    {
      name: 'lingyi',
      baseUrl: 'https://api.lingyiwanwu.com/v1',
      apiKey: '',
      isActive: false,
      priority: 3,
      weight: 1,
      description: '零一万物'
    },
    // 视频生成
    {
      name: 'kling',
      baseUrl: 'https://api.klingai.com',
      apiKey: '',
      isActive: false,
      priority: 1,
      weight: 1,
      description: '快手可灵 - 视频生成'
    },
    {
      name: 'vidu',
      baseUrl: 'https://api.vidu.cn',
      apiKey: '',
      isActive: false,
      priority: 2,
      weight: 1,
      description: 'Vidu - 视频生成'
    },
    // 本地服务
    {
      name: 'ollama',
      baseUrl: 'http://localhost:11434/api',
      apiKey: 'ollama', // Ollama 不需要 API Key
      isActive: false,
      priority: 10,
      weight: 1,
      description: 'Ollama - 本地模型服务'
    },
    {
      name: 'comfyui',
      baseUrl: 'http://localhost:8188',
      apiKey: '',
      isActive: false,
      priority: 10,
      weight: 1,
      description: 'ComfyUI - 本地图像生成'
    }
  ]

  for (const provider of aiProviders) {
    const existing = await prisma.aiProvider.findUnique({
      where: { name: provider.name }
    })

    if (existing) {
      // 已存在则更新
      await prisma.aiProvider.update({
        where: { id: existing.id },
        data: {
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
          isActive: provider.isActive,
          priority: provider.priority,
          weight: provider.weight,
          description: provider.description
        }
      })
    } else {
      // 不存在则创建
      await prisma.aiProvider.create({
        data: provider
      })
    }
    console.log(`  ✓ ${provider.name} (${provider.isActive ? 'active' : 'inactive'})`)
  }

  // 5. 创建默认 AI 模型配置
  console.log('')
  console.log('📦 Creating default AI model configurations...')

  // 获取 OpenAI provider
  const openaiProvider = await prisma.aiProvider.findUnique({
    where: { name: 'openai' }
  })

  if (openaiProvider) {
    const openaiModels = [
      {
        modelId: 'gpt-4o',
        name: 'GPT-4o',
        type: 'TEXT' as const,
        isDefault: true,
        maxTokens: 128000,
        contextWindow: 128000,
        inputCost: 0.005,
        outputCost: 0.015,
        description: 'OpenAI 旗舰模型，支持多模态'
      },
      {
        modelId: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        type: 'TEXT' as const,
        isDefault: false,
        maxTokens: 128000,
        contextWindow: 128000,
        inputCost: 0.00015,
        outputCost: 0.0006,
        description: '轻量级 GPT-4o，性价比高'
      },
      {
        modelId: 'dall-e-3',
        name: 'DALL-E 3',
        type: 'IMAGE' as const,
        isDefault: true,
        imageCost: 0.04,
        description: 'OpenAI 图像生成模型'
      }
    ]

    for (const model of openaiModels) {
      await prisma.aiModel.upsert({
        where: { providerId_modelId: {
          providerId: openaiProvider.id,
          modelId: model.modelId
        }},
        update: model,
        create: {
          providerId: openaiProvider.id,
          ...model
        }
      })
      console.log(`  ✓ OpenAI/${model.modelId}`)
    }
  }

  // 获取 Doubao provider
  const doubaoProvider = await prisma.aiProvider.findUnique({
    where: { name: 'doubao' }
  })

  if (doubaoProvider) {
    const doubaoModels = [
      {
        modelId: 'doubao-seedance-1-0-pro-fast-251015',
        name: 'Doubao Seedance 1.0 Pro Fast',
        type: 'VIDEO' as const,
        isDefault: true,
        videoCost: 0.5,
        description: '豆包视频生成模型'
      }
    ]

    for (const model of doubaoModels) {
      await prisma.aiModel.upsert({
        where: { providerId_modelId: {
          providerId: doubaoProvider.id,
          modelId: model.modelId
        }},
        update: model,
        create: {
          providerId: doubaoProvider.id,
          ...model
        }
      })
      console.log(`  ✓ Doubao/${model.modelId}`)
    }
  }

  console.log('')
  console.log('💡 提示：AI 渠道商默认禁用，请在数据库填入 API Key 后手动启用')
  console.log('   使用 Prisma Studio: npx prisma studio')
  console.log('   或执行 SQL: UPDATE ai_providers SET isActive = 1, apiKey = "your-key" WHERE name = "openai"')

  console.log('')
  console.log('✅ Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
