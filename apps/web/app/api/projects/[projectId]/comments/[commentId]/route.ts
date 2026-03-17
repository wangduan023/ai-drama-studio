/**
 * 评论详情 API
 * PUT - 编辑评论（只能编辑自己的）
 * DELETE - 删除评论
 * 权限: 评论作者或项目所有者
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import {
  canManageMembers,
  canViewProject,
  logProjectActivity,
} from '@/lib/collaboration/permissions'

// 编辑评论
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id: projectId, commentId } = await params
    const body = await request.json()
    const { content } = body

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

    // 查找评论
    const comment = await prisma.projectComment.findFirst({
      where: {
        id: commentId,
        projectId,
      },
    })

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    // 检查权限（只能编辑自己的评论）
    const isOwner = comment.userId === userId
    const canManage = await canManageMembers(userId, projectId)

    if (!isOwner && !canManage) {
      return NextResponse.json(
        { error: 'You can only edit your own comments' },
        { status: 403 }
      )
    }

    // 更新评论
    const updatedComment = await prisma.projectComment.update({
      where: { id: commentId },
      data: {
        content: content.trim(),
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
      'comment.updated',
      'comment',
      commentId,
      {
        contentPreview: content.slice(0, 100),
      }
    )

    return NextResponse.json({
      message: 'Comment updated successfully',
      comment: {
        id: updatedComment.id,
        content: updatedComment.content,
        episodeId: updatedComment.episodeId,
        user: updatedComment.user,
        createdAt: updatedComment.createdAt.toISOString(),
        updatedAt: updatedComment.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Failed to update comment:', error)
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    )
  }
}

// 删除评论
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id: projectId, commentId } = await params

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

    // 查找评论
    const comment = await prisma.projectComment.findFirst({
      where: {
        id: commentId,
        projectId,
      },
    })

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      )
    }

    // 检查权限（可以删除自己的评论，所有者可以删除任何评论）
    const isOwner = comment.userId === userId
    const canManage = await canManageMembers(userId, projectId)

    if (!isOwner && !canManage) {
      return NextResponse.json(
        { error: 'You can only delete your own comments' },
        { status: 403 }
      )
    }

    // 删除评论（级联删除回复）
    await prisma.projectComment.delete({
      where: { id: commentId },
    })

    // 记录活动
    await logProjectActivity(
      projectId,
      userId,
      'comment.deleted',
      'comment',
      commentId,
      {
        wasOwner: isOwner,
        deletedBy: userId,
      }
    )

    return NextResponse.json({
      message: 'Comment deleted successfully',
    })
  } catch (error) {
    console.error('Failed to delete comment:', error)
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    )
  }
}
