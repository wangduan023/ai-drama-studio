/**
 * RBAC Permissions API
 * 获取当前用户权限
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/middleware'
import { RoleRepository, prisma } from '@ai-drama-studio/db'

const roleRepo = new RoleRepository(prisma)

export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request)
  if (!authResult.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = authResult.user.id
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  try {
    // 获取系统级权限
    const systemRoles = await roleRepo.getUserRoles(userId)
    const systemPermissions = systemRoles.flatMap(role =>
      role.permissions.map(rp => ({
        resource: rp.permission.resource,
        action: rp.permission.action,
      }))
    )

    // 获取项目级权限
    const projects: Record<string, Array<{ resource: string; action: string }>> = {}
    
    if (projectId) {
      const projectRoles = await roleRepo.getUserProjectRoles(userId, projectId)
      projects[projectId] = projectRoles.flatMap(role =>
        role.permissions.map(rp => ({
          resource: rp.permission.resource,
          action: rp.permission.action,
        }))
      )
    } else {
      const userProjects = await prisma.projectMemberRole.findMany({
        where: { userId },
        include: {
          role: {
            include: {
              permissions: { include: { permission: true } }
            }
          }
        }
      })

      for (const pm of userProjects) {
        if (!projects[pm.projectId]) {
          projects[pm.projectId] = []
        }
        projects[pm.projectId].push(
          ...pm.role.permissions.map(rp => ({
            resource: rp.permission.resource,
            action: rp.permission.action,
          }))
        )
      }
    }

    return NextResponse.json({ system: systemPermissions, projects })
  } catch (error: any) {
    console.error('Failed to get permissions:', error)
    return NextResponse.json(
      { error: 'Failed to get permissions' },
      { status: 500 }
    )
  }
}
