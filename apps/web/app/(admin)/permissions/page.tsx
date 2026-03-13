/**
 * Permissions Management Page
 * 权限管理页面
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { RBACButton } from '@/components/rbac'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Lock,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Key,
} from 'lucide-react'

interface Permission {
  id: string
  resource: string
  action: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export default function PermissionsPage() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterResource, setFilterResource] = useState<string>('ALL')

  // 获取权限列表
  const fetchPermissions = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/permissions')
      if (response.ok) {
        const data = await response.json()
        setPermissions(data)
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPermissions()
  }, [])

  // 获取所有资源类型
  const resources = Array.from(new Set(permissions.map(p => p.resource)))
  const uniquePermissions = permissions.filter(
    (p, index, self) => index === self.findIndex((t) => t.resource === p.resource && t.action === p.action)
  )

  const filteredPermissions = uniquePermissions.filter(permission => {
    const matchesSearch =
      permission.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesResource = filterResource === 'ALL' || permission.resource === filterResource
    return matchesSearch && matchesResource
  })

  const getResourceBadge = (resource: string) => {
    const colors: Record<string, string> = {
      user: 'bg-blue-100 text-blue-700',
      role: 'bg-purple-100 text-purple-700',
      permission: 'bg-green-100 text-green-700',
      ai_key: 'bg-orange-100 text-orange-700',
      ai_proxy: 'bg-cyan-100 text-cyan-700',
      ai_provider: 'bg-indigo-100 text-indigo-700',
      config: 'bg-gray-100 text-gray-700',
    }
    return (
      <Badge className={colors[resource] || 'bg-gray-100 text-gray-700'}>
        {resource}
      </Badge>
    )
  }

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      create: 'bg-green-100 text-green-700',
      read: 'bg-blue-100 text-blue-700',
      update: 'bg-yellow-100 text-yellow-700',
      delete: 'bg-red-100 text-red-700',
    }
    return (
      <Badge
        variant="outline"
        className={colors[action] || 'bg-gray-100 text-gray-700'}
      >
        {action}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">权限管理</h1>
          <p className="text-gray-500 mt-1">管理系统权限定义</p>
        </div>

        <RBACButton resource="permission" action="create">
          <Plus className="w-4 h-4 mr-2" />
          新建权限
        </RBACButton>
      </div>

      {/* 筛选和搜索 */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant={filterResource === 'ALL' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilterResource('ALL')}
          >
            全部
          </Badge>
          {resources.map(resource => (
            <Badge
              key={resource}
              variant={filterResource === resource ? 'default' : 'outline'}
              className="cursor-pointer capitalize"
              onClick={() => setFilterResource(resource)}
            >
              {resource}
            </Badge>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px] ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索权限..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 权限列表 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPermissions.map((permission) => (
          <Card key={permission.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Key className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{permission.name}</h3>
                    <p className="text-xs text-gray-500">
                      {permission.resource}.{permission.action}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                {getResourceBadge(permission.resource)}
                {getActionBadge(permission.action)}
              </div>

              {permission.description && (
                <p className="text-sm text-gray-600 mb-3">
                  {permission.description}
                </p>
              )}

              <div className="text-xs text-gray-400">
                创建：{new Date(permission.createdAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredPermissions.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Lock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无权限</p>
          </div>
        )}
      </div>
    </div>
  )
}
