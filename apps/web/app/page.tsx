'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Film, Plus, ArrowRight, Sparkles, Users, Settings, Clock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { LoginPrompt } from '@/components/ui/LoginPrompt'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut' as const,
    },
  },
}

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  const handleCreateProject = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true)
      return
    }
    router.push('/projects/new')
  }

  const handleViewProjects = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true)
      return
    }
    router.push('/projects')
  }

  const handleLogin = () => {
    setShowLoginPrompt(false)
    router.push('/login')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Hero Section */}
        <motion.section variants={itemVariants}>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-accent p-8 md:p-12">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary" className="bg-white/20 text-white border-0">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI 驱动
                </Badge>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">
                {isAuthenticated ? `欢迎回来，${user?.name || user?.email}` : '用 AI 创造精彩短剧'}
              </h1>
              <p className="text-white/80 text-lg md:text-xl mb-6 max-w-2xl">
                {isAuthenticated
                  ? '继续您的创作，让 AI 帮您实现更多可能'
                  : '将你的小说、剧本自动转换为精美的视频内容，让创作变得如此简单'}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90" onClick={handleCreateProject}>
                  <Plus className="h-5 w-5 mr-2" />
                  创建项目
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" onClick={handleViewProjects}>
                  查看项目
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>
            </div>

            {/* 装饰动画 */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          </div>
        </motion.section>

        {/* 统计卡片 - 仅登录用户显示 */}
        {isAuthenticated && <DashboardStats />}

        {/* 最近项目 - 仅登录用户显示 */}
        {isAuthenticated && <RecentProjects onCreateProject={handleCreateProject} />}

        {/* 功能特性 - 仅未登录用户显示 */}
        {!isAuthenticated && (
          <motion.section variants={itemVariants}>
            <h2 className="text-2xl font-bold mb-6">核心功能</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard
                icon={Sparkles}
                title="智能分镜"
                description="AI 自动分析剧本，生成专业分镜脚本，包含镜头语言、运镜方式等专业要素"
              />
              <FeatureCard
                icon={Users}
                title="角色管理"
                description="统一管理角色设定，保持一致性，支持角色外观变化和一致性验证"
              />
              <FeatureCard
                icon={Settings}
                title="多模型支持"
                description="支持多种 AI 模型，灵活配置，满足不同风格和质量的创作需求"
              />
            </div>
          </motion.section>
        )}
      </motion.div>

      {/* 登录提示弹窗 */}
      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        onLogin={handleLogin}
      />
    </div>
  )
}

// 统计数据组件
function DashboardStats() {
  const [stats, setStats] = useState({
    projects: 0,
    episodes: 0,
    characters: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [projectsRes, charactersRes] = await Promise.all([
          fetch('/api/projects'),
          fetch('/api/characters'),
        ])

        const projects = await projectsRes.json()
        const characters = await charactersRes.json()

        // 计算总剧集数
        let totalEpisodes = 0
        if (Array.isArray(projects)) {
          const episodeCounts = await Promise.all(
            projects.map(async (project: { id: string }) => {
              const res = await fetch(`/api/episodes?projectId=${project.id}`)
              const episodes = await res.json()
              return Array.isArray(episodes) ? episodes.length : 0
            })
          )
          totalEpisodes = episodeCounts.reduce((sum: number, count: number) => sum + count, 0)
        }

        setStats({
          projects: Array.isArray(projects) ? projects.length : 0,
          episodes: totalEpisodes,
          characters: Array.isArray(characters) ? characters.length : 0,
        })
      } catch (error) {
        console.error('获取统计数据失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const statCards = [
    { label: '项目数', value: stats.projects, icon: Film },
    { label: '已生成剧集', value: stats.episodes, icon: Clock },
    { label: '角色数', value: stats.characters, icon: Users },
  ]

  if (loading) {
    return (
      <motion.section variants={itemVariants}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-card/50 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">加载中...</p>
                    <div className="h-8 w-20 mt-1 animate-pulse bg-muted rounded" />
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.section>
    )
  }

  return (
    <motion.section variants={itemVariants}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <h3 className="text-2xl font-bold">{stat.value}</h3>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.section>
  )
}

// 最近项目组件
function RecentProjects({ onCreateProject }: { onCreateProject: () => void }) {
  const [projects, setProjects] = useState<Array<{
    id: string
    name: string
    description: string | null
    status: string
    updatedAt: string
    episodeCount: number
  }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/projects')
        const data = await res.json()
        // 按更新时间排序，取最近 6 个
        const sortedProjects = Array.isArray(data)
          ? data.sort((a: { updatedAt: string }, b: { updatedAt: string }) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            ).slice(0, 6)
          : []
        setProjects(sortedProjects)
      } catch (error) {
        console.error('获取项目列表失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      DRAFT: '草稿',
      IN_PROGRESS: '进行中',
      COMPLETED: '已完成',
      ARCHIVED: '已归档',
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      COMPLETED: 'bg-green-100 text-green-800',
      ARCHIVED: 'bg-purple-100 text-purple-800',
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <motion.section variants={itemVariants}>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse bg-muted rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.section>
    )
  }

  if (projects.length === 0) {
    return (
      <motion.section variants={itemVariants}>
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Film className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">还没有项目</h3>
            <p className="text-muted-foreground mb-4">创建您的第一个短剧项目，开始创作之旅</p>
            <Button onClick={onCreateProject}>
              <Plus className="h-4 w-4 mr-2" />
              创建项目
            </Button>
          </CardContent>
        </Card>
      </motion.section>
    )
  }

  return (
    <motion.section variants={itemVariants}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">最近项目</h2>
        <Link href="/projects">
          <Button variant="ghost">
            查看全部 <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <Card className="h-full hover:shadow-lg transition-all duration-300 group hover:border-primary cursor-pointer">
              <CardContent className="p-6">
                <div className="aspect-video rounded-lg bg-muted mb-4 flex items-center justify-center overflow-hidden relative">
                  <Film className="h-12 w-12 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div className="absolute top-2 right-2">
                    <Badge
                      variant={project.status === 'COMPLETED' ? 'default' : 'secondary'}
                      className={project.status !== 'COMPLETED' ? getStatusColor(project.status) : ''}
                    >
                      {getStatusLabel(project.status)}
                    </Badge>
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                  {project.name}
                </h3>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {project.description || '暂无描述'}
                </p>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{project.episodeCount || 0} 集</span>
                  <span>{formatDate(project.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {/* 新建项目卡片 */}
        <Card
          className="h-full border-dashed hover:border-primary hover:bg-muted/50 transition-all min-h-[280px] flex flex-col items-center justify-center gap-4 cursor-pointer"
          onClick={onCreateProject}
        >
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Plus className="h-8 w-8 text-primary" />
          </div>
          <span className="font-medium text-muted-foreground">创建新项目</span>
        </Card>
      </div>
    </motion.section>
  )
}

interface FeatureCardProps {
  icon: React.ElementType
  title: string
  description: string
}

function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </Card>
  )
}
