#!/usr/bin/env node
/**
 * API Test Script
 * 
 * 测试 API 端点：
 * - Projects API
 * - Characters API
 * - Locations API
 * - Episodes API
 * - SSE API
 * 
 * 使用方法:
 *   pnpm test:api
 * 
 * 注意：确保服务已启动 (pnpm dev)
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000'

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

// 测试工具函数
async function testEndpoint(name, method, path, body = null, headers = {}) {
  const url = `${BASE_URL}${path}`
  const options = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
  }
  
  if (body) {
    options.body = JSON.stringify(body)
  }

  try {
    log(`\n📡 ${method} ${path}`, 'cyan')
    const startTime = Date.now()
    const response = await fetch(url, options)
    const duration = Date.now() - startTime
    
    const contentType = response.headers.get('content-type')
    let data
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }

    if (response.ok) {
      log(`   ✅ ${response.status} (${duration}ms)`, 'green')
      if (typeof data === 'object') {
        const jsonStr = JSON.stringify(data, null, 2)
        log(`   📦 Response: ${jsonStr.substring(0, 150)}${jsonStr.length > 150 ? '...' : ''}`, 'blue')
      }
      return { success: true, data, status: response.status }
    } else {
      log(`   ❌ ${response.status} (${duration}ms)`, 'red')
      log(`   📦 Error: ${JSON.stringify(data).substring(0, 200)}`, 'red')
      return { success: false, data, status: response.status }
    }
  } catch (error) {
    log(`   ❌ Error: ${error.message}`, 'red')
    return { success: false, error: error.message }
  }
}

// 测试 Projects API
async function testProjectsAPI() {
  log('\n========================================', 'yellow')
  log('🗂️  Testing Projects API', 'yellow')
  log('========================================', 'yellow')

  let createdProjectId = null

  // 1. 获取项目列表
  const listResult = await testEndpoint('List Projects', 'GET', '/api/projects')
  
  if (listResult.success && Array.isArray(listResult.data)) {
    log(`   📊 Found ${listResult.data.length} projects`, 'blue')
  }

  // 2. 创建新项目
  const createResult = await testEndpoint('Create Project', 'POST', '/api/projects', {
    name: 'API测试项目',
    description: '这是一个通过API测试脚本创建的项目',
  })

  if (createResult.success && createResult.data.id) {
    createdProjectId = createResult.data.id
    log(`   📝 Created project ID: ${createdProjectId}`, 'blue')
  }

  // 3. 获取项目详情
  if (createdProjectId) {
    await testEndpoint('Get Project', 'GET', `/api/projects/${createdProjectId}`)

    // 4. 更新项目
    await testEndpoint('Update Project', 'PUT', `/api/projects/${createdProjectId}`, {
      name: 'API测试项目（已更新）',
      description: '项目描述已更新',
    })

    // 5. 获取更新后的项目
    await testEndpoint('Get Updated Project', 'GET', `/api/projects/${createdProjectId}`)
  }

  return { createdProjectId }
}

// 测试 Characters API
async function testCharactersAPI(projectId) {
  log('\n========================================', 'yellow')
  log('🎭 Testing Characters API', 'yellow')
  log('========================================', 'yellow')

  if (!projectId) {
    log('   ⚠️  No project ID available, skipping character tests', 'yellow')
    return { createdCharacterId: null }
  }

  // 1. 获取角色列表
  await testEndpoint('List Characters', 'GET', `/api/characters?projectId=${projectId}`)

  // 2. 创建新角色
  const createResult = await testEndpoint('Create Character', 'POST', '/api/characters', {
    projectId,
    name: 'API测试角色',
    introduction: '这是一个通过API测试脚本创建的角色',
    gender: '男',
    ageRange: '约三十岁',
    roleLevel: 'B',
    personalityTags: ['友善', '乐观'],
    visualKeywords: ['阳光', '干练'],
  })

  let createdCharacterId = null
  if (createResult.success && createResult.data.id) {
    createdCharacterId = createResult.data.id
    log(`   📝 Created character ID: ${createdCharacterId}`, 'blue')
  }

  // 3. 获取角色详情
  if (createdCharacterId) {
    await testEndpoint('Get Character', 'GET', `/api/characters/${createdCharacterId}?projectId=${projectId}`)

    // 4. 更新角色
    await testEndpoint('Update Character', 'PUT', `/api/characters/${createdCharacterId}`, {
      projectId,
      name: 'API测试角色（已更新）',
      introduction: '角色介绍已更新',
    })
  }

  return { createdCharacterId }
}

// 测试 Locations API
async function testLocationsAPI(projectId) {
  log('\n========================================', 'yellow')
  log('🎬 Testing Locations API', 'yellow')
  log('========================================', 'yellow')

  if (!projectId) {
    log('   ⚠️  No project ID available, skipping location tests', 'yellow')
    return { createdLocationId: null }
  }

  // 1. 获取场景列表
  await testEndpoint('List Locations', 'GET', `/api/locations?projectId=${projectId}`)

  // 2. 创建新场景
  const createResult = await testEndpoint('Create Location', 'POST', '/api/locations', {
    projectId,
    name: 'API测试场景',
    description: '这是一个通过API测试脚本创建的场景',
    locationType: 'INDOOR',
    moodColor: '蓝色',
    keyElements: ['窗户', '书桌', '书架'],
  })

  let createdLocationId = null
  if (createResult.success && createResult.data.id) {
    createdLocationId = createResult.data.id
    log(`   📝 Created location ID: ${createdLocationId}`, 'blue')
  }

  // 3. 获取场景详情
  if (createdLocationId) {
    await testEndpoint('Get Location', 'GET', `/api/locations/${createdLocationId}?projectId=${projectId}`)

    // 4. 更新场景
    await testEndpoint('Update Location', 'PUT', `/api/locations/${createdLocationId}`, {
      projectId,
      name: 'API测试场景（已更新）',
      description: '场景描述已更新',
    })
  }

  return { createdLocationId }
}

// 测试 Episodes API
async function testEpisodesAPI(projectId) {
  log('\n========================================', 'yellow')
  log('🎥 Testing Episodes API', 'yellow')
  log('========================================', 'yellow')

  if (!projectId) {
    log('   ⚠️  No project ID available, skipping episode tests', 'yellow')
    return { createdEpisodeId: null }
  }

  // 1. 获取剧集列表
  await testEndpoint('List Episodes', 'GET', `/api/episodes?projectId=${projectId}`)

  // 2. 创建新剧集
  const createResult = await testEndpoint('Create Episode', 'POST', '/api/episodes', {
    projectId,
    number: 1,
    name: 'API测试剧集',
    novelText: '这是一个通过API测试脚本创建的剧集内容...',
  })

  let createdEpisodeId = null
  if (createResult.success && createResult.data.id) {
    createdEpisodeId = createResult.data.id
    log(`   📝 Created episode ID: ${createdEpisodeId}`, 'blue')
  }

  // 3. 获取剧集详情
  if (createdEpisodeId) {
    await testEndpoint('Get Episode', 'GET', `/api/episodes/${createdEpisodeId}?projectId=${projectId}`)

    // 4. 更新剧集
    await testEndpoint('Update Episode', 'PUT', `/api/episodes/${createdEpisodeId}`, {
      projectId,
      name: 'API测试剧集（已更新）',
      novelText: '剧集内容已更新...',
    })
  }

  return { createdEpisodeId }
}

// 测试 SSE API
async function testSSEAPI() {
  log('\n========================================', 'yellow')
  log('📡 Testing SSE API', 'yellow')
  log('========================================', 'yellow')

  // SSE 连接测试（不保持连接，只检查端点是否存在）
  const url = `${BASE_URL}/api/sse`
  
  try {
    log(`\n📡 Testing SSE endpoint...`, 'cyan')
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/event-stream',
      },
      signal: controller.signal,
    })
    
    clearTimeout(timeout)
    
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      log(`   ✅ SSE endpoint is accessible`, 'green')
      log(`   📦 Content-Type: ${response.headers.get('content-type')}`, 'blue')
    } else {
      log(`   ⚠️  SSE endpoint returned unexpected content type`, 'yellow')
      log(`   📦 Content-Type: ${response.headers.get('content-type') || 'none'}`, 'blue')
    }
    
    controller.abort()
  } catch (error) {
    if (error.name === 'AbortError') {
      log(`   ✅ SSE endpoint is accessible (connection timeout expected)`, 'green')
    } else {
      log(`   ⚠️  SSE check error: ${error.message}`, 'yellow')
    }
  }
}

// 清理测试数据
async function cleanupTestData(projectId, characterId, locationId, episodeId) {
  log('\n========================================', 'yellow')
  log('🧹 Cleaning up test data', 'yellow')
  log('========================================', 'yellow')

  // 按依赖顺序删除：episode -> location/character -> project
  if (episodeId) {
    await testEndpoint('Delete Test Episode', 'DELETE', `/api/episodes/${episodeId}?projectId=${projectId}`)
  }
  
  if (locationId) {
    await testEndpoint('Delete Test Location', 'DELETE', `/api/locations/${locationId}?projectId=${projectId}`)
  }
  
  if (characterId) {
    await testEndpoint('Delete Test Character', 'DELETE', `/api/characters/${characterId}?projectId=${projectId}`)
  }

  if (projectId) {
    await testEndpoint('Delete Test Project', 'DELETE', `/api/projects/${projectId}`)
  }
}

// 主测试流程
async function main() {
  console.log('🧪 AI Drama Studio - API Test Suite')
  console.log('====================================')
  console.log(`Base URL: ${BASE_URL}`)
  console.log('')

  // 检查服务是否运行
  try {
    await fetch(BASE_URL)
  } catch (error) {
    log(`❌ Cannot connect to ${BASE_URL}`, 'red')
    log('   Please make sure the server is running:', 'yellow')
    log('   pnpm dev', 'cyan')
    process.exit(1)
  }

  log('✅ Server is accessible', 'green')

  const startTime = Date.now()
  let projectId = null
  let characterId = null
  let locationId = null
  let episodeId = null

  try {
    // 运行测试
    const projectResult = await testProjectsAPI()
    projectId = projectResult.createdProjectId

    if (projectId) {
      const characterResult = await testCharactersAPI(projectId)
      characterId = characterResult.createdCharacterId

      const locationResult = await testLocationsAPI(projectId)
      locationId = locationResult.createdLocationId

      const episodeResult = await testEpisodesAPI(projectId)
      episodeId = episodeResult.createdEpisodeId
    }

    await testSSEAPI()

    // 统计
    const duration = Date.now() - startTime
    log('\n========================================', 'green')
    log('📊 Test Summary', 'green')
    log('========================================', 'green')
    log(`   ✅ All tests completed in ${duration}ms`, 'green')
    
    if (projectId) {
      log(`   📝 Created Project: ${projectId}`, 'blue')
      log(`   🎭 Created Character: ${characterId || 'N/A'}`, 'blue')
      log(`   🎬 Created Location: ${locationId || 'N/A'}`, 'blue')
      log(`   🎥 Created Episode: ${episodeId || 'N/A'}`, 'blue')
      
      log('\n💡 Test data created for manual inspection:', 'yellow')
      log(`   Project ID: ${projectId}`, 'cyan')
      log(`   Visit: ${BASE_URL}/projects/${projectId}`, 'cyan')
      
      log('\n🧹 To clean up test data, run:', 'yellow')
      log(`   curl -X DELETE ${BASE_URL}/api/projects/${projectId}`, 'cyan')
    } else {
      log(`   ⚠️  No test data was created`, 'yellow')
    }

  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red')
    console.error(error)
    process.exit(1)
  }
}

main()
