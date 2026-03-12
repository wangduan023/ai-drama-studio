/**
 * RBAC Check API
 * 检查当前用户是否拥有指定权限
 * 
 * POST /api/rbac/check
 * Body: { resource: string, action: string, projectId?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/middleware'
import { RoleRepository, prisma } from '@ai-drama-studio/db'

const roleRepo = new RoleRepository(prisma)

export async function POST(request: NextRequest) {
  const authResult = await verifyAuth(request)
  if (!authResult.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { resource, action, projectId } = body

    if (!resource || !action) {
      return NextResponse.json(
        { error: 'Missing resource or action' },
        { status: 400 }
      )
    }

    const hasPermission = await roleRepo.checkUserPermission(
      authResult.user.id,
      resource,
      action,
      projectId
    )

    return NextResponse.json({
      resource,
      action,
      projectId,
      permitted: hasPermission,
    })
  } catch (error: any) {
    console.error('Failed to check permission:', error)
    return NextResponse.json(
      { error: 'Failed to check permission' },
      { status: 500 }
    )
  }
}
