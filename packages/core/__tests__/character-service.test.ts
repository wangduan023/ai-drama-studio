import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  CharacterProfileService,
  CharacterServiceError,
  validateCharacterData,
  validateLocationData
} from '../src/services/character.service'
import { CharacterRoleLevel } from '../src/types'

// Mock Prisma Client
vi.mock('@prisma/client', () => {
  return {
    PrismaClient: class MockPrismaClient {
      characterProfile = {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      }
      characterAppearance = {
        upsert: vi.fn(),
        findUnique: vi.fn(),
      }
      episode = {
        findUnique: vi.fn(),
        update: vi.fn(),
      }
      $transaction = vi.fn()
    }
  }
})

describe('Character Service', () => {
  let prisma: PrismaClient
  let service: CharacterProfileService

  beforeEach(() => {
    prisma = new PrismaClient()
    service = new CharacterProfileService(prisma)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('validateCharacterData', () => {
    it('should throw error for empty name', () => {
      expect(() => validateCharacterData({ name: '' }))
        .toThrowError(CharacterServiceError)

      expect(() => validateCharacterData({ name: '   ' }))
        .toThrowError(CharacterServiceError)
    })

    it('should throw error for name exceeding length limit', () => {
      const longName = 'a'.repeat(101)
      expect(() => validateCharacterData({ name: longName }))
        .toThrowError(CharacterServiceError)
    })

    it('should throw error for invalid costume tier', () => {
      expect(() => validateCharacterData({
        name: 'Test Character',
        costumeTier: 0
      })).toThrowError(CharacterServiceError)

      expect(() => validateCharacterData({
        name: 'Test Character',
        costumeTier: 6
      })).toThrowError(CharacterServiceError)
    })

    it('should pass validation for valid data', () => {
      expect(() => validateCharacterData({
        name: 'Valid Name',
        costumeTier: 3
      })).not.toThrow()

      expect(() => validateCharacterData({
        name: 'Valid Name'
      })).not.toThrow()
    })
  })

  describe('validateLocationData', () => {
    it('should throw error for empty name', () => {
      expect(() => validateLocationData({ name: '' }))
        .toThrowError(CharacterServiceError)

      expect(() => validateLocationData({ name: '   ' }))
        .toThrowError(CharacterServiceError)
    })

    it('should throw error for name exceeding length limit', () => {
      const longName = 'a'.repeat(101)
      expect(() => validateLocationData({ name: longName }))
        .toThrowError(CharacterServiceError)
    })

    it('should pass validation for valid data', () => {
      expect(() => validateLocationData({
        name: 'Valid Name'
      })).not.toThrow()
    })
  })

  describe('CharacterProfileService', () => {
    it('should initialize with default options', () => {
      const service = new CharacterProfileService(prisma)
      expect(service).toBeDefined()
    })

    it('should initialize with custom options', () => {
      const service = new CharacterProfileService(prisma, {
        strictValidation: false,
        requirePrimaryIdentifier: false,
        requireShoesDescription: false
      })
      expect(service).toBeDefined()
    })

    it('should throw CharacterServiceError for duplicate character', async () => {
      // Mock Prisma to throw a unique constraint violation
      const mockError = {
        code: 'P2002',
        message: 'Unique constraint failed'
      }
      vi.mocked(prisma.characterProfile.findUnique).mockRejectedValue(mockError)

      await expect(service.upsertCharacterProfile('project1', {
        name: 'Duplicate Name'
      })).rejects.toThrowError(CharacterServiceError)
    })

    it('should validate inputs during upsert', async () => {
      await expect(service.upsertCharacterProfile('project1', {
        name: ''
      })).rejects.toThrowError(CharacterServiceError)
    })

    it('should handle database errors', async () => {
      const mockError = {
        code: 'DATABASE_ERROR',
        message: 'Database connection failed'
      }
      vi.mocked(prisma.characterProfile.findUnique).mockRejectedValue(mockError)

      await expect(service.upsertCharacterProfile('project1', {
        name: 'Test Character'
      })).rejects.toThrowError(CharacterServiceError)
    })

    it('should handle batch upsert with duplicate names', async () => {
      const profiles = [
        { name: 'Character 1' },
        { name: 'Character 1' } // Duplicate name
      ]

      await expect(service.batchUpsertCharacterProfiles('project1', profiles))
        .rejects.toThrowError(CharacterServiceError)
    })

    it('should handle empty batch upsert', async () => {
      const result = await service.batchUpsertCharacterProfiles('project1', [])
      expect(result).toEqual([])
    })

    it('should validate all inputs in batch upsert', async () => {
      const profiles = [
        { name: 'Valid Character' },
        { name: '' } // Invalid name
      ]

      await expect(service.batchUpsertCharacterProfiles('project1', profiles))
        .rejects.toThrowError(CharacterServiceError)
    })

    it('should validate consistency with missing identifier for S-level role', () => {
      const character = {
        id: 'char1',
        name: 'Test Character',
        projectId: 'proj1',
        roleLevel: CharacterRoleLevel.S as CharacterRoleLevel.S,
        profileConfirmed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = service.validateConsistency('some prompt', character)
      expect(result.isValid).toBe(false)
      // This should include multiple violations - both missing_identifier (error) and missing_shoes (warning)
      expect(result.violations).not.toHaveLength(0)
      expect(result.violations.some(v => v.type === 'missing_identifier')).toBe(true)
    })

    it('should validate consistency with missing shoes', () => {
      const character = {
        id: 'char1',
        name: 'Test Character',
        projectId: 'proj1',
        profileConfirmed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Service requires shoes by default
      const result = service.validateConsistency('some prompt without shoes', character)
      expect(result.isValid).toBe(true) // warnings don't make it invalid
      expect(result.violations.some(v => v.type === 'missing_shoes')).toBe(true)
    })

    it('should validate consistency with costume mismatch', () => {
      const character = {
        id: 'char1',
        name: 'Test Character',
        projectId: 'proj1',
        costumeTier: 5, // High tier
        profileConfirmed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const result = service.validateConsistency('some prompt without luxury keywords', character)
      expect(result.isValid).toBe(true) // warnings don't make it invalid
      expect(result.violations.some(v => v.type === 'costume_mismatch')).toBe(true)
    })
  })
})