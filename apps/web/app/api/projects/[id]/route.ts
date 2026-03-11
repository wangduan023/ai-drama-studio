import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ProjectStatus } from '@prisma/client'

// 获取项目详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // TODO: 从 session 中获取当前用户 ID
    const userId = 'b29b8e81-d968-4563-9998-fc221137e842'

    const project = await prisma.project.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
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
        { error: 'Project not found' },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, status } = body

    // TODO: 从 session 中获取当前用户 ID
    const userId = 'b29b8e81-d968-4563-9998-fc221137e842'

    // 检查项目是否存在且属于当前用户
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
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
      where: { id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // TODO: 从 session 中获取当前用户 ID
    const userId = 'b29b8e81-d968-4563-9998-fc221137e842'

    // 检查项目是否存在且属于当前用户
    const existingProject = await prisma.project.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // 软删除：更新 deletedAt 字段
    await prisma.project.update({
      where: { id },
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
