'use client'

import { useState } from 'react'
import { Coins, Loader2, History, ArrowUpRight, ArrowDownLeft, Gift, ShoppingCart, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useCredits, useCreditHistory } from '@/hooks/useCredits'
import { TransactionType } from '@/lib/credits'
import { cn } from '@/lib/utils'

interface CreditDisplayProps {
  showHistory?: boolean
  variant?: 'default' | 'compact'
}

/**
 * 获取交易类型图标
 */
function getTransactionIcon(type: TransactionType) {
  switch (type) {
    case TransactionType.EARN:
      return <ArrowUpRight className="h-4 w-4 text-green-500" />
    case TransactionType.USE:
      return <ArrowDownLeft className="h-4 w-4 text-red-500" />
    case TransactionType.REFUND:
      return <RotateCcw className="h-4 w-4 text-blue-500" />
    case TransactionType.PURCHASE:
      return <ShoppingCart className="h-4 w-4 text-purple-500" />
    case TransactionType.BONUS:
      return <Gift className="h-4 w-4 text-amber-500" />
    default:
      return <Coins className="h-4 w-4" />
  }
}

/**
 * 获取交易类型标签
 */
function getTransactionLabel(type: TransactionType) {
  switch (type) {
    case TransactionType.EARN:
      return '获得'
    case TransactionType.USE:
      return '使用'
    case TransactionType.REFUND:
      return '退款'
    case TransactionType.PURCHASE:
      return '购买'
    case TransactionType.BONUS:
      return '奖励'
    default:
      return type
  }
}

/**
 * 获取交易类型颜色
 */
function getTransactionColor(type: TransactionType) {
  switch (type) {
    case TransactionType.EARN:
    case TransactionType.BONUS:
    case TransactionType.REFUND:
      return 'text-green-500'
    case TransactionType.USE:
      return 'text-red-500'
    case TransactionType.PURCHASE:
      return 'text-purple-500'
    default:
      return 'text-muted-foreground'
  }
}

/**
 * 积分显示组件（Header 中使用）
 */
