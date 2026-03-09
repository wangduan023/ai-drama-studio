#!/usr/bin/env tsx
/**
 * Database Migration Script
 *
 * 使用方法:
 *   npm run db:migrate        - 开发环境迁移（自动创建迁移文件）
 *   npm run db:migrate:deploy - 生产环境迁移（应用所有待处理迁移）
 *   npm run db:push           - 直接推送 schema 到数据库（开发快速迭代）
 */

import { execSync } from 'child_process'
import path from 'path'

const PRISMA_DIR = path.join(__dirname, '../prisma')
const SCHEMA_PATH = path.join(PRISMA_DIR, 'schema.prisma')

console.log('🔧 AI Drama Studio - Database Migration Tool')
console.log('============================================')
console.log(`Schema: ${SCHEMA_PATH}`)
console.log('')

// 检查命令行参数
const args = process.argv.slice(2)
const command = args[0] || 'dev'

try {
  switch (command) {
    case 'dev':
      console.log('📝 Running development migration...')
      execSync('prisma migrate dev', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      })
      break

    case 'deploy':
      console.log('🚀 Running production migration...')
      execSync('prisma migrate deploy', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      })
      break

    case 'push':
      console.log('⚠️  Pushing schema directly to database...')
      console.log('   Warning: This will overwrite the database schema without creating migration files.')
      execSync('prisma db push --accept-data-loss', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      })
      break

    case 'generate':
      console.log('🔨 Generating Prisma Client...')
      execSync('prisma generate', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      })
      break

    case 'reset':
      console.log('🔄 Resetting database...')
      execSync('prisma migrate reset', {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
      })
      break

    default:
      console.log('Unknown command. Available commands:')
      console.log('  dev     - Development migration (creates migration files)')
      console.log('  deploy  - Production migration (applies pending migrations)')
      console.log('  push    - Direct schema push (no migration files)')
      console.log('  generate - Generate Prisma Client')
      console.log('  reset   - Reset database and apply all migrations')
      process.exit(1)
  }

  console.log('')
  console.log('✅ Migration completed successfully!')
} catch (error) {
  console.error('❌ Migration failed:', error)
  process.exit(1)
}
