/**
 * Prisma Client Singleton
 * 避免在开发过程中创建多个 Prisma 实例
 */
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * 关闭数据库连接
 * 在脚本执行完毕或服务器关闭时调用
 */
export async function disconnect() {
  await prisma.$disconnect()
}
