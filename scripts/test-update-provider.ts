#!/usr/bin/env tsx
/**
 * 测试更新 provider API
 */

import 'dotenv/config'

async function main() {
  const providerId = process.argv[2] || '5e1432ea-a880-4b5f-be5a-9e5fa3f32def'
  
  console.log(`🧪 测试更新 provider: ${providerId}`)
  console.log('=====================================\n')

  // 首先获取 cookie 或 token
  // 这里假设已经登录，从浏览器复制 cookie
  console.log('⚠️  请确保已登录并在浏览器中运行此测试')
  console.log('或者在下方添加你的认证 token\n')
  
  const token = process.env.AUTH_TOKEN || ''
  
  try {
    const response = await fetch(`http://localhost:3333/api/admin/providers/${providerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth_token=${token}`,
      },
      body: JSON.stringify({
        isActive: true
      }),
    })

    console.log(`状态码: ${response.status}`)
    console.log(`Content-Type: ${response.headers.get('content-type')}`)
    
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const data = await response.json()
      console.log('响应数据:', JSON.stringify(data, null, 2))
    } else {
      const text = await response.text()
      console.log('响应文本:', text)
    }
  } catch (error: any) {
    console.error('请求失败:', error.message)
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
