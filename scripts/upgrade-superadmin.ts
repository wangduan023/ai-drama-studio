#!/usr/bin/env tsx
/**
 * 升级 superadmin@aidrama.com 为系统最高权限
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'superadmin@aidrama.com'
  
  console.log(`🚀 升级用户权限: ${email}`)
  console.log('=====================================\n')

  // 1. 更新用户表 role 字段为 SUPER_ADMIN
  const user = await prisma.user.update({
    where: { email },
    data: { role: 'SUPER_ADMIN' }
  })
  console.log(`✅ 用户表 role 字段已更新为: ${user.role}`)

  // 2. 确保 superadmin 角色存在
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'superadmin' },
    update: {},
    create: {
      name: 'superadmin',
      label: '超级管理员',
      description: '系统最高权限，拥有通配符权限',
      type: 'SYSTEM',
      isSystem: true,
    }
  })
  console.log(`✅ superadmin 角色已准备: ${superAdminRole.id}`)

  // 3. 确保通配符权限存在
  const wildcardPerm = await prisma.permission.upsert({
    where: {
      resource_action: {
        resource: '*',
        action: '*'
      }
    },
    update: {},
    create: {
      resource: '*',
      action: '*',
      name: '所有权限'
    }
  })
  console.log(`✅ 通配符权限已准备: ${wildcardPerm.id}`)

  // 4. 将通配符权限分配给 superadmin 角色
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: superAdminRole.id,
        permissionId: wildcardPerm.id
      }
    },
    update: {},
    create: {
      roleId: superAdminRole.id,
      permissionId: wildcardPerm.id
    }
  })
  console.log(`✅ 通配符权限已分配给 superadmin 角色`)

  // 5. 将用户关联到 superadmin 角色
  await prisma.userSystemRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: superAdminRole.id
      }
    },
    update: {},
    create: {
      userId: user.id,
      roleId: superAdminRole.id
    }
  })
  console.log(`✅ 用户已关联到 superadmin 角色`)

  // 6. 验证权限
  const { RoleRepository } = await import('@ai-drama-studio/db')
  const roleRepo = new RoleRepository(prisma)
  
  const hasWildcard = await roleRepo.checkUserPermission(user.id, '*', '*')
  const hasProviderUpdate = await roleRepo.checkUserPermission(user.id, 'ai_provider', 'update')
  
  console.log('\n📋 权限验证:')
  console.log(`  *:* -> ${hasWildcard ? '✅ 有权限' : '❌ 无权限'}`)
  console.log(`  ai_provider:update -> ${hasProviderUpdate ? '✅ 有权限' : '❌ 无权限'}`)

  console.log('\n=====================================')
  console.log('✅ 升级完成！请重新登录以生效。')
}

main()
  .catch((e) => {
    console.error('❌ 升级失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
