/**
 * 获取当前用户在项目中的角色
 * GET - 返回当前用户的角色信息
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { getProjectRole } from '@/lib/collaboration/permissions'

// GET - 获取当前用户在项目中的角色
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await verifyAuth(request)
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params

    // 检查项目是否存在
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        deletedAt: null,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // 获取用户在项目中的角色
    const role = await getProjectRole(user.id, projectId)

    if (!role) {
      return NextResponse.json(
        { error: 'Not a member of this project' },
        { status: 403 }
      )
    }

    return NextResponse.json({ role })
  } catch (error) {
    console.error('Failed to fetch user role:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user role' },
      { status: 500 }
    )
  }
}
