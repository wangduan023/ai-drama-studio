'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Mail, Globe, FileText, Lock, Loader2, Camera, ChevronRight, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const profileCategories = [
  {
    id: 'profile',
    title: '编辑资料',
    description: '更新您的个人信息和头像',
    icon: User,
    color: 'bg-blue-500/10 text-blue-500',
  },
  {
    id: 'password',
    title: '修改密码',
    description: '更新您的账户密码',
    icon: Lock,
    color: 'bg-amber-500/10 text-amber-500',
  },
]

const profileSchema = z.object({
  name: z.string().max(50, '昵称不能超过50个字符').optional(),
  avatar: z.string().url('请输入有效的URL').optional().or(z.literal('')),
  bio: z.string().max(500, '简介不能超过500个字符').optional(),
  website: z.string().url('请输入有效的URL').optional().or(z.literal('')),
})

const passwordSchema = z.object({
  oldPassword: z.string().min(1, '请输入旧密码'),
  newPassword: z.string().min(8, '新密码至少需要8位'),
  confirmNewPassword: z.string().min(1, '请确认新密码'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmNewPassword'],
})

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

export function ProfileForm() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, updateProfile, changePassword } = useAuth()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
    reset: resetProfile,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      avatar: '',
      bio: '',
      website: '',
    },
  })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
    reset: resetPassword,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      oldPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  })

  useEffect(() => {
    if (user) {
      resetProfile({
        name: user.name || '',
        avatar: user.avatar || '',
        bio: user.bio || user.profile?.bio || '',
        website: user.website || user.profile?.website || '',
      })
    }
  }, [user, resetProfile])

  const onProfileSubmit = async (data: ProfileFormData) => {
    await updateProfile(data)
  }

  const onPasswordSubmit = async (data: PasswordFormData) => {
    await changePassword({
      oldPassword: data.oldPassword,
      newPassword: data.newPassword,
    })
    resetPassword()
    setActiveCategory(null)
  }

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId)
  }

  const handleBack = () => {
    setActiveCategory(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const getRoleText = (role: string) => {
    const roleMap: Record<string, string> = {
      'USER': '普通用户',
      'PREMIUM': '付费用户',
      'ADMIN': '管理员',
      'SUPER_ADMIN': '超级管理员',
    }
    return roleMap[role] || role
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-5xl mx-auto"
    >
      {/* 用户信息卡片 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <Avatar size="lg" className="h-24 w-24">
                {user.avatar ? (
                  <AvatarImage src={user.avatar} alt={user.name || user.email} />
                ) : null}
                <AvatarFallback className="text-2xl">
                  {(user.name?.[0] || user.email[0]).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold">
                {user.name || '未设置昵称'}
              </h2>
              <div className="flex flex-col sm:flex-row items-center gap-2 mt-1 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              <div className="mt-2">
                <Badge variant={user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? 'default' : 'secondary'}>
                  {getRoleText(user.role)}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profileCategories.map((category, index) => {
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
            <div className="mb-6">
              <Button
                variant="ghost"
                className="mb-4 -ml-4 text-muted-foreground hover:text-foreground"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回个人资料
              </Button>
            </div>

            {/* 编辑资料表单 */}
            {activeCategory === 'profile' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    <CardTitle>编辑资料</CardTitle>
                  </div>
                  <CardDescription>更新您的个人信息和头像</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">昵称</Label>
                        <div className="relative">
                          <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="name"
                            placeholder="您的昵称"
                            className="pl-9"
                            {...registerProfile('name')}
                          />
                        </div>
                        {profileErrors.name && (
                          <p className="text-sm text-destructive" role="alert">
                            {profileErrors.name.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="website">网站</Label>
                        <div className="relative">
                          <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="website"
                            type="url"
                            placeholder="https://your-website.com"
                            className="pl-9"
                            {...registerProfile('website')}
                          />
                        </div>
                        {profileErrors.website && (
                          <p className="text-sm text-destructive" role="alert">
                            {profileErrors.website.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="avatar">头像 URL</Label>
                      <Input
                        id="avatar"
                        type="url"
                        placeholder="https://example.com/avatar.jpg"
                        {...registerProfile('avatar')}
                      />
                      {profileErrors.avatar && (
                        <p className="text-sm text-destructive" role="alert">
                          {profileErrors.avatar.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">简介</Label>
                      <div className="relative">
                        <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Textarea
                          id="bio"
                          placeholder="简单介绍一下自己..."
                          className="pl-9 min-h-[100px]"
                          {...registerProfile('bio')}
                        />
                      </div>
                      {profileErrors.bio && (
                        <p className="text-sm text-destructive" role="alert">
                          {profileErrors.bio.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        简介最多500个字符
                      </p>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={isProfileSubmitting}>
                        {isProfileSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            保存中...
                          </>
                        ) : (
                          '保存更改'
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* 修改密码表单 */}
            {activeCategory === 'password' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    <CardTitle>修改密码</CardTitle>
                  </div>
                  <CardDescription>更新您的账户密码</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="oldPassword">旧密码</Label>
                      <div className="relative">
                        <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="oldPassword"
                          type="password"
                          placeholder="••••••••"
                          className="pl-9"
                          {...registerPassword('oldPassword')}
                        />
                      </div>
                      {passwordErrors.oldPassword && (
                        <p className="text-sm text-destructive" role="alert">
                          {passwordErrors.oldPassword.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">新密码</Label>
                      <div className="relative">
                        <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="newPassword"
                          type="password"
                          placeholder="••••••••"
                          className="pl-9"
                          {...registerPassword('newPassword')}
                        />
                      </div>
                      {passwordErrors.newPassword && (
                        <p className="text-sm text-destructive" role="alert">
                          {passwordErrors.newPassword.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        密码至少需要8位字符
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmNewPassword">确认新密码</Label>
                      <div className="relative">
                        <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="confirmNewPassword"
                          type="password"
                          placeholder="••••••••"
                          className="pl-9"
                          {...registerPassword('confirmNewPassword')}
                        />
                      </div>
                      {passwordErrors.confirmNewPassword && (
                        <p className="text-sm text-destructive" role="alert">
                          {passwordErrors.confirmNewPassword.message}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={isPasswordSubmitting}>
                        {isPasswordSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            修改中...
                          </>
                        ) : (
                          '修改密码'
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
