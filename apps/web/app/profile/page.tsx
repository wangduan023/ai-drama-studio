'use client'

import { motion } from 'framer-motion'
import { ProfileForm } from '@/components/auth/ProfileForm'

export default function ProfilePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">个人资料</h1>
        <p className="text-muted-foreground">管理您的账户信息和安全设置</p>
      </motion.div>

      <ProfileForm />
    </div>
  )
}
