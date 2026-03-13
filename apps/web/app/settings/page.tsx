'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  User,
  Bell,
  Palette,
  Globe,
  Key,
  Sun,
  Moon,
  Monitor,
  ChevronRight,
  ArrowLeft,
  Switch,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch as SwitchUI } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { LoginPrompt } from '@/components/ui/LoginPrompt'

const settingsCategories = [
  {
    id: 'profile',
    title: '个人资料',
    description: '更新你的个人信息和头像',
    icon: User,
    color: 'bg-blue-500/10 text-blue-500',
  },
  {
    id: 'notifications',
    title: '通知设置',
    description: '配置你想要接收的通知类型',
    icon: Bell,
    color: 'bg-amber-500/10 text-amber-500',
  },
  {
    id: 'appearance',
    title: '外观主题',
    description: '自定义界面主题和显示偏好',
    icon: Palette,
    color: 'bg-purple-500/10 text-purple-500',
  },
  {
    id: 'api',
    title: 'API 密钥',
    description: '管理你的 API 密钥',
    icon: Key,
    color: 'bg-emerald-500/10 text-emerald-500',
  },
]

export default function SettingsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      setShowLoginPrompt(true)
    }
  }, [isAuthenticated, isLoading])

  const handleLogin = () => {
    setShowLoginPrompt(false)
    router.push('/login')
  }

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId)
  }

  const handleBack = () => {
    setActiveCategory(null)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <AnimatePresence mode="wait">
        {!activeCategory ? (
          /* 网格卡片首页 */
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* 标题 */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">设置</h1>
              <p className="text-muted-foreground">管理你的账户和偏好设置</p>
            </div>

            {/* 网格卡片 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {settingsCategories.map((category, index) => {
                const Icon = category.icon
                return (
                  <motion.button
                    key={category.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    onClick={() => handleCategoryClick(category.id)}
                    className="group relative flex items-start gap-4 p-6 rounded-xl border bg-card text-left transition-all duration-200 hover:shadow-lg hover:border-primary/50 hover:-translate-y-0.5"
                  >
                    {/* 图标 */}
                    <div className={cn(
                      'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center',
                      category.color
                    )}>
                      <Icon className="h-6 w-6" />
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                        {category.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {category.description}
                      </p>
                    </div>

                    {/* 箭头 */}
                    <ChevronRight className="flex-shrink-0 h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        ) : (
          /* 详细设置页 */
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* 返回按钮和标题 */}
            <div className="mb-8">
              <Button
                variant="ghost"
                className="mb-4 -ml-4 text-muted-foreground hover:text-foreground"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回设置
              </Button>
              <h1 className="text-3xl font-bold mb-2">
                {settingsCategories.find(c => c.id === activeCategory)?.title}
              </h1>
              <p className="text-muted-foreground">
                {settingsCategories.find(c => c.id === activeCategory)?.description}
              </p>
            </div>

            {/* 设置内容 */}
            {activeCategory === 'profile' && <ProfileSettings />}
            {activeCategory === 'notifications' && <NotificationSettings />}
            {activeCategory === 'appearance' && <AppearanceSettings />}
            {activeCategory === 'api' && <ApiSettings />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 登录提示弹窗 */}
      <LoginPrompt
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        onLogin={handleLogin}
      />
    </div>
  )
}

// 个人资料设置
function ProfileSettings() {
  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-10 w-10 text-primary" />
          </div>
          <Button variant="outline">更换头像</Button>
        </div>
        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">昵称</Label>
            <Input id="name" placeholder="你的昵称" defaultValue="用户" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input id="email" type="email" placeholder="your@email.com" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio">简介</Label>
          <Input id="bio" placeholder="简单介绍一下自己..." />
        </div>
        <div className="flex justify-end">
          <Button>保存更改</Button>
        </div>
      </CardContent>
    </Card>
  )
}

// 通知设置
function NotificationSettings() {
  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">项目更新通知</p>
            <p className="text-sm text-muted-foreground">当项目状态发生变化时接收通知</p>
          </div>
          <SwitchUI defaultChecked />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">角色一致性警告</p>
            <p className="text-sm text-muted-foreground">当检测到角色一致性问题时接收通知</p>
          </div>
          <SwitchUI defaultChecked />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">生成完成通知</p>
            <p className="text-sm text-muted-foreground">当视频生成完成时接收通知</p>
          </div>
          <SwitchUI defaultChecked />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">邮件通知</p>
            <p className="text-sm text-muted-foreground">接收重要更新的邮件通知</p>
          </div>
          <SwitchUI />
        </div>
      </CardContent>
    </Card>
  )
}

// 外观设置
function AppearanceSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const themes = [
    {
      id: 'light',
      name: '亮色模式',
      description: '清晰的浅色背景',
      icon: Sun,
    },
    {
      id: 'dark',
      name: '暗色模式',
      description: '深色背景，适合夜间',
      icon: Moon,
    },
    {
      id: 'system',
      name: '跟随系统',
      description: '自动跟随系统主题',
      icon: Monitor,
    },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>主题风格</CardTitle>
          <CardDescription>选择你喜欢的界面主题</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {themes.map((t) => {
              const Icon = t.icon
              const isSelected = theme === t.id
              
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    'relative flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-200',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-accent'
                  )}
                >
                  <Icon className={cn(
                    'h-8 w-8 mb-2',
                    isSelected ? 'text-primary' : 'text-muted-foreground'
                  )} />
                  <span className="font-medium text-sm">{t.name}</span>
                  <span className="text-xs text-muted-foreground text-center mt-1">
                    {t.description}
                  </span>
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>语言</CardTitle>
          <CardDescription>选择界面显示语言</CardDescription>
        </CardHeader>
        <CardContent>
          <Select defaultValue="zh">
            <SelectTrigger className="w-full sm:w-[200px]">
              <Globe className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="zh">简体中文</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  )
}

// API 设置
function ApiSettings() {
  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-2">
          <Label>OpenAI API Key</Label>
          <div className="flex gap-2">
            <Input type="password" placeholder="sk-..." />
            <Button variant="outline">验证</Button>
          </div>
        </div>
        <Separator />
        <div className="space-y-2">
          <Label>Stability AI API Key</Label>
          <div className="flex gap-2">
            <Input type="password" placeholder="sk-..." />
            <Button variant="outline">验证</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
