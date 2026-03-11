#!/usr/bin/env node
/**
 * Database Verification Script
 * 
 * 验证数据库状态：
 * - 检查数据库连接
 * - 统计各表数据
 * - 验证表结构
 * 
 * 使用方法:
 *   pnpm db:verify
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// 检测数据库类型
function getDbType() {
  const dbUrl = process.env.DATABASE_URL || ''
  if (dbUrl.startsWith('mysql:')) return 'mysql'
  if (dbUrl.startsWith('file:') || dbUrl.includes('.db')) return 'sqlite'
  if (dbUrl.startsWith('postgresql:')) return 'postgresql'
  return 'unknown'
}

async function verifyConnection() {
  log('\n========================================', 'yellow')
  log('🔗 Checking Database Connection', 'yellow')
  log('========================================', 'yellow')

  try {
    await prisma.$connect()
    log('   ✅ Database connected successfully', 'green')
    
    // 获取数据库类型和信息
    const dbType = getDbType()
    log(`   📦 Database Type: ${dbType}`, 'blue')
    
    // 尝试获取数据库信息
    try {
      if (dbType === 'mysql') {
        const result = await prisma.$queryRaw`SELECT DATABASE() as db`
        log(`   📦 Database: ${result[0].db}`, 'blue')
      } else if (dbType === 'sqlite') {
        log(`   📦 Database: SQLite`, 'blue')
      }
    } catch (e) {
      // 忽略特定数据库函数的错误
    }
    
    return true
  } catch (error) {
    log(`   ❌ Connection failed: ${error.message}`, 'red')
    return false
  }
}

async function countRecords() {
  log('\n========================================', 'yellow')
  log('📊 Counting Records', 'yellow')
  log('========================================', 'yellow')

  const counts = {}

  try {
    // 用户表
    counts.users = await prisma.user.count()
    log(`   👤 Users: ${counts.users}`, 'blue')

    // 项目表
    counts.projects = await prisma.project.count()
    counts.projectsActive = await prisma.project.count({
      where: { deletedAt: null }
    })
    log(`   📁 Projects: ${counts.projects} (active: ${counts.projectsActive})`, 'blue')

    // 角色表
    counts.characters = await prisma.characterProfile.count()
    counts.charactersActive = await prisma.characterProfile.count({
      where: { deletedAt: null }
    })
    log(`   🎭 Characters: ${counts.characters} (active: ${counts.charactersActive})`, 'blue')

    // 场景表
    counts.locations = await prisma.locationProfile.count()
    counts.locationsActive = await prisma.locationProfile.count({
      where: { deletedAt: null }
    })
    log(`   🎬 Locations: ${counts.locations} (active: ${counts.locationsActive})`, 'blue')

    // 剧集表
    counts.episodes = await prisma.episode.count()
    counts.episodesActive = await prisma.episode.count({
      where: { deletedAt: null }
    })
    log(`   🎥 Episodes: ${counts.episodes} (active: ${counts.episodesActive})`, 'blue')

    // 剧本表
    counts.scripts = await prisma.script.count()
    log(`   📝 Scripts: ${counts.scripts}`, 'blue')

    // 分镜表
    counts.storyboards = await prisma.storyboard.count()
    log(`   🎨 Storyboards: ${counts.storyboards}`, 'blue')

    // 任务表
    counts.tasks = await prisma.task.count()
    log(`   📋 Tasks: ${counts.tasks}`, 'blue')

    // AI 配置表
    counts.aiProviders = await prisma.aiProvider.count()
    counts.aiModels = await prisma.aiModel.count()
    log(`   🤖 AI Providers: ${counts.aiProviders}`, 'blue')
    log(`   🤖 AI Models: ${counts.aiModels}`, 'blue')

    // 配置表
    counts.configs = await prisma.config.count()
    log(`   ⚙️  Configs: ${counts.configs}`, 'blue')

    return counts
  } catch (error) {
    log(`   ❌ Count failed: ${error.message}`, 'red')
    return null
  }
}

async function verifyTables() {
  log('\n========================================', 'yellow')
  log('📋 Verifying Table Structure', 'yellow')
  log('========================================', 'yellow')

  const requiredTables = [
    'users',
    'projects',
    'character_profiles',
    'location_profiles',
    'episodes',
    'scripts',
    'storyboards',
    'clips',
    'tasks',
    'task_events',
    'ai_providers',
    'ai_models',
    'ai_usage_logs',
    'configs',
    'assets',
    'usage_costs',
  ]

  const dbType = getDbType()

  try {
    let existingTables = []
    
    if (dbType === 'mysql') {
      // MySQL: 查询 information_schema
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
      `
      existingTables = tables.map(t => t.TABLE_NAME || t.table_name)
    } else if (dbType === 'sqlite') {
      // SQLite: 查询 sqlite_master
      const tables = await prisma.$queryRaw`
        SELECT name FROM sqlite_master WHERE type='table'
      `
      existingTables = tables.map(t => t.name)
    } else {
      // 未知数据库类型，尝试使用 Prisma 模型验证
      log(`   ⚠️  Unknown database type, skipping table structure check`, 'yellow')
      return true
    }
    
    let allTablesExist = true
    
    for (const table of requiredTables) {
      if (existingTables.includes(table)) {
        log(`   ✅ ${table}`, 'green')
      } else {
        log(`   ❌ ${table} (missing)`, 'red')
        allTablesExist = false
      }
    }

    // 检查额外的表
    const extraTables = existingTables.filter(t => !requiredTables.includes(t))
    if (extraTables.length > 0) {
      log(`\n   ℹ️  Extra tables found: ${extraTables.join(', ')}`, 'cyan')
    }

    return allTablesExist
  } catch (error) {
    log(`   ❌ Verification failed: ${error.message}`, 'red')
    return false
  }
}

async function verifyRelations() {
  log('\n========================================', 'yellow')
  log('🔗 Verifying Sample Relations', 'yellow')
  log('========================================', 'yellow')

  try {
    // 获取一个项目及其关联数据
    const project = await prisma.project.findFirst({
      where: { deletedAt: null },
      include: {
        _count: {
          select: {
            episodes: true,
            characterProfiles: true,
            locationProfiles: true,
          }
        }
      }
    })

    if (project) {
      log(`   ✅ Project relations working`, 'green')
      log(`      - ${project.name}`, 'blue')
      log(`      - Episodes: ${project._count.episodes}`, 'blue')
      log(`      - Characters: ${project._count.characterProfiles}`, 'blue')
      log(`      - Locations: ${project._count.locationProfiles}`, 'blue')
    } else {
      log(`   ⚠️  No active project found for relation test`, 'yellow')
    }

    // 获取一个用户
    const user = await prisma.user.findFirst({
      include: {
        _count: {
          select: { projects: true }
        }
      }
    })

    if (user) {
      log(`   ✅ User relations working`, 'green')
      log(`      - ${user.email}`, 'blue')
      log(`      - Projects: ${user._count.projects}`, 'blue')
    } else {
      log(`   ⚠️  No user found for relation test`, 'yellow')
    }

    return true
  } catch (error) {
    log(`   ❌ Relation verification failed: ${error.message}`, 'red')
    return false
  }
}

async function checkIndexes() {
  log('\n========================================', 'yellow')
  log('🔍 Checking Indexes', 'yellow')
  log('========================================', 'yellow')

  const dbType = getDbType()

  try {
    let indexCount = 0
    
    if (dbType === 'mysql') {
      // MySQL: 查询 information_schema
      const indexes = await prisma.$queryRaw`
        SELECT 
          table_name,
          index_name,
          column_name
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
        ORDER BY table_name, index_name
      `
      indexCount = indexes.length
      
      // 按表分组显示
      const indexesByTable = {}
      for (const idx of indexes) {
        const table = idx.table_name || idx.TABLE_NAME
        if (!indexesByTable[table]) {
          indexesByTable[table] = []
        }
        indexesByTable[table].push(idx.index_name || idx.INDEX_NAME)
      }

      for (const [table, tableIndexes] of Object.entries(indexesByTable)) {
        const uniqueIndexes = [...new Set(tableIndexes)]
        log(`   📦 ${table}: ${uniqueIndexes.length} indexes`, 'blue')
      }
    } else if (dbType === 'sqlite') {
      // SQLite: 查询每个表的索引
      const tables = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table'`
      
      for (const t of tables) {
        const tableName = t.name
        // 使用字符串拼接而不是模板参数（PRAGMA 不支持参数化查询）
        const indexes = await prisma.$queryRawUnsafe(`PRAGMA index_list("${tableName}")`)
        if (indexes.length > 0) {
          log(`   📦 ${tableName}: ${indexes.length} indexes`, 'blue')
          indexCount += indexes.length
        }
      }
    } else {
      log(`   ⚠️  Unknown database type, skipping index check`, 'yellow')
      return true
    }
    
    log(`   ✅ Found ${indexCount} indexes`, 'green')
    return true
  } catch (error) {
    log(`   ❌ Index check failed: ${error.message}`, 'red')
    return false
  }
}

async function main() {
  console.log('🔍 AI Drama Studio - Database Verification')
  console.log('==========================================')

  const startTime = Date.now()
  let allPassed = true

  try {
    // 1. 检查连接
    if (!await verifyConnection()) {
      allPassed = false
    }

    // 2. 统计记录数
    const counts = await countRecords()
    if (!counts) {
      allPassed = false
    }

    // 3. 验证表结构
    if (!await verifyTables()) {
      allPassed = false
    }

    // 4. 验证关联关系
    if (!await verifyRelations()) {
      allPassed = false
    }

    // 5. 检查索引
    if (!await checkIndexes()) {
      allPassed = false
    }

    // 总结
    const duration = Date.now() - startTime
    log('\n========================================', allPassed ? 'green' : 'red')
    log('📊 Verification Summary', allPassed ? 'green' : 'red')
    log('========================================', allPassed ? 'green' : 'red')
    
    if (allPassed) {
      log('   ✅ All checks passed!', 'green')
    } else {
      log('   ⚠️  Some checks failed', 'yellow')
    }
    
    log(`   ⏱️  Completed in ${duration}ms`, 'blue')

    if (counts) {
      log('\n   📈 Data Summary:', 'cyan')
      const totalRecords = Object.values(counts)
        .filter(v => typeof v === 'number' && !String(Object.keys(counts).find(k => counts[k] === v)).includes('Active'))
        .reduce((a, b) => a + b, 0)
      log(`      • Total records: ${totalRecords}`, 'blue')
      log(`      • Projects: ${counts.projects || 0}`, 'blue')
      log(`      • Characters: ${counts.characters || 0}`, 'blue')
      log(`      • Locations: ${counts.locations || 0}`, 'blue')
    }

  } catch (error) {
    log(`\n❌ Verification failed: ${error.message}`, 'red')
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
