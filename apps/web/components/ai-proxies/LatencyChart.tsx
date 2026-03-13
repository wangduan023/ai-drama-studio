/**
 * Latency Chart Component
 * 延迟趋势图表组件
 */

'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface LatencyDataPoint {
  timestamp: string
  latency: number
}

interface LatencyChartProps {
  data?: LatencyDataPoint[]
  width?: number
  height?: number
  className?: string
  showGrid?: boolean
  showLabels?: boolean
}

export function LatencyChart({
  data = [],
  width = 300,
  height = 100,
  className,
  showGrid = true,
  showLabels = false,
}: LatencyChartProps) {
  // 生成模拟数据（如果没有真实数据）
  const chartData = useMemo(() => {
    if (data.length === 0) {
      // 生成 24 小时的模拟数据
      const now = Date.now()
      return Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(now - (23 - i) * 3600000).toISOString(),
        latency: Math.floor(Math.random() * 200) + 50,
      }))
    }
    return data
  }, [data])

  // 计算最大值和最小值用于缩放
  const maxLatency = Math.max(...chartData.map(d => d.latency), 100)
  const minLatency = 0

  // 生成 SVG 路径
  const path = useMemo(() => {
    if (chartData.length === 0) return ''

    const padding = showLabels ? 30 : 0
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    const points = chartData.map((point, index) => {
      const x = padding + (index / (chartData.length - 1)) * chartWidth
      const y = padding + chartHeight - ((point.latency - minLatency) / (maxLatency - minLatency)) * chartHeight
      return `${x},${y}`
    })

    return `M ${points.join(' L ')}`
  }, [chartData, width, height, maxLatency, minLatency, showLabels])

  // 填充区域路径
  const areaPath = useMemo(() => {
    if (chartData.length === 0) return ''

    const padding = showLabels ? 30 : 0
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    const points = chartData.map((point, index) => {
      const x = padding + (index / (chartData.length - 1)) * chartWidth
      const y = padding + chartHeight - ((point.latency - minLatency) / (maxLatency - minLatency)) * chartHeight
      return `${x},${y}`
    })

    const firstX = padding
    const lastX = padding + chartWidth
    const baselineY = padding + chartHeight

    return `M ${firstX},${baselineY} L ${points.join(' L ')} L ${lastX},${baselineY} Z`
  }, [chartData, width, height, maxLatency, minLatency, showLabels])

  // 获取延迟颜色
  const getLineColor = (latency: number) => {
    if (latency < 100) return '#22c55e' // green
    if (latency < 300) return '#eab308' // yellow
    return '#ef4444' // red
  }

  const avgLatency = chartData.reduce((sum, d) => sum + d.latency, 0) / chartData.length

  return (
    <div className={cn('space-y-2', className)}>
      <svg
        width={width}
        height={height}
        className="w-full h-auto"
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* 网格线 */}
        {showGrid && (
          <g className="stroke-gray-200" strokeWidth="1">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = height * ratio
              return <line key={ratio} x1="0" x2={width} y1={y} y2={y} />
            })}
          </g>
        )}

        {/* 填充区域 */}
        <path
          d={areaPath}
          className="fill-green-100 opacity-50"
        />

        {/* 折线 */}
        <path
          d={path}
          fill="none"
          stroke="#22c55e"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 数据点 */}
        {chartData.map((point, index) => {
          const padding = showLabels ? 30 : 0
          const chartWidth = width - padding * 2
          const chartHeight = height - padding * 2
          const x = padding + (index / (chartData.length - 1)) * chartWidth
          const y = padding + chartHeight - ((point.latency - minLatency) / (maxLatency - minLatency)) * chartHeight

          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="3"
              fill={getLineColor(point.latency)}
              className="opacity-0 hover:opacity-100 transition-opacity"
            >
              <title>{`${point.latency}ms @ ${new Date(point.timestamp).toLocaleString()}`}</title>
            </circle>
          )
        })}
      </svg>

      {showLabels && (
        <div className="flex justify-between text-xs text-gray-500">
          <span>平均：{avgLatency.toFixed(0)}ms</span>
          <span>最大：{maxLatency}ms</span>
        </div>
      )}
    </div>
  )
}

interface LatencySparklineProps {
  value: number
  trend?: 'up' | 'down' | 'stable'
  className?: string
}

export function LatencySparkline({
  value,
  trend = 'stable',
  className,
}: LatencySparklineProps) {
  const color = value < 100 ? 'text-green-600' : value < 300 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span className={cn('font-bold', color)}>{value}ms</span>
      {trend === 'up' && <span className="text-red-500 text-xs">↑</span>}
      {trend === 'down' && <span className="text-green-500 text-xs">↓</span>}
    </div>
  )
}
