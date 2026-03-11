'use client'

import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  CreditCard,
  Key,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold mb-2">设置</h1>
        <p className="text-muted-foreground mb-8">管理你的账户和偏好设置</p>
      </motion.div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            个人资料
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            通知
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            外观
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>个人资料</CardTitle>
              <CardDescription>更新你的个人信息和头像</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
              <Button>保存更改</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>通知设置</CardTitle>
              <CardDescription>配置你想要接收的通知类型</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">项目更新通知</p>
                  <p className="text-sm text-muted-foreground">当项目状态发生变化时接收通知</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">角色一致性警告</p>
                  <p className="text-sm text-muted-foreground">当检测到角色一致性问题时接收通知</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">生成完成通知</p>
                  <p className="text-sm text-muted-foreground">当视频生成完成时接收通知</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">邮件通知</p>
                  <p className="text-sm text-muted-foreground">接收重要更新的邮件通知</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <AppearanceSettings />
        </TabsContent>

        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API 密钥</CardTitle>
              <CardDescription>管理你的 API 密钥</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
        </TabsContent>
      </Tabs>
    </div>
  )
}

// 外观设置组件
function AppearanceSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const themes = [
    {
      id: 'light',
      name: '亮色模式',
      description: '清晰的浅色背景，适合日间使用',
      icon: Sun,
    },
    {
      id: 'dark',
      name: '暗色模式',
      description: '深色背景，减少眼部疲劳，适合夜间',
      icon: Moon,
    },
    {
      id: 'system',
      name: '跟随系统',
      description: '自动跟随系统主题设置',
      icon: Monitor,
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>外观设置</CardTitle>
        <CardDescription>自定义界面主题和显示偏好</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 主题选择卡片 */}
        <div className="space-y-3">
          <Label>主题风格</Label>
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
        </div>

        <Separator />

        {/* 当前主题预览 */}
        <div className="space-y-2">
          <Label>当前主题</Label>
          <div className="p-4 rounded-lg bg-muted">
            <div className="flex items-center gap-3">
              {resolvedTheme === 'dark' ? (
                <Moon className="h-5 w-5 text-primary" />
              ) : (
                <Sun className="h-5 w-5 text-primary" />
              )}
              <div>
                <p className="font-medium">
                  {resolvedTheme === 'dark' ? '暗色模式' : '亮色模式'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {theme === 'system' ? '跟随系统设置' : '手动设置'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* 语言设置 */}
        <div className="space-y-2">
          <Label>语言</Label>
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
        </div>
      </CardContent>
    </Card>
  )
}
