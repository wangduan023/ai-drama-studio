import { NextRequest, NextResponse } from 'next/server'
import {
  TaskType,
  TaskPriority,
} from '@/lib/task-queue'

// POST /api/projects/[projectId]/export
// 导出最终视频
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const body = await request.json()
    const {
      resolution,
      format,
      includeSubtitles,
      includeDubbing,
      includeMusic,
      timeline,
    } = body

    if (!resolution || !format) {
      return NextResponse.json(
        { error: 'Resolution and format are required' },
        { status: 400 }
      )
    }

    // 验证分辨率
    const validResolutions = ['720p', '1080p', '2k', '4k']
    if (!validResolutions.includes(resolution)) {
      return NextResponse.json(
        { error: 'Invalid resolution. Must be 720p, 1080p, 2k, or 4k' },
        { status: 400 }
      )
    }

    // 验证格式
    const validFormats = ['mp4', 'mov', 'webm']
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be mp4, mov, or webm' },
        { status: 400 }
      )
    }

    // 提交导出任务到队列
    const { getTaskQueue } = await import('@/lib/task-queue')
    const queue = getTaskQueue()

    const taskId = await queue.add({
      projectId: params.projectId,
      type: TaskType.EXPORT_VIDEO,
      status: 'pending',
      priority: TaskPriority.HIGH,
      payload: {
        resolution,
        format,
        includeSubtitles: includeSubtitles ?? true,
        includeDubbing: includeDubbing ?? true,
        includeMusic: includeMusic ?? true,
        timeline: timeline || {},
      },
    })

    // 估算费用
    const resolutionCosts: Record<string, number> = {
      '720p': 10,
      '1080p': 20,
      '2k': 40,
      '4k': 80,
    }

    return NextResponse.json({
      success: true,
      taskId,
      cost: resolutionCosts[resolution] || 20,
      message: 'Video export task submitted',
    })
  } catch (error) {
    console.error('Error exporting video:', error)
    return NextResponse.json(
      { error: 'Failed to export video' },
      { status: 500 }
    )
  }
}
