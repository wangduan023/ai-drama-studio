/**
 * 角色 CRUD 集成测试
 * 测试创建->查询->更新->删除完整流程、批量创建、事务回滚、并发操作
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  CharacterProfileService,
  LocationProfileService,
  CharacterServiceError
} from '../src/services/character.service'
import { CharacterRoleLevel } from '../src/types'

// Mock Prisma Client
const createMockPrisma = () => {
  const mockData = {
    characters: new Map(),
    locations: new Map(),
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
        if (where.projectId_name) {
          for (const char of mockData.characters.values()) {
            if (char.projectId === where.projectId_name.projectId && 
                char.name === where.projectId_name.name) {
              return { ...char }
            }
          }
          return null
        }
        if (where.id) {
          const char = mockData.characters.get(where.id)
          return char ? { ...char } : null
        }
        return null
      }),
      findMany: vi.fn(async ({ where, include, take, skip }: any) => {
        let results = Array.from(mockData.characters.values())
        
        if (where?.projectId) {
          results = results.filter(c => c.projectId === where.projectId)
        }
        if (where?.deletedAt === null) {
          results = results.filter(c => c.deletedAt === null || c.deletedAt === undefined)
        }
        if (where?.profileConfirmed === true) {
          results = results.filter(c => c.profileConfirmed === true)
        }
        if (where?.profileConfirmed === false) {
          results = results.filter(c => c.profileConfirmed === false)
        }
        if (where?.id?.in) {
          results = results.filter(c => where.id.in.includes(c.id))
        }

        // Handle pagination
        if (skip) results = results.slice(skip)
        if (take) results = results.slice(0, take)

        // Handle include
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
      create: vi.fn(async ({ data }: any) => {
        const id = generateId()
        const now = new Date()
        const char = {
          id,
          ...data,
          createdAt: now,
          updatedAt: now
        }
        mockData.characters.set(id, char)
        return { ...char }
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const char = mockData.characters.get(where.id)
        if (!char) throw new Error('Character not found')
        
        const updated = {
          ...char,
          ...data,
          updatedAt: new Date()
        }
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
        const newApp = {
          id,
          ...create,
          createdAt: now,
          updatedAt: now
        }
        mockData.appearances.set(id, newApp)
        return { ...newApp }
      })
    },
    locationProfile: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.projectId_name) {
          for (const loc of mockData.locations.values()) {
            if (loc.projectId === where.projectId_name.projectId && 
                loc.name === where.projectId_name.name) {
              return { ...loc }
            }
          }
          return null
        }
        return null
      }),
      findMany: vi.fn(async ({ where }: any) => {
        let results = Array.from(mockData.locations.values())
        if (where?.projectId) {
          results = results.filter(l => l.projectId === where.projectId)
        }
        if (where?.deletedAt === null) {
          results = results.filter(l => l.deletedAt === null || l.deletedAt === undefined)
        }
        return results.map(r => ({ ...r }))
      }),
      create: vi.fn(async ({ data }: any) => {
        const id = generateId()
        const now = new Date()
        const loc = {
          id,
          ...data,
          createdAt: now,
          updatedAt: now
        }
        mockData.locations.set(id, loc)
        return { ...loc }
      }),
      update: vi.fn(async ({ where, data }: any) => {
        for (const [id, loc] of mockData.locations) {
          if (loc.projectId === where.projectId && loc.name === where.name) {
            const updated = { ...loc, ...data, updatedAt: new Date() }
            mockData.locations.set(id, updated)
            return { ...updated }
          }
        }
        throw new Error('Location not found')
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
      // 简单的事务模拟 - 实际执行回调
      const txClient = {
        characterProfile: {
          findUnique: vi.fn(async (args: any) => {
            // 从 mockData 中查找
            for (const char of mockData.characters.values()) {
              if (args.where.projectId_name) {
                if (char.projectId === args.where.projectId_name.projectId && 
                    char.name === args.where.projectId_name.name) {
                  return { ...char }
                }
              }
            }
            return null
          }),
          create: vi.fn(async ({ data }: any) => {
            const id = generateId()
            const now = new Date()
            const char = { id, ...data, createdAt: now, updatedAt: now }
            mockData.characters.set(id, char)
            return { ...char }
          }),
          update: vi.fn(async ({ where, data }: any) => {
            const char = mockData.characters.get(where.id)
            if (!char) throw new Error('Character not found')
            const updated = { ...char, ...data, updatedAt: new Date() }
            mockData.characters.set(where.id, updated)
            return { ...updated }
          })
        },
        locationProfile: {
          findUnique: vi.fn(async (args: any) => {
            for (const loc of mockData.locations.values()) {
              if (args.where.projectId_name) {
                if (loc.projectId === args.where.projectId_name.projectId && 
                    loc.name === args.where.projectId_name.name) {
                  return { ...loc }
                }
              }
            }
            return null
          }),
          create: vi.fn(async ({ data }: any) => {
            const id = generateId()
            const now = new Date()
            const loc = { id, ...data, createdAt: now, updatedAt: now }
            mockData.locations.set(id, loc)
            return { ...loc }
          }),
          update: vi.fn(async ({ where, data }: any) => {
            for (const [id, loc] of mockData.locations) {
              if (loc.projectId === where.projectId && loc.name === where.name) {
                const updated = { ...loc, ...data, updatedAt: new Date() }
                mockData.locations.set(id, updated)
                return { ...updated }
              }
            }
            throw new Error('Location not found')
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

describe('Character CRUD Integration', () => {
  let prisma: any
  let characterService: CharacterProfileService
  let locationService: LocationProfileService

  beforeEach(() => {
    prisma = createMockPrisma()
    characterService = new CharacterProfileService(prisma)
    locationService = new LocationProfileService(prisma)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('创建 -> 查询 -> 更新 -> 删除 完整流程', () => {
    it('应该完成角色的完整生命周期', async () => {
      const projectId = 'proj-test-001'

      // 1. 创建角色
      const created = await characterService.upsertCharacterProfile(projectId, {
        name: '测试角色',
        introduction: '这是一个测试角色',
        gender: '男',
        ageRange: '20-30',
        roleLevel: CharacterRoleLevel.S
      })

      expect(created).toBeDefined()
      expect(created.name).toBe('测试角色')
      expect(created.projectId).toBe(projectId)
      expect(created.profileConfirmed).toBe(false)
      expect(created.createdAt).toBeDefined()

      // 2. 查询角色
      const characters = await characterService.getCharacterProfiles(projectId)
      expect(characters).toHaveLength(1)
      expect(characters[0].name).toBe('测试角色')

      // 3. 更新角色
      const updated = await characterService.upsertCharacterProfile(projectId, {
        name: '测试角色',
        introduction: '更新后的介绍',
        gender: '女',
        primaryIdentifier: '金色长发'
      })

      expect(updated.name).toBe('测试角色')
      expect(updated.gender).toBe('女')
      expect(updated.introduction).toBe('更新后的介绍')
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime())

      // 4. 确认角色（添加外观）
      const confirmed = await characterService.confirmCharacterProfile(updated.id, [
        {
          appearanceIndex: 1,
          changeReason: '初始外观',
          description: '穿着白色连衣裙的金发少女',
          descriptions: ['白色连衣裙', '金色长发', '蓝色眼睛']
        },
        {
          appearanceIndex: 2,
          changeReason: '战斗形态',
          description: '穿着银色铠甲的女战士',
          descriptions: ['银色铠甲', '金色长发', '持剑']
        }
      ])

      expect(confirmed.profileConfirmed).toBe(true)

      // 5. 查询带外观的角色
      const withAppearances = await characterService.getCharacterProfileWithAppearances(updated.id)
      expect(withAppearances).toBeDefined()
      expect(withAppearances?.appearances).toHaveLength(2)
      expect(withAppearances?.appearances[0].appearanceIndex).toBe(1)
      expect(withAppearances?.appearances[1].appearanceIndex).toBe(2)
    })

    it('应该支持场景档案的完整生命周期', async () => {
      const projectId = 'proj-test-002'

      // 创建场景
      const created = await locationService.upsertLocationProfile(projectId, {
        name: '测试场景',
        description: '这是一个测试场景',
        locationType: 'INDOOR'
      })

      expect(created.name).toBe('测试场景')
      expect(created.projectId).toBe(projectId)

      // 查询场景
      const locations = await locationService.getLocationProfiles(projectId)
      expect(locations).toHaveLength(1)
      expect(locations[0].name).toBe('测试场景')

      // 更新场景
      const updated = await locationService.upsertLocationProfile(projectId, {
        name: '测试场景',
        description: '更新后的场景描述',
        locationType: 'OUTDOOR'
      })

      expect(updated.description).toBe('更新后的场景描述')
    })
  })

  describe('批量创建角色（10+ 角色）', () => {
    it('应该成功批量创建 10 个角色', async () => {
      const projectId = 'proj-batch-001'
      
      const profiles = Array.from({ length: 10 }, (_, i) => ({
        name: `批量角色${i + 1}`,
        introduction: `这是第${i + 1}个批量创建的角色`,
        gender: i % 2 === 0 ? '男' : '女',
        ageRange: `${20 + i}-${30 + i}`,
        roleLevel: i === 0 ? CharacterRoleLevel.S : i < 3 ? CharacterRoleLevel.A : CharacterRoleLevel.B
      }))

      const results = await characterService.batchUpsertCharacterProfiles(projectId, profiles)

      expect(results).toHaveLength(10)
      results.forEach((char, i) => {
        expect(char.name).toBe(`批量角色${i + 1}`)
        expect(char.projectId).toBe(projectId)
      })

      // 验证所有角色都已创建
      const allCharacters = await characterService.getCharacterProfiles(projectId)
      expect(allCharacters).toHaveLength(10)
    })

    it('应该成功批量创建 20 个角色', async () => {
      const projectId = 'proj-batch-002'
      
      const profiles = Array.from({ length: 20 }, (_, i) => ({
        name: `角色${String(i + 1).padStart(2, '0')}`,
        introduction: `角色${i + 1}的介绍`
      }))

      const results = await characterService.batchUpsertCharacterProfiles(projectId, profiles)

      expect(results).toHaveLength(20)
    })

    it('应该在批量创建中检测重复名称', async () => {
      const projectId = 'proj-batch-003'
      
      const profiles = [
        { name: '重复角色', introduction: '第一个' },
        { name: '正常角色', introduction: '正常' },
        { name: '重复角色', introduction: '第二个重复' } // 重复名称
      ]

      await expect(characterService.batchUpsertCharacterProfiles(projectId, profiles))
        .rejects.toThrow(CharacterServiceError)
    })

    it('应该在批量创建中验证所有输入', async () => {
      const projectId = 'proj-batch-004'
      
      const profiles = [
        { name: '有效角色', introduction: '正常' },
        { name: '', introduction: '无效名称' }, // 无效名称
        { name: '另一个有效', introduction: '正常' }
      ]

      await expect(characterService.batchUpsertCharacterProfiles(projectId, profiles))
        .rejects.toThrow(CharacterServiceError)
    })

    it('应该支持空批量操作', async () => {
      const projectId = 'proj-batch-005'
      
      const results = await characterService.batchUpsertCharacterProfiles(projectId, [])
      
      expect(results).toEqual([])
    })
  })

  describe('事务回滚测试', () => {
    it('应该在批量创建失败时回滚所有操作', async () => {
      const projectId = 'proj-tx-001'
      
      // 创建一些初始角色
      await characterService.upsertCharacterProfile(projectId, {
        name: '初始角色',
        introduction: '已存在的角色'
      })

      // 模拟事务失败
      prisma.$transaction = vi.fn().mockRejectedValue(new Error('Simulated database error'))

      const profiles = [
        { name: '新角色1', introduction: '新角色' },
        { name: '新角色2', introduction: '新角色' }
      ]

      await expect(characterService.batchUpsertCharacterProfiles(projectId, profiles))
        .rejects.toThrow(CharacterServiceError)

      // 恢复事务函数
      const newPrisma = createMockPrisma()
      prisma.$transaction = newPrisma.$transaction
      prisma.mockData.characters = newPrisma.mockData.characters

      // 验证只有初始角色存在
      const allCharacters = await characterService.getCharacterProfiles(projectId)
      expect(allCharacters).toHaveLength(1)
      expect(allCharacters[0].name).toBe('初始角色')
    })

    it('应该在确认角色外观时保持事务一致性', async () => {
      const projectId = 'proj-tx-002'

      // 创建角色
      const character = await characterService.upsertCharacterProfile(projectId, {
        name: '事务测试角色',
        introduction: '测试事务'
      })

      // 确认角色外观（应该在事务中完成）
      const confirmed = await characterService.confirmCharacterProfile(character.id, [
        {
          appearanceIndex: 1,
          changeReason: '初始外观',
          description: '初始描述',
          descriptions: ['描述1', '描述2']
        }
      ])

      expect(confirmed.profileConfirmed).toBe(true)

      // 验证外观已创建
      const withAppearances = await characterService.getCharacterProfileWithAppearances(character.id)
      expect(withAppearances?.appearances).toHaveLength(1)
      expect(withAppearances?.appearances[0].description).toBe('初始描述')
    })
  })

  describe('并发操作测试', () => {
    it('应该处理并发的角色创建请求', async () => {
      const projectId = 'proj-concurrent-001'

      // 并发创建多个角色
      const promises = Array.from({ length: 10 }, (_, i) =>
        characterService.upsertCharacterProfile(projectId, {
          name: `并发角色${i}`,
          introduction: `并发创建的角色${i}`
        })
      )

      const results = await Promise.all(promises)

      expect(results).toHaveLength(10)
      
      // 验证所有角色名称都不同
      const names = results.map(r => r.name)
      const uniqueNames = new Set(names)
      expect(uniqueNames.size).toBe(10)
    })

    it('应该处理并发的批量创建请求', async () => {
      const projectId = 'proj-concurrent-002'

      const batch1 = Array.from({ length: 5 }, (_, i) => ({
        name: `批次1-角色${i}`,
        introduction: `批次1的角色${i}`
      }))

      const batch2 = Array.from({ length: 5 }, (_, i) => ({
        name: `批次2-角色${i}`,
        introduction: `批次2的角色${i}`
      }))

      // 并发执行两个批量创建
      const [results1, results2] = await Promise.all([
        characterService.batchUpsertCharacterProfiles(projectId, batch1),
        characterService.batchUpsertCharacterProfiles(projectId, batch2)
      ])

      expect(results1).toHaveLength(5)
      expect(results2).toHaveLength(5)

      // 验证总共有10个角色
      const allCharacters = await characterService.getCharacterProfiles(projectId)
      expect(allCharacters).toHaveLength(10)
    })

    it('应该处理并发的读写操作', async () => {
      const projectId = 'proj-concurrent-003'

      // 先创建一些角色
      for (let i = 0; i < 5; i++) {
        await characterService.upsertCharacterProfile(projectId, {
          name: `读写角色${i}`,
          introduction: `角色${i}`
        })
      }

      // 并发执行读写操作
      const operations = [
        characterService.getCharacterProfiles(projectId),
        characterService.upsertCharacterProfile(projectId, {
          name: '新读写角色',
          introduction: '新角色'
        }),
        characterService.getCharacterProfiles(projectId, { limit: 3 }),
        characterService.upsertCharacterProfile(projectId, {
          name: '读写角色0', // 更新已有角色
          introduction: '更新的介绍'
        })
      ]

      const results = await Promise.all(operations)

      // 验证结果
      expect(results[0]).toHaveLength(5) // 初始查询
      expect((results[1] as any).name).toBe('新读写角色') // 新创建
      expect(results[2]).toHaveLength(3) // 限制查询
      expect((results[3] as any).introduction).toBe('更新的介绍') // 更新
    })
  })

  describe('外观映射功能', () => {
    it('应该正确构建和保存外观映射', async () => {
      const projectId = 'proj-map-001'
      const episodeId = 'ep-map-001'

      // 创建角色
      const char1 = await characterService.upsertCharacterProfile(projectId, {
        name: '角色A',
        introduction: '角色A'
      })
      const char2 = await characterService.upsertCharacterProfile(projectId, {
        name: '角色B',
        introduction: '角色B'
      })

      // 确认角色外观
      await characterService.confirmCharacterProfile(char1.id, [
        { appearanceIndex: 1, changeReason: '初始', description: '外观1' },
        { appearanceIndex: 2, changeReason: '变身', description: '外观2' }
      ])
      await characterService.confirmCharacterProfile(char2.id, [
        { appearanceIndex: 1, changeReason: '初始', description: '外观1' }
      ])

      // 创建剧集
      prisma.mockData.episodes.set(episodeId, {
        id: episodeId,
        projectId,
        characterAppearanceMap: null
      })

      // 构建外观映射
      const appearanceMap = await characterService.buildAppearanceMap(episodeId, [char1.id, char2.id])
      
      // 默认外观索引应该是 1
      expect(appearanceMap[char1.id]).toBe(1)
      expect(appearanceMap[char2.id]).toBe(1)

      // 保存自定义外观映射
      await characterService.saveAppearanceMap(episodeId, {
        [char1.id]: 2, // 角色A使用外观2
        [char2.id]: 1
      })

      // 重新构建应该使用保存的映射
      const updatedMap = await characterService.buildAppearanceMap(episodeId, [char1.id, char2.id])
      expect(updatedMap[char1.id]).toBe(2)
      expect(updatedMap[char2.id]).toBe(1)
    })

    it('应该为分镜规划准备角色信息', async () => {
      const projectId = 'proj-prep-001'
      const episodeId = 'ep-prep-001'

      // 创建角色并确认外观
      const char = await characterService.upsertCharacterProfile(projectId, {
        name: '准备角色',
        introduction: '测试准备'
      })

      await characterService.confirmCharacterProfile(char.id, [
        { appearanceIndex: 1, changeReason: '初始', description: '穿着红色长裙的少女' }
      ])

      // 创建剧集
      prisma.mockData.episodes.set(episodeId, {
        id: episodeId,
        projectId,
        characterAppearanceMap: { [char.id]: 1 }
      })

      // 准备分镜角色信息
      const prep = await characterService.prepareCharactersForStoryboard(episodeId, [char.id])

      expect(prep.appearanceMap).toBeDefined()
      expect(prep.characters).toHaveLength(1)
      expect(prep.appearanceList).toContain('准备角色')
      expect(prep.appearanceList).toContain('穿着红色长裙的少女')
    })
  })

  describe('查询过滤功能', () => {
    it('应该支持按确认状态过滤', async () => {
      const projectId = 'proj-filter-001'

      // 创建未确认角色
      await characterService.upsertCharacterProfile(projectId, {
        name: '未确认角色',
        introduction: '未确认'
      })

      // 创建并确认角色
      const confirmed = await characterService.upsertCharacterProfile(projectId, {
        name: '已确认角色',
        introduction: '已确认'
      })
      await characterService.confirmCharacterProfile(confirmed.id, [
        { appearanceIndex: 1, changeReason: '初始', description: '外观' }
      ])

      // 查询所有角色
      const allChars = await characterService.getCharacterProfiles(projectId)
      expect(allChars).toHaveLength(2)

      // 查询已确认角色
      const confirmedChars = await characterService.getCharacterProfiles(projectId, { confirmedOnly: true })
      expect(confirmedChars).toHaveLength(1)
      expect(confirmedChars[0].name).toBe('已确认角色')
    })

    it('应该支持分页查询', async () => {
      const projectId = 'proj-paging-001'

      // 创建 15 个角色
      for (let i = 0; i < 15; i++) {
        await characterService.upsertCharacterProfile(projectId, {
          name: `分页角色${String(i).padStart(2, '0')}`,
          introduction: `角色${i}`
        })
      }

      // 查询前 10 个
      const page1 = await characterService.getCharacterProfiles(projectId, { limit: 10, offset: 0 })
      expect(page1).toHaveLength(10)

      // 查询后 5 个
      const page2 = await characterService.getCharacterProfiles(projectId, { limit: 10, offset: 10 })
      expect(page2).toHaveLength(5)
    })
  })
})
