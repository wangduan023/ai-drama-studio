'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FilePlus, Users, Film, Settings } from 'lucide-react'
import Link from 'next/link'

export function QuickActions() {
  const actions = [
    {
      title: '新建项目',
      description: '创建一个新的短剧项目',
      icon: FilePlus,
      href: '/projects/new',
      color: 'text-blue-600',
    },
    {
      title: '角色管理',
      description: '创建和管理角色档案',
      icon: Users,
      href: '/projects?tab=characters',
      color: 'text-green-600',
    },
    {
      title: '分镜制作',
      description: '创建和编辑分镜脚本',
      icon: Film,
      href: '/projects?tab=storyboards',
      color: 'text-purple-600',
    },
    {
      title: '设置',
      description: '管理账户和偏好设置',
      icon: Settings,
      href: '/settings',
      color: 'text-gray-600',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>快捷操作</CardTitle>
        <CardDescription>快速访问常用功能</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.title} href={action.href}>
                <div className="group flex flex-col items-center p-6 border rounded-lg hover:border-primary hover:bg-muted/50 transition-all cursor-pointer text-center">
                  <Icon className={`h-10 w-10 mb-4 ${action.color}`} />
                  <h3 className="font-medium mb-1">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
