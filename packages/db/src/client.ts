/**
 * Prisma Client Singleton
 * 避免在开发过程中创建多个 Prisma 实例
 * 支持连接池配置和重试机制
 */
import { PrismaClient } from '@prisma/client'

/**
 * 从环境变量获取连接池配置
 */
function getConnectionPoolConfig() {
  // 开发环境使用较小的连接池
  const isDev = process.env.NODE_ENV === 'development'
  
  return {
    // 连接池大小，默认开发环境 5，生产环境 20
    connection_limit: parseInt(process.env.DATABASE_CONNECTION_LIMIT || (isDev ? '5' : '20')),
    
    // 连接超时（毫秒），默认 10 秒
    connect_timeout: parseInt(process.env.DATABASE_CONNECT_TIMEOUT || '10000'),
    
    // 空闲连接超时（毫秒），默认 1 分钟
    idle_timeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '60000'),
    
    // 最大连接存活时间（毫秒），默认 1 小时
    max_lifetime: parseInt(process.env.DATABASE_MAX_LIFETIME || '3600000'),
  }
}

/**
 * 构建数据库 URL（带连接池参数）
 */
function buildDatabaseUrl(): string {
  const baseUrl = process.env.DATABASE_URL
  if (!baseUrl) {
    throw new Error('DATABASE_URL 环境变量未设置')
  }

  // SQLite 不需要连接池参数
  if (baseUrl.startsWith('file:')) {
    return baseUrl
  }

  const poolConfig = getConnectionPoolConfig()
  
  // 解析现有 URL
  const url = new URL(baseUrl)
  
  // 添加连接池参数（MySQL/PostgreSQL）
  url.searchParams.set('connection_limit', poolConfig.connection_limit.toString())
  url.searchParams.set('connect_timeout', poolConfig.connect_timeout.toString())
  url.searchParams.set('idle_timeout', poolConfig.idle_timeout.toString())
  url.searchParams.set('max_lifetime', poolConfig.max_lifetime.toString())
  
  return url.toString()
}

/**
 * Prisma 日志级别配置
 */
function getLogConfig() {
  const env = process.env.NODE_ENV
  
  if (env === 'production') {
    return [
      { emit: 'stdout', level: 'error' },
      { emit: 'stdout', level: 'warn' },
    ] as const
  }
  
  // 开发环境启用详细日志
  return [
    { emit: 'stdout', level: 'error' },
    { emit: 'stdout', level: 'warn' },
    { emit: 'stdout', level: 'info' },
    { emit: 'stdout', level: 'query' },
  ] as const
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * 创建 Prisma Client 实例
 */
function createPrismaClient(): PrismaClient {
  const databaseUrl = buildDatabaseUrl()
  
  // 临时设置环境变量（Prisma 会读取）
  const originalUrl = process.env.DATABASE_URL
  process.env.DATABASE_URL = databaseUrl
  
  const client = new PrismaClient({
    log: getLogConfig(),
  })
  
  // 恢复原始环境变量
  if (originalUrl) {
    process.env.DATABASE_URL = originalUrl
  }
  
  return client
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * 关闭数据库连接
 * 在脚本执行完毕或服务器关闭时调用
 */
export async function disconnect(): Promise<void> {
  await prisma.$disconnect()
}

/**
 * 检查数据库连接健康
 * 
 * 注意：$queryRaw 使用模板字符串语法是安全的，Prisma 会自动参数化处理
 * 避免使用字符串拼接：prisma.$queryRaw(`SELECT ${unsafe}`) ❌
 * 始终使用模板字符串：prisma.$queryRaw`SELECT ${safe}` ✅
 */
export async function healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
  const start = Date.now()
  try {
    // 执行简单查询测试连接
    await prisma.$queryRaw`SELECT 1`
    return {
      healthy: true,
      latency: Date.now() - start,
    }
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * 执行参数化原始查询（安全）
 * 使用示例：
 *   const results = await queryRaw`SELECT * FROM users WHERE id = ${userId}`
 * 
 * @param strings - SQL 模板字符串
 * @param values - 参数值（自动转义）
 */
export async function queryRaw<T>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T> {
  return prisma.$queryRaw<T>(strings, ...values)
}

/**
 * 带重试的数据库操作
 * 
 * @param operation - 数据库操作函数
 * @param maxRetries - 最大重试次数（默认 3）
 * @param retryDelay - 重试延迟（毫秒，默认 1000）
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  retryDelay = 1000
): Promise<T> {
  let lastError: Error | undefined
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // 如果是最后一次尝试，抛出错误
      if (attempt === maxRetries) {
        throw lastError
      }
      
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
    }
  }
  
  throw lastError
}

/**
 * 执行事务的包装函数
 * 自动处理连接错误和重试
 */
export async function withTransaction<T>(
  fn: (tx: typeof prisma) => Promise<T>,
  options?: {
    maxRetries?: number
    retryDelay?: number
    isolationLevel?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable'
  }
): Promise<T> {
  const { maxRetries = 3, retryDelay = 1000, isolationLevel } = options || {}
  
  return withRetry(
    async () => {
      return prisma.$transaction(fn, {
        ...(isolationLevel && { isolationLevel }),
      })
    },
    maxRetries,
    retryDelay
  )
}
