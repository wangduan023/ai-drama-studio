'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { AppBreadcrumb } from './Breadcrumb'

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
  header?: React.ReactNode
  breadcrumb?: { label: string; href?: string }[]
  sidebarCollapsed: boolean
}

export function PageContainer({
  children,
  className,
  title,
  description,
  header,
  breadcrumb,
  sidebarCollapsed,
}: PageContainerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'min-h-[calc(100vh-4rem)] p-6 pt-20 transition-all duration-200',
        sidebarCollapsed ? 'ml-[72px]' : 'ml-60',
        className
      )}
    >
      <div className="mx-auto max-w-7xl">
        {/* Breadcrumb */}
        {breadcrumb && (
          <div className="mb-4">
            <AppBreadcrumb items={breadcrumb} />
          </div>
        )}

        {/* Page Header */}
        {(title || description || header) && (
          <div className="mb-8">
            {title && (
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            )}
            {description && (
              <p className="mt-2 text-muted-foreground">{description}</p>
            )}
            {header && <div className="mt-4">{header}</div>}
          </div>
        )}

        {/* Page Content */}
        {children}
      </div>
    </motion.div>
  )
}
