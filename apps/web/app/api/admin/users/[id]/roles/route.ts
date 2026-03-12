/**
 * Admin User Roles API
 * 用户角色分配接口
 * 
 * GET /api/admin/users/[id]/roles - 获取用户角色
 * POST /api/admin/users/[id]/roles - 分配角色
 * DELETE /api/admin/users/[id]/roles - 移除角色
 */

import { NextRequest, NextResponse } from 'next/server'
import { RoleRepository, prisma } from '@ai-drama-studio/db'
import { requirePermission } from '@/lib/rbac'

const roleRepo = new RoleRepository(prisma)

// GET - 获取用户角色
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'role', 'read')
  if (!auth.success) return auth.response

  try {
    const { id: userId } = await params
    const roles = await roleRepo.getUserRoles(userId)
    return NextResponse.json(roles)
  } catch (error: any) {
    console.error('Failed to fetch user roles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user roles' },
      { status: 500 }
    )
  }
}

// POST - 分配角色
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'role', 'update')
  if (!auth.success) return auth.response

  try {
    const { id: userId } = await params
    const body = await request.json()
    const { roleId } = body

    if (!roleId) {
      return NextResponse.json(
        { error: 'Missing roleId' },
        { status: 400 }
      )
    }

    await roleRepo.assignToUser(userId, roleId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to assign role:', error)
    return NextResponse.json(
      { error: 'Failed to assign role' },
      { status: 500 }
    )
  }
}

// DELETE - 移除角色
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'role', 'update')
  if (!auth.success) return auth.response

  try {
    const { id: userId } = await params
    const body = await request.json()
    const { roleId } = body

    if (!roleId) {
      return NextResponse.json(
        { error: 'Missing roleId' },
        { status: 400 }
      )
    }

    await roleRepo.removeFromUser(userId, roleId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to remove role:', error)
    return NextResponse.json(
      { error: 'Failed to remove role' },
      { status: 500 }
    )
  }
}
