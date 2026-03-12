/**
 * AI 生成 API
 * 
 * 统一的 AI 生成服务入口
 * 支持: 文本生成、图片生成、视频生成、语音生成
 * 
 * 权限要求: 项目级别的 ai:generate 权限
 */

import { NextRequest, NextResponse } from 'next/server'
import { createUnifiedAIClient, type UnifiedClientConfig } from '@ai-drama-studio/ai-client'
import { requirePermission } from '@/lib/rbac'

// ============================================
// POST /api/ai/generate - AI 生成请求
// ============================================
export async function POST(request: NextRequest) {
  // 权限检查（项目级别）
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  
  const auth = await requirePermission(request, 'ai', 'generate', projectId || undefined)
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    
    // 验证必填字段
    if (!body.providerId || !body.type) {
      return NextResponse.json(
        { error: 'Missing required fields: providerId, type' },
        { status: 400 }
      )
    }

    const { providerId, modelId, type, params, options } = body

    // 创建统一客户端配置
    const clientConfig: UnifiedClientConfig = {
      providerId,
      modelId,
      capability: mapTypeToCapability(type),
      useProxy: options?.useProxy ?? true,
      timeout: options?.timeout,
      retryConfig: options?.retryConfig,
    }

    // 创建客户端
    const client = createUnifiedAIClient(clientConfig)

    // 根据类型执行生成
    let result: unknown
    switch (type) {
      case 'text':
      case 'chat':
        result = await client.generateText(params, {
          stream: options?.stream,
          timeout: options?.timeout,
          retries: options?.retries,
        })
        break

      case 'image':
        result = await client.generateImage(params, {
          timeout: options?.timeout,
          retries: options?.retries,
        })
        break

      case 'video':
        result = await client.generateVideo(params, {
          timeout: options?.timeout,
          retries: options?.retries,
        })
        break

      case 'audio':
      case 'voice':
        result = await client.generateAudio(params, {
          timeout: options?.timeout,
          retries: options?.retries,
        })
        break

      default:
        return NextResponse.json(
          { error: `Unsupported generation type: ${type}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      type,
      result,
    })
  } catch (error: any) {
    console.error('AI generation failed:', error)

    // 分类错误响应
    if (error.code === 'CONFIGURATION_ERROR') {
      return NextResponse.json(
        { error: 'Configuration error', message: error.message },
        { status: 503 }
      )
    }

    if (error.code === 'RATE_LIMIT') {
      return NextResponse.json(
        { error: 'Rate limit exceeded', message: error.message },
        { status: 429 }
      )
    }

    if (error.code === 'AUTHENTICATION_ERROR') {
      return NextResponse.json(
        { error: 'Authentication failed', message: error.message },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Generation failed', message: error.message },
      { status: 500 }
    )
  }
}

/**
 * 映射生成类型到能力类型
 */
function mapTypeToCapability(type: string): 'TEXT' | 'IMAGE' | 'VIDEO' | 'VOICE' | 'CHAT' | 'VISION' {
  const mapping: Record<string, 'TEXT' | 'IMAGE' | 'VIDEO' | 'VOICE' | 'CHAT' | 'VISION'> = {
    text: 'TEXT',
    chat: 'CHAT',
    image: 'IMAGE',
    video: 'VIDEO',
    audio: 'VOICE',
    voice: 'VOICE',
  }
  return mapping[type] || 'TEXT'
}
