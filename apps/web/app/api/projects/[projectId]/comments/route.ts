/**
 * 项目评论 API
 * GET - 获取评论列表（支持分页）
 * POST - 发表评论
 * 权限: 项目成员
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import {
  canViewProject,
  logProjectActivity,
} from '@/lib/collaboration/permissions'

// 获取评论列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const episodeId = searchParams.get('episodeId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
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
      episodeId?: string | null
      parentId?: null
    } = {
      projectId,
      parentId: null, // 只获取顶层评论
    }

    if (episodeId) {
      where.episodeId = episodeId
    }

    const [comments, total] = await Promise.all([
      prisma.projectComment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          replies: {
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
              createdAt: 'asc',
            },
          },
          _count: {
            select: {
              replies: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.projectComment.count({ where }),
    ])

    return NextResponse.json({
      comments: comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        episodeId: comment.episodeId,
        user: comment.user,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        replyCount: comment._count.replies,
        replies: comment.replies.map((reply) => ({
          id: reply.id,
          content: reply.content,
          episodeId: reply.episodeId,
          user: reply.user,
          createdAt: reply.createdAt.toISOString(),
          updatedAt: reply.updatedAt.toISOString(),
        })),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Failed to fetch comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

// 发表评论
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const { content, episodeId, parentId } = body

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

    // 验证内容
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      )
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: 'Comment content too long (max 5000 characters)' },
        { status: 400 }
      )
    }

    // 如果指定了父评论，验证是否存在
    if (parentId) {
      const parentComment = await prisma.projectComment.findFirst({
        where: {
          id: parentId,
          projectId,
        },
      })

      if (!parentComment) {
        return NextResponse.json(
          { error: 'Parent comment not found' },
          { status: 404 }
        )
      }

      // 不允许嵌套超过一级
      if (parentComment.parentId) {
        return NextResponse.json(
          { error: 'Cannot reply to a reply' },
          { status: 400 }
        )
      }
    }

    // 如果指定了剧集，验证是否存在
    if (episodeId) {
      const episode = await prisma.episode.findFirst({
        where: {
          id: episodeId,
          projectId,
          deletedAt: null,
        },
      })

      if (!episode) {
        return NextResponse.json(
          { error: 'Episode not found' },
          { status: 404 }
        )
      }
    }

    // 创建评论
    const comment = await prisma.projectComment.create({
      data: {
        projectId,
        userId,
        content: content.trim(),
        episodeId: episodeId || null,
        parentId: parentId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    })

    // 记录活动
    await logProjectActivity(
      projectId,
      userId,
      parentId ? 'comment.replied' : 'comment.created',
      'comment',
      comment.id,
      {
        episodeId: episodeId || null,
        parentId: parentId || null,
        contentPreview: content.slice(0, 100),
      }
    )

    return NextResponse.json({
      message: 'Comment created successfully',
      comment: {
        id: comment.id,
        content: comment.content,
        episodeId: comment.episodeId,
        user: comment.user,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Failed to create comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}
