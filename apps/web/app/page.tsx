import Link from 'next/link'
import { Film, Plus, ArrowRight } from 'lucide-react'

// 模拟项目数据（占位符）
const projects = [
  {
    id: '1',
    title: '我的第一个短剧',
    description: '这是一个测试项目',
    episodes: 3,
    status: 'in_progress',
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: '都市爱情故事',
    description: '现代都市背景的爱情短剧',
    episodes: 12,
    status: 'completed',
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
]

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="mb-12">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] p-8 md:p-12">
          <div className="relative z-10">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
              用 AI 创造精彩短剧
            </h1>
            <p className="text-white/80 text-lg md:text-xl mb-6 max-w-2xl">
              将你的小说、剧本自动转换为精美的视频内容，让创作变得如此简单
            </p>
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 bg-white text-[var(--color-primary)] px-6 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors"
            >
              <Plus className="h-5 w-5" />
              创建项目
            </Link>
          </div>

          {/* 装饰动画 */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        </div>
      </section>

      {/* 项目列表 */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">我的项目</h2>
          <Link href="/projects" className="text-[var(--color-primary)] hover:underline inline-flex items-center gap-1">
            查看全部 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block group"
            >
              <div className="card h-full hover:shadow-lg transition-all duration-300 group-hover:border-[var(--color-primary)]">
                <div className="aspect-video rounded-lg bg-[var(--color-secondary)] mb-4 flex items-center justify-center overflow-hidden">
                  <Film className="h-12 w-12 text-[var(--color-muted-fg)] group-hover:text-[var(--color-primary)] transition-colors" />
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-[var(--color-primary)] transition-colors">
                  {project.title}
                </h3>
                <p className="text-[var(--color-muted-fg)] text-sm mb-4 line-clamp-2">
                  {project.description}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-muted-fg)]">
                    {project.episodes} 集
                  </span>
                  <span className={`badge ${
                    project.status === 'completed' ? 'badge-success' : 'badge-primary'
                  }`}>
                    {project.status === 'completed' ? '已完成' : '制作中'}
                  </span>
                </div>
              </div>
            </Link>
          ))}

          {/* 新建项目卡片 */}
          <Link href="/projects/new" className="block">
            <div className="card h-full border-dashed hover:border-[var(--color-primary)] hover:bg-[var(--color-muted)]/50 transition-all min-h-[280px] flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                <Plus className="h-8 w-8 text-[var(--color-primary)]" />
              </div>
              <span className="font-medium text-[var(--color-muted-fg)]">创建新项目</span>
            </div>
          </Link>
        </div>
      </section>

      {/* 功能特性 */}
      <section className="mt-16">
        <h2 className="text-2xl font-bold mb-6">核心功能</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon={Film}
            title="智能分镜"
            description="AI 自动分析剧本，生成专业分镜脚本"
          />
          <FeatureCard
            icon={FolderHeart}
            title="角色管理"
            description="统一管理角色设定，保持一致性"
          />
          <FeatureCard
            icon={Settings}
            title="多模型支持"
            description="支持多种 AI 模型，灵活配置"
          />
        </div>
      </section>
    </div>
  )
}

interface FeatureCardProps {
  icon: React.ElementType
  title: string
  description: string
}

function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="card p-6">
      <div className="w-12 h-12 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-[var(--color-primary)]" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-[var(--color-muted-fg)] text-sm">{description}</p>
    </div>
  )
}
