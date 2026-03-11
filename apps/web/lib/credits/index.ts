/**
 * 积分系统核心服务
 * 提供用户积分查询、扣除、增加等功能
 */

import { prisma } from '@/lib/db'
import { TransactionType, Prisma } from '@prisma/client'
import type { Credit, CreditTransaction } from '@prisma/client'

export { TransactionType }
export type { Credit, CreditTransaction }

/**
 * 包含交易的积分类型
 */
export type CreditWithTransactions = Credit & {
  transactions: CreditTransaction[]
}

/**
 * 获取用户积分信息
 * @param userId - 用户ID
 * @returns 用户积分信息，如果不存在则返回 null
 */
export async function getUserCredits(userId: string): Promise<CreditWithTransactions | null> {
  if (!userId) {
    return null
  }

  const credit = await prisma.credit.findUnique({
    where: { userId },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  return credit
}

/**
 * 确保用户积分记录存在
 * 如果不存在则创建一个新的积分记录
 * @param userId - 用户ID
 * @returns 用户积分信息
 */
export async function ensureUserCredits(userId: string): Promise<Credit> {
  const existing = await prisma.credit.findUnique({
    where: { userId },
  })

  if (existing) {
    return existing
  }

  return prisma.credit.create({
    data: {
      userId,
      balance: 0,
      totalEarned: 0,
      totalUsed: 0,
    },
  })
}

/**
 * 扣除积分
 * @param userId - 用户ID
 * @param amount - 扣除数量（正数）
 * @param description - 扣除描述
 * @param taskId - 关联的任务ID（可选）
 * @returns 扣除结果
 */
export async function deductCredits(
  userId: string,
  amount: number,
  description: string,
  taskId?: string
): Promise<{ success: boolean; error?: string; transaction?: CreditTransaction }> {
  if (!userId) {
    return { success: false, error: '用户ID不能为空' }
  }

  if (amount <= 0) {
    return { success: false, error: '扣除积分必须为正数' }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 获取或创建用户积分记录
      let credit = await tx.credit.findUnique({
        where: { userId },
      })

      if (!credit) {
        credit = await tx.credit.create({
          data: {
            userId,
            balance: 0,
            totalEarned: 0,
            totalUsed: 0,
          },
        })
      }

      // 检查余额是否足够
      if (credit.balance < amount) {
        throw new Error(`积分不足，当前余额: ${credit.balance}，需要: ${amount}`)
      }

      // 更新积分余额
      const updatedCredit = await tx.credit.update({
        where: { userId },
        data: {
          balance: { decrement: amount },
          totalUsed: { increment: amount },
        },
      })

      // 创建交易记录
      const transaction = await tx.creditTransaction.create({
        data: {
          creditId: credit.id,
          type: TransactionType.USE,
          amount: -amount,
          balance: updatedCredit.balance,
          description,
          taskId,
        },
      })

      return { credit: updatedCredit, transaction }
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    })

    return { success: true, transaction: result.transaction }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '扣除积分失败'
    return { success: false, error: errorMessage }
  }
}

/**
 * 增加积分
 * @param userId - 用户ID
 * @param amount - 增加数量（正数）
 * @param type - 交易类型
 * @param description - 描述
 * @param metadata - 额外元数据（可选）
 * @returns 创建的交易记录
 */
export async function addCredits(
  userId: string,
  amount: number,
  type: TransactionType,
  description: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; error?: string; transaction?: CreditTransaction }> {
  if (!userId) {
    return { success: false, error: '用户ID不能为空' }
  }

  if (amount <= 0) {
    return { success: false, error: '增加积分必须为正数' }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 获取或创建用户积分记录
      let credit = await tx.credit.findUnique({
        where: { userId },
      })

      if (!credit) {
        credit = await tx.credit.create({
          data: {
            userId,
            balance: 0,
            totalEarned: 0,
            totalUsed: 0,
          },
        })
      }

      // 更新积分余额
      const updatedCredit = await tx.credit.update({
        where: { userId },
        data: {
          balance: { increment: amount },
          totalEarned: { increment: amount },
        },
      })

      // 创建交易记录
      const transaction = await tx.creditTransaction.create({
        data: {
          creditId: credit.id,
          type,
          amount,
          balance: updatedCredit.balance,
          description,
          metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      })

      return { credit: updatedCredit, transaction }
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    })

    return { success: true, transaction: result.transaction }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '增加积分失败'
    return { success: false, error: errorMessage }
  }
}

/**
 * 退款积分
 * @param userId - 用户ID
 * @param amount - 退款数量
 * @param description - 描述
 * @param taskId - 关联的任务ID（可选）
 * @returns 退款结果
 */
export async function refundCredits(
  userId: string,
  amount: number,
  description: string,
  taskId?: string
): Promise<{ success: boolean; error?: string; transaction?: CreditTransaction }> {
  if (!userId) {
    return { success: false, error: '用户ID不能为空' }
  }

  if (amount <= 0) {
    return { success: false, error: '退款积分必须为正数' }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const credit = await tx.credit.findUnique({
        where: { userId },
      })

      if (!credit) {
        throw new Error('用户积分记录不存在')
      }

      // 更新积分余额
      const updatedCredit = await tx.credit.update({
        where: { userId },
        data: {
          balance: { increment: amount },
          totalUsed: { decrement: amount },
        },
      })

      // 创建交易记录
      const transaction = await tx.creditTransaction.create({
        data: {
          creditId: credit.id,
          type: TransactionType.REFUND,
          amount,
          balance: updatedCredit.balance,
          description,
          taskId,
        },
      })

      return { credit: updatedCredit, transaction }
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    })

    return { success: true, transaction: result.transaction }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '退款失败'
    return { success: false, error: errorMessage }
  }
}

/**
 * 检查积分是否足够
 * @param userId - 用户ID
 * @param amount - 需要检查的数量
 * @returns 是否有足够的积分
 */
export async function hasEnoughCredits(userId: string, amount: number): Promise<boolean> {
  if (!userId || amount <= 0) {
    return false
  }

  const credit = await prisma.credit.findUnique({
    where: { userId },
  })

  if (!credit) {
    return false
  }

  return credit.balance >= amount
}

/**
 * 获取积分流水
 * @param userId - 用户ID
 * @param limit - 限制数量（默认 20）
 * @param offset - 偏移量（默认 0）
 * @returns 积分流水列表
 */
export async function getCreditTransactions(
  userId: string,
  limit = 20,
  offset = 0
): Promise<{ transactions: CreditTransaction[]; total: number }> {
  if (!userId) {
    return { transactions: [], total: 0 }
  }

  const credit = await prisma.credit.findUnique({
    where: { userId },
  })

  if (!credit) {
    return { transactions: [], total: 0 }
  }

  const [transactions, total] = await Promise.all([
    prisma.creditTransaction.findMany({
      where: { creditId: credit.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.creditTransaction.count({
      where: { creditId: credit.id },
    }),
  ])

  return { transactions, total }
}

/**
 * 获取积分统计
 * @param userId - 用户ID
 * @returns 积分统计信息
 */
export async function getCreditStats(userId: string): Promise<{
  balance: number
  totalEarned: number
  totalUsed: number
  transactionCount: number
} | null> {
  if (!userId) {
    return null
  }

  const credit = await prisma.credit.findUnique({
    where: { userId },
    include: {
      _count: {
        select: { transactions: true },
      },
    },
  })

  if (!credit) {
    return null
  }

  return {
    balance: credit.balance,
    totalEarned: credit.totalEarned,
    totalUsed: credit.totalUsed,
    transactionCount: credit._count.transactions,
  }
}
