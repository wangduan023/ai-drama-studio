#!/usr/bin/env tsx
/**
 * Database Seed Script for Web App
 * 
 * 创建测试数据：
 * - 测试用户
 * - 测试项目
 * - 测试角色
 * - 测试场景
 * 
 * 使用方法:
 *   pnpm db:seed
 */

import { prisma } from '../lib/db.js'
import { ProjectStatus, CharacterRoleLevel, LocationType, UserRole } from '@prisma/client'
import { hashPassword } from '../lib/auth/password.js'

async function main() {
  console.log('🌱 AI Drama Studio - Web App Database Seeding')
  console.log('==============================================')
  console.log('')

  // 1. 创建测试用户（如果不存在）
  console.log('👤 Creating test user...')

  const hashedPassword = await hashPassword('Test123456!')

  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: '测试用户',
      role: UserRole.USER,
      passwordHash: hashedPassword,
      isActive: true,
      emailVerified: false,
    },
  })
  console.log(`  ✓ User: ${user.email} (ID: ${user.id})`)

  // 1.1 创建管理员用户
  console.log('')
  console.log('👑 Creating admin user...')

  const admin = await prisma.user.upsert({
    where: { email: 'admin@aidrama.com' },
    update: {},
    create: {
      email: 'admin@aidrama.com',
      name: '管理员',
      role: UserRole.ADMIN,
      passwordHash: hashedPassword,
      isActive: true,
      emailVerified: false,
    },
  })
  console.log(`  ✓ Admin: ${admin.email} (ID: ${admin.id})`)

  // 1.2 创建超级管理员用户
  console.log('')
  console.log('🔥 Creating superadmin user...')

  const superAdminPassword = await hashPassword('SuperAdmin@2026')

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@aidrama.com' },
    update: {},
    create: {
      email: 'superadmin@aidrama.com',
      name: '超级管理员',
      role: UserRole.SUPER_ADMIN,
      passwordHash: superAdminPassword,
      isActive: true,
      emailVerified: false,
    },
  })
  console.log(`  ✓ SuperAdmin: ${superAdmin.email} (ID: ${superAdmin.id})`)

  // 2. 创建测试项目
  console.log('')
  console.log('📁 Creating test project...')
  
  const project = await prisma.project.create({
    data: {
      name: '我的第一个短剧',
      description: '这是一个测试项目，用于演示 AI Drama Studio 的功能',
      userId: user.id,
      status: ProjectStatus.DRAFT,
    },
  })
  console.log(`  ✓ Project: ${project.name} (ID: ${project.id})`)

  // 3. 创建测试角色
  console.log('')
  console.log('🎭 Creating test characters...')
  
  const characters = [
    {
      name: '主角张三',
      roleLevel: CharacterRoleLevel.A,
      introduction: '勇敢善良的年轻人，故事的主角',
      gender: '男',
      ageRange: '约二十五岁',
      personalityTags: JSON.stringify(['勇敢', '善良', '正直']),
      visualKeywords: JSON.stringify(['阳光', '帅气', '干练']),
      projectId: project.id,
    },
    {
      name: '女主角李四',
      roleLevel: CharacterRoleLevel.A,
      introduction: '聪明独立的女主角',
      gender: '女',
      ageRange: '约二十三岁',
      personalityTags: JSON.stringify(['聪明', '独立', '温柔']),
      visualKeywords: JSON.stringify(['优雅', '知性', '温柔']),
      projectId: project.id,
    },
    {
      name: '反派王五',
      roleLevel: CharacterRoleLevel.B,
      introduction: '阴险狡诈的反派角色',
      gender: '男',
      ageRange: '约四十岁',
      personalityTags: JSON.stringify(['阴险', '狡诈', '贪婪']),
      visualKeywords: JSON.stringify(['阴沉', '城府', '威严']),
      projectId: project.id,
    },
  ]

  for (const charData of characters) {
    const character = await prisma.characterProfile.create({
      data: charData,
    })
    console.log(`  ✓ Character: ${character.name} (${character.roleLevel})`)
  }

  // 4. 创建测试场景
  console.log('')
  console.log('🎬 Creating test locations...')
  
  const locations = [
    {
      name: '咖啡厅',
      description: '温馨的街角咖啡厅，主角们经常在这里相遇',
      locationType: LocationType.INDOOR,
      moodColor: '暖黄色',
      keyElements: JSON.stringify(['木质桌椅', '落地窗', '咖啡机', '书架']),
      projectId: project.id,
    },
    {
      name: '城市公园',
      description: '繁华的都市中的一片绿地',
      locationType: LocationType.OUTDOOR,
      moodColor: '翠绿色',
      keyElements: JSON.stringify(['草坪', '长椅', '花坛', '喷泉']),
      projectId: project.id,
    },
    {
      name: '主角公寓',
      description: '简约现代的单身公寓',
      locationType: LocationType.INDOOR,
      moodColor: '米白色',
      keyElements: JSON.stringify(['落地窗', '书架', '沙发', '工作台']),
      projectId: project.id,
    },
  ]

  for (const locData of locations) {
    const location = await prisma.locationProfile.create({
      data: locData,
    })
    console.log(`  ✓ Location: ${location.name}`)
  }

  // 5. 创建测试剧集
  console.log('')
  console.log('🎥 Creating test episode...')
  
  const episode = await prisma.episode.create({
    data: {
      projectId: project.id,
      number: 1,
      name: '第一集：初遇',
      novelText: '张三和李四在咖啡厅初次相遇，两人因为一场误会而结缘...',
    },
  })
  console.log(`  ✓ Episode: ${episode.name} (第${episode.number}集)`)

  // 6. 创建测试剧本
  console.log('')
  console.log('📝 Creating test script...')
  
  const script = await prisma.script.create({
    data: {
      episodeId: episode.id,
      content: JSON.stringify({
        scenes: [
          {
            id: 1,
            location: '咖啡厅',
            time: '下午',
            description: '阳光透过落地窗洒进咖啡厅',
          },
        ],
        dialogues: [
          { character: '张三', line: '不好意思，这是您的咖啡吗？' },
          { character: '李四', line: '啊，是的，谢谢你！' },
        ],
      }),
      characters: JSON.stringify(['张三', '李四']),
      scenes: JSON.stringify(['咖啡厅']),
    },
  })
  console.log(`  ✓ Script created (ID: ${script.id})`)

  // 7. 创建测试分镜
  console.log('')
  console.log('🎨 Creating test storyboards...')
  
  const storyboards = [
    {
      episodeId: episode.id,
      sequence: 1,
      description: '咖啡厅外景，阳光明媚的下午',
      imagePrompt: 'A cozy coffee shop exterior, sunny afternoon, warm lighting, street view, cinematic shot',
    },
    {
      episodeId: episode.id,
      sequence: 2,
      description: '张三走进咖啡厅，环顾四周',
      imagePrompt: 'A young man entering a coffee shop, looking around, warm interior lighting, medium shot',
    },
    {
      episodeId: episode.id,
      sequence: 3,
      description: '李四坐在窗边，看着窗外',
      imagePrompt: 'A young woman sitting by the window, looking outside, soft natural light, close-up shot',
    },
  ]

  for (const sbData of storyboards) {
    const storyboard = await prisma.storyboard.create({
      data: sbData,
    })
    console.log(`  ✓ Storyboard #${storyboard.sequence}`)
  }

  // 统计信息
  console.log('')
  console.log('📊 Seed Summary:')
  console.log('----------------')
  console.log(`  • Users: 3 (test user, admin, superadmin)`)
  console.log(`  • Projects: 1`)
  console.log(`  • Characters: ${characters.length}`)
  console.log(`  • Locations: ${locations.length}`)
  console.log(`  • Episodes: 1`)
  console.log(`  • Storyboards: ${storyboards.length}`)
  console.log('')
  console.log('✅ Seeding completed successfully!')
  console.log('')
  console.log('📝 Test Accounts:')
  console.log('  • Test User:    test@example.com    / Test123456!')
  console.log('  • Admin:        admin@aidrama.com   / Test123456!')
  console.log('  • SuperAdmin:   superadmin@aidrama.com / SuperAdmin@2026')
  console.log('')
  console.log('💡 Next steps:')
  console.log('   - Run `pnpm db:verify` to verify database state')
  console.log('   - Run `pnpm test:api` to test API endpoints')
  console.log('   - Visit http://localhost:3000 to see the app')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
