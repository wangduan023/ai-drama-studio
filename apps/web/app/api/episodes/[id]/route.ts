import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// 获取剧集详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // TODO: 从 session 中获取当前用户 ID
    const userId = 'b29b8e81-d968-4563-9998-fc221137e842'

    const episode = await prisma.episode.findFirst({
      where: {
        id,
        deletedAt: null,
        project: {
          userId,
          deletedAt: null,
        },
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
            id: true,
            content: true,
            characters: true,
            scenes: true,
            status: true,
            createdAt: true,
          },
        },
        clips: {
          orderBy: {
            sequence: 'asc',
          },
          select: {
            id: true,
            sequence: true,
            description: true,
            duration: true,
            status: true,
          },
        },
      },
    })

    if (!episode) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: episode.id,
      projectId: episode.projectId,
      number: episode.number,
      name: episode.name,
      novelText: episode.novelText,
      script: episode.script ? {
        id: episode.script.id,
        content: episode.script.content,
        characters: episode.script.characters,
        scenes: episode.script.scenes,
        status: episode.script.status,
        createdAt: episode.script.createdAt.toISOString(),
      } : null,
      scriptStatus: episode.script?.status || 'PENDING',
      storyboardCount: episode._count.storyboards,
      clipCount: episode._count.clips,
      clips: episode.clips.map(clip => ({
        id: clip.id,
        sequence: clip.sequence,
        description: clip.description,
        duration: clip.duration,
        status: clip.status,
      })),
      characterAppearanceMap: episode.characterAppearanceMap,
      createdAt: episode.createdAt.toISOString(),
      updatedAt: episode.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch episode:', error)
    return NextResponse.json(
      { error: 'Failed to fetch episode' },
      { status: 500 }
    )
  }
}

// 更新剧集
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      name,
      novelText,
      number,
      characterAppearanceMap,
    } = body

    // TODO: 从 session 中获取当前用户 ID
    const userId = 'b29b8e81-d968-4563-9998-fc221137e842'

    // 检查剧集是否存在且属于当前用户
    const existingEpisode = await prisma.episode.findFirst({
      where: {
        id,
        deletedAt: null,
        project: {
          userId,
          deletedAt: null,
        },
      },
    })

    if (!existingEpisode) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      )
    }

    // 如果更改了集数，检查是否与其他剧集冲突
    if (number !== undefined && number !== existingEpisode.number) {
      const conflictingEpisode = await prisma.episode.findFirst({
        where: {
          projectId: existingEpisode.projectId,
          number,
          deletedAt: null,
          id: { not: id },
        },
      })

      if (conflictingEpisode) {
        return NextResponse.json(
          { error: `Episode number ${number} already exists in this project` },
          { status: 409 }
        )
      }
    }

    const episode = await prisma.episode.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(novelText !== undefined && { novelText }),
        ...(number !== undefined && { number }),
        ...(characterAppearanceMap !== undefined && { characterAppearanceMap }),
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
      storyboardCount: episode._count.storyboards,
      clipCount: episode._count.clips,
      characterAppearanceMap: episode.characterAppearanceMap,
      createdAt: episode.createdAt.toISOString(),
      updatedAt: episode.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Failed to update episode:', error)
    
    // 处理唯一约束冲突
    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
      return NextResponse.json(
        { error: 'Episode with this number already exists in the project' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update episode' },
      { status: 500 }
    )
  }
}

// 软删除剧集
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // TODO: 从 session 中获取当前用户 ID
    const userId = 'b29b8e81-d968-4563-9998-fc221137e842'

    // 检查剧集是否存在且属于当前用户
    const existingEpisode = await prisma.episode.findFirst({
      where: {
        id,
        deletedAt: null,
        project: {
          userId,
          deletedAt: null,
        },
      },
    })

    if (!existingEpisode) {
      return NextResponse.json(
        { error: 'Episode not found' },
        { status: 404 }
      )
    }

    // 软删除：更新 deletedAt 字段
    await prisma.episode.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    })

    return NextResponse.json(
      { message: 'Episode deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to delete episode:', error)
    return NextResponse.json(
      { error: 'Failed to delete episode' },
      { status: 500 }
    )
  }
}
