/**
 * 项目成员详情 API
 * PUT - 修改成员角色
 * DELETE - 移除成员
 * 权限: OWNER
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import {
  canManageMembers,
  logProjectActivity,
} from '@/lib/collaboration/permissions'
import { ProjectRole } from '@prisma/client'

// 修改成员角色
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: projectId, userId: targetUserId } = await params
    const body = await request.json()
    const { role } = body

    const { user } = await verifyAuth(request)
    const currentUserId = user?.id

    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 检查管理权限
    const canManage = await canManageMembers(currentUserId, projectId)
    if (!canManage) {
      return NextResponse.json(
        { error: 'Only project owner can modify member roles' },
        { status: 403 }
      )
    }

    // 验证角色
    if (!role || !Object.values(ProjectRole).includes(role as ProjectRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // 不能修改为 OWNER
    if (role === ProjectRole.OWNER) {
      return NextResponse.json(
        { error: 'Cannot change role to owner' },
        { status: 400 }
      )
    }

    // 检查项目是否存在
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        deletedAt: null,
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // 不能修改项目所有者
    if (targetUserId === project.userId) {
      return NextResponse.json(
        { error: 'Cannot modify project owner role' },
        { status: 400 }
      )
    }

    // 查找成员
    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    })

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // 更新角色
    const updatedMember = await prisma.projectMember.update({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
      data: {
        role: role as ProjectRole,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
    })

    // 记录活动
    await logProjectActivity(
      projectId,
      currentUserId,
      'member.role_changed',
      'member',
      updatedMember.id,
      {
        targetUserId,
        oldRole: member.role,
        newRole: role,
      }
    )

    return NextResponse.json({
      message: 'Member role updated successfully',
      member: {
        id: updatedMember.id,
        userId: updatedMember.userId,
        role: updatedMember.role,
        invitedBy: updatedMember.invitedBy,
        joinedAt: updatedMember.joinedAt.toISOString(),
        updatedAt: updatedMember.updatedAt.toISOString(),
        user: updatedMember.user,
      },
    })
  } catch (error) {
    console.error('Failed to update member role:', error)
    return NextResponse.json(
      { error: 'Failed to update member role' },
      { status: 500 }
    )
  }
}

// 移除成员
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: projectId, userId: targetUserId } = await params

    const { user } = await verifyAuth(request)
    const currentUserId = user?.id

    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 检查管理权限
    const canManage = await canManageMembers(currentUserId, projectId)
    if (!canManage) {
      return NextResponse.json(
        { error: 'Only project owner can remove members' },
        { status: 403 }
      )
    }

    // 检查项目是否存在
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        deletedAt: null,
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // 不能移除项目所有者
    if (targetUserId === project.userId) {
      return NextResponse.json(
        { error: 'Cannot remove project owner' },
        { status: 400 }
      )
    }

    // 查找成员
    const member = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    })

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // 删除成员
    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    })

    // 记录活动
    await logProjectActivity(
      projectId,
      currentUserId,
      'member.removed',
      'member',
      member.id,
      {
        removedUserId: targetUserId,
        removedUserEmail: member.user?.email || 'unknown',
        role: member.role,
      }
    )

    return NextResponse.json({
      message: 'Member removed successfully',
    })
  } catch (error) {
    console.error('Failed to remove member:', error)
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    )
  }
}
