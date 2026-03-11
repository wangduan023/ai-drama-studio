/**
 * 邀请处理 API
 * GET - 验证邀请信息
 * POST - 接受邀请
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { logProjectActivity } from '@/lib/collaboration/permissions'

// 验证邀请信息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 400 }
      )
    }

    const invite = await prisma.projectInvite.findUnique({
      where: { token },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            userId: true,
          },
        },
      },
    })

    if (!invite) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // 检查是否已使用
    if (invite.usedAt) {
      return NextResponse.json(
        { error: 'Invitation has already been used' },
        { status: 400 }
      )
    }

    // 检查是否过期
    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // 获取邀请人信息
    const inviter = await prisma.user.findUnique({
      where: { id: invite.invitedBy },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    return NextResponse.json({
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        project: invite.project,
        inviter: inviter || null,
        expiresAt: invite.expiresAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Failed to verify invitation:', error)
    return NextResponse.json(
      { error: 'Failed to verify invitation' },
      { status: 500 }
    )
  }
}

// 接受邀请
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const { user } = await verifyAuth(request)
    const userId = user?.id

    if (!token) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 400 }
      )
    }

    const invite = await prisma.projectInvite.findUnique({
      where: { token },
      include: {
        project: true,
      },
    })

    if (!invite) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // 检查是否已使用
    if (invite.usedAt) {
      return NextResponse.json(
        { error: 'Invitation has already been used' },
        { status: 400 }
      )
    }

    // 检查是否过期
    if (invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // 如果已登录，检查邮箱是否匹配
    if (userId) {
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
      })

      if (currentUser?.email.toLowerCase() !== invite.email.toLowerCase()) {
        return NextResponse.json(
          {
            error: 'Email mismatch',
            message: 'This invitation was sent to a different email address',
          },
          { status: 403 }
        )
      }

      // 检查是否已经是成员
      const existingMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: invite.projectId,
            userId,
          },
        },
      })

      if (existingMember) {
        return NextResponse.json(
          { error: 'You are already a member of this project' },
          { status: 400 }
        )
      }

      // 不能邀请自己（如果是项目所有者）
      if (invite.project.userId === userId) {
        return NextResponse.json(
          { error: 'You are the project owner' },
          { status: 400 }
        )
      }

      // 添加为成员
      const member = await prisma.projectMember.create({
        data: {
          projectId: invite.projectId,
          userId,
          role: invite.role,
          invitedBy: invite.invitedBy,
        },
      })

      // 标记邀请为已使用
      await prisma.projectInvite.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      })

      // 记录活动
      await logProjectActivity(
        invite.projectId,
        userId,
        'member.joined',
        'member',
        member.id,
        {
          inviteId: invite.id,
          role: invite.role,
        }
      )

      return NextResponse.json({
        message: 'Successfully joined the project',
        member: {
          id: member.id,
          projectId: member.projectId,
          role: member.role,
          joinedAt: member.joinedAt.toISOString(),
        },
      })
    }

    // 未登录，返回需要注册/登录的信息
    return NextResponse.json({
      requireAuth: true,
      email: invite.email,
      message: 'Please login or register to accept this invitation',
    })
  } catch (error) {
    console.error('Failed to accept invitation:', error)
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}
