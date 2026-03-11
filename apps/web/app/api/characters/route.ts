import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CharacterRoleLevel } from '@prisma/client'

// 获取角色列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const search = searchParams.get('search')
    const roleLevel = searchParams.get('roleLevel')

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

    const characters = await prisma.characterProfile.findMany({
      where: {
        projectId,
        deletedAt: null,
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { introduction: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
        ...(roleLevel ? { roleLevel: roleLevel as CharacterRoleLevel } : {}),
      },
      include: {
        _count: {
          select: {
            appearances: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    // 格式化返回数据
    const formattedCharacters = characters.map((character) => ({
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
      appearanceCount: character._count.appearances,
      createdAt: character.createdAt.toISOString(),
      updatedAt: character.updatedAt.toISOString(),
    }))

    return NextResponse.json(formattedCharacters)
  } catch (error) {
    console.error('Failed to fetch characters:', error)
    return NextResponse.json(
      { error: 'Failed to fetch characters' },
      { status: 500 }
    )
  }
}

// 创建新角色
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      projectId,
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

    // 验证角色级别
    if (roleLevel && !Object.values(CharacterRoleLevel).includes(roleLevel as CharacterRoleLevel)) {
      return NextResponse.json(
        { error: 'Invalid role level' },
        { status: 400 }
      )
    }

    const character = await prisma.characterProfile.create({
      data: {
        projectId,
        name,
        aliases: aliases ? JSON.stringify(aliases) : null,
        introduction,
        gender,
        ageRange,
        roleLevel: roleLevel as CharacterRoleLevel || null,
        archetype,
        personalityTags: personalityTags ? JSON.stringify(personalityTags) : null,
        eraPeriod,
        socialClass,
        occupation,
        costumeTier,
        suggestedColors: suggestedColors ? JSON.stringify(suggestedColors) : null,
        primaryIdentifier,
        visualKeywords: visualKeywords ? JSON.stringify(visualKeywords) : null,
        expectedAppearances: expectedAppearances || undefined,
      },
      include: {
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
      aliases: aliases || [],
      introduction: character.introduction,
      gender: character.gender,
      ageRange: character.ageRange,
      roleLevel: character.roleLevel,
      archetype: character.archetype,
      personalityTags: personalityTags || [],
      eraPeriod: character.eraPeriod,
      socialClass: character.socialClass,
      occupation: character.occupation,
      costumeTier: character.costumeTier,
      suggestedColors: suggestedColors || [],
      primaryIdentifier: character.primaryIdentifier,
      visualKeywords: visualKeywords || [],
      expectedAppearances: character.expectedAppearances,
      profileConfirmed: character.profileConfirmed,
      appearanceCount: 0,
      createdAt: character.createdAt.toISOString(),
      updatedAt: character.updatedAt.toISOString(),
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create character:', error)
    
    // 处理唯一约束冲突
    if (error instanceof Error && error.message.includes('Unique constraint failed')) {
      return NextResponse.json(
        { error: 'Character with this name already exists in the project' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create character' },
      { status: 500 }
    )
  }
}