export function CreditDisplay({ showHistory = true, variant = 'default' }: CreditDisplayProps) {
  const { balance, isLoading } = useCredits()
  const [historyOpen, setHistoryOpen] = useState(false)

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
        <Coins className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            Math.floor(balance)
          )}
        </span>
      </div>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 px-2 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              <Coins className="h-4 w-4 text-amber-500" />
              <span className="font-medium">
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  Math.floor(balance)
                )}
              </span>
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-72">
          <CreditSummary />
          {showHistory && (
            <>
              <Separator className="my-2" />
              <div className="px-2 pb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => setHistoryOpen(true)}
                >
                  <History className="h-4 w-4" />
                  查看完整流水
                </Button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 积分流水弹窗 */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              积分流水
            </DialogTitle>
          </DialogHeader>
          <CreditHistoryList />
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * 积分摘要卡片
 */
function CreditSummary() {
  const { credits, stats, isLoading } = useCredits()

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* 当前余额 */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">当前余额</p>
        <p className="text-3xl font-bold text-amber-500">
          {Math.floor(credits?.balance || 0)}
          <Coins className="h-6 w-6 inline-block ml-1" />
        </p>
      </div>

      {/* 统计 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="text-center p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
          <p className="text-xs text-muted-foreground">累计获得</p>
          <p className="text-lg font-semibold text-green-600">
            +{Math.floor(stats?.totalEarned || 0)}
          </p>
        </div>
        <div className="text-center p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
          <p className="text-xs text-muted-foreground">累计使用</p>
          <p className="text-lg font-semibold text-red-600">
            -{Math.floor(stats?.totalUsed || 0)}
          </p>
        </div>
      </div>

      {/* 最近交易 */}
      {credits?.transactions && credits.transactions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">最近交易</p>
          <div className="space-y-1">
            {credits.transactions.slice(0, 3).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
              >
                <div className="flex items-center gap-2">
                  {getTransactionIcon(tx.type)}
                  <span className="truncate max-w-[120px]">{tx.description || getTransactionLabel(tx.type)}</span>
                </div>
                <span className={cn('font-medium', getTransactionColor(tx.type))}>
                  {tx.amount > 0 ? '+' : ''}{Math.floor(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 积分流水列表
 */
function CreditHistoryList() {
  const { transactions, total, isLoading } = useCreditHistory(50)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Coins className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>暂无积分记录</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2 pr-4">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-background rounded-full">
                {getTransactionIcon(tx.type)}
              </div>
              <div>
                <p className="font-medium text-sm">
                  {tx.description || getTransactionLabel(tx.type)}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{getTransactionLabel(tx.type)}</span>
                  <span>·</span>
                  <span>
                    {format(new Date(tx.createdAt), 'MM-dd HH:mm', { locale: zhCN })}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className={cn('font-bold', getTransactionColor(tx.type))}>
                {tx.amount > 0 ? '+' : ''}{Math.floor(tx.amount)}
              </p>
              <p className="text-xs text-muted-foreground">
                余额 {Math.floor(tx.balance)}
              </p>
            </div>
          </div>
        ))}
        
        {total > transactions.length && (
          <p className="text-center text-xs text-muted-foreground py-2">
            共 {total} 条记录，显示前 {transactions.length} 条
          </p>
        )}
      </div>
    </ScrollArea>
  )
}

/**
 * 积分卡片组件（用于设置页面等）
 */
export function CreditCard() {
  const { credits, stats, isLoading } = useCredits()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-amber-500" />
          我的积分
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 余额 */}
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-1">当前积分余额</p>
          {isLoading ? (
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          ) : (
            <p className="text-4xl font-bold text-amber-500">
              {Math.floor(credits?.balance || 0)}
            </p>
          )}
        </div>

        {/* 统计 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">累计获得</p>
            <p className="text-lg font-semibold text-green-600">
              +{Math.floor(stats?.totalEarned || 0)}
            </p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">累计使用</p>
            <p className="text-lg font-semibold text-red-600">
              -{Math.floor(stats?.totalUsed || 0)}
            </p>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <p className="text-xs text-muted-foreground">交易次数</p>
            <p className="text-lg font-semibold">
              {stats?.transactionCount || 0}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * 积分不足提示组件
 */
export function InsufficientCreditsAlert({ required, current }: { required: number; current: number }) {
  return (
    <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
      <div className="flex items-start gap-3">
        <Coins className="h-5 w-5 text-red-500 mt-0.5" />
        <div>
          <p className="font-medium text-red-700 dark:text-red-400">积分不足</p>
          <p className="text-sm text-red-600 dark:text-red-300">
            需要 <strong>{Math.floor(required)}</strong> 积分，
            当前余额 <strong>{Math.floor(current)}</strong> 积分
          </p>
        </div>
      </div>
    </div>
  )
}

/**
 * 任务成本预估组件
 */
export function TaskCostEstimate({ 
  taskType, 
  params 
}: { 
  taskType: string
  params?: Record<string, unknown>
}) {
  const { estimateCost, isEstimating } = useCredits()
  const [estimate, setEstimate] = useState<{
    cost: number
    balance: number
    canAfford: boolean
  } | null>(null)

  // 自动估算成本
  useState(() => {
    const doEstimate = async () => {
      try {
        const result = await estimateCost({ taskType, params })
        setEstimate(result)
      } catch {
        // 忽略错误
      }
    }
    doEstimate()
  })

  if (isEstimating) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        计算成本中...
      </div>
    )
  }

  if (!estimate) return null

  return (
    <div className="flex items-center gap-2 text-sm">
      <Coins className="h-4 w-4 text-amber-500" />
      <span>预计消耗:</span>
      <Badge variant={estimate.canAfford ? 'secondary' : 'destructive'}>
        {estimate.cost} 积分
      </Badge>
      {!estimate.canAfford && (
        <span className="text-xs text-red-500">(余额不足)</span>
      )}
    </div>
  )
}
