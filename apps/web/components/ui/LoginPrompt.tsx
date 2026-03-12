'use client'

import { useEffect, useCallback, useState } from 'react'
import { Lock, X } from 'lucide-react'
import { Button } from './button'
import { createPortal } from 'react-dom'

interface LoginPromptProps {
  isOpen: boolean
  onClose: () => void
  onLogin: () => void
}

export function LoginPrompt({ isOpen, onClose, onLogin }: LoginPromptProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogin = useCallback(() => {
    onLogin()
  }, [onLogin])

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        handleLogin()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOpen, handleLogin])

  if (!isOpen || !mounted) return null

  const content = (
    <div 
      className="login-prompt-overlay"
      style={{
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        zIndex: '2147483647',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
      }}
      onClick={onClose}
    >
      <div 
        className="login-prompt-card"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '384px',
          margin: '16px',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 进度条 */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', backgroundColor: 'rgba(99, 102, 241, 0.2)' }}>
          <div style={{ height: '100%', backgroundColor: '#6366f1', animation: 'shrink 3s linear forwards' }} />
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '12px', right: '12px', padding: '4px', borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', zIndex: 10 }}
        >
          <X size={16} color="#6b7280" />
        </button>

        {/* 内容 */}
        <div style={{ padding: '32px', textAlign: 'center' }}>
          {/* 图标 */}
          <div style={{ margin: '0 auto 16px', width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Lock size={32} color="#6366f1" />
          </div>

          {/* 标题 */}
          <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#111827' }}>
            需要登录
          </h3>

          {/* 描述 */}
          <p style={{ color: '#6b7280', marginBottom: '24px', lineHeight: 1.6 }}>
            该功能需要登录后才能使用<br />
            将在 3 秒后自动跳转
          </p>

          {/* 按钮 */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button onClick={handleLogin}>立即登录</Button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )

  return createPortal(content, document.body)
}
