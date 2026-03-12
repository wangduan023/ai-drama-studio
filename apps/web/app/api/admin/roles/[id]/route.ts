/**
 * Admin Role Detail API
 * 单个角色管理接口
 */

import { NextRequest, NextResponse } from 'next/server'
import { RoleRepository, prisma } from '@ai-drama-studio/db'
import { requirePermission } from '@/lib/rbac'

const roleRepo = new RoleRepository(prisma)

// GET /api/admin/roles/[id] - 获取角色详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'role', 'read')
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const role = await roleRepo.findById(id)

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    return NextResponse.json(role)
  } catch (error: any) {
    console.error('Failed to fetch role:', error)
    return NextResponse.json(
      { error: 'Failed to fetch role' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/roles/[id] - 更新角色
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'role', 'update')
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const body = await request.json()

    const role = await roleRepo.update(id, {
      label: body.label,
      description: body.description,
      permissionIds: body.permissionIds,
    })

    return NextResponse.json(role)
  } catch (error: any) {
    console.error('Failed to update role:', error)

    if (error.message?.includes('不存在')) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Failed to update role' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/roles/[id] - 删除角色
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, 'role', 'delete')
  if (!auth.success) return auth.response

  try {
    const { id } = await params
    const role = await roleRepo.findById(id)

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    if (role.isSystem) {
      return NextResponse.json(
        { error: 'Cannot delete system role' },
        { status: 403 }
      )
    }

    await roleRepo.delete(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to delete role:', error)
    return NextResponse.json(
      { error: 'Failed to delete role' },
      { status: 500 }
    )
  }
}
