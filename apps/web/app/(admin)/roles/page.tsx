/**
 * Roles Management Page
 * 角色权限管理页面
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { RBACButton } from '@/components/rbac'
import { useConfirm } from '@/components/providers/ConfirmProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  Users,
  Check,
} from 'lucide-react'

interface Permission {
  id: string
  resource: string
  action: string
  name: string
  description: string | null
}

interface Role {
  id: string
  name: string
  type: 'SYSTEM' | 'PROJECT'
  label: string
  description: string | null
  isSystem: boolean
  permissions: Array<{
    id: string
    permissionId: string
    permission: Permission
  }>
  createdAt: string
  updatedAt: string
}

export default function RolesPage() {
  const confirm = useConfirm()
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'ALL' | 'SYSTEM' | 'PROJECT'>('ALL')
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [editingPermissions, setEditingPermissions] = useState(false)

  // 获取角色列表
  const fetchRoles = useCallback(async (type?: string) => {
    setIsLoading(true)
    try {
      const url = new URL('/api/admin/roles', window.location.origin)
      if (type) url.searchParams.set('type', type)

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setRoles(data)
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 获取所有权限
  const fetchPermissions = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/permissions')
      if (response.ok) {
        const data = await response.json()
        setPermissions(data)
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error)
    }
  }, [])

  useEffect(() => {
    fetchRoles()
    fetchPermissions()
  }, [])

  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.label.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'ALL' || role.type === filterType
    return matchesSearch && matchesType
  })

  const getTypeBadge = (type: 'SYSTEM' | 'PROJECT') => {
    return type === 'SYSTEM'
      ? <Badge className="bg-purple-100 text-purple-700">系统角色</Badge>
      : <Badge className="bg-blue-100 text-blue-700">项目角色</Badge>
  }

  const getPermissionCount = (role: Role) => {
    return role.permissions.length
  }

  const togglePermission = (permissionId: string) => {
    if (!selectedRole) return

    const hasPermission = selectedRole.permissions.some(
      p => p.permissionId === permissionId
    )

    if (hasPermission) {
      // 移除权限
      setRoles(prev => prev.map(r => {
        if (r.id === selectedRole.id) {
          return {
            ...r,
            permissions: r.permissions.filter(p => p.permissionId !== permissionId)
          }
        }
        return r
      }))
      setSelectedRole(prev => prev ? {
        ...prev,
        permissions: prev.permissions.filter(p => p.permissionId !== permissionId)
      } : null)
    } else {
      // 添加权限
      const permission = permissions.find(p => p.id === permissionId)
      if (permission) {
        setRoles(prev => prev.map(r => {
          if (r.id === selectedRole.id) {
            return {
              ...r,
              permissions: [...r.permissions, {
                id: `temp-${permissionId}`,
                permissionId,
                permission
              }]
            }
          }
          return r
        }))
        setSelectedRole(prev => prev ? {
          ...prev,
          permissions: [...prev.permissions, {
            id: `temp-${permissionId}`,
            permissionId,
            permission
          }]
        } : null)
      }
    }
  }

  const savePermissions = async () => {
    if (!selectedRole) return

    try {
      const response = await fetch(`/api/admin/roles/${selectedRole.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissionIds: selectedRole.permissions.map(p => p.permissionId)
        })
      })

      if (response.ok) {
        setEditingPermissions(false)
        setSelectedRole(null)
        // 清除 RBAC 权限缓存，使变更立即生效
        import('@/hooks/useRBAC').then(({ clearRBACCache }) => {
          clearRBACCache()
          console.log('[RolesPage] RBAC cache cleared after permission update')
        })
      }
    } catch (error) {
      console.error('Failed to save permissions:', error)
    }
  }

  const deleteRole = async (role: Role) => {
    confirm({
      title: '删除确认',
      message: `确定要删除角色 "${role.label}" 吗？此操作不可恢复。`,
      confirmText: '删除',
      cancelText: '取消',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/admin/roles/${role.id}`, {
            method: 'DELETE'
          })

          if (response.ok) {
            setRoles(prev => prev.filter(r => r.id !== role.id))
            toast.success('删除成功', {
              description: `角色 "${role.label}" 已被删除`,
            })
          } else {
            const data = await response.json()
            toast.error('删除失败', {
              description: data.error || '请稍后重试',
            })
          }
        } catch (error: any) {
          console.error('Failed to delete role:', error)
          toast.error('删除失败', {
            description: error.message || '请稍后重试',
          })
        }
      },
    })
  }

  // 按资源分组权限
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = []
    }
    acc[perm.resource].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

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
          <h1 className="text-2xl font-bold text-gray-900">角色权限管理</h1>
          <p className="text-gray-500 mt-1">管理系统角色和权限分配</p>
        </div>

        <RBACButton resource="role" action="create">
          <Plus className="w-4 h-4 mr-2" />
          新建角色
        </RBACButton>
      </div>

      {/* 筛选和搜索 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Badge
            variant={filterType === 'ALL' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilterType('ALL')}
          >
            全部
          </Badge>
          <Badge
            variant={filterType === 'SYSTEM' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilterType('SYSTEM')}
          >
            系统角色
          </Badge>
          <Badge
            variant={filterType === 'PROJECT' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilterType('PROJECT')}
          >
            项目角色
          </Badge>
        </div>

        <div className="relative flex-1 max-w-md ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索角色..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* 角色列表 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredRoles.map((role) => (
          <Card key={role.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{role.label}</h3>
                    <p className="text-xs text-gray-500">{role.name}</p>
                  </div>
                </div>
                {getTypeBadge(role.type)}
              </div>

              {role.description && (
                <p className="text-sm text-gray-600 mb-3">{role.description}</p>
              )}

              <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                <span className="flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  {getPermissionCount(role)} 个权限
                </span>
                <span>{new Date(role.createdAt).toLocaleDateString()}</span>
              </div>

              <div className="flex gap-2 pt-3 border-t">
                <RBACButton
                  resource="role"
                  action="update"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setSelectedRole(role)
                    setEditingPermissions(true)
                  }}
                >
                  <Edit2 className="w-3 h-3 mr-1" />
                  编辑权限
                </RBACButton>

                {!role.isSystem && (
                  <RBACButton
                    resource="role"
                    action="delete"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => deleteRole(role)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </RBACButton>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRoles.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>暂无角色</p>
        </div>
      )}

      {/* 编辑权限模态框 */}
      {editingPermissions && selectedRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>编辑权限 - {selectedRole.label}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedRole.name} ({selectedRole.type})
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setEditingPermissions(false)
                    setSelectedRole(null)
                  }}
                >
                  ×
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto">
              {Object.entries(groupedPermissions).map(([resource, perms]) => (
                <div key={resource} className="mb-6">
                  <h4 className="font-semibold text-sm text-gray-700 mb-2 capitalize">
                    {resource}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {perms.map((perm) => {
                      const isChecked = selectedRole.permissions.some(
                        p => p.permissionId === perm.id
                      )
                      return (
                        <label
                          key={perm.id}
                          className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-blue-50 border-blue-200'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(perm.id)}
                            className="w-4 h-4"
                          />
                          <span className="text-sm">
                            {perm.action}
                            {perm.description && (
                              <span className="text-gray-500 ml-1">
                                - {perm.description}
                              </span>
                            )}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </CardContent>

            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingPermissions(false)
                  setSelectedRole(null)
                }}
              >
                取消
              </Button>
              <RBACButton
                resource="role"
                action="update"
                onClick={savePermissions}
              >
                保存
              </RBACButton>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
