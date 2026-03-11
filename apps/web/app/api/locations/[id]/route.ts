import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { LocationType } from '@prisma/client'

// 获取场景详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user } = await verifyAuth(request)
    const userId = user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const location = await prisma.locationProfile.findFirst({
      where: {
        id,
        deletedAt: null,
        project: {
          userId,
          deletedAt: null,
        },
      },
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: location.id,
      projectId: location.projectId,
      name: location.name,
      description: location.description,
      eraPeriod: location.eraPeriod,
      locationType: location.locationType,
      moodColor: location.moodColor,
      keyElements: location.keyElements ? JSON.parse(location.keyElements) : [],
      locationConfirmed: location.locationConfirmed,
      createdAt: location.createdAt.toISOString(),
      updatedAt: location.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch location:', error)
    return NextResponse.json(
      { error: 'Failed to fetch location' },
      { status: 500 }
    )
  }
}

// 更新场景
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      name,
      description,
      eraPeriod,
      locationType,
      moodColor,
      keyElements,
      locationConfirmed,
    } = body

    const { user } = await verifyAuth(request)
    const userId = user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 检查场景是否存在且属于当前用户
    const existingLocation = await prisma.locationProfile.findFirst({
      where: {
        id,
        deletedAt: null,
        project: {
          userId,
          deletedAt: null,
        },
      },
    })

    if (!existingLocation) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // 验证场景类型
    if (locationType && !Object.values(LocationType).includes(locationType as LocationType)) {
      return NextResponse.json(
        { error: 'Invalid location type' },
        { status: 400 }
      )
    }

    const location = await prisma.locationProfile.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(eraPeriod !== undefined && { eraPeriod }),
        ...(locationType !== undefined && { locationType: locationType as LocationType || null }),
        ...(moodColor !== undefined && { moodColor }),
        ...(keyElements !== undefined && { keyElements: keyElements ? JSON.stringify(keyElements) : null }),
        ...(locationConfirmed !== undefined && { locationConfirmed }),
      },
    })

    return NextResponse.json({
      id: location.id,
      projectId: location.projectId,
      name: location.name,
      description: location.description,
      eraPeriod: location.eraPeriod,
      locationType: location.locationType,
      moodColor: location.moodColor,
      keyElements: keyElements || [],
      locationConfirmed: location.locationConfirmed,
      createdAt: location.createdAt.toISOString(),
      updatedAt: location.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Failed to update location:', error)
    
    // 处理唯一约束冲突
    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
      return NextResponse.json(
        { error: 'Location with this name already exists in the project' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update location' },
      { status: 500 }
    )
  }
}

// 软删除场景
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { user } = await verifyAuth(request)
    const userId = user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 检查场景是否存在且属于当前用户
    const existingLocation = await prisma.locationProfile.findFirst({
      where: {
        id,
        deletedAt: null,
        project: {
          userId,
          deletedAt: null,
        },
      },
    })

    if (!existingLocation) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // 软删除：更新 deletedAt 字段
    await prisma.locationProfile.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    })

    return NextResponse.json(
      { message: 'Location deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to delete location:', error)
    return NextResponse.json(
      { error: 'Failed to delete location' },
      { status: 500 }
    )
  }
}
