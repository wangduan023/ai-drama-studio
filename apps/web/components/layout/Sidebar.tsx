'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Film,
  Users,
  MapPin,
  LayoutDashboard,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Shield,
  Key,
  Globe,
  Bot,
  Cpu,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/hooks/useAuth'
import { LoginPrompt } from '@/components/ui/LoginPrompt'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

// 定义用户角色类型
type UserRole = 'USER' | 'PREMIUM' | 'ADMIN' | 'SUPER_ADMIN'

// 菜单项配置
interface NavItemConfig {
  title: string
  href: string
  icon: React.ElementType
  requireAuth: boolean
  allowedRoles?: UserRole[] // 允许访问的角色，不传则所有登录用户都可访问
  adminOnly?: boolean // 仅管理员可见
}

// 主导航菜单
const mainNavItems: NavItemConfig[] = [
  {
    title: '首页',
    href: '/',
    icon: LayoutDashboard,
    requireAuth: true,
  },
  {
    title: '项目库',
    href: '/projects',
    icon: Film,
    requireAuth: true,
  },
  {
    title: '角色库',
    href: '/library/characters',
    icon: Users,
    requireAuth: true,
  },
  {
    title: '场景库',
    href: '/library/locations',
    icon: MapPin,
    requireAuth: true,
  },
  {
    title: '待办事项',
    href: '/todos',
    icon: CheckSquare,
    requireAuth: true,
  },
]

// 管理菜单（仅管理员可见）
const adminNavItems: NavItemConfig[] = [
  {
    title: '密钥管理',
    href: '/ai-keys',
    icon: Key,
    requireAuth: true,
    adminOnly: true,
  },
  {
    title: '代理管理',
    href: '/ai-proxies',
    icon: Globe,
    requireAuth: true,
    adminOnly: true,
  },
  {
    title: '渠道管理',
    href: '/ai-providers',
    icon: Bot,
    requireAuth: true,
    adminOnly: true,
  },
  {
    title: '模型管理',
    href: '/ai-models',
    icon: Cpu,
    requireAuth: true,
    adminOnly: true,
  },
  {
    title: '用户管理',
    href: '/users',
    icon: Users,
    requireAuth: true,
    adminOnly: true,
  },
  {
    title: '角色管理',
    href: '/roles',
    icon: Shield,
    requireAuth: true,
    adminOnly: true,
  },
  {
    title: '权限管理',
    href: '/permissions',
    icon: Key,
    requireAuth: true,
    adminOnly: true,
  },
]

// 辅助导航菜单
const secondaryNavItems: NavItemConfig[] = [
  {
    title: '设置',
    href: '/settings',
    icon: Settings,
    requireAuth: true,
  },
  {
    title: '帮助',
    href: '/help',
    icon: HelpCircle,
    requireAuth: false,
  },
]

// 检查用户是否有权限访问菜单
function hasPermission(userRole: UserRole | undefined, item: NavItemConfig): boolean {
  // 不需要登录的菜单
  if (!item.requireAuth) return true

  // 需要登录但未登录
  if (!userRole) return false

  // 仅管理员可见的菜单
  if (item.adminOnly) {
    return userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'
  }

  // 指定了允许角色的菜单
  if (item.allowedRoles) {
    return item.allowedRoles.includes(userRole)
  }

  // 默认所有登录用户可访问
  return true
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState('')

  const userRole = user?.role

  // 过滤出有权限访问的菜单
  const filteredMainNavItems = mainNavItems.filter(item =>
    hasPermission(userRole, item)
  )
  const filteredAdminNavItems = adminNavItems.filter(item =>
    hasPermission(userRole, item)
  )
  const filteredSecondaryNavItems = secondaryNavItems.filter(item =>
    hasPermission(userRole, item)
  )

  const handleNavClick = (href: string, requireAuth: boolean) => {
    if (requireAuth && !isAuthenticated) {
      setPendingNavigation(href)
      setShowLoginPrompt(true)
      return false
    }
    return true
  }

  const handleLogin = () => {
    setShowLoginPrompt(false)
    router.push('/login')
  }

  const handleClosePrompt = () => {
    setShowLoginPrompt(false)
    setPendingNavigation('')
  }

  // 检查是否是管理员
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r bg-card',
        collapsed ? 'w-[72px]' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        <Link href="/" className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Film className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="whitespace-nowrap font-semibold"
            >
              AI Drama
            </motion.span>
          )}
        </Link>
      </div>

      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background shadow-sm hidden lg:flex"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>

      {/* Navigation */}
      <ScrollArea className="h-[calc(100vh-8rem)] px-3 py-4">
        <nav className="flex flex-col gap-2" data-testid="sidebar-nav">
          {/* 主导航 */}
          {filteredMainNavItems.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
              collapsed={collapsed}
              onNavClick={handleNavClick}
            />
          ))}

          {/* 管理菜单 - 仅管理员可见 */}
          {filteredAdminNavItems.length > 0 && (
            <>
              <div className="my-4 border-t" />
              {!collapsed && (
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  管理
                </div>
              )}
              {collapsed && (
                <div className="flex justify-center py-2">
                  <div className="w-6 h-px bg-border" />
                </div>
              )}
              {filteredAdminNavItems.map((item) => (
                <NavItem
                  key={item.href}
                  item={item}
                  isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                  collapsed={collapsed}
                  onNavClick={handleNavClick}
                />
              ))}
            </>
          )}

          {/* 辅助导航 */}
          <div className="my-4 border-t" />
          {filteredSecondaryNavItems.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              isActive={pathname === item.href}
              collapsed={collapsed}
              onNavClick={handleNavClick}
            />
          ))}
        </nav>
      </ScrollArea>

      {/* 登录提示弹窗 */}
      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={handleClosePrompt}
        onLogin={handleLogin}
      />
    </motion.aside>
  )
}

interface NavItemProps {
  item: NavItemConfig
  isActive: boolean
  collapsed: boolean
  onNavClick: (href: string, requireAuth: boolean) => boolean
}

function NavItem({ item, isActive, collapsed, onNavClick }: NavItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    const canNavigate = onNavClick(item.href, item.requireAuth)
    if (!canNavigate) {
      e.preventDefault()
    }
  }

  return (
    <Link href={item.href} onClick={handleClick}>
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors cursor-pointer',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )}
        title={collapsed ? item.title : undefined}
      >
        <item.icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span className="whitespace-nowrap text-sm font-medium">{item.title}</span>}
      </div>
    </Link>
  )
}
