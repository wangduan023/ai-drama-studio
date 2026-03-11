'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Mail, Globe, FileText, Lock, Loader2, Camera } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'

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

  // 未登录时跳转到登录页
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

  // 当用户信息加载完成后，重置表单
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

  // 获取角色显示文本
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
      className="w-full max-w-3xl mx-auto"
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

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            编辑资料
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            修改密码
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>个人资料</CardTitle>
              <CardDescription>更新您的个人信息和头像</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>修改密码</CardTitle>
              <CardDescription>更新您的账户密码</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-6">
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

                <Separator />

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
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}
