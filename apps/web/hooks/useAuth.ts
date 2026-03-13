'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export interface User {
  id: string
  email: string
  name: string | null
  avatar: string | null
  bio?: string | null
  website?: string | null
  role: 'USER' | 'PREMIUM' | 'ADMIN' | 'SUPER_ADMIN'
  createdAt?: string
  updatedAt?: string
  profile?: {
    bio?: string | null
    website?: string | null
  }
}

export interface LoginInput {
  email: string
  password: string
  remember?: boolean
}

export interface RegisterInput {
  name?: string
  email: string
  password: string
  confirmPassword: string
}

export interface UpdateProfileInput {
  name?: string
  avatar?: string
  bio?: string
  website?: string
}

export interface ChangePasswordInput {
  oldPassword: string
  newPassword: string
  confirmNewPassword: string
}

interface AuthResponse {
  user: User
  token?: string
}

interface UserResponse {
  user: User
}

const queryKeys = {
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
  },
}

/**
 * 获取当前用户信息
 */
function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.user(),
    queryFn: async () => {
      const response = await api.get<UserResponse>('/api/auth/me')
      return response.user
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5分钟
    refetchOnWindowFocus: true, // 窗口聚焦时重新获取
    refetchOnMount: true, // 组件挂载时重新获取
  })
}

/**
 * 登录
 */
function useLogin() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const response = await api.post<AuthResponse>('/api/auth/local/login', input)
      return response
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.auth.user(), data.user)
      toast.success('登录成功', {
        description: `欢迎回来，${data.user.name || data.user.email}`,
      })
      router.push('/projects')
    },
    onError: (error: Error) => {
      toast.error('登录失败', {
        description: error.message || '请检查邮箱和密码',
      })
    },
  })
}

/**
 * 注册
 */
function useRegister() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (input: Omit<RegisterInput, 'confirmPassword'>) => {
      const response = await api.post<AuthResponse>('/api/auth/local/register', input)
      return response
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.auth.user(), data.user)
      toast.success('注册成功', {
        description: `欢迎加入 AI Drama Studio！`,
      })
      router.push('/dashboard')
    },
    onError: (error: Error) => {
      toast.error('注册失败', {
        description: error.message || '请检查输入信息',
      })
    },
  })
}

/**
 * 登出
 */
function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async () => {
      await api.post('/api/auth/local/logout')
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.auth.all })
      toast.success('已登出', {
        description: '期待您的再次访问',
      })
      router.push('/login')
    },
    onError: (error: Error) => {
      toast.error('登出失败', {
        description: error.message,
      })
    },
  })
}

/**
 * 更新用户资料
 */
function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const response = await api.patch<UserResponse>('/api/auth/me', input)
      return response.user
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.auth.user(), data)
      toast.success('资料已更新', {
        description: '您的个人信息已保存',
      })
    },
    onError: (error: Error) => {
      toast.error('更新失败', {
        description: error.message || '请稍后重试',
      })
    },
  })
}

/**
 * 修改密码
 */
function useChangePassword() {
  return useMutation({
    mutationFn: async (input: Omit<ChangePasswordInput, 'confirmNewPassword'>) => {
      await api.post('/api/auth/password/change', input)
    },
    onSuccess: () => {
      toast.success('密码已修改', {
        description: '请使用新密码登录',
      })
    },
    onError: (error: Error) => {
      toast.error('修改失败', {
        description: error.message || '请检查旧密码是否正确',
      })
    },
  })
}

/**
 * 认证相关 Hooks 的聚合
 */
export function useAuth() {
  const { data: user, isLoading, error } = useCurrentUser()
  const loginMutation = useLogin()
  const registerMutation = useRegister()
  const logoutMutation = useLogout()
  const updateProfileMutation = useUpdateProfile()
  const changePasswordMutation = useChangePassword()

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    updateProfile: updateProfileMutation.mutateAsync,
    changePassword: changePasswordMutation.mutateAsync,
    isLoginLoading: loginMutation.isPending,
    isRegisterLoading: registerMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
    isUpdateProfileLoading: updateProfileMutation.isPending,
    isChangePasswordLoading: changePasswordMutation.isPending,
  }
}

export { queryKeys as authQueryKeys }
