/**
 * Breadcrumbs
 * 面包屑导航
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
}

const breadcrumbMap: Record<string, BreadcrumbItem[]> = {
  '/ai-keys': [
    { label: 'AI 管理', href: null },
    { label: '密钥管理', href: '/ai-keys' },
  ],
  '/ai-keys/new': [
    { label: 'AI 管理', href: null },
    { label: '密钥管理', href: '/ai-keys' },
    { label: '新建密钥', href: null },
  ],
  '/ai-proxies': [
    { label: 'AI 管理', href: null },
    { label: '代理管理', href: '/ai-proxies' },
  ],
  '/ai-proxies/new': [
    { label: 'AI 管理', href: null },
    { label: '代理管理', href: '/ai-proxies' },
    { label: '新建代理', href: null },
  ],
  '/ai-providers': [
    { label: 'AI 管理', href: null },
    { label: '渠道管理', href: '/ai-providers' },
  ],
  '/ai-analytics': [
    { label: 'AI 管理', href: null },
    { label: '使用统计', href: '/ai-analytics' },
  ],
  '/roles': [
    { label: '系统', href: null },
    { label: '角色权限', href: '/roles' },
  ],
  '/settings': [
    { label: '系统', href: null },
    { label: '系统设置', href: '/settings' },
  ],
}

export function Breadcrumbs() {
  const pathname = usePathname()
  
  if (!pathname) return null

  // 查找匹配的面包屑配置
  let items: BreadcrumbItem[] = []
  
  // 精确匹配
  if (breadcrumbMap[pathname]) {
    items = breadcrumbMap[pathname]
  } else {
    // 动态路由匹配 (如 /ai-keys/xxx/edit)
    const basePath = pathname.split('/').slice(0, 2).join('/')
    if (breadcrumbMap[basePath]) {
      items = [...breadcrumbMap[basePath]]
      
      // 根据路径添加动态部分
      const parts = pathname.split('/').slice(2)
      if (parts.includes('edit')) {
        items.push({ label: '编辑', href: null })
      } else if (parts.length > 0 && parts[0] !== 'new') {
        items.push({ label: '详情', href: null })
      }
    }
  }

  if (items.length === 0) return null

  return (
    <nav className="flex items-center gap-2 text-sm">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          
          {item.href ? (
            <Link
              href={item.href}
              className="text-gray-600 hover:text-gray-900"
            >
              {item.label}
            </Link>
          ) : (
            <span className={index === items.length - 1 ? 'text-gray-900 font-medium' : 'text-gray-600'}>
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}
