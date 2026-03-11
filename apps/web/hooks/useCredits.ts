'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Credit, CreditTransaction } from '@/lib/credits'

export interface CreditsData {
  balance: number
  totalEarned: number
  totalUsed: number
  transactions: CreditTransaction[]
}

export interface CreditStats {
  balance: number
  totalEarned: number
  totalUsed: number
  transactionCount: number
}

export interface CreditCheckResult {
  hasEnough: boolean
  required: number
  balance: number
}

export interface CostEstimate {
  taskType: string
  cost: number
  params?: Record<string, unknown>
  balance: number
  canAfford: boolean
}

const queryKeys = {
  credits: {
    all: ['credits'] as const,
    balance: () => [...queryKeys.credits.all, 'balance'] as const,
    transactions: () => [...queryKeys.credits.all, 'transactions'] as const,
    stats: () => [...queryKeys.credits.all, 'stats'] as const,
  },
}

/**
 * 获取用户积分信息
 */
function useCreditsQuery() {
  return useQuery({
    queryKey: queryKeys.credits.balance(),
    queryFn: async (): Promise<CreditsData> => {
      return api.get('/api/credits')
    },
    staleTime: 30 * 1000, // 30秒
  })
}

/**
 * 获取积分统计
 */
function useCreditStats() {
  return useQuery({
    queryKey: queryKeys.credits.stats(),
    queryFn: async (): Promise<CreditStats> => {
      return api.get('/api/credits?type=stats')
    },
    staleTime: 60 * 1000, // 1分钟
  })
}

/**
 * 获取积分流水
 */
function useCreditTransactions(limit = 20, offset = 0) {
  return useQuery({
    queryKey: [...queryKeys.credits.transactions(), limit, offset],
    queryFn: async (): Promise<{ transactions: CreditTransaction[]; total: number; limit: number; offset: number }> => {
      return api.get(`/api/credits?type=transactions&limit=${limit}&offset=${offset}`)
    },
    staleTime: 30 * 1000,
  })
}

/**
 * 检查积分是否足够
 */
function useCheckCredits() {
  return useMutation({
    mutationFn: async (amount: number): Promise<CreditCheckResult> => {
      return api.get(`/api/credits?type=check&amount=${amount}`)
    },
  })
}

/**
 * 估算任务成本
 */
function useEstimateCost() {
  return useMutation({
    mutationFn: async ({
      taskType,
      params,
    }: {
      taskType: string
      params?: Record<string, unknown>
    }): Promise<CostEstimate> => {
      return api.post('/api/credits', {
        action: 'estimate',
        taskType,
        params,
      })
    },
  })
}

/**
 * 扣除积分
 */
function useDeductCredits() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      amount,
      description,
      taskId,
    }: {
      amount: number
      description: string
      taskId?: string
    }): Promise<{ success: boolean; transaction?: CreditTransaction }> => {
      return api.post('/api/credits', {
        action: 'deduct',
        amount,
        description,
        taskId,
      })
    },
    onSuccess: () => {
      // 刷新积分数据
      queryClient.invalidateQueries({ queryKey: queryKeys.credits.all })
    },
    onError: (error: Error) => {
      toast.error('积分扣除失败', {
        description: error.message || '请检查积分余额',
      })
    },
  })
}

/**
 * 积分相关 Hooks 的聚合
 */
export function useCredits() {
  const { data: credits, isLoading, error, refetch } = useCreditsQuery()
  const { data: stats } = useCreditStats()
  const checkCreditsMutation = useCheckCredits()
  const estimateCostMutation = useEstimateCost()
  const deductCreditsMutation = useDeductCredits()

  return {
    // 数据
    credits,
    balance: credits?.balance || 0,
    totalEarned: credits?.totalEarned || 0,
    totalUsed: credits?.totalUsed || 0,
    transactions: credits?.transactions || [],
    stats,
    
    // 状态
    isLoading,
    error,
    
    // 方法
    refetch,
    checkCredits: checkCreditsMutation.mutateAsync,
    estimateCost: estimateCostMutation.mutateAsync,
    deductCredits: deductCreditsMutation.mutateAsync,
    
    // 加载状态
    isChecking: checkCreditsMutation.isPending,
    isEstimating: estimateCostMutation.isPending,
    isDeducting: deductCreditsMutation.isPending,
  }
}

/**
 * 仅获取积分余额（轻量级）
 */
export function useCreditBalance() {
  const { data: credits, isLoading } = useCreditsQuery()
  
  return {
    balance: credits?.balance || 0,
    isLoading,
  }
}

/**
 * 获取积分流水（带分页）
 */
export function useCreditHistory(limit = 20, offset = 0) {
  const { data, isLoading, error } = useCreditTransactions(limit, offset)
  
  return {
    transactions: data?.transactions || [],
    total: data?.total || 0,
    limit: data?.limit || limit,
    offset: data?.offset || offset,
    isLoading,
    error,
  }
}

export { queryKeys as creditQueryKeys }
