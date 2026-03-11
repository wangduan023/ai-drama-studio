import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { LayoutWrapper } from '@/components/layout/LayoutWrapper'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'AI Drama Studio - AI 短剧生成平台',
    template: '%s | AI Drama Studio',
  },
  description: '使用 AI 技术自动将小说/剧本转换为视频内容的平台',
  keywords: ['AI', '视频生成', '短剧', '漫剧', '人工智能'],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#6366f1',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={cn(
          `${inter.variable} antialiased`,
          'min-h-screen bg-background text-foreground'
        )}
      >
        <ThemeProvider>
          <QueryProvider>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
            <Toaster position="top-center" richColors closeButton />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
