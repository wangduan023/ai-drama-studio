import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CharacterRoleLevel } from '@prisma/client'

// 获取角色详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // TODO: 从 session 中获取当前用户 ID
    const userId = 'b29b8e81-d968-4563-9998-fc221137e842'

    const character = await prisma.characterProfile.findFirst({
      where: {
        id,
        deletedAt: null,
        project: {
          userId,
          deletedAt: null,
        },
      },
      include: {
        appearances: {
          orderBy: {
            appearanceIndex: 'asc',
          },
        },
        _count: {
          select: {
            appearances: true,
          },
        },
      },
    })

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: character.id,
      projectId: character.projectId,
      name: character.name,
      aliases: character.aliases ? JSON.parse(character.aliases) : [],
      introduction: character.introduction,
      gender: character.gender,
      ageRange: character.ageRange,
      roleLevel: character.roleLevel,
      archetype: character.archetype,
      personalityTags: character.personalityTags ? JSON.parse(character.personalityTags) : [],
      eraPeriod: character.eraPeriod,
      socialClass: character.socialClass,
      occupation: character.occupation,
      costumeTier: character.costumeTier,
      suggestedColors: character.suggestedColors ? JSON.parse(character.suggestedColors) : [],
      primaryIdentifier: character.primaryIdentifier,
      visualKeywords: character.visualKeywords ? JSON.parse(character.visualKeywords) : [],
      expectedAppearances: character.expectedAppearances,
      profileConfirmed: character.profileConfirmed,
      appearances: character.appearances.map(app => ({
        id: app.id,
        appearanceIndex: app.appearanceIndex,
        changeReason: app.changeReason,
        description: app.description,
        descriptions: app.descriptions ? JSON.parse(app.descriptions) : [],
        imageUrls: app.imageUrls ? JSON.parse(app.imageUrls) : [],
        previousImageUrls: app.previousImageUrls ? JSON.parse(app.previousImageUrls) : [],
        createdAt: app.createdAt.toISOString(),
        updatedAt: app.updatedAt.toISOString(),
      })),
      appearanceCount: character._count.appearances,
      createdAt: character.createdAt.toISOString(),
      updatedAt: character.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch character:', error)
    return NextResponse.json(
      { error: 'Failed to fetch character' },
      { status: 500 }
    )
  }
}

// 更新角色
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      name,
      aliases,
      introduction,
      gender,
      ageRange,
      roleLevel,
      archetype,
      personalityTags,
      eraPeriod,
      socialClass,
      occupation,
      costumeTier,
      suggestedColors,
      primaryIdentifier,
      visualKeywords,
      expectedAppearances,
      profileConfirmed,
    } = body

    // TODO: 从 session 中获取当前用户 ID
    const userId = 'b29b8e81-d968-4563-9998-fc221137e842'

    // 检查角色是否存在且属于当前用户
    const existingCharacter = await prisma.characterProfile.findFirst({
      where: {
        id,
        deletedAt: null,
        project: {
          userId,
          deletedAt: null,
        },
      },
    })

    if (!existingCharacter) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    // 验证角色级别
    if (roleLevel && !Object.values(CharacterRoleLevel).includes(roleLevel as CharacterRoleLevel)) {
      return NextResponse.json(
        { error: 'Invalid role level' },
        { status: 400 }
      )
    }

    const character = await prisma.characterProfile.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(aliases !== undefined && { aliases: aliases ? JSON.stringify(aliases) : null }),
        ...(introduction !== undefined && { introduction }),
        ...(gender !== undefined && { gender }),
        ...(ageRange !== undefined && { ageRange }),
        ...(roleLevel !== undefined && { roleLevel: roleLevel as CharacterRoleLevel || null }),
        ...(archetype !== undefined && { archetype }),
        ...(personalityTags !== undefined && { personalityTags: personalityTags ? JSON.stringify(personalityTags) : null }),
        ...(eraPeriod !== undefined && { eraPeriod }),
        ...(socialClass !== undefined && { socialClass }),
        ...(occupation !== undefined && { occupation }),
        ...(costumeTier !== undefined && { costumeTier }),
        ...(suggestedColors !== undefined && { suggestedColors: suggestedColors ? JSON.stringify(suggestedColors) : null }),
        ...(primaryIdentifier !== undefined && { primaryIdentifier }),
        ...(visualKeywords !== undefined && { visualKeywords: visualKeywords ? JSON.stringify(visualKeywords) : null }),
        ...(expectedAppearances !== undefined && { expectedAppearances }),
        ...(profileConfirmed !== undefined && { profileConfirmed }),
      },
      include: {
        appearances: {
          orderBy: {
            appearanceIndex: 'asc',
          },
        },
        _count: {
          select: {
            appearances: true,
          },
        },
      },
    })

    return NextResponse.json({
      id: character.id,
      projectId: character.projectId,
      name: character.name,
      aliases: character.aliases ? JSON.parse(character.aliases) : [],
      introduction: character.introduction,
      gender: character.gender,
      ageRange: character.ageRange,
      roleLevel: character.roleLevel,
      archetype: character.archetype,
      personalityTags: character.personalityTags ? JSON.parse(character.personalityTags) : [],
      eraPeriod: character.eraPeriod,
      socialClass: character.socialClass,
      occupation: character.occupation,
      costumeTier: character.costumeTier,
      suggestedColors: character.suggestedColors ? JSON.parse(character.suggestedColors) : [],
      primaryIdentifier: character.primaryIdentifier,
      visualKeywords: character.visualKeywords ? JSON.parse(character.visualKeywords) : [],
      expectedAppearances: character.expectedAppearances,
      profileConfirmed: character.profileConfirmed,
      appearances: character.appearances.map(app => ({
        id: app.id,
        appearanceIndex: app.appearanceIndex,
        changeReason: app.changeReason,
        description: app.description,
        descriptions: app.descriptions ? JSON.parse(app.descriptions) : [],
        imageUrls: app.imageUrls ? JSON.parse(app.imageUrls) : [],
        previousImageUrls: app.previousImageUrls ? JSON.parse(app.previousImageUrls) : [],
        createdAt: app.createdAt.toISOString(),
        updatedAt: app.updatedAt.toISOString(),
      })),
      appearanceCount: character._count.appearances,
      createdAt: character.createdAt.toISOString(),
      updatedAt: character.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Failed to update character:', error)
    
    // 处理唯一约束冲突
    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
      return NextResponse.json(
        { error: 'Character with this name already exists in the project' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update character' },
      { status: 500 }
    )
  }
}

// 软删除角色
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // TODO: 从 session 中获取当前用户 ID
    const userId = 'b29b8e81-d968-4563-9998-fc221137e842'

    // 检查角色是否存在且属于当前用户
    const existingCharacter = await prisma.characterProfile.findFirst({
      where: {
        id,
        deletedAt: null,
        project: {
          userId,
          deletedAt: null,
        },
      },
    })

    if (!existingCharacter) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    // 软删除：更新 deletedAt 字段
    await prisma.characterProfile.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
      },
    })

    return NextResponse.json(
      { message: 'Character deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Failed to delete character:', error)
    return NextResponse.json(
      { error: 'Failed to delete character' },
      { status: 500 }
    )
  }
}
