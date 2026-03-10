import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import {
  LocationProfileService,
  CharacterServiceError,
} from '../src/services/character.service'
import { LocationType } from '../src/types'

// Mock Prisma Client
vi.mock('@prisma/client', () => {
  return {
    PrismaClient: class MockPrismaClient {
      locationProfile = {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      }
      $transaction = vi.fn()
    }
  }
})

describe('Location Service', () => {
  let prisma: PrismaClient
  let service: LocationProfileService

  beforeEach(() => {
    prisma = new PrismaClient()
    service = new LocationProfileService(prisma)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('LocationProfileService', () => {
    it('should initialize correctly', () => {
      expect(service).toBeDefined()
    })

    it('should throw error for empty location name', async () => {
      await expect(service.upsertLocationProfile('project1', {
        name: ''
      })).rejects.toThrowError(CharacterServiceError)
    })

    it('should throw error for long location name', async () => {
      const longName = 'a'.repeat(101)
      await expect(service.upsertLocationProfile('project1', {
        name: longName
      })).rejects.toThrowError(CharacterServiceError)
    })

    it('should handle duplicate location names', async () => {
      const mockError = {
        code: 'P2002',
        message: 'Unique constraint failed'
      }
      vi.mocked(prisma.locationProfile.findUnique).mockRejectedValue(mockError)

      await expect(service.upsertLocationProfile('project1', {
        name: 'Duplicate Name'
      })).rejects.toThrowError(CharacterServiceError)
    })

    it('should handle database errors', async () => {
      const mockError = new Error('Database error')
      vi.mocked(prisma.locationProfile.findUnique).mockRejectedValue(mockError)

      await expect(service.upsertLocationProfile('project1', {
        name: 'Test Location'
      })).rejects.toThrowError(CharacterServiceError)
    })

    it('should upsert location profile when it does not exist', async () => {
      const mockLocation = {
        id: 'loc1',
        projectId: 'project1',
        name: 'Test Location',
        locationConfirmed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(prisma.locationProfile.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.locationProfile.create).mockResolvedValue(mockLocation)

      const result = await service.upsertLocationProfile('project1', {
        name: 'Test Location'
      })

      expect(result).toEqual(mockLocation)
      expect(prisma.locationProfile.create).toHaveBeenCalledWith({
        data: {
          projectId: 'project1',
          name: 'Test Location',
          locationConfirmed: false,
        },
      })
    })

    it('should update location profile when it exists', async () => {
      const existingLocation = {
        id: 'loc1',
        projectId: 'project1',
        name: 'Test Location',
        locationConfirmed: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedLocation = {
        ...existingLocation,
        description: 'Updated description',
        updatedAt: new Date(),
      }

      vi.mocked(prisma.locationProfile.findUnique).mockResolvedValue(existingLocation)
      vi.mocked(prisma.locationProfile.update).mockResolvedValue(updatedLocation)

      const result = await service.upsertLocationProfile('project1', {
        name: 'Test Location',
        description: 'Updated description'
      })

      expect(result).toEqual(updatedLocation)
      expect(prisma.locationProfile.update).toHaveBeenCalledWith({
        where: { id: 'loc1' },
        data: {
          name: 'Test Location',  // Name should also be updated according to the service implementation
          description: 'Updated description',
          updatedAt: expect.any(Date),
        },
      })
    })

    it('should handle batch upsert with duplicate names', async () => {
      const profiles = [
        { name: 'Location 1' },
        { name: 'Location 1' } // Duplicate name
      ]

      await expect(service.batchUpsertLocationProfiles('project1', profiles))
        .rejects.toThrowError(CharacterServiceError)
    })

    it('should handle empty batch upsert', async () => {
      const result = await service.batchUpsertLocationProfiles('project1', [])
      expect(result).toEqual([])
    })

    it('should validate all inputs in batch upsert', async () => {
      const profiles = [
        { name: 'Valid Location' },
        { name: '' } // Invalid name
      ]

      await expect(service.batchUpsertLocationProfiles('project1', profiles))
        .rejects.toThrowError(CharacterServiceError)
    })

    it('should get all location profiles for a project', async () => {
      const mockLocations = [
        {
          id: 'loc1',
          projectId: 'project1',
          name: 'Location 1',
          locationConfirmed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      ]

      vi.mocked(prisma.locationProfile.findMany).mockResolvedValue(mockLocations)

      const result = await service.getLocationProfiles('project1')

      expect(result).toEqual(mockLocations)
      expect(prisma.locationProfile.findMany).toHaveBeenCalledWith({
        where: { projectId: 'project1', deletedAt: null },
      })
    })

    it('should build locations introduction string', () => {
      const locations = [
        { name: 'Forest', description: 'A dense forest' },
        { name: 'Castle', description: 'An ancient castle' },
        { name: 'Empty', description: null }, // This should be filtered out
      ]

      const introduction = service.buildLocationsIntroduction(locations as any)

      expect(introduction).toBe('- Forest：A dense forest\n- Castle：An ancient castle')
    })

    it('should return "暂无场景介绍" when no locations have descriptions', () => {
      const locations = [
        { name: 'Forest', description: null },
        { name: 'Castle', description: undefined },
      ]

      const introduction = service.buildLocationsIntroduction(locations as any)

      expect(introduction).toBe('暂无场景介绍')
    })

    it('should return "暂无场景介绍" when no locations provided', () => {
      const introduction = service.buildLocationsIntroduction([])
      expect(introduction).toBe('暂无场景介绍')
    })
  })
})