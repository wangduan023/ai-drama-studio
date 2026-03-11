import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 启用 React 严格模式
  reactStrictMode: true,

  // Turbopack 配置
  turbopack: {
    // 解析外部包
    resolveAlias: {
      // 确保这些包正确解析
      'tailwindcss': 'tailwindcss',
    },
    // 需要外部化的包
    root: process.cwd(),
  },

  // Webpack 配置（作为 Turbopack 的 fallback）
  webpack: (config, { isServer }) => {
    // 配置模块解析
    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve?.fallback,
        fs: false,
        net: false,
        tls: false,
      },
    }
    return config
  },

  // 远程图片配置（用于加载外部图片）
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // 实验性功能
  experimental: {
    // 启用 CSS 优化
    optimizeCss: true,
    // 启用服务器组件
    serverComponents: true,
  },

  // API 代理配置（开发环境）
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ]
  },
}

export default nextConfig
