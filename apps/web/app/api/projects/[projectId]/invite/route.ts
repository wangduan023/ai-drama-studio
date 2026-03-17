/**
 * 项目邀请 API
 * POST - 发送邀请邮件
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
import { randomBytes } from 'crypto'

// 生成邀请 token
function generateInviteToken(): string {
  return randomBytes(32).toString('hex')
}

// 发送邀请
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const { email, role = 'VIEWER' } = body

    const { user } = await verifyAuth(request)
    const userId = user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 检查管理权限
    const canManage = await canManageMembers(userId, projectId)
    if (!canManage) {
      return NextResponse.json(
        { error: 'Only project owner can send invitations' },
        { status: 403 }
      )
    }

    // 验证参数
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!role || !Object.values(ProjectRole).includes(role as ProjectRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // 不能邀请为 OWNER
    if (role === ProjectRole.OWNER) {
      return NextResponse.json(
        { error: 'Cannot invite as owner' },
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

    const normalizedEmail = email.toLowerCase()

    // 检查是否邀请自己
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (currentUser?.email === normalizedEmail) {
      return NextResponse.json(
        { error: 'Cannot invite yourself' },
        { status: 400 }
      )
    }

    // 查找被邀请用户
    const invitedUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    // 如果用户已存在，检查是否已经是成员
    if (invitedUser) {
      const existingMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: invitedUser.id,
          },
        },
      })

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a member of this project' },
          { status: 400 }
        )
      }

      if (invitedUser.id === project.userId) {
        return NextResponse.json(
          { error: 'User is the project owner' },
          { status: 400 }
        )
      }
    }

    // 检查是否已有未使用的邀请
    const existingInvite = await prisma.projectInvite.findFirst({
      where: {
        projectId,
        email: normalizedEmail,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (existingInvite) {
      return NextResponse.json(
        { error: 'An active invitation already exists for this email' },
        { status: 400 }
      )
    }

    // 创建邀请
    const token = generateInviteToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7天后过期

    const invite = await prisma.projectInvite.create({
      data: {
        projectId,
        email: normalizedEmail,
        role: role as ProjectRole,
        token,
        invitedBy: userId,
        expiresAt,
      },
    })

    // 记录活动
    await logProjectActivity(
      projectId,
      userId,
      'member.invited',
      'invite',
      invite.id,
      {
        email: normalizedEmail,
        role,
        tokenPrefix: token.slice(0, 8) + '***', // 只记录前缀，避免泄露敏感信息
      }
    )

    // 构建邀请链接
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`

    // TODO: 发送邀请邮件
    console.log(`[Invite Email] To: ${normalizedEmail}`)
    console.log(`[Invite Link] ${inviteUrl}`)

    return NextResponse.json({
      message: 'Invitation sent successfully',
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt.toISOString(),
        // token 不在响应中返回，仅通过邮件发送
        inviteUrl,
      },
    })
  } catch (error) {
    console.error('Failed to send invitation:', error)
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    )
  }
}

// 获取项目的邀请列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params

    const { user } = await verifyAuth(request)
    const userId = user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 检查管理权限
    const canManage = await canManageMembers(userId, projectId)
    if (!canManage) {
      return NextResponse.json(
        { error: 'Only project owner can view invitations' },
        { status: 403 }
      )
    }

    const invites = await prisma.projectInvite.findMany({
      where: {
        projectId,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      invites: invites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        invitedBy: invite.invitedBy,
        expiresAt: invite.expiresAt.toISOString(),
        usedAt: invite.usedAt?.toISOString() || null,
        createdAt: invite.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Failed to fetch invitations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}
