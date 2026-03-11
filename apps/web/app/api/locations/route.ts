import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'
import { LocationType } from '@prisma/client'

// 获取场景列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const search = searchParams.get('search')
    const locationType = searchParams.get('locationType')

    const { user } = await verifyAuth(request)
    const userId = user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 如果提供了 projectId，验证项目是否存在且属于当前用户
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId,
          deletedAt: null,
        },
      })

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        )
      }
    }

    const locations = await prisma.locationProfile.findMany({
      where: {
        ...(projectId ? { projectId } : {
          project: {
            userId,
            deletedAt: null,
          }
        }),
        deletedAt: null,
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
        ...(locationType ? { locationType: locationType as LocationType } : {}),
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    // 格式化返回数据
    const formattedLocations = locations.map((location) => ({
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
    }))

    return NextResponse.json(formattedLocations)
  } catch (error) {
    console.error('Failed to fetch locations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch locations' },
      { status: 500 }
    )
  }
}

// 创建新场景
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      projectId,
      name,
      description,
      eraPeriod,
      locationType,
      moodColor,
      keyElements,
    } = body

    // 验证必填字段
    if (!projectId || !name) {
      return NextResponse.json(
        { error: 'Project ID and name are required' },
        { status: 400 }
      )
    }

    const { user } = await verifyAuth(request)
    const userId = user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 验证项目是否存在且属于当前用户
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId,
        deletedAt: null,
      },
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
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

    const location = await prisma.locationProfile.create({
      data: {
        projectId,
        name,
        description,
        eraPeriod,
        locationType: locationType as LocationType || null,
        moodColor,
        keyElements: keyElements ? JSON.stringify(keyElements) : null,
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
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create location:', error)
    
    // 处理唯一约束冲突
    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
      return NextResponse.json(
        { error: 'Location with this name already exists in the project' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create location' },
      { status: 500 }
    )
  }
}
