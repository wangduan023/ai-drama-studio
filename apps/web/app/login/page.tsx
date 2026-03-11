import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: '登录',
  description: '登录到 AI Drama Studio 账号',
}

export default function LoginPage() {
  return (
    <div className="container mx-auto px-4 py-16 min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <LoginForm />
    </div>
  )
}
