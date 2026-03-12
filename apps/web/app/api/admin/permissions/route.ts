/**
 * Admin Permissions API
 * 权限管理接口
 * 
 * 权限要求: permission:read (GET), permission:create (POST)
 */

import { NextRequest, NextResponse } from 'next/server'
import { PermissionRepository, prisma } from '@ai-drama-studio/db'
import { requirePermission } from '@/lib/rbac'

const permRepo = new PermissionRepository(prisma)

// GET /api/admin/permissions - 获取权限列表
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'permission', 'read')
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const resource = searchParams.get('resource') || undefined
    const grouped = searchParams.get('grouped') === 'true'

    if (grouped) {
      const groupedPermissions = await permRepo.findGroupedByResource()
      return NextResponse.json(groupedPermissions)
    }

    const permissions = await permRepo.findAll({ resource })
    return NextResponse.json(permissions)
  } catch (error: any) {
    console.error('Failed to fetch permissions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    )
  }
}

// POST /api/admin/permissions - 创建权限
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'permission', 'create')
  if (!auth.success) return auth.response

  try {
    const body = await request.json()

    if (!body.resource || !body.action) {
      return NextResponse.json(
        { error: 'Missing required fields: resource, action' },
        { status: 400 }
      )
    }

    const permission = await permRepo.create({
      resource: body.resource,
      action: body.action,
      description: body.description,
    })

    return NextResponse.json(permission, { status: 201 })
  } catch (error: any) {
    console.error('Failed to create permission:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Permission already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create permission' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/permissions - 批量删除权限
export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'permission', 'delete')
  if (!auth.success) return auth.response

  try {
    const body = await request.json()
    const { ids } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Missing permission ids' },
        { status: 400 }
      )
    }

    // 检查权限是否被使用
    for (const id of ids) {
      const inUse = await permRepo.isInUse(id)
      if (inUse) {
        return NextResponse.json(
          { error: `Permission ${id} is in use by roles` },
          { status: 409 }
        )
      }
    }

    // 删除权限
    for (const id of ids) {
      await permRepo.delete(id)
    }

    return NextResponse.json({ success: true, deleted: ids.length })
  } catch (error: any) {
    console.error('Failed to delete permissions:', error)
    return NextResponse.json(
      { error: 'Failed to delete permissions' },
      { status: 500 }
    )
  }
}
