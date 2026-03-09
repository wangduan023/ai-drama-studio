/**
 * Location Repository
 * 场景档案仓储层，封装场景相关的数据库操作
 */
import { Prisma, PrismaClient, LocationType, LocationProfile } from '@prisma/client'
import { prisma } from '../client'

export interface CreateLocationInput {
  projectId: string
  name: string
  description?: string
  eraPeriod?: string
  locationType?: LocationType
  moodColor?: string
  keyElements?: string[]
}

export interface UpdateLocationInput {
  description?: string
  eraPeriod?: string
  locationType?: LocationType
  moodColor?: string
  keyElements?: string[]
  locationConfirmed?: boolean
  deletedAt?: Date | null
  deletedBy?: string
}

export interface FindLocationOptions {
  withDeleted?: boolean
}

export class LocationRepository {
  private prisma: PrismaClient

  constructor(prismaInstance?: PrismaClient) {
    this.prisma = prismaInstance || prisma
  }

  /**
   * 根据 ID 查找场景
   */
  async findById(
    id: string,
    options: FindLocationOptions = {}
  ): Promise<LocationProfile | null> {
    const where: Prisma.LocationProfileWhereUniqueInput = {
      id,
      ...(options.withDeleted ? {} : { deletedAt: null }),
    }

    return this.prisma.locationProfile.findUnique({
      where,
    })
  }

  /**
   * 根据项目 ID 查找所有场景
   */
  async findByProjectId(
    projectId: string,
    options: FindLocationOptions = {}
  ): Promise<LocationProfile[]> {
    const where: Prisma.LocationProfileWhereInput = {
      projectId,
      ...(options.withDeleted ? {} : { deletedAt: null }),
    }

    return this.prisma.locationProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * 根据项目和名称查找
   */
  async findByProjectAndName(
    projectId: string,
    name: string,
    options: FindLocationOptions = {}
  ): Promise<LocationProfile | null> {
    return this.prisma.locationProfile.findUnique({
      where: {
        projectId_name: {
          projectId,
          name,
        },
      },
    })
  }

  /**
   * 创建场景
   */
  async create(input: CreateLocationInput): Promise<LocationProfile> {
    const data: Prisma.LocationProfileCreateInput = {
      project: { connect: { id: input.projectId } },
      name: input.name,
      description: input.description,
      eraPeriod: input.eraPeriod,
      locationType: input.locationType,
      moodColor: input.moodColor,
      keyElements: input.keyElements ? JSON.stringify(input.keyElements) : null,
    }

    return this.prisma.locationProfile.create({ data })
  }

  /**
   * 更新场景
   */
  async update(id: string, input: UpdateLocationInput): Promise<LocationProfile> {
    const data: Prisma.LocationProfileUpdateInput = {}

    if (input.description !== undefined) data.description = input.description
    if (input.eraPeriod !== undefined) data.eraPeriod = input.eraPeriod
    if (input.locationType !== undefined) data.locationType = input.locationType
    if (input.moodColor !== undefined) data.moodColor = input.moodColor
    if (input.keyElements !== undefined) data.keyElements = input.keyElements ? JSON.stringify(input.keyElements) : null
    if (input.locationConfirmed !== undefined) data.locationConfirmed = input.locationConfirmed
    if (input.deletedAt !== undefined) data.deletedAt = input.deletedAt
    if (input.deletedBy !== undefined) data.deletedBy = input.deletedBy

    return this.prisma.locationProfile.update({
      where: { id },
      data,
    })
  }

  /**
   * 软删除场景
   */
  async softDelete(id: string, deletedBy?: string): Promise<LocationProfile> {
    return this.prisma.locationProfile.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
      },
    })
  }

  /**
   * 恢复已删除的场景
   */
  async restore(id: string): Promise<LocationProfile> {
    return this.prisma.locationProfile.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedBy: null,
      },
    })
  }

  /**
   * 确认场景档案
   */
  async confirmLocation(id: string): Promise<LocationProfile> {
    return this.prisma.locationProfile.update({
      where: { id },
      data: { locationConfirmed: true },
    })
  }
}
