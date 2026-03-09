'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Film, FolderHeart, Settings, Home } from 'lucide-react'

export function Navbar() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Film className="h-6 w-6 text-[var(--color-primary)]" />
            <span className="font-bold text-lg">AI Drama Studio</span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <NavLink href="/" icon={Home} label="首页" active={isActive('/')} />
            <NavLink href="/projects" icon={FolderHeart} label="项目" active={isActive('/projects')} />
            <NavLink href="/settings" icon={Settings} label="设置" active={isActive('/settings')} />
          </div>
        </div>
      </div>
    </nav>
  )
}

interface NavLinkProps {
  href: string
  icon: React.ElementType
  label: string
  active?: boolean
}

function NavLink({ href, icon: Icon, label, active }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        active
          ? 'bg-[var(--color-primary)] text-[var(--color-primary-fg)]'
          : 'text-[var(--color-muted-fg)] hover:text-[var(--foreground)] hover:bg-[var(--color-muted)]'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  )
}
