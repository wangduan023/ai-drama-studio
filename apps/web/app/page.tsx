'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Film, Plus, ArrowRight, Sparkles, Users, Settings, Clock, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { LoginPrompt } from '@/components/ui/LoginPrompt'

// 模拟项目数据
const recentProjects = [
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

const stats = [
  { label: '项目数', value: '12', icon: Film, trend: '+2' },
  { label: '已完成剧集', value: '48', icon: TrendingUp, trend: '+5' },
  { label: '角色数', value: '36', icon: Users, trend: '+3' },
  { label: '总时长', value: '2.4h', icon: Clock, trend: '+12%' },
]

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
  const { isAuthenticated } = useAuth()
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
                用 AI 创造精彩短剧
              </h1>
              <p className="text-white/80 text-lg md:text-xl mb-6 max-w-2xl">
                将你的小说、剧本自动转换为精美的视频内容，让创作变得如此简单
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

        {/* 统计卡片 */}
        <motion.section variants={itemVariants}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <Card key={index} className="bg-card/50 backdrop-blur">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <div className="flex items-baseline gap-2 mt-1">
                        <h3 className="text-2xl font-bold">{stat.value}</h3>
                        <span className="text-xs text-primary">{stat.trend}</span>
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

        {/* 最近项目 */}
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
            {recentProjects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="h-full hover:shadow-lg transition-all duration-300 group hover:border-primary cursor-pointer">
                  <CardContent className="p-6">
                    <div className="aspect-video rounded-lg bg-muted mb-4 flex items-center justify-center overflow-hidden relative">
                      <Film className="h-12 w-12 text-muted-foreground group-hover:text-primary transition-colors" />
                      <div className="absolute top-2 right-2">
                        <Badge variant={project.status === 'completed' ? 'default' : 'secondary'}>
                          {project.status === 'completed' ? '已完成' : '制作中'}
                        </Badge>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                      {project.description}
                    </p>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{project.episodes} 集</span>
                      <span>{new Date(project.updatedAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {/* 新建项目卡片 */}
            <Card 
              className="h-full border-dashed hover:border-primary hover:bg-muted/50 transition-all min-h-[280px] flex flex-col items-center justify-center gap-4 cursor-pointer"
              onClick={handleCreateProject}
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <span className="font-medium text-muted-foreground">创建新项目</span>
            </Card>
          </div>
        </motion.section>

        {/* 功能特性 */}
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
