/**
 * Admin Sidebar
 * 管理后台侧边栏
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { RBACGuard } from '@/components/rbac'
import {
  Key,
  Globe,
  Bot,
  Settings,
  Shield,
  BarChart3,
  Users,
  Lock,
  Cpu,
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  href: string
  icon: React.ReactNode
  resource: string
  action: string
}

interface NavGroup {
  group: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    group: 'AI 管理',
    items: [
      {
        id: 'ai-keys',
        label: '密钥管理',
        href: '/ai-keys',
        icon: <Key className="w-5 h-5" />,
        resource: 'ai_key',
        action: 'read',
      },
      {
        id: 'ai-proxies',
        label: '代理管理',
        href: '/ai-proxies',
        icon: <Globe className="w-5 h-5" />,
        resource: 'ai_proxy',
        action: 'read',
      },
      {
        id: 'ai-providers',
        label: '渠道管理',
        href: '/ai-providers',
        icon: <Bot className="w-5 h-5" />,
        resource: 'ai_provider',
        action: 'read',
      },
      {
        id: 'ai-models',
        label: '模型管理',
        href: '/ai-models',
        icon: <Cpu className="w-5 h-5" />,
        resource: 'ai_model',
        action: 'read',
      },
      {
        id: 'ai-analytics',
        label: '使用统计',
        href: '/ai-analytics',
        icon: <BarChart3 className="w-5 h-5" />,
        resource: 'ai_key',
        action: 'read',
      },
    ],
  },
  {
    group: '权限管理',
    items: [
      {
        id: 'users',
        label: '用户管理',
        href: '/users',
        icon: <Users className="w-5 h-5" />,
        resource: 'user',
        action: 'read',
      },
      {
        id: 'roles',
        label: '角色管理',
        href: '/roles',
        icon: <Shield className="w-5 h-5" />,
        resource: 'role',
        action: 'read',
      },
      {
        id: 'permissions',
        label: '权限管理',
        href: '/permissions',
        icon: <Lock className="w-5 h-5" />,
        resource: 'permission',
        action: 'read',
      },
    ],
  },
  {
    group: '系统',
    items: [
      {
        id: 'settings',
        label: '系统设置',
        href: '/settings',
        icon: <Settings className="w-5 h-5" />,
        resource: 'config',
        action: 'read',
      },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 overflow-y-auto">
      <nav className="p-4 space-y-4">
        {navGroups.map((group) => (
          <div key={group.group}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-2">
              {group.group}
            </h3>
            <div className="space-y-1">
              {group.items.map((item) => (
                <RBACGuard
                  key={item.id}
                  resource={item.resource}
                  action={item.action}
                  hideWhenNoPermission
                >
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                      pathname === item.href || pathname?.startsWith(item.href + '/')
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </RBACGuard>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}
