import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/server'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import { RecentProjects } from '@/components/dashboard/RecentProjects'
import { QuickActions } from '@/components/dashboard/QuickActions'

export const metadata: Metadata = {
  title: '仪表盘',
  description: 'AI Drama Studio 仪表盘',
}

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">欢迎回来，{user.name || user.email}</h1>
        <p className="text-muted-foreground">管理您的项目和创作内容</p>
      </div>

      <div className="space-y-8">
        <DashboardStats userId={user.id} />
        <QuickActions />
        <RecentProjects userId={user.id} limit={5} />
      </div>
    </div>
  )
}
