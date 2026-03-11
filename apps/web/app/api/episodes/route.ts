import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// 获取剧集列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const search = searchParams.get('search')

    // TODO: 从 session 中获取当前用户 ID
    const userId = 'b29b8e81-d968-4563-9998-fc221137e842'

    // 验证 projectId
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
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

    const episodes = await prisma.episode.findMany({
      where: {
        projectId,
        deletedAt: null,
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { novelText: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      include: {
        _count: {
          select: {
            storyboards: true,
            clips: true,
          },
        },
        script: {
          select: {
            status: true,
          },
        },
      },
      orderBy: {
        number: 'asc',
      },
    })

    // 格式化返回数据
    const formattedEpisodes = episodes.map((episode) => ({
      id: episode.id,
      projectId: episode.projectId,
      number: episode.number,
      name: episode.name,
      novelText: episode.novelText,
      scriptStatus: episode.script?.status || 'PENDING',
      storyboardCount: episode._count.storyboards,
      clipCount: episode._count.clips,
      characterAppearanceMap: episode.characterAppearanceMap,
      createdAt: episode.createdAt.toISOString(),
      updatedAt: episode.updatedAt.toISOString(),
    }))

    return NextResponse.json(formattedEpisodes)
  } catch (error) {
    console.error('Failed to fetch episodes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch episodes' },
      { status: 500 }
    )
  }
}

// 创建新剧集
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      projectId,
      name,
      novelText,
      number,
    } = body

    // 验证必填字段
    if (!projectId || !name) {
      return NextResponse.json(
        { error: 'Project ID and name are required' },
        { status: 400 }
      )
    }

    // TODO: 从 session 中获取当前用户 ID
    const userId = 'b29b8e81-d968-4563-9998-fc221137e842'

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

    // 如果没有指定集数，自动计算下一个集数
    let episodeNumber = number
    if (episodeNumber === undefined || episodeNumber === null) {
      const lastEpisode = await prisma.episode.findFirst({
        where: { projectId, deletedAt: null },
        orderBy: { number: 'desc' },
        select: { number: true },
      })
      episodeNumber = (lastEpisode?.number || 0) + 1
    } else {
      // 检查集数是否已存在
      const existingEpisode = await prisma.episode.findUnique({
        where: {
          projectId_number: {
            projectId,
            number: episodeNumber,
          },
        },
      })
      if (existingEpisode && existingEpisode.deletedAt === null) {
        return NextResponse.json(
          { error: `Episode number ${episodeNumber} already exists in this project` },
          { status: 409 }
        )
      }
    }

    const episode = await prisma.episode.create({
      data: {
        projectId,
        name,
        novelText,
        number: episodeNumber,
      },
      include: {
        _count: {
          select: {
            storyboards: true,
            clips: true,
          },
        },
        script: {
          select: {
            status: true,
          },
        },
      },
    })

    return NextResponse.json({
      id: episode.id,
      projectId: episode.projectId,
      number: episode.number,
      name: episode.name,
      novelText: episode.novelText,
      scriptStatus: episode.script?.status || 'PENDING',
      storyboardCount: 0,
      clipCount: 0,
      characterAppearanceMap: episode.characterAppearanceMap,
      createdAt: episode.createdAt.toISOString(),
      updatedAt: episode.updatedAt.toISOString(),
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create episode:', error)
    
    // 处理唯一约束冲突
    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
      return NextResponse.json(
        { error: 'Episode with this number already exists in the project' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create episode' },
      { status: 500 }
    )
  }
}
