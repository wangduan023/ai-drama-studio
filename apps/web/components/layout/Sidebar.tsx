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

const mainNavItems = [
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

const secondaryNavItems = [
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

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState('')

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
          {mainNavItems.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
              collapsed={collapsed}
              onNavClick={handleNavClick}
            />
          ))}

          <div className="my-4 border-t" />

          {secondaryNavItems.map((item) => (
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
  item: {
    title: string
    href: string
    icon: React.ElementType
    requireAuth?: boolean
  }
  isActive: boolean
  collapsed: boolean
  onNavClick: (href: string, requireAuth: boolean) => boolean
}

function NavItem({ item, isActive, collapsed, onNavClick }: NavItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    // 如果需要登录但未登录，则阻止导航并显示提示
    const canNavigate = onNavClick(item.href, item.requireAuth || false)
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
