/**
 * 项目活动日志 API
 * GET - 获取项目活动日志
 * 权限: 项目成员
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { canViewProject } from '@/lib/collaboration/permissions'

// 活动类型映射（用于显示）
const ACTIVITY_LABELS: Record<string, { action: string; icon: string }> = {
  'member.added': { action: '添加了成员', icon: 'user-plus' },
  'member.invited': { action: '发送了邀请', icon: 'mail' },
  'member.joined': { action: '加入了项目', icon: 'user-check' },
  'member.removed': { action: '移除了成员', icon: 'user-minus' },
  'member.role_changed': { action: '更改了成员角色', icon: 'user-cog' },
  'comment.created': { action: '发表了评论', icon: 'message-square' },
  'comment.replied': { action: '回复了评论', icon: 'message-circle' },
  'comment.updated': { action: '编辑了评论', icon: 'edit' },
  'comment.deleted': { action: '删除了评论', icon: 'trash-2' },
  'episode.created': { action: '创建了剧集', icon: 'file-plus' },
  'episode.updated': { action: '更新了剧集', icon: 'file-edit' },
  'episode.deleted': { action: '删除了剧集', icon: 'file-minus' },
  'project.updated': { action: '更新了项目', icon: 'settings' },
  'character.created': { action: '创建了角色', icon: 'user' },
  'character.updated': { action: '更新了角色', icon: 'user-edit' },
  'location.created': { action: '创建了场景', icon: 'map-pin' },
  'location.updated': { action: '更新了场景', icon: 'map' },
  'task.created': { action: '创建了任务', icon: 'play-circle' },
  'task.completed': { action: '完成了任务', icon: 'check-circle' },
  'task.failed': { action: '任务失败', icon: 'x-circle' },
}

// 获取活动日志
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const action = searchParams.get('action')
    const skip = (page - 1) * limit

    const { user } = await verifyAuth(request)
    const userId = user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 检查查看权限
    const hasAccess = await canViewProject(userId, projectId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 构建查询条件
    const where: {
      projectId: string
      action?: string
    } = {
      projectId,
    }

    if (action) {
      where.action = action
    }

    const [activities, total] = await Promise.all([
      prisma.projectActivity.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.projectActivity.count({ where }),
    ])

    return NextResponse.json({
      activities: activities.map((activity) => ({
        id: activity.id,
        action: activity.action,
        label: ACTIVITY_LABELS[activity.action]?.action || activity.action,
        icon: ACTIVITY_LABELS[activity.action]?.icon || 'activity',
        targetType: activity.targetType,
        targetId: activity.targetId,
        metadata: activity.metadata,
        user: activity.user,
        createdAt: activity.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Failed to fetch activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}

// 创建活动日志（内部使用，也可用于手动记录）
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const { action, targetType, targetId, metadata } = body

    const { user } = await verifyAuth(request)
    const userId = user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 检查查看权限
    const hasAccess = await canViewProject(userId, projectId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 验证参数
    if (!action || typeof action !== 'string') {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    const activity = await prisma.projectActivity.create({
      data: {
        projectId,
        userId,
        action,
        targetType: targetType || null,
        targetId: targetId || null,
        metadata: metadata || {},
      },
    })

    return NextResponse.json({
      message: 'Activity logged successfully',
      activity: {
        id: activity.id,
        action: activity.action,
        targetType: activity.targetType,
        targetId: activity.targetId,
        metadata: activity.metadata,
        createdAt: activity.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
    return NextResponse.json(
      { error: 'Failed to log activity' },
      { status: 500 }
    )
  }
}
