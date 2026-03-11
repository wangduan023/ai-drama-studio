/**
 * 积分系统 API 路由
 * GET - 获取当前用户积分
 * POST /deduct - 扣除积分（内部使用）
 * GET /transactions - 获取积分流水
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth/middleware'
import {
  getUserCredits,
  getCreditTransactions,
  getCreditStats,
  deductCredits,
  addCredits,
  hasEnoughCredits,
  TransactionType,
  type CreditWithTransactions,
} from '@/lib/credits'
import { calculateTaskCost } from '@/lib/credits/cost'

/**
 * GET /api/credits
 * 获取当前用户积分信息
 */
export async function GET(request: NextRequest) {
  // 认证检查
  const authResult = await verifyAuth(request)
  if (authResult.error || !authResult.user) {
    return NextResponse.json({ error: authResult.error || '未认证' }, { status: 401 })
  }

  const userId = authResult.user.id
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  try {
    // 获取积分流水
    if (type === 'transactions') {
      const limit = parseInt(searchParams.get('limit') || '20')
      const offset = parseInt(searchParams.get('offset') || '0')
      
      const { transactions, total } = await getCreditTransactions(userId, limit, offset)
      
      return NextResponse.json({
        transactions,
        total,
        limit,
        offset,
      })
    }

    // 获取积分统计
    if (type === 'stats') {
      const stats = await getCreditStats(userId)
      
      if (!stats) {
        return NextResponse.json({
          balance: 0,
          totalEarned: 0,
          totalUsed: 0,
          transactionCount: 0,
        })
      }
      
      return NextResponse.json(stats)
    }

    // 检查积分是否足够
    if (type === 'check') {
      const amount = parseFloat(searchParams.get('amount') || '0')
      
      if (amount <= 0) {
        return NextResponse.json({ error: '无效的检查金额' }, { status: 400 })
      }
      
      const hasEnough = await hasEnoughCredits(userId, amount)
      const credits = await getUserCredits(userId)
      
      return NextResponse.json({
        hasEnough,
        required: amount,
        balance: credits?.balance || 0,
      })
    }

    // 默认返回用户积分信息
    const credits = await getUserCredits(userId)
    
    if (!credits) {
      return NextResponse.json({
        balance: 0,
        totalEarned: 0,
        totalUsed: 0,
        transactions: [],
      })
    }

    return NextResponse.json({
      balance: credits.balance,
      totalEarned: credits.totalEarned,
      totalUsed: credits.totalUsed,
      transactions: credits.transactions,
    })
  } catch (error) {
    console.error('获取积分信息失败:', error)
    return NextResponse.json(
      { error: '获取积分信息失败' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/credits
 * 扣除或增加积分（内部使用）
 */
export async function POST(request: NextRequest) {
  // 认证检查
  const authResult = await verifyAuth(request)
  if (authResult.error || !authResult.user) {
    return NextResponse.json({ error: authResult.error || '未认证' }, { status: 401 })
  }

  const userId = authResult.user.id

  try {
    const body = await request.json()
    const { action, amount, description, taskId, type, metadata, taskType, params } = body

    // 扣除积分
    if (action === 'deduct') {
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: '无效的扣除金额' }, { status: 400 })
      }

      const result = await deductCredits(
        userId,
        amount,
        description || '积分扣除',
        taskId
      )

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || '扣除积分失败' },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        transaction: result.transaction,
      })
    }

    // 增加积分
    if (action === 'add') {
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: '无效的增加金额' }, { status: 400 })
      }

      const transactionType = type || TransactionType.EARN
      
      const result = await addCredits(
        userId,
        amount,
        transactionType,
        description || '积分增加',
        metadata
      )

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || '增加积分失败' },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        transaction: result.transaction,
      })
    }

    // 估算任务成本
    if (action === 'estimate') {
      if (!taskType) {
        return NextResponse.json({ error: '缺少任务类型' }, { status: 400 })
      }

      const cost = calculateTaskCost(taskType, params)
      const credits = await getUserCredits(userId)

      return NextResponse.json({
        taskType,
        cost,
        params,
        balance: credits?.balance || 0,
        canAfford: (credits?.balance || 0) >= cost,
      })
    }

    return NextResponse.json({ error: '无效的操作类型' }, { status: 400 })
  } catch (error) {
    console.error('积分操作失败:', error)
    return NextResponse.json(
      { error: '积分操作失败' },
      { status: 500 }
    )
  }
}
