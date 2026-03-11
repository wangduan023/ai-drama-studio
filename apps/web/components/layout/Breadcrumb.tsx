'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface AppBreadcrumbProps {
  items?: BreadcrumbItem[]
}

const routeNameMap: Record<string, string> = {
  '': '首页',
  projects: '项目',
  library: '资源库',
  characters: '角色',
  locations: '场景',
  episodes: '剧集',
  settings: '设置',
  help: '帮助',
  new: '新建',
}

export function AppBreadcrumb({ items }: AppBreadcrumbProps) {
  const pathname = usePathname()
  
  // 如果没有提供 items，则从路径自动生成
  const breadcrumbItems = items || generateBreadcrumbItems(pathname)

  return (
    <Breadcrumb data-testid="breadcrumb">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink >
            <Link href="/" className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span className="sr-only">首页</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        
        {breadcrumbItems.map((item, index) => (
          <span key={index} className="flex items-center gap-2">
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              {item.href && index < breadcrumbItems.length - 1 ? (
                <BreadcrumbLink >
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

function generateBreadcrumbItems(pathname: string): BreadcrumbItem[] {
  const parts = pathname.split('/').filter(Boolean)
  const items: BreadcrumbItem[] = []
  let currentPath = ''

  parts.forEach((part, index) => {
    currentPath += `/${part}`
    
    // 跳过 ID 路径段，显示更具描述性的名称
    if (isUUID(part) || isNumber(part)) {
      return
    }
    
    const label = routeNameMap[part] || part
    const isLast = index === parts.length - 1 || 
                   (index < parts.length - 1 && (isUUID(parts[index + 1]) || isNumber(parts[index + 1])))
    
    items.push({
      label,
      href: isLast ? undefined : currentPath,
    })
  })

  return items
}

function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

function isNumber(str: string): boolean {
  return /^\d+$/.test(str)
}
