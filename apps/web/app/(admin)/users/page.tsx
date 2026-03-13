/**
 * Users Management Page
 * 用户管理页面
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { RBACButton } from '@/components/rbac'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  Mail,
  Shield,
} from 'lucide-react'

interface Role {
  id: string
  name: string
  label: string
}

interface User {
  id: string
  email: string
  name: string | null
  avatar: string | null
  isActive: boolean
  roles: Role[]
  createdAt: string
  updatedAt: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editingRoles, setEditingRoles] = useState(false)
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])

  // 获取用户列表
  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 获取所有角色
  const fetchRoles = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/roles')
      if (response.ok) {
        const data = await response.json()
        setAvailableRoles(data)
      }
    } catch (error) {
      console.error('Failed to fetch roles:', error)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [])

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const getUserRoleBadges = (user: User) => {
    if (user.roles.length === 0) {
      return <Badge variant="outline" className="text-xs">无角色</Badge>
    }
    return user.roles.map(role => (
      <Badge key={role.id} variant="secondary" className="text-xs">
        {role.label}
      </Badge>
    ))
  }

  const toggleUserRole = (roleId: string) => {
    if (!selectedUser) return

    const hasRole = selectedUser.roles.some(r => r.id === roleId)

    if (hasRole) {
      setUsers(prev => prev.map(u => {
        if (u.id === selectedUser.id) {
          return {
            ...u,
            roles: u.roles.filter(r => r.id !== roleId)
          }
        }
        return u
      }))
      setSelectedUser(prev => prev ? {
        ...prev,
        roles: prev.roles.filter(r => r.id !== roleId)
      } : null)
    } else {
      const role = availableRoles.find(r => r.id === roleId)
      if (role) {
        setUsers(prev => prev.map(u => {
          if (u.id === selectedUser.id) {
            return {
              ...u,
              roles: [...u.roles, role]
            }
          }
          return u
        }))
        setSelectedUser(prev => prev ? {
          ...prev,
          roles: [...prev.roles, role]
        } : null)
      }
    }
  }

  const saveUserRoles = async () => {
    if (!selectedUser) return

    try {
      // 获取用户当前的角色（从服务器）
      const currentRolesRes = await fetch(`/api/admin/users/${selectedUser.id}/roles`)
      const currentRoles = await currentRolesRes.json()
      const currentRoleIds = currentRoles.map((r: any) => r.id)

      // 计算需要添加和移除的角色
      const newRoleIds = selectedUser.roles.map(r => r.id)
      const toAdd = newRoleIds.filter(id => !currentRoleIds.includes(id))
      const toRemove = currentRoleIds.filter(id => !newRoleIds.includes(id))

      // 逐个添加/移除
      const promises: Promise<any>[] = []

      for (const roleId of toAdd) {
        promises.push(
          fetch(`/api/admin/users/${selectedUser.id}/roles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roleId })
          })
        )
      }

      for (const roleId of toRemove) {
        promises.push(
          fetch(`/api/admin/users/${selectedUser.id}/roles`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roleId })
          })
        )
      }

      await Promise.all(promises)

      setEditingRoles(false)
      setSelectedUser(null)
      fetchUsers()
    } catch (error) {
      console.error('Failed to save user roles:', error)
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('确定要删除此用户吗？')) return

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId))
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
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
          <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
          <p className="text-gray-500 mt-1">管理系统用户和角色分配</p>
        </div>

        <RBACButton resource="user" action="create">
          <Plus className="w-4 h-4 mr-2" />
          新建用户
        </RBACButton>
      </div>

      {/* 搜索栏 */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="搜索用户邮箱或姓名..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 用户列表 */}
      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className={!user.isActive ? 'opacity-60' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name || user.email}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <Users className="w-6 h-6 text-blue-600" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">
                        {user.name || user.email}
                      </h3>
                      {!user.isActive && (
                        <Badge variant="outline" className="text-xs">已禁用</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="w-4 h-4" />
                      {user.email}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Shield className="w-4 h-4 text-gray-400" />
                      {getUserRoleBadges(user)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <RBACButton
                    resource="user"
                    action="update"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedUser(user)
                      setEditingRoles(true)
                    }}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    编辑角色
                  </RBACButton>

                  <RBACButton
                    resource="user"
                    action="delete"
                    variant="ghost"
                    size="icon"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => deleteUser(user.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </RBACButton>
                </div>
              </div>

              <div className="flex items-center gap-6 mt-4 pt-4 border-t text-sm text-gray-500">
                <span>
                  加入时间：{new Date(user.createdAt).toLocaleDateString()}
                </span>
                {user.updatedAt !== user.createdAt && (
                  <span>
                    更新：{new Date(user.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无用户</p>
          </div>
        )}
      </div>

      {/* 编辑角色模态框 */}
      {editingRoles && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-semibold text-lg">编辑角色 - {selectedUser.name || selectedUser.email}</h3>
                <p className="text-sm text-gray-500">{selectedUser.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setEditingRoles(false)
                  setSelectedUser(null)
                }}
              >
                ×
              </Button>
            </div>

            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {availableRoles.map((role) => {
                const hasRole = selectedUser.roles.some(r => r.id === role.id)
                return (
                  <label
                    key={role.id}
                    className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${
                      hasRole
                        ? 'bg-blue-50 border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={hasRole}
                      onChange={() => toggleUserRole(role.id)}
                      className="w-4 h-4"
                    />
                    <div>
                      <div className="font-medium">{role.label}</div>
                      <div className="text-xs text-gray-500">{role.name}</div>
                    </div>
                  </label>
                )
              })}
            </div>

            <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingRoles(false)
                  setSelectedUser(null)
                }}
              >
                取消
              </Button>
              <RBACButton
                resource="user"
                action="update"
                onClick={saveUserRoles}
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
