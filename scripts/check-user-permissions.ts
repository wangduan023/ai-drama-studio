#!/usr/bin/env tsx
/**
 * 检查用户权限脚本
 * 用法: npx tsx scripts/check-user-permissions.ts [email]
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2] || 'superadmin@aidrama.com'
  
  console.log(`🔍 检查用户权限: ${email}`)
  console.log('=====================================\n')

  // 1. 查询用户基本信息
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      createdAt: true,
    }
  })

  if (!user) {
    console.log('❌ 用户不存在')
    process.exit(1)
  }

  console.log('📋 用户基本信息:')
  console.log(`  ID: ${user.id}`)
  console.log(`  邮箱: ${user.email}`)
  console.log(`  名称: ${user.name || 'N/A'}`)
  console.log(`  角色: ${user.role}`)
  console.log(`  状态: ${user.isActive ? '启用' : '禁用'}`)
  console.log(`  创建时间: ${user.createdAt.toLocaleString()}`)
  console.log()

  // 2. 查询系统角色
  const systemRoles = await prisma.userSystemRole.findMany({
    where: { userId: user.id },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      }
    }
  })

  console.log('🔐 系统角色分配:')
  if (systemRoles.length === 0) {
    console.log('  无系统角色')
  } else {
    for (const usr of systemRoles) {
      console.log(`  - ${usr.role.name} (${usr.role.label})`)
      console.log(`    类型: ${usr.role.type}`)
      console.log(`    系统角色: ${usr.role.isSystem ? '是' : '否'}`)
      console.log(`    权限数量: ${usr.role.permissions.length}`)
      
      // 显示具体权限
      if (usr.role.permissions.length > 0) {
        console.log('    权限列表:')
        for (const rp of usr.role.permissions) {
          console.log(`      • ${rp.permission.resource}:${rp.permission.action} (${rp.permission.name})`)
        }
      }
    }
  }
  console.log()

  // 3. 查询所有权限（合并去重）
  const allPermissions = new Map()
  
  for (const usr of systemRoles) {
    for (const rp of usr.role.permissions) {
      const key = `${rp.permission.resource}:${rp.permission.action}`
      if (!allPermissions.has(key)) {
        allPermissions.set(key, {
          resource: rp.permission.resource,
          action: rp.permission.action,
          name: rp.permission.name,
          role: usr.role.name
        })
      }
    }
  }

  console.log('📦 合并后的权限列表:')
  if (allPermissions.size === 0) {
    console.log('  无任何权限')
  } else {
    // 按资源分组
    const byResource = new Map()
    for (const [key, perm] of allPermissions) {
      if (!byResource.has(perm.resource)) {
        byResource.set(perm.resource, [])
      }
      byResource.get(perm.resource).push(perm)
    }
    
    for (const [resource, perms] of byResource) {
      console.log(`  ${resource}:`)
      for (const perm of perms) {
        console.log(`    - ${perm.action} (${perm.name}) [来自: ${perm.role}]`)
      }
    }
  }
  console.log()

  // 4. 检查关键权限
  console.log('✅ 关键权限检查:')
  const keyPermissions = [
    { resource: 'ai_provider', action: 'read' },
    { resource: 'ai_provider', action: 'create' },
    { resource: 'ai_provider', action: 'update' },
    { resource: 'ai_provider', action: 'delete' },
    { resource: '*', action: '*' },
  ]
  
  // 重新查询以使用仓库方法
  const { RoleRepository } = await import('@ai-drama-studio/db')
  const roleRepo = new RoleRepository(prisma)
  
  for (const perm of keyPermissions) {
    const hasPerm = await roleRepo.checkUserPermission(
      user.id,
      perm.resource,
      perm.action
    )
    console.log(`  ${perm.resource}:${perm.action} -> ${hasPerm ? '✅ 有权限' : '❌ 无权限'}`)
  }

  console.log('\n=====================================')
  console.log('检查完成')
}

main()
  .catch((e) => {
    console.error('❌ 检查失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
