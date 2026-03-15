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

import { prisma } from './client'

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
        email: 'superadmin@aidrama.com',
        name: 'Super Admin',
        role: 'SUPER_ADMIN' as const,
        passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJ/I2K' // hashed 'password123'
      },
      {
        email: 'super@example.com',
        name: 'Super Admin',
        role: 'SUPER_ADMIN' as const,
        passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJ/I2K' // hashed 'password123'
      },
      {
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN' as const,
        passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJ/I2K' // hashed 'password123'
      },
      {
        email: 'user@example.com',
        name: 'Demo User',
        role: 'USER' as const,
        passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYMyzJ/I2K' // hashed 'password123'
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
    // ============================================
    // 国际厂商
    // ============================================
    {
      name: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      apiKey: '',
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
    {
      name: 'mistral',
      baseUrl: 'https://api.mistral.ai/v1',
      apiKey: '',
      isActive: false,
      priority: 2,
      weight: 1,
      description: 'Mistral AI - Mistral 系列'
    },
    {
      name: 'cohere',
      baseUrl: 'https://api.cohere.ai/v1',
      apiKey: '',
      isActive: false,
      priority: 2,
      weight: 1,
      description: 'Cohere - Command 系列'
    },
    {
      name: 'groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: '',
      isActive: false,
      priority: 2,
      weight: 1,
      description: 'Groq - 高速推理'
    },
    {
      name: 'stability',
      baseUrl: 'https://api.stability.ai/v2beta',
      apiKey: '',
      isActive: false,
      priority: 2,
      weight: 1,
      description: 'Stability AI - Stable Diffusion'
    },
    {
      name: 'fal',
      baseUrl: 'https://api.fal.ai/v1',
      apiKey: '',
      isActive: false,
      priority: 2,
      weight: 1,
      description: 'Fal.ai - 多模态生成'
    },
    {
      name: 'runway',
      baseUrl: 'https://api.runwayml.com/v1',
      apiKey: '',
      isActive: false,
      priority: 2,
      weight: 1,
      description: 'Runway ML - Gen-3 视频生成'
    },
    {
      name: 'elevenlabs',
      baseUrl: 'https://api.elevenlabs.io/v1',
      apiKey: '',
      isActive: false,
      priority: 2,
      weight: 1,
      description: 'ElevenLabs - 语音合成'
    },
    {
      name: 'luma',
      baseUrl: 'https://api.lumalabs.ai/dream-machine/v1',
      apiKey: '',
      isActive: false,
      priority: 2,
      weight: 1,
      description: 'Luma AI - Dream Machine 视频生成'
    },
    {
      name: 'huggingface',
      baseUrl: 'https://api-inference.huggingface.co',
      apiKey: '',
      isActive: false,
      priority: 3,
      weight: 1,
      description: 'Hugging Face - 多模态模型'
    },
    // ============================================
    // 国内厂商 - 文本/多模态
    // ============================================
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
      description: 'MiniMax - 海螺 AI'
    },
    {
      name: 'lingyi',
      baseUrl: 'https://api.lingyiwanwu.com/v1',
      apiKey: '',
      isActive: false,
      priority: 3,
      weight: 1,
      description: '零一万物 - Yi 系列'
    },
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
      name: 'stepfun',
      baseUrl: 'https://api.stepfun.com/v1',
      apiKey: '',
      isActive: false,
      priority: 3,
      weight: 1,
      description: '阶跃星辰 - 跃问'
    },
    {
      name: 'baichuan',
      baseUrl: 'https://api.baichuan-ai.com/v1',
      apiKey: '',
      isActive: false,
      priority: 3,
      weight: 1,
      description: '百川智能 - Baichuan 系列'
    },
    {
      name: 'sensetime',
      baseUrl: 'https://api.sensetime.com/v1',
      apiKey: '',
      isActive: false,
      priority: 3,
      weight: 1,
      description: '商汤科技 - 日日新'
    },
    // ============================================
    // 图像生成专用
    // ============================================
    {
      name: 'wanxiang',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey: '',
      isActive: false,
      priority: 2,
      weight: 1,
      description: '阿里通义万相 - 图像生成'
    },
    {
      name: 'hunyuan-image',
      baseUrl: 'https://hunyuan.tencentcloudapi.com',
      apiKey: '',
      isActive: false,
      priority: 2,
      weight: 1,
      description: '腾讯混元图像 - 图像生成'
    },
    {
      name: 'gewang',
      baseUrl: 'https://qianfan.baidubce.com/v2',
      apiKey: '',
      isActive: false,
      priority: 2,
      weight: 1,
      description: '百度文心一格 - 图像生成'
    },
    // ============================================
    // 本地服务
    // ============================================
    {
      name: 'ollama',
      baseUrl: 'http://localhost:11434/api',
      apiKey: 'ollama',
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

  // 6. 创建 RBAC 权限和角色
  console.log('')
  console.log('🔐 Creating RBAC permissions and roles...')

  // 6.1 创建基础权限
  const permissions = [
    // 通配符权限（超级管理员）
    { resource: '*', action: '*', name: '所有权限' },
    // 用户管理
    { resource: 'user', action: 'read', name: '查看用户' },
    { resource: 'user', action: 'create', name: '创建用户' },
    { resource: 'user', action: 'update', name: '编辑用户' },
    { resource: 'user', action: 'delete', name: '删除用户' },
    // 角色管理
    { resource: 'role', action: 'read', name: '查看角色' },
    { resource: 'role', action: 'create', name: '创建角色' },
    { resource: 'role', action: 'update', name: '编辑角色' },
    { resource: 'role', action: 'delete', name: '删除角色' },
    // 权限管理
    { resource: 'permission', action: 'read', name: '查看权限' },
    { resource: 'permission', action: 'create', name: '创建权限' },
    { resource: 'permission', action: 'update', name: '编辑权限' },
    { resource: 'permission', action: 'delete', name: '删除权限' },
    // AI 密钥管理
    { resource: 'ai_key', action: 'read', name: '查看 AI 密钥' },
    { resource: 'ai_key', action: 'create', name: '创建 AI 密钥' },
    { resource: 'ai_key', action: 'update', name: '编辑 AI 密钥' },
    { resource: 'ai_key', action: 'delete', name: '删除 AI 密钥' },
    // AI 代理管理
    { resource: 'ai_proxy', action: 'read', name: '查看 AI 代理' },
    { resource: 'ai_proxy', action: 'create', name: '创建 AI 代理' },
    { resource: 'ai_proxy', action: 'update', name: '编辑 AI 代理' },
    { resource: 'ai_proxy', action: 'delete', name: '删除 AI 代理' },
    // AI 模型管理
    { resource: 'ai_model', action: 'read', name: '查看 AI 模型' },
    { resource: 'ai_model', action: 'create', name: '创建 AI 模型' },
    { resource: 'ai_model', action: 'update', name: '编辑 AI 模型' },
    { resource: 'ai_model', action: 'delete', name: '删除 AI 模型' },
    // AI 渠道管理
    { resource: 'ai_provider', action: 'read', name: '查看 AI 渠道' },
    { resource: 'ai_provider', action: 'create', name: '创建 AI 渠道' },
    { resource: 'ai_provider', action: 'update', name: '编辑 AI 渠道' },
    { resource: 'ai_provider', action: 'delete', name: '删除 AI 渠道' },
    // 配置管理
    { resource: 'config', action: 'read', name: '查看配置' },
    { resource: 'config', action: 'create', name: '创建配置' },
    { resource: 'config', action: 'update', name: '编辑配置' },
    { resource: 'config', action: 'delete', name: '删除配置' },
  ]

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: {
        resource_action: {
          resource: perm.resource,
          action: perm.action,
        },
      },
      update: perm,
      create: perm,
    })
    console.log(`  ✓ Permission: ${perm.resource}:${perm.action}`)
  }

  // 6.2 创建系统角色
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'superadmin' },
    update: {
      label: '超级管理员',
      description: '系统最高权限，拥有通配符权限',
      type: 'SYSTEM',
      isSystem: true,
    },
    create: {
      name: 'superadmin',
      label: '超级管理员',
      description: '系统最高权限，拥有通配符权限',
      type: 'SYSTEM',
      isSystem: true,
    },
  })

  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {
      label: '管理员',
      description: '系统管理员，拥有所有权限',
      type: 'SYSTEM',
      isSystem: true,
    },
    create: {
      name: 'admin',
      label: '管理员',
      description: '系统管理员，拥有所有权限',
      type: 'SYSTEM',
      isSystem: true,
    },
  })

  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: {
      label: '普通用户',
      description: '普通用户，拥有基础查看权限',
      type: 'SYSTEM',
      isSystem: true,
    },
    create: {
      name: 'user',
      label: '普通用户',
      description: '普通用户，拥有基础查看权限',
      type: 'SYSTEM',
      isSystem: true,
    },
  })

  console.log('  ✓ Roles: superadmin, admin, user')

  // 6.3 为管理员角色分配所有权限
  const allPermissions = await prisma.permission.findMany()

  // 先删除现有权限关联，避免唯一约束冲突
  await prisma.rolePermission.deleteMany({
    where: { roleId: adminRole.id },
  })

  // 批量创建权限关联
  await prisma.rolePermission.createMany({
    data: allPermissions.map(perm => ({
      roleId: adminRole.id,
      permissionId: perm.id,
    })),
    skipDuplicates: true,
  })
  console.log('  ✓ Admin role: all permissions assigned')

  // 6.3b 为超级管理员角色分配通配符权限
  const wildcardPermission = await prisma.permission.findUnique({
    where: { resource_action: { resource: '*', action: '*' } }
  })

  if (wildcardPermission) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: wildcardPermission.id,
        }
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: wildcardPermission.id,
      }
    })
    console.log('  ✓ SuperAdmin role: wildcard permission (*:*) assigned')
  }

  // 6.4 为普通用户分配基础查看权限
  const readPermissions = await prisma.permission.findMany({
    where: { action: 'read' },
  })

  // 先删除现有权限关联，避免唯一约束冲突
  await prisma.rolePermission.deleteMany({
    where: { roleId: userRole.id },
  })

  // 批量创建权限关联
  await prisma.rolePermission.createMany({
    data: readPermissions.map(perm => ({
      roleId: userRole.id,
      permissionId: perm.id,
    })),
    skipDuplicates: true,
  })
  console.log('  ✓ User role: read permissions assigned')

  // 6.5 将 superadmin 用户关联到 superadmin 角色（拥有通配符权限）
  const superAdminUser = await prisma.user.findUnique({
    where: { email: 'superadmin@aidrama.com' },
  })

  if (superAdminUser) {
    await prisma.userSystemRole.upsert({
      where: {
        userId_roleId: {
          userId: superAdminUser.id,
          roleId: superAdminRole.id,
        },
      },
      update: {},
      create: {
        userId: superAdminUser.id,
        roleId: superAdminRole.id,
      },
    })
    console.log('  ✓ superadmin@aidrama.com assigned to superadmin role')
  }

  // 将 super@example.com 也关联到 superadmin 角色
  const superUser = await prisma.user.findUnique({
    where: { email: 'super@example.com' },
  })

  if (superUser) {
    await prisma.userSystemRole.upsert({
      where: {
        userId_roleId: {
          userId: superUser.id,
          roleId: superAdminRole.id,
        },
      },
      update: {},
      create: {
        userId: superUser.id,
        roleId: superAdminRole.id,
      },
    })
    console.log('  ✓ super@example.com assigned to superadmin role')
  }

  // 将 admin@example.com 关联到 admin 角色
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@example.com' },
  })

  if (adminUser) {
    await prisma.userSystemRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: adminRole.id,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    })
    console.log('  ✓ admin@example.com assigned to admin role')
  }

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
