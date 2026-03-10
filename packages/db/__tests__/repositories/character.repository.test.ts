/**
 * Character Repository Tests
 * 测试角色仓储层
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PrismaClient, CharacterRoleLevel } from '@prisma/client'
import {
  CharacterRepository,
  CreateCharacterInput,
  UpdateCharacterInput,
  FindCharacterOptions,
} from '../../src/repositories/character.repository'

describe('CharacterRepository', () => {
  let mockPrisma: PrismaClient
  let mockCharacterModel: any
  let mockAppearanceModel: any
  let repository: CharacterRepository

  beforeEach(() => {
    // 创建 mock Prisma 客户端
    mockCharacterModel = {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    }

    mockAppearanceModel = {
      findMany: vi.fn(),
      create: vi.fn(),
    }

    mockPrisma = {
      characterProfile: mockCharacterModel,
      characterAppearance: mockAppearanceModel,
    } as unknown as PrismaClient

    repository = new CharacterRepository(mockPrisma)
  })

  describe('constructor', () => {
    it('应该使用传入的 Prisma 实例', () => {
      const customPrisma = {} as PrismaClient
      const repo = new CharacterRepository(customPrisma)
      expect(repo['prisma']).toBe(customPrisma)
    })

    it('应该在不传入时使用全局实例', () => {
      const repo = new CharacterRepository()
      expect(repo['prisma']).toBeDefined()
    })
  })

  describe('findById', () => {
    it('应该通过 ID 查找角色', async () => {
      const mockData = { id: 'char-id', name: '张三', projectId: 'project-id' }
      mockCharacterModel.findFirst.mockResolvedValue(mockData)

      const result = await repository.findById('char-id')

      expect(mockCharacterModel.findFirst).toHaveBeenCalledWith({
        where: { id: 'char-id', deletedAt: null },
        include: {},
      })
      expect(result).toEqual(mockData)
    })

    it('应该包含关联的外观', async () => {
      const mockData = {
        id: 'char-id',
        name: '张三',
        appearances: [{ id: 'app-1', description: '初始造型' }],
      }
      mockCharacterModel.findFirst.mockResolvedValue(mockData)

      await repository.findById('char-id', { includeAppearances: true })

      expect(mockCharacterModel.findFirst).toHaveBeenCalledWith({
        where: { id: 'char-id', deletedAt: null },
        include: { appearances: true },
      })
    })

    it('应该包含已删除的角色', async () => {
      const mockData = { id: 'char-id', name: '张三', deletedAt: new Date() }
      mockCharacterModel.findUnique.mockResolvedValue(mockData)

      await repository.findById('char-id', { withDeleted: true })

      expect(mockCharacterModel.findUnique).toHaveBeenCalledWith({
        where: { id: 'char-id' },
        include: {},
      })
    })

    it('应该在不存在时返回 null', async () => {
      mockCharacterModel.findFirst.mockResolvedValue(null)

      const result = await repository.findById('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('findByProjectId', () => {
    it('应该按项目 ID 查找所有角色', async () => {
      const mockData = [
        { id: 'char-1', name: '张三', roleLevel: 'MAIN' },
        { id: 'char-2', name: '李四', roleLevel: 'SUPPORTING' },
      ]
      mockCharacterModel.findMany.mockResolvedValue(mockData)

      const result = await repository.findByProjectId('project-id')

      expect(mockCharacterModel.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-id', deletedAt: null },
        include: {},
        orderBy: { createdAt: 'desc' },
      })
      expect(result).toEqual(mockData)
    })

    it('应该包含关联的外观', async () => {
      const mockData = [
        { id: 'char-1', name: '张三', appearances: [] },
      ]
      mockCharacterModel.findMany.mockResolvedValue(mockData)

      await repository.findByProjectId('project-id', { includeAppearances: true })

      expect(mockCharacterModel.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-id', deletedAt: null },
        include: { appearances: true },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('应该包含已删除的角色', async () => {
      const mockData = [
        { id: 'char-1', name: '张三', deletedAt: new Date() },
      ]
      mockCharacterModel.findMany.mockResolvedValue(mockData)

      await repository.findByProjectId('project-id', { withDeleted: true })

      expect(mockCharacterModel.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project-id' },
        include: {},
        orderBy: { createdAt: 'desc' },
      })
    })
  })

  describe('findByProjectAndName', () => {
    it('应该按项目和名称查找角色', async () => {
      const mockData = { id: 'char-id', name: '张三', projectId: 'project-id' }
      mockCharacterModel.findUnique.mockResolvedValue(mockData)

      const result = await repository.findByProjectAndName('project-id', '张三')

      expect(mockCharacterModel.findUnique).toHaveBeenCalledWith({
        where: {
          projectId_name: {
            projectId: 'project-id',
            name: '张三',
          },
        },
        include: {},
      })
      expect(result).toEqual(mockData)
    })

    it('应该包含关联的外观', async () => {
      const mockData = {
        id: 'char-id',
        name: '张三',
        appearances: [{ id: 'app-1', description: '初始造型' }],
      }
      mockCharacterModel.findUnique.mockResolvedValue(mockData)

      await repository.findByProjectAndName('project-id', '张三', { includeAppearances: true })

      expect(mockCharacterModel.findUnique).toHaveBeenCalledWith({
        where: {
          projectId_name: {
            projectId: 'project-id',
            name: '张三',
          },
        },
        include: { appearances: true },
      })
    })

    it('应该在不存在时返回 null', async () => {
      mockCharacterModel.findUnique.mockResolvedValue(null)

      const result = await repository.findByProjectAndName('project-id', '不存在')

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('应该创建角色', async () => {
      const input: CreateCharacterInput = {
        projectId: 'project-id',
        name: '张三',
      }

      const mockData = { id: 'char-id', ...input }
      mockCharacterModel.create.mockResolvedValue(mockData)

      const result = await repository.create(input)

      expect(mockCharacterModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          project: { connect: { id: 'project-id' } },
          name: '张三',
          aliases: null,
          personalityTags: null,
          suggestedColors: null,
          visualKeywords: null,
        }),
      })
      expect(result).toEqual(mockData)
    })

    it('应该创建包含可选字段的角色', async () => {
      const input: CreateCharacterInput = {
        projectId: 'project-id',
        name: '张三',
        aliases: ['小张', '三哥'],
        gender: '男',
        ageRange: '20-30',
        roleLevel: 'MAIN' as CharacterRoleLevel,
        personalityTags: ['开朗', '乐观'],
        suggestedColors: ['#FF0000'],
        visualKeywords: ['短发', '高个子'],
      }

      const mockData = { id: 'char-id', ...input }
      mockCharacterModel.create.mockResolvedValue(mockData)

      await repository.create(input)

      expect(mockCharacterModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          project: { connect: { id: 'project-id' } },
          name: '张三',
          aliases: JSON.stringify(['小张', '三哥']),
          gender: '男',
          ageRange: '20-30',
          roleLevel: 'MAIN',
          personalityTags: JSON.stringify(['开朗', '乐观']),
          suggestedColors: JSON.stringify(['#FF0000']),
          visualKeywords: JSON.stringify(['短发', '高个子']),
        }),
      })
    })

    it('应该创建包含预期外观的角色', async () => {
      const input: CreateCharacterInput = {
        projectId: 'project-id',
        name: '张三',
        expectedAppearances: [
          { change_reason: '初始造型', descriptions: ['穿着休闲装'] },
        ],
      }

      const mockData = { id: 'char-id', ...input }
      mockCharacterModel.create.mockResolvedValue(mockData)

      await repository.create(input)

      expect(mockCharacterModel.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expectedAppearances: expect.anything(),
        }),
      })
    })
  })

  describe('update', () => {
    it('应该更新角色', async () => {
      const input: UpdateCharacterInput = {
        name: 'updated-name' as any,
        gender: '女',
      }

      const mockData = { id: 'char-id', gender: '女' }
      mockCharacterModel.update.mockResolvedValue(mockData)

      const result = await repository.update('char-id', input)

      expect(mockCharacterModel.update).toHaveBeenCalledWith({
        where: { id: 'char-id' },
        data: expect.objectContaining({
          gender: '女',
        }),
      })
      expect(result).toEqual(mockData)
    })

    it('应该支持更新 JSON 字段', async () => {
      const input: UpdateCharacterInput = {
        aliases: ['新别名'],
        personalityTags: ['新的标签'],
      }

      const mockData = { id: 'char-id', ...input }
      mockCharacterModel.update.mockResolvedValue(mockData)

      await repository.update('char-id', input)

      expect(mockCharacterModel.update).toHaveBeenCalledWith({
        where: { id: 'char-id' },
        data: expect.objectContaining({
          aliases: JSON.stringify(['新别名']),
          personalityTags: JSON.stringify(['新的标签']),
        }),
      })
    })

    it('应该支持更新外观', async () => {
      const input: UpdateCharacterInput = {
        expectedAppearances: [
          { change_reason: '新造型', descriptions: ['穿着正装'] },
        ],
      }

      const mockData = { id: 'char-id', expectedAppearances: input.expectedAppearances }
      mockCharacterModel.update.mockResolvedValue(mockData)

      await repository.update('char-id', input)

      expect(mockCharacterModel.update).toHaveBeenCalledWith({
        where: { id: 'char-id' },
        data: expect.objectContaining({
          expectedAppearances: { set: input.expectedAppearances },
        }),
      })
    })

    it('应该支持确认档案', async () => {
      const input: UpdateCharacterInput = {
        profileConfirmed: true,
      }

      const mockData = { id: 'char-id', profileConfirmed: true }
      mockCharacterModel.update.mockResolvedValue(mockData)

      await repository.update('char-id', input)

      expect(mockCharacterModel.update).toHaveBeenCalledWith({
        where: { id: 'char-id' },
        data: expect.objectContaining({
          profileConfirmed: true,
        }),
      })
    })
  })

  describe('softDelete', () => {
    it('应该软删除角色', async () => {
      const mockData = { id: 'char-id', deletedAt: expect.any(Date), deletedBy: null }
      mockCharacterModel.update.mockResolvedValue(mockData)

      const result = await repository.softDelete('char-id')

      expect(mockCharacterModel.update).toHaveBeenCalledWith({
        where: { id: 'char-id' },
        data: {
          deletedAt: expect.any(Date),
          deletedBy: undefined,
        },
      })
    })

    it('应该支持传入 deletedBy', async () => {
      const mockData = { id: 'char-id', deletedAt: expect.any(Date), deletedBy: 'user-123' }
      mockCharacterModel.update.mockResolvedValue(mockData)

      await repository.softDelete('char-id', 'user-123')

      expect(mockCharacterModel.update).toHaveBeenCalledWith({
        where: { id: 'char-id' },
        data: {
          deletedAt: expect.any(Date),
          deletedBy: 'user-123',
        },
      })
    })
  })

  describe('restore', () => {
    it('应该恢复已删除的角色', async () => {
      const mockData = { id: 'char-id', deletedAt: null, deletedBy: null }
      mockCharacterModel.update.mockResolvedValue(mockData)

      const result = await repository.restore('char-id')

      expect(mockCharacterModel.update).toHaveBeenCalledWith({
        where: { id: 'char-id' },
        data: {
          deletedAt: null,
          deletedBy: null,
        },
      })
      expect(result.deletedAt).toBeNull()
    })
  })

  describe('confirmProfile', () => {
    it('应该确认角色档案', async () => {
      const mockData = { id: 'char-id', profileConfirmed: true }
      mockCharacterModel.update.mockResolvedValue(mockData)

      const result = await repository.confirmProfile('char-id')

      expect(mockCharacterModel.update).toHaveBeenCalledWith({
        where: { id: 'char-id' },
        data: { profileConfirmed: true },
      })
      expect(result.profileConfirmed).toBe(true)
    })
  })

  describe('addAppearance', () => {
    it('应该添加角色外观', async () => {
      const mockData = {
        id: 'appearance-id',
        characterId: 'char-id',
        appearanceIndex: 0,
        changeReason: '新造型',
        description: '穿着休闲装',
      }
      mockAppearanceModel.create.mockResolvedValue(mockData)

      const result = await repository.addAppearance(
        'char-id',
        0,
        '新造型',
        '穿着休闲装'
      )

      expect(mockAppearanceModel.create).toHaveBeenCalledWith({
        data: {
          characterId: 'char-id',
          appearanceIndex: 0,
          changeReason: '新造型',
          description: '穿着休闲装',
          descriptions: null,
          imageUrls: null,
        },
      })
      expect(result).toEqual(mockData)
    })

    it('应该添加包含描述列表的外观', async () => {
      const mockData = {
        id: 'appearance-id',
        characterId: 'char-id',
        appearanceIndex: 1,
        changeReason: '换装',
        description: '正式造型',
        descriptions: JSON.stringify(['西装', '领带']),
      }
      mockAppearanceModel.create.mockResolvedValue(mockData)

      await repository.addAppearance(
        'char-id',
        1,
        '换装',
        '正式造型',
        ['西装', '领带']
      )

      expect(mockAppearanceModel.create).toHaveBeenCalledWith({
        data: {
          characterId: 'char-id',
          appearanceIndex: 1,
          changeReason: '换装',
          description: '正式造型',
          descriptions: JSON.stringify(['西装', '领带']),
          imageUrls: null,
        },
      })
    })

    it('应该添加包含图片的外观', async () => {
      const mockData = {
        id: 'appearance-id',
        characterId: 'char-id',
        appearanceIndex: 2,
        changeReason: '最终造型',
        description: '最终造型',
        imageUrls: JSON.stringify(['https://example.com/image1.jpg']),
      }
      mockAppearanceModel.create.mockResolvedValue(mockData)

      await repository.addAppearance(
        'char-id',
        2,
        '最终造型',
        '最终造型',
        undefined,
        ['https://example.com/image1.jpg']
      )

      expect(mockAppearanceModel.create).toHaveBeenCalledWith({
        data: {
          characterId: 'char-id',
          appearanceIndex: 2,
          changeReason: '最终造型',
          description: '最终造型',
          descriptions: null,
          imageUrls: JSON.stringify(['https://example.com/image1.jpg']),
        },
      })
    })
  })

  describe('getAppearances', () => {
    it('应该获取角色的所有外观', async () => {
      const mockData = [
        { id: 'app-1', appearanceIndex: 0, description: '初始造型' },
        { id: 'app-2', appearanceIndex: 1, description: '换装' },
      ]
      mockAppearanceModel.findMany.mockResolvedValue(mockData)

      const result = await repository.getAppearances('char-id')

      expect(mockAppearanceModel.findMany).toHaveBeenCalledWith({
        where: { characterId: 'char-id' },
        orderBy: { appearanceIndex: 'asc' },
      })
      expect(result).toEqual(mockData)
    })

    it('应该处理空外观列表', async () => {
      mockAppearanceModel.findMany.mockResolvedValue([])

      const result = await repository.getAppearances('char-id')

      expect(result).toEqual([])
    })
  })

  describe('TypeScript Types', () => {
    it('应该正确使用类型', () => {
      // 类型测试
      const createInput: CreateCharacterInput = {
        projectId: 'project-id',
        name: '张三',
        roleLevel: 'MAIN' as CharacterRoleLevel,
      }

      const updateInput: UpdateCharacterInput = {
        gender: '女',
        profileConfirmed: true,
      }

      const options: FindCharacterOptions = {
        includeAppearances: true,
        withDeleted: false,
      }

      expect(createInput.projectId).toBe('project-id')
      expect(updateInput.profileConfirmed).toBe(true)
      expect(options.includeAppearances).toBe(true)
    })
  })
})
