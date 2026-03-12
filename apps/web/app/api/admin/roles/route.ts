/**
 * Admin Roles Management API
 * 角色管理接口
 * 
 * 权限要求: role:read (GET), role:create (POST)
 */

import { NextRequest, NextResponse } from 'next/server'
import { RoleRepository, PermissionRepository, prisma } from '@ai-drama-studio/db'
import { requirePermission } from '@/lib/rbac'

const roleRepo = new RoleRepository(prisma)
const permRepo = new PermissionRepository(prisma)

// GET /api/admin/roles - 获取角色列表
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'role', 'read')
  if (!auth.success) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as 'SYSTEM' | 'PROJECT' | undefined

    const roles = await roleRepo.findAll({ type })
    return NextResponse.json(roles)
  } catch (error: any) {
    console.error('Failed to fetch roles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch roles' },
      { status: 500 }
    )
  }
}

// POST /api/admin/roles - 创建角色
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'role', 'create')
  if (!auth.success) return auth.response

  try {
    const body = await request.json()

    if (!body.name || !body.type || !body.label) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, label' },
        { status: 400 }
      )
    }

    const role = await roleRepo.create({
      name: body.name,
      type: body.type,
      label: body.label,
      description: body.description,
      permissionIds: body.permissionIds || [],
    })

    return NextResponse.json(role, { status: 201 })
  } catch (error: any) {
    console.error('Failed to create role:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Role name already exists' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create role' },
      { status: 500 }
    )
  }
}
