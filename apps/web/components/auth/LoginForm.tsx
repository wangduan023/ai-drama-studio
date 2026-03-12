'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/hooks/useAuth'

const REMEMBERED_EMAIL_KEY = 'remembered_email'
const REMEMBER_ME_KEY = 'remember_me'

const loginSchema = z.object({
  email: z
    .string()
    .min(1, '请输入邮箱')
    .email('请输入有效的邮箱地址'),
  password: z
    .string()
    .min(1, '请输入密码')
    .min(8, '密码至少需要8位'),
  remember: z.boolean().optional(),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isAuthenticated, isLoading: authLoading } = useAuth()
  const [isClient, setIsClient] = useState(false)
  
  // 获取 returnUrl 参数，如果没有则跳转到首页
  const returnUrl = searchParams.get('returnUrl') || '/'

  // 从 localStorage 读取记住的邮箱
  const rememberedEmail = typeof window !== 'undefined' ? localStorage.getItem(REMEMBERED_EMAIL_KEY) : ''
  const rememberMe = typeof window !== 'undefined' ? localStorage.getItem(REMEMBER_ME_KEY) === 'true' : false

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    watch,
    setValue,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: rememberedEmail || '',
      password: '',
      remember: rememberMe,
    },
  })

  // 客户端挂载后才渲染表单
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 监听 remember 变化，保存到 localStorage
  const remember = watch('remember')
  useEffect(() => {
    if (isClient) {
      localStorage.setItem(REMEMBER_ME_KEY, remember ? 'true' : 'false')
    }
  }, [remember, isClient])

  // 如果已登录，跳转到 returnUrl 或首页
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push(returnUrl)
    }
  }, [isAuthenticated, authLoading, router, returnUrl])

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login({
        email: data.email,
        password: data.password,
        remember: data.remember,
      })
      // 登录成功后，根据"记住我"选项保存或清除邮箱
      if (data.remember) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, data.email)
        localStorage.setItem(REMEMBER_ME_KEY, 'true')
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY)
        localStorage.setItem(REMEMBER_ME_KEY, 'false')
      }
    } catch (error) {
      // 错误处理已在 hook 中完成
      // 这里可以添加额外的表单级别错误处理
      if (error instanceof Error) {
        setError('root', {
          type: 'manual',
          message: error.message,
        })
      }
    }
  }

  if (!isClient || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto"
    >
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            登录到 AI Drama Studio
          </CardTitle>
          <CardDescription className="text-center">
            输入您的邮箱和密码继续
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  className="pl-9"
                  {...register('email')}
                  aria-invalid={errors.email ? 'true' : 'false'}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  {...register('password')}
                  aria-invalid={errors.password ? 'true' : 'false'}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" {...register('remember')} />
                <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                  记住我
                </Label>
              </div>
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                忘记密码？
              </Link>
            </div>

            {errors.root && (
              <p className="text-sm text-destructive text-center" role="alert">
                {errors.root.message}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">还没有账号？</span>{' '}
            <Link
              href="/register"
              className="text-primary hover:underline font-medium"
            >
              立即注册
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
