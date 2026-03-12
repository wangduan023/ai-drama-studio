/**
 * AI 流式生成 API
 * 
 * SSE 流式输出，用于实时显示生成内容
 * 
 * 权限要求: 项目级别的 ai:generate 权限
 */

import { NextRequest } from 'next/server'
import { createUnifiedAIClient } from '@ai-drama-studio/ai-client'
import { requirePermission } from '@/lib/rbac'

// ============================================
// POST /api/ai/generate/stream - 流式生成
// ============================================
export async function POST(request: NextRequest) {
  // 权限检查
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  
  const auth = await requirePermission(request, 'ai', 'generate', projectId || undefined)
  if (!auth.success) {
    return auth.response
  }

  try {
    const body = await request.json()
    
    // 验证必填字段
    if (!body.providerId || !body.params) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: providerId, params' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { providerId, modelId, params, options } = body

    // 创建客户端
    const client = createUnifiedAIClient({
      providerId,
      modelId,
      capability: 'CHAT',
      useProxy: options?.useProxy ?? true,
      timeout: options?.timeout || 120000,
    })

    // 创建 SSE 流
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        
        try {
          // 发送开始事件
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`))

          // 执行流式生成
          await client.generateText(params, {
            stream: true,
            onStream: (event) => {
              const data = JSON.stringify({
                type: 'data',
                content: event.content,
                finishReason: event.finishReason,
                usage: event.usage,
              })
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))

              if (event.finishReason) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
                controller.close()
              }
            },
            timeout: options?.timeout,
            retries: options?.retries || 2,
          })
        } catch (error: any) {
          const errorData = JSON.stringify({
            type: 'error',
            error: error.message || 'Generation failed',
            code: error.code || 'UNKNOWN_ERROR',
          })
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    console.error('Stream generation failed:', error)
    return new Response(
      JSON.stringify({ error: 'Stream generation failed', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
