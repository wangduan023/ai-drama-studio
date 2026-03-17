import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { ProjectStatus } from '@prisma/client'

// 获取项目详情
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

    const project = await prisma.project.findFirst({
      where: { id: projectId,
        deletedAt: null,
        OR: [
          { userId }, // 所有者
          { members: { some: { userId } } } // 成员
        ]
      },
      include: {
        _count: {
          select: {
            episodes: {
              where: { deletedAt: null },
            },
            characterProfiles: {
              where: { deletedAt: null },
            },
            locationProfiles: {
              where: { deletedAt: null },
            },
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      episodeCount: project._count.episodes,
      characterCount: project._count.characterProfiles,
      locationCount: project._count.locationProfiles,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

// 更新项目
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const { name, description, status } = body

    const { user } = await verifyAuth(request)
    const userId = user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 检查项目访问权限和角色（需要 EDITOR 或 OWNER 权限）
    const projectAccess = await prisma.project.findFirst({
      where: { id: projectId,
        deletedAt: null,
        OR: [
          { userId }, // 所有者有完全权限
          { members: { some: { userId, role: { in: ['EDITOR', 'OWNER'] } } } }
        ]
      }
    })

    if (!projectAccess) {
      return NextResponse.json(
        { error: 'Project not found or insufficient permissions' },
        { status: 403 }
      )
    }

    // 验证状态值
    if (status && !Object.values(ProjectStatus).includes(status as ProjectStatus)) {
      return NextResponse.json(
        { error: 'Invalid project status' },
        { status: 400 }
      )
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status: status as ProjectStatus }),
      },
      include: {
        _count: {
          select: {
            episodes: {
              where: { deletedAt: null },
            },
            characterProfiles: {
              where: { deletedAt: null },
            },
            locationProfiles: {
              where: { deletedAt: null },
            },
          },
        },
      },
    })

    return NextResponse.json({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      episodeCount: project._count.episodes,
      characterCount: project._count.characterProfiles,
      locationCount: project._count.locationProfiles,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Failed to update project:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

// 软删除项目
export async function DELETE(
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

    // 检查项目访问权限和角色（需要 EDITOR 或 OWNER 权限）
    const projectAccess = await prisma.project.findFirst({
      where: { id: projectId,
        deletedAt: null,
        OR: [
          { userId }, // 所有者有完全权限
          { members: { some: { userId, role: { in: ['EDITOR', 'OWNER'] } } } }
        ]
      }
    })

    if (!projectAccess) {
      return NextResponse.json(
        { error: 'Project not found or insufficient permissions' },
        { status: 403 }
      )
    }

    // 软删除：更新 deletedAt 字段
    await prisma.project.update({
      where: { id: projectId },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    })

    return NextResponse.json(
      { message: 'Project deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to delete project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
