import type { Metadata } from 'next'
import { RegisterForm } from '@/components/auth/RegisterForm'

export const metadata: Metadata = {
  title: '注册',
  description: '创建 AI Drama Studio 新账号',
}

export default function RegisterPage() {
  return (
    <div className="container mx-auto px-4 py-16 min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <RegisterForm />
    </div>
  )
}
