import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 启用 React 严格模式
  reactStrictMode: true,

  // 开发环境允许的源地址（解决跨域问题）
  allowedDevOrigins: ['0.0.0.0:3333', 'localhost:3333', '192.168.2.75:3333'],

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
    // 禁用 CSS 优化（需要 critters 依赖）
    optimizeCss: false,
  },

  // API 代理配置（开发环境）
  // 注意：使用 Next.js 自带的 API Routes 时无需代理
  // 如需代理到独立后端服务器（如端口 3000），取消下面的注释并修改端口
  // async rewrites() {
  //   return [
  //     {
  //       source: '/api/:path*',
  //       destination: 'http://localhost:3000/api/:path*',
  //     },
  //   ]
  // },
}

export default nextConfig
