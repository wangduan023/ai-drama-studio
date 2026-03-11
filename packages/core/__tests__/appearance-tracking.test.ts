/**
 * 角色外观追踪测试
 * 测试外观索引映射正确性、多阶段外观变化追踪、外观变化原因记录验证
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CharacterProfileService, type AppearanceMap } from '../src/services/character.service'

// Mock Prisma Client
const createMockPrisma = () => {
  const mockData = {
    characters: new Map(),
    appearances: new Map(),
    episodes: new Map()
  }

  let idCounter = 0
  const generateId = () => `mock-id-${++idCounter}`

  return {
    mockData,
    generateId,
    characterProfile: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.id) {
          const char = mockData.characters.get(where.id)
          if (!char) return null
          
          // Handle include
          if (where.include?.appearances) {
            const appearances = Array.from(mockData.appearances.values())
              .filter(a => a.characterId === where.id)
              .sort((a, b) => a.appearanceIndex - b.appearanceIndex)
            return { ...char, appearances }
          }
          return { ...char }
        }
        return null
      }),
      findMany: vi.fn(async ({ where, include }: any) => {
        let results = Array.from(mockData.characters.values())
        
        if (where?.deletedAt === null) {
          results = results.filter(c => c.deletedAt === null)
        }
        if (where?.id?.in) {
          results = results.filter(c => where.id.in.includes(c.id))
        }

        if (include?.appearances) {
          results = results.map(c => ({
            ...c,
            appearances: Array.from(mockData.appearances.values())
              .filter(a => a.characterId === c.id)
              .sort((a, b) => a.appearanceIndex - b.appearanceIndex)
          }))
        }

        return results.map(r => ({ ...r }))
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const char = mockData.characters.get(where.id)
        if (!char) throw new Error('Character not found')
        
        const updated = { ...char, ...data, updatedAt: new Date() }
        mockData.characters.set(where.id, updated)
        return { ...updated }
      })
    },
    characterAppearance: {
      findUnique: vi.fn(async ({ where }: any) => {
        for (const app of mockData.appearances.values()) {
          if (app.characterId === where.characterId_appearanceIndex.characterId &&
              app.appearanceIndex === where.characterId_appearanceIndex.appearanceIndex) {
            return { ...app }
          }
        }
        return null
      }),
      findMany: vi.fn(async ({ where }: any) => {
        let results = Array.from(mockData.appearances.values())
        if (where?.characterId) {
          results = results.filter(a => a.characterId === where.characterId)
        }
        if (where?.appearanceIndex?.in) {
          results = results.filter(a => where.appearanceIndex.in.includes(a.appearanceIndex))
        }
        return results.map(r => ({ ...r }))
      }),
      upsert: vi.fn(async ({ where, create, update }: any) => {
        for (const [id, app] of mockData.appearances) {
          if (app.characterId === where.characterId_appearanceIndex.characterId &&
              app.appearanceIndex === where.characterId_appearanceIndex.appearanceIndex) {
            const updated = { ...app, ...update, updatedAt: new Date() }
            mockData.appearances.set(id, updated)
            return { ...updated }
          }
        }
        
        const id = generateId()
        const now = new Date()
        const newApp = { id, ...create, createdAt: now, updatedAt: now }
        mockData.appearances.set(id, newApp)
        return { ...newApp }
      })
    },
    episode: {
      findUnique: vi.fn(async ({ where }: any) => {
        const ep = mockData.episodes.get(where.id)
        return ep ? { ...ep } : null
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const ep = mockData.episodes.get(where.id)
        if (!ep) throw new Error('Episode not found')
        const updated = { ...ep, ...data }
        mockData.episodes.set(where.id, updated)
        return { ...updated }
      })
    },
    $transaction: vi.fn(async (callback) => {
      const txClient = {
        characterProfile: {
          update: vi.fn(async ({ where, data }: any) => {
            const char = mockData.characters.get(where.id)
            if (!char) throw new Error('Character not found')
            const updated = { ...char, ...data, updatedAt: new Date() }
            mockData.characters.set(where.id, updated)
            return { ...updated }
          })
        },
        characterAppearance: {
          upsert: vi.fn(async ({ where, create, update }: any) => {
            for (const [id, app] of mockData.appearances) {
              if (app.characterId === where.characterId_appearanceIndex.characterId &&
                  app.appearanceIndex === where.characterId_appearanceIndex.appearanceIndex) {
                const updated = { ...app, ...update, updatedAt: new Date() }
                mockData.appearances.set(id, updated)
                return { ...updated }
              }
            }
            const id = generateId()
            const now = new Date()
            const newApp = { id, ...create, createdAt: now, updatedAt: now }
            mockData.appearances.set(id, newApp)
            return { ...newApp }
          })
        }
      }
      return callback(txClient)
    })
  }
}

describe('Appearance Tracking', () => {
  let prisma: any
  let service: CharacterProfileService

  beforeEach(() => {
    prisma = createMockPrisma()
    service = new CharacterProfileService(prisma)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('外观索引映射正确性', () => {
    it('应该正确映射角色的外观索引', async () => {
      const projectId = 'proj-appearance-001'
      const episodeId = 'ep-appearance-001'

      // 创建角色
      const character = await createCharacter(projectId, '外观角色', prisma)

      // 创建外观
      await createAppearance(character.id, 1, '初始外观', '穿着校服的学生', prisma)
      await createAppearance(character.id, 2, '战斗形态', '穿着战斗服的战士', prisma)
      await createAppearance(character.id, 3, '最终形态', '觉醒后的形态', prisma)

      // 创建剧集并设置外观映射
      prisma.mockData.episodes.set(episodeId, {
        id: episodeId,
        projectId,
        characterAppearanceMap: {
          [character.id]: 2 // 使用外观2
        }
      })

      // 构建外观映射
      const appearanceMap = await service.buildAppearanceMap(episodeId, [character.id])

      expect(appearanceMap[character.id]).toBe(2)
    })

    it('应该在无映射时返回默认外观索引 1', async () => {
      const projectId = 'proj-appearance-002'
      const episodeId = 'ep-appearance-002'

      const character = await createCharacter(projectId, '默认外观角色', prisma)
      await createAppearance(character.id, 1, '初始', '初始外观', prisma)

      // 创建剧集但不设置外观映射
      prisma.mockData.episodes.set(episodeId, {
        id: episodeId,
        projectId,
        characterAppearanceMap: null
      })

      const appearanceMap = await service.buildAppearanceMap(episodeId, [character.id])

      expect(appearanceMap[character.id]).toBe(1)
    })

    it('应该支持多个角色的外观映射', async () => {
      const projectId = 'proj-appearance-003'
      const episodeId = 'ep-appearance-003'

      const char1 = await createCharacter(projectId, '角色1', prisma)
      const char2 = await createCharacter(projectId, '角色2', prisma)
      const char3 = await createCharacter(projectId, '角色3', prisma)

      // 为每个角色创建多个外观
      await createAppearance(char1.id, 1, '初始', '外观1-1', prisma)
      await createAppearance(char1.id, 2, '变身', '外观1-2', prisma)
      await createAppearance(char2.id, 1, '初始', '外观2-1', prisma)
      await createAppearance(char3.id, 1, '初始', '外观3-1', prisma)
      await createAppearance(char3.id, 2, '升级', '外观3-2', prisma)

      prisma.mockData.episodes.set(episodeId, {
        id: episodeId,
        projectId,
        characterAppearanceMap: {
          [char1.id]: 2,
          [char2.id]: 1,
          [char3.id]: 2
        }
      })

      const appearanceMap = await service.buildAppearanceMap(episodeId, [char1.id, char2.id, char3.id])

      expect(appearanceMap[char1.id]).toBe(2)
      expect(appearanceMap[char2.id]).toBe(1)
      expect(appearanceMap[char3.id]).toBe(2)
    })

    it('应该过滤指定的角色 ID', async () => {
      const projectId = 'proj-appearance-004'
      const episodeId = 'ep-appearance-004'

      const char1 = await createCharacter(projectId, '角色1', prisma)
      const char2 = await createCharacter(projectId, '角色2', prisma)
      const char3 = await createCharacter(projectId, '角色3', prisma)

      prisma.mockData.episodes.set(episodeId, {
        id: episodeId,
        projectId,
        characterAppearanceMap: {
          [char1.id]: 1,
          [char2.id]: 2,
          [char3.id]: 1
        }
      })

      // 只请求 char1 和 char3
      const appearanceMap = await service.buildAppearanceMap(episodeId, [char1.id, char3.id])

      expect(appearanceMap[char1.id]).toBeDefined()
      expect(appearanceMap[char2.id]).toBeUndefined()
      expect(appearanceMap[char3.id]).toBeDefined()
    })

    it('应该保存外观映射到剧集', async () => {
      const projectId = 'proj-appearance-005'
      const episodeId = 'ep-appearance-005'

      const char1 = await createCharacter(projectId, '角色1', prisma)
      const char2 = await createCharacter(projectId, '角色2', prisma)

      prisma.mockData.episodes.set(episodeId, {
        id: episodeId,
        projectId,
        characterAppearanceMap: null
      })

      const newMap: AppearanceMap = {
        [char1.id]: 2,
        [char2.id]: 1
      }

      await service.saveAppearanceMap(episodeId, newMap)

      const episode = prisma.mockData.episodes.get(episodeId)
      expect(episode.characterAppearanceMap).toEqual(newMap)
    })
  })

  describe('多阶段外观变化追踪', () => {
    it('应该追踪角色的多个外观阶段', async () => {
      const projectId = 'proj-stages-001'

      const character = await createCharacter(projectId, '多阶段角色', prisma)

      // 使用 confirmCharacterProfile 创建多个外观阶段
      await service.confirmCharacterProfile(character.id, [
        {
          appearanceIndex: 1,
          changeReason: '初始形象',
          description: '穿着校服的普通学生',
          descriptions: ['校服', '书包', '短发']
        },
        {
          appearanceIndex: 2,
          changeReason: '觉醒变身',
          description: '魔法少女形态，粉色战斗服',
          descriptions: ['粉色战斗服', '魔法棒', '翅膀']
        },
        {
          appearanceIndex: 3,
          changeReason: '最终决战',
          description: '终极形态，金色光芒环绕',
          descriptions: ['金色光芒', '终极武器', '神圣光环']
        }
      ])

      // 查询角色及其外观
      const charWithAppearances = await service.getCharacterProfileWithAppearances(character.id)

      expect(charWithAppearances?.appearances).toHaveLength(3)
      expect(charWithAppearances?.appearances[0].appearanceIndex).toBe(1)
      expect(charWithAppearances?.appearances[1].appearanceIndex).toBe(2)
      expect(charWithAppearances?.appearances[2].appearanceIndex).toBe(3)
    })

    it('应该支持外观阶段的更新', async () => {
      const projectId = 'proj-stages-002'

      const character = await createCharacter(projectId, '更新外观角色', prisma)

      // 初始创建
      await service.confirmCharacterProfile(character.id, [
        {
          appearanceIndex: 1,
          changeReason: '初始',
          description: '初始描述',
          descriptions: ['描述1']
        }
      ])

      // 更新外观1并添加外观2
      await service.confirmCharacterProfile(character.id, [
        {
          appearanceIndex: 1,
          changeReason: '修正',
          description: '修正后的描述',
          descriptions: ['修正描述1', '修正描述2']
        },
        {
          appearanceIndex: 2,
          changeReason: '新形态',
          description: '新形态描述',
          descriptions: ['新描述1']
        }
      ])

      const charWithAppearances = await service.getCharacterProfileWithAppearances(character.id)

      expect(charWithAppearances?.appearances).toHaveLength(2)
      expect(charWithAppearances?.appearances[0].description).toBe('修正后的描述')
      expect(charWithAppearances?.appearances[1].description).toBe('新形态描述')
    })

    it('应该按 appearanceIndex 排序返回外观', async () => {
      const projectId = 'proj-stages-003'

      const character = await createCharacter(projectId, '排序角色', prisma)

      // 故意不按顺序创建外观
      await createAppearance(character.id, 3, '第三', '第三阶段', prisma)
      await createAppearance(character.id, 1, '第一', '第一阶段', prisma)
      await createAppearance(character.id, 2, '第二', '第二阶段', prisma)

      const charWithAppearances = await service.getCharacterProfileWithAppearances(character.id)

      expect(charWithAppearances?.appearances[0].appearanceIndex).toBe(1)
      expect(charWithAppearances?.appearances[1].appearanceIndex).toBe(2)
      expect(charWithAppearances?.appearances[2].appearanceIndex).toBe(3)
      
      expect(charWithAppearances?.appearances[0].changeReason).toBe('第一')
      expect(charWithAppearances?.appearances[1].changeReason).toBe('第二')
      expect(charWithAppearances?.appearances[2].changeReason).toBe('第三')
    })

    it('应该获取指定外观索引的描述', async () => {
      const projectId = 'proj-stages-004'

      const character = await createCharacter(projectId, '指定外观角色', prisma)

      await createAppearance(character.id, 1, '初始', '初始外观描述', prisma)
      await createAppearance(character.id, 2, '变身', '变身外观描述', prisma)

      const desc1 = await service.getCurrentAppearanceDescription(character.id, 1)
      const desc2 = await service.getCurrentAppearanceDescription(character.id, 2)
      const desc3 = await service.getCurrentAppearanceDescription(character.id, 3) // 不存在

      expect(desc1).toBe('初始外观描述')
      expect(desc2).toBe('变身外观描述')
      expect(desc3).toBeNull()
    })

    it('应该处理空外观列表', async () => {
      const projectId = 'proj-stages-005'

      const character = await createCharacter(projectId, '无外观角色', prisma)

      const charWithAppearances = await service.getCharacterProfileWithAppearances(character.id)

      expect(charWithAppearances?.appearances).toHaveLength(0)
    })
  })

  describe('外观变化原因记录验证', () => {
    it('应该正确记录每个外观的变化原因', async () => {
      const projectId = 'proj-reason-001'

      const character = await createCharacter(projectId, '原因记录角色', prisma)

      const appearances = [
        {
          appearanceIndex: 1,
          changeReason: '故事开始时的初始形象',
          description: '普通学生装',
          descriptions: ['校服', '眼镜']
        },
        {
          appearanceIndex: 2,
          changeReason: '遇到导师后获得魔法力量',
          description: '初级魔法使',
          descriptions: ['法袍', '魔杖']
        },
        {
          appearanceIndex: 3,
          changeReason: '在魔法试炼中突破自我',
          description: '高级魔法使',
          descriptions: ['高级法袍', '发光魔杖', '魔法光环']
        }
      ]

      await service.confirmCharacterProfile(character.id, appearances)

      const charWithAppearances = await service.getCharacterProfileWithAppearances(character.id)

      expect(charWithAppearances?.appearances[0].changeReason).toBe('故事开始时的初始形象')
      expect(charWithAppearances?.appearances[1].changeReason).toBe('遇到导师后获得魔法力量')
      expect(charWithAppearances?.appearances[2].changeReason).toBe('在魔法试炼中突破自我')
    })

    it('应该允许空变化原因', async () => {
      const projectId = 'proj-reason-002'

      const character = await createCharacter(projectId, '空原因角色', prisma)

      await service.confirmCharacterProfile(character.id, [
        {
          appearanceIndex: 1,
          changeReason: '', // 空原因
          description: '描述',
          descriptions: ['描述1']
        }
      ])

      const charWithAppearances = await service.getCharacterProfileWithAppearances(character.id)

      expect(charWithAppearances?.appearances[0].changeReason).toBe('')
    })

    it('应该支持长文本变化原因', async () => {
      const projectId = 'proj-reason-003'

      const character = await createCharacter(projectId, '长原因角色', prisma)

      const longReason = '这是一个非常长的变化原因描述。'.repeat(50)

      await service.confirmCharacterProfile(character.id, [
        {
          appearanceIndex: 1,
          changeReason: longReason,
          description: '描述',
          descriptions: ['描述1']
        }
      ])

      const charWithAppearances = await service.getCharacterProfileWithAppearances(character.id)

      expect(charWithAppearances?.appearances[0].changeReason).toBe(longReason)
      expect(charWithAppearances?.appearances[0].changeReason.length).toBeGreaterThan(1000)
    })

    it('应该保存外观描述数组', async () => {
      const projectId = 'proj-reason-004'

      const character = await createCharacter(projectId, '描述数组角色', prisma)

      await service.confirmCharacterProfile(character.id, [
        {
          appearanceIndex: 1,
          changeReason: '初始',
          description: '主要描述',
          descriptions: ['描述1', '描述2', '描述3', '描述4', '描述5']
        }
      ])

      const charWithAppearances = await service.getCharacterProfileWithAppearances(character.id)

      // descriptions 应该以 JSON 字符串形式存储
      const descriptionsData = charWithAppearances?.appearances[0].descriptions
      expect(descriptionsData).toBeDefined()
    })
  })

  describe('外观映射边缘情况', () => {
    it('应该处理剧集不存在的情况', async () => {
      const appearanceMap = await service.buildAppearanceMap('non-existent-episode', ['char-1'])

      // 应该返回空映射
      expect(appearanceMap).toEqual({})
    })

    it('应该处理角色不存在的情况', async () => {
      const projectId = 'proj-edge-001'
      const episodeId = 'ep-edge-001'

      prisma.mockData.episodes.set(episodeId, {
        id: episodeId,
        projectId,
        characterAppearanceMap: {
          'non-existent-char': 1
        }
      })

      const appearanceMap = await service.buildAppearanceMap(episodeId, ['non-existent-char'])

      // 应该返回映射中定义的值
      expect(appearanceMap['non-existent-char']).toBe(1)
    })

    it('应该处理空角色 ID 列表', async () => {
      const projectId = 'proj-edge-002'
      const episodeId = 'ep-edge-002'

      prisma.mockData.episodes.set(episodeId, {
        id: episodeId,
        projectId,
        characterAppearanceMap: { 'char-1': 1 }
      })

      const appearanceMap = await service.buildAppearanceMap(episodeId, [])

      // 应该返回所有映射
      expect(Object.keys(appearanceMap)).toContain('char-1')
    })

    it('应该处理负值或零的外观索引', async () => {
      const projectId = 'proj-edge-003'
      const episodeId = 'ep-edge-003'

      const character = await createCharacter(projectId, '边缘角色', prisma)

      prisma.mockData.episodes.set(episodeId, {
        id: episodeId,
        projectId,
        characterAppearanceMap: {
          [character.id]: 0 // 零值
        }
      })

      const appearanceMap = await service.buildAppearanceMap(episodeId, [character.id])

      // 应该返回映射中定义的值（即使是0）
      expect(appearanceMap[character.id]).toBe(0)
    })
  })

  describe('为分镜准备角色信息', () => {
    it('应该正确生成外观列表字符串', async () => {
      const projectId = 'proj-prep-001'
      const episodeId = 'ep-prep-001'

      const char1 = await createCharacter(projectId, '角色A', prisma)
      const char2 = await createCharacter(projectId, '角色B', prisma)

      await createAppearance(char1.id, 1, '初始', '穿着校服', prisma)
      await createAppearance(char2.id, 1, '初始', '穿着西装', prisma)

      prisma.mockData.episodes.set(episodeId, {
        id: episodeId,
        projectId,
        characterAppearanceMap: {
          [char1.id]: 1,
          [char2.id]: 1
        }
      })

      const prep = await service.prepareCharactersForStoryboard(episodeId, [char1.id, char2.id])

      expect(prep.appearanceList).toContain('角色A: 穿着校服')
      expect(prep.appearanceList).toContain('角色B: 穿着西装')
    })

    it('应该在使用不存在的外观索引时返回默认描述', async () => {
      const projectId = 'proj-prep-002'
      const episodeId = 'ep-prep-002'

      const character = await createCharacter(projectId, '无外观角色', prisma)
      // 不创建任何外观

      prisma.mockData.episodes.set(episodeId, {
        id: episodeId,
        projectId,
        characterAppearanceMap: {
          [character.id]: 1 // 映射到不存在的外观
        }
      })

      const prep = await service.prepareCharactersForStoryboard(episodeId, [character.id])

      expect(prep.appearanceList).toContain('无外观角色: 默认外观')
    })

    it('应该只包含指定外观索引的外观', async () => {
      const projectId = 'proj-prep-003'
      const episodeId = 'ep-prep-003'

      const character = await createCharacter(projectId, '多外观角色', prisma)

      await createAppearance(character.id, 1, '初始', '校服外观', prisma)
      await createAppearance(character.id, 2, '变身', '战斗外观', prisma)
      await createAppearance(character.id, 3, '最终', '最终外观', prisma)

      // 只使用外观2
      prisma.mockData.episodes.set(episodeId, {
        id: episodeId,
        projectId,
        characterAppearanceMap: {
          [character.id]: 2
        }
      })

      const prep = await service.prepareCharactersForStoryboard(episodeId, [character.id])

      expect(prep.characters[0].appearances).toHaveLength(1)
      expect(prep.characters[0].appearances[0].appearanceIndex).toBe(2)
      expect(prep.appearanceList).toContain('战斗外观')
    })
  })
})

// 辅助函数
async function createCharacter(projectId: string, name: string, prisma: any) {
  const id = `char-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const now = new Date()
  const character = {
    id,
    projectId,
    name,
    profileConfirmed: false,
    createdAt: now,
    updatedAt: now
  }
  prisma.mockData.characters.set(id, character)
  return character
}

async function createAppearance(
  characterId: string, 
  appearanceIndex: number, 
  changeReason: string, 
  description: string, 
  prisma: any
) {
  const id = `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const now = new Date()
  const appearance = {
    id,
    characterId,
    appearanceIndex,
    changeReason,
    description,
    descriptions: null,
    imageUrls: null,
    previousImageUrls: null,
    createdAt: now,
    updatedAt: now
  }
  prisma.mockData.appearances.set(id, appearance)
  return appearance
}
