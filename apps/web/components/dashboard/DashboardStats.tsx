'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Users, Video, Clock } from 'lucide-react'

interface DashboardStatsProps {
  userId: string
}

export function DashboardStats({ userId }: DashboardStatsProps) {
  const [stats, setStats] = useState({
    projects: 0,
    characters: 0,
    episodes: 0,
    recentActivity: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 获取统计数据
    const fetchStats = async () => {
      try {
        const [projectsRes] = await Promise.all([
          fetch(`/api/projects`),
        ])

        const projects = await projectsRes.json()

        setStats({
          projects: Array.isArray(projects) ? projects.length : 0,
          characters: 0,
          episodes: 0,
          recentActivity: 0,
        })
      } catch (error) {
        console.error('获取统计数据失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [userId])

  const statCards = [
    {
      title: '项目',
      value: stats.projects,
      icon: FileText,
      description: '创建的短剧项目',
    },
    {
      title: '角色',
      value: stats.characters,
      icon: Users,
      description: '角色档案',
    },
    {
      title: '剧集',
      value: stats.episodes,
      icon: Video,
      description: '已生成剧集',
    },
    {
      title: '最近活动',
      value: stats.recentActivity,
      icon: Clock,
      description: '7 天内活动',
    },
  ]

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">加载中...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
