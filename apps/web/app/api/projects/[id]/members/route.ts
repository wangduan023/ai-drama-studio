/**
 * 项目成员管理 API
 * GET - 获取项目成员列表
 * POST - 添加成员（通过邀请）
 * 权限: EDITOR 及以上可以查看，OWNER 可以添加成员
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import {
  canEditProject,
  canManageMembers,
  getProjectMembers,
  logProjectActivity,
} from '@/lib/collaboration/permissions'
import { ProjectRole } from '@prisma/client'
import { randomBytes } from 'crypto'

// 生成邀请 token
function generateInviteToken(): string {
  return randomBytes(32).toString('hex')
}

// 获取项目成员列表
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
    const { user } = await verifyAuth(request)
    const userId = user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 检查查看权限
    const canView = await canEditProject(userId, projectId)
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const members = await getProjectMembers(projectId)

    return NextResponse.json({
      members: members.map((member) => ({
        id: member.id,
        userId: member.userId,
        role: member.role,
        invitedBy: member.invitedBy,
        joinedAt: member.joinedAt.toISOString(),
        updatedAt: member.updatedAt.toISOString(),
        user: member.user,
      })),
    })
  } catch (error) {
    console.error('Failed to fetch project members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project members' },
      { status: 500 }
    )
  }
}

// 邀请新成员
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params
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
        { error: 'Only project owner can invite members' },
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

    // 查找被邀请用户
    const invitedUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
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

      // 直接添加为成员
      const member = await prisma.projectMember.create({
        data: {
          projectId,
          userId: invitedUser.id,
          role: role as ProjectRole,
          invitedBy: userId,
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
        userId,
        'member.added',
        'member',
        member.id,
        {
          addedUserId: invitedUser.id,
          addedUserEmail: email,
          role,
        }
      )

      return NextResponse.json({
        message: 'Member added successfully',
        member: {
          id: member.id,
          userId: member.userId,
          role: member.role,
          invitedBy: member.invitedBy,
          joinedAt: member.joinedAt.toISOString(),
          updatedAt: member.updatedAt.toISOString(),
          user: member.user,
        },
      })
    }

    // 用户不存在，创建邀请
    // 检查是否已有未使用的邀请
    const existingInvite = await prisma.projectInvite.findFirst({
      where: {
        projectId,
        email: email.toLowerCase(),
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
        email: email.toLowerCase(),
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
        email,
        role,
        token,
      }
    )

    // TODO: 发送邀请邮件
    console.log(`[Invite] Project: ${projectId}, Email: ${email}, Token: ${token}`)

    return NextResponse.json({
      message: 'Invitation sent successfully',
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt.toISOString(),
        token: invite.token,
      },
    })
  } catch (error) {
    console.error('Failed to invite member:', error)
    return NextResponse.json(
      { error: 'Failed to invite member' },
      { status: 500 }
    )
  }
}
