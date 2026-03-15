/**
 * Admin Users Management API
 * 用户管理接口
 *
 * 权限要求：user:read (GET), user:delete (DELETE)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@ai-drama-studio/db'
import { requirePermission } from '@/lib/rbac'

// GET /api/admin/users - 获取用户列表
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'user', 'read')
  if (!auth.success) return auth.response

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        isActive: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // 为每个用户获取系统角色
    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        const userRoles = await prisma.userSystemRole.findMany({
          where: { userId: user.id },
          include: {
            role: {
              select: {
                id: true,
                name: true,
                label: true,
              },
            },
          },
        })
        return {
          ...user,
          roles: userRoles.map(ur => ur.role),
        }
      })
    )

    return NextResponse.json(usersWithRoles)
  } catch (error: any) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/users/[id] - 删除用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'user', 'delete')
  if (!auth.success) return auth.response

  try {
    const { id } = await params

    // 不能删除自己
    const currentUser = auth.user
    if (currentUser?.id === id) {
      return NextResponse.json(
        { error: 'Cannot delete yourself' },
        { status: 400 }
      )
    }

    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 删除用户（级联删除相关记录）
    await prisma.user.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to delete user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
