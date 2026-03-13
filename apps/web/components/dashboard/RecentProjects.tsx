'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Plus, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  updatedAt: string
}

interface RecentProjectsProps {
  userId: string
  limit?: number
}

export function RecentProjects({ userId, limit = 5 }: RecentProjectsProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch(`/api/projects`)
        const data = await res.json()
        // API 返回的是数组格式
        const projectsList = Array.isArray(data) ? data : []
        setProjects(projectsList.slice(0, limit))
      } catch (error) {
        console.error('获取项目列表失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [limit])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      ARCHIVED: 'bg-purple-100 text-purple-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      DRAFT: '草稿',
      IN_PROGRESS: '进行中',
      COMPLETED: '已完成',
      ARCHIVED: '已归档',
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>最近项目</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (projects.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>最近项目</CardTitle>
          <CardDescription>您还没有创建任何项目</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/projects/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              创建第一个项目
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>最近项目</CardTitle>
            <CardDescription>查看您最近创建和编辑的项目</CardDescription>
          </div>
          <Link href="/projects">
            <Button variant="ghost" size="sm">
              查看全部
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <FileText className="h-10 w-10 text-muted-foreground" />
                <div>
                  <h3 className="font-medium">{project.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {project.description || '无描述'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    project.status
                  )}`}
                >
                  {getStatusLabel(project.status)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatDate(project.updatedAt)}
                </span>
                <Link href={`/projects/${project.id}`}>
                  <Button variant="ghost" size="sm">
                    查看
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
