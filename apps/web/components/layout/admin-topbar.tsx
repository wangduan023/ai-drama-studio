/**
 * Admin Topbar
 * 管理后台顶部栏
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Breadcrumbs } from './breadcrumbs'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, LogOut, Settings } from 'lucide-react'

export function AdminTopbar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  // 非管理后台页面不显示
  if (!pathname?.startsWith('/ai-keys') && 
      !pathname?.startsWith('/ai-proxies') &&
      !pathname?.startsWith('/ai-providers') &&
      !pathname?.startsWith('/ai-analytics') &&
      !pathname?.startsWith('/roles')) {
    return null
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50">
      <div className="flex items-center justify-between h-full px-6">
        {/* 左侧：Logo + 面包屑 */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">AI</span>
            </div>
            <span className="font-semibold text-lg">管理后台</span>
          </Link>
          
          <div className="h-6 w-px bg-gray-300" />
          
          <Breadcrumbs />
        </div>

        {/* 右侧：用户菜单 */}
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <span className="max-w-[120px] truncate">
                  {user?.email || '用户'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  个人资料
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  设置
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={logout}
                className="flex items-center gap-2 text-red-600"
              >
                <LogOut className="w-4 h-4" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
