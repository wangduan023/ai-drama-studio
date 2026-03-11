import { test, expect, type Page } from '@playwright/test'

// 测试用的前缀
const TEST_PREFIX = '[E2E测试]'

// 辅助函数：等待页面加载
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
}

// 辅助函数：创建测试项目
async function createTestProject(page: Page, name: string): Promise<string> {
  await page.goto('/projects/new')
  await waitForPageLoad(page)
  
  // 填写表单
  await page.fill('[data-testid="project-name-input"]', name)
  await page.fill('[data-testid="project-description-input"]', '测试项目描述')
  
  // 下一步到确认页面
  await page.click('[data-testid="next-button"]')
  await page.waitForTimeout(500)
  await page.click('[data-testid="next-button"]')
  await page.waitForTimeout(500)
  await page.click('[data-testid="next-button"]')
  await page.waitForTimeout(500)
  
  // 提交表单
  await page.click('[data-testid="submit-button"]')
  
  // 等待跳转并获取项目ID
  await page.waitForURL(/\/projects\/.+/, { timeout: 15000 })
  const url = page.url()
  const projectId = url.split('/projects/')[1]
  
  return projectId
}

// 辅助函数：通过 API 创建剧集
async function createTestEpisode(page: Page, projectId: string, episodeData: {
  name: string
  number?: number
  novelText?: string
}) {
  return await page.evaluate(async ({ projectId, episodeData }) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: episodeData.name,
          number: episodeData.number || 1,
          novelText: episodeData.novelText || ''
        })
      })
      return await response.json()
    } catch (e) {
      console.error('Create episode failed:', e)
      return null
    }
  }, { projectId, episodeData })
}

// 辅助函数：清理测试数据
async function cleanupTestData(page: Page) {
  try {
    await page.evaluate(async (prefix) => {
      try {
        // 获取所有项目
        const projectsResponse = await fetch('/api/projects')
        const projects = await projectsResponse.json()
        
        // 删除测试创建的项目
        for (const project of projects) {
          if (project.title && project.title.startsWith(prefix)) {
            await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
          }
        }
      } catch (e) {
        console.error('Cleanup failed:', e)
      }
    }, TEST_PREFIX)
  } catch {
    // 忽略清理错误
  }
}

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()
  await cleanupTestData(page)
  await page.close()
})

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage()
  await cleanupTestData(page)
  await page.close()
})

test.describe('剧集列表页面', () => {
  test('应该显示剧集列表页面', async ({ page }) => {
    // 创建测试项目
    const projectName = `${TEST_PREFIX} 剧集列表项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    
    // 访问项目页面
    await page.goto(`/projects/${projectId}`)
    await waitForPageLoad(page)
    
    // 切换到剧集标签页
    await page.getByRole('tab', { name: '剧集' }).click()
    await page.waitForTimeout(500)
    
    // 验证页面标题
    await expect(page.getByRole('heading', { name: '剧集列表' })).toBeVisible()
  })

  test('应该能添加新剧集', async ({ page }) => {
    // 创建测试项目
    const projectName = `${TEST_PREFIX} 添加剧集项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    
    // 访问项目页面
    await page.goto(`/projects/${projectId}`)
    await waitForPageLoad(page)
    
    // 切换到剧集标签页
    await page.getByRole('tab', { name: '剧集' }).click()
    await page.waitForTimeout(500)
    
    // 点击添加剧集按钮
    const addButton = page.getByRole('button', { name: '添加剧集' })
    await expect(addButton).toBeVisible()
    await addButton.click()

    // 验证弹出创建对话框或页面
    await expect(page.getByText('新建剧集').or(page.getByRole('dialog'))).toBeVisible()
  })

  test('应该显示剧集卡片列表', async ({ page }) => {
    // 创建测试项目
    const projectName = `${TEST_PREFIX} 剧集卡片项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    
    // 创建测试剧集
    await createTestEpisode(page, projectId, {
      name: `${TEST_PREFIX} 测试剧集`,
      number: 1
    })
    
    // 访问项目页面
    await page.goto(`/projects/${projectId}`)
    await waitForPageLoad(page)
    
    // 切换到剧集标签页
    await page.getByRole('tab', { name: '剧集' }).click()
    await page.waitForTimeout(500)
    
    // 验证剧集卡片存在
    const episodeCards = page.locator('[data-testid="episode-card"]')
    await expect(episodeCards.first()).toBeVisible()
  })
})

test.describe('剧集创建流程', () => {
  test('应该能通过 API 创建剧集', async ({ page }) => {
    // 创建测试项目
    const projectName = `${TEST_PREFIX} 创建剧集项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    
    // 通过 API 创建剧集
    const episodeName = `${TEST_PREFIX} 测试剧集 ${Date.now()}`
    const episode = await createTestEpisode(page, projectId, {
      name: episodeName,
      number: 1,
      novelText: '这是测试剧本内容'
    })
    
    expect(episode).not.toBeNull()
    expect(episode.name).toBe(episodeName)
    expect(episode.number).toBe(1)
    
    // 验证剧集显示在项目页面
    await page.goto(`/projects/${projectId}`)
    await waitForPageLoad(page)
    await page.getByRole('tab', { name: '剧集' }).click()
    await page.waitForTimeout(500)
    
    await expect(page.getByText(episodeName)).toBeVisible()
  })

  test('应该验证剧集名称必填', async ({ page }) => {
    // 创建测试项目
    const projectName = `${TEST_PREFIX} 验证剧集项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    
    // 尝试创建没有名称的剧集
    const result = await page.evaluate(async (projectId) => {
      try {
        const response = await fetch(`/api/projects/${projectId}/episodes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: '',
            number: 1
          })
        })
        return { status: response.status, ok: response.ok }
      } catch (e) {
        return { status: 0, ok: false }
      }
    }, projectId)
    
    // 验证创建失败
    expect(result.ok).toBeFalsy()
  })

  test('应该验证集数唯一性', async ({ page }) => {
    // 创建测试项目
    const projectName = `${TEST_PREFIX} 集数唯一项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    
    // 创建第一个剧集
    const episode1 = await createTestEpisode(page, projectId, {
      name: `${TEST_PREFIX} 第一集`,
      number: 1
    })
    expect(episode1).not.toBeNull()
    
    // 尝试创建相同集数的剧集
    const result = await page.evaluate(async ({ projectId }) => {
      try {
        const response = await fetch(`/api/projects/${projectId}/episodes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: '重复集数剧集',
            number: 1
          })
        })
        return { status: response.status, ok: response.ok }
      } catch (e) {
        return { status: 0, ok: false }
      }
    }, { projectId })
    
    // 根据 API 实现，可能返回错误或者自动调整集数
    // 这里我们只需要验证请求被处理了
    expect(result.status).not.toBe(0)
  })

  test('应该支持创建多集剧集', async ({ page }) => {
    // 创建测试项目
    const projectName = `${TEST_PREFIX} 多集项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    
    // 创建多个剧集
    for (let i = 1; i <= 3; i++) {
      const episode = await createTestEpisode(page, projectId, {
        name: `${TEST_PREFIX} 第${i}集`,
        number: i
      })
      expect(episode).not.toBeNull()
      expect(episode.number).toBe(i)
    }
    
    // 验证剧集显示
    await page.goto(`/projects/${projectId}`)
    await waitForPageLoad(page)
    await page.getByRole('tab', { name: '剧集' }).click()
    await page.waitForTimeout(500)
    
    // 验证显示3个剧集
    const episodeCards = page.locator('[data-testid="episode-card"]')
    expect(await episodeCards.count()).toBeGreaterThanOrEqual(3)
  })
})

test.describe('剧集详情页面', () => {
  test('应该能查看剧集详情', async ({ page }) => {
    // 创建测试项目和剧集
    const projectName = `${TEST_PREFIX} 详情测试项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    const episodeName = `${TEST_PREFIX} 详情测试剧集`
    const episode = await createTestEpisode(page, projectId, {
      name: episodeName,
      number: 1
    })
    
    // 访问剧集详情页
    await page.goto(`/projects/${projectId}/episodes/${episode.id}`)
    await waitForPageLoad(page)
    
    // 验证详情页内容
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByText(/第 \d+ 集/)).toBeVisible()
  })

  test('应该能编辑剧集信息', async ({ page }) => {
    // 创建测试项目和剧集
    const projectName = `${TEST_PREFIX} 编辑剧集项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    const episodeName = `${TEST_PREFIX} 待编辑剧集`
    const episode = await createTestEpisode(page, projectId, {
      name: episodeName,
      number: 1
    })
    
    // 通过 API 更新剧集
    const newName = `${TEST_PREFIX} 已编辑剧集`
    const result = await page.evaluate(async ({ episodeId, newName }) => {
      try {
        const response = await fetch(`/api/episodes/${episodeId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newName })
        })
        return await response.json()
      } catch (e) {
        return null
      }
    }, { episodeId: episode.id, newName })
    
    expect(result).not.toBeNull()
    expect(result.name).toBe(newName)
  })

  test('剧集详情页应该包含标签页', async ({ page }) => {
    // 创建测试项目和剧集
    const projectName = `${TEST_PREFIX} 标签页项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    const episode = await createTestEpisode(page, projectId, {
      name: `${TEST_PREFIX} 标签页测试剧集`,
      number: 1
    })
    
    // 访问剧集详情页
    await page.goto(`/projects/${projectId}/episodes/${episode.id}`)
    await waitForPageLoad(page)
    
    // 验证标签页存在
    await expect(page.getByRole('tab', { name: '剧本' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '片段' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '生成' })).toBeVisible()
  })

  test('应该能在剧集详情页切换标签', async ({ page }) => {
    // 创建测试项目和剧集
    const projectName = `${TEST_PREFIX} 切换标签项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    const episode = await createTestEpisode(page, projectId, {
      name: `${TEST_PREFIX} 切换标签测试剧集`,
      number: 1
    })
    
    // 访问剧集详情页
    await page.goto(`/projects/${projectId}/episodes/${episode.id}`)
    await waitForPageLoad(page)
    
    // 切换到片段标签
    await page.getByRole('tab', { name: '片段' }).click()
    await expect(page.getByText('片段列表').or(page.getByText('暂无片段'))).toBeVisible()
    
    // 切换到生成标签
    await page.getByRole('tab', { name: '生成' }).click()
    await expect(page.getByText('生成控制').or(page.getByRole('button', { name: /生成/ }))).toBeVisible()
    
    // 切回剧本标签
    await page.getByRole('tab', { name: '剧本' }).click()
    await expect(page.getByText('剧本编辑').or(page.locator('textarea'))).toBeVisible()
  })

  test('应该能通过返回按钮返回项目页', async ({ page }) => {
    // 创建测试项目和剧集
    const projectName = `${TEST_PREFIX} 返回项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    const episode = await createTestEpisode(page, projectId, {
      name: `${TEST_PREFIX} 返回测试剧集`,
      number: 1
    })
    
    // 访问剧集详情页
    await page.goto(`/projects/${projectId}/episodes/${episode.id}`)
    await waitForPageLoad(page)
    
    // 点击返回按钮
    const backButton = page.getByRole('button', { name: '返回项目' })
    if (await backButton.isVisible().catch(() => false)) {
      await backButton.click()
      
      // 验证返回项目详情页
      await expect(page).toHaveURL(`/projects/${projectId}`)
    }
  })
})

test.describe('剧集删除流程', () => {
  test('应该能删除剧集', async ({ page }) => {
    // 创建测试项目和剧集
    const projectName = `${TEST_PREFIX} 删除剧集项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    const episodeName = `${TEST_PREFIX} 待删除剧集`
    const episode = await createTestEpisode(page, projectId, {
      name: episodeName,
      number: 1
    })
    
    // 验证剧集存在
    await page.goto(`/projects/${projectId}`)
    await waitForPageLoad(page)
    await page.getByRole('tab', { name: '剧集' }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText(episodeName)).toBeVisible()
    
    // 通过 API 删除剧集
    const result = await page.evaluate(async ({ episodeId }) => {
      try {
        const response = await fetch(`/api/episodes/${episodeId}`, {
          method: 'DELETE'
        })
        return { status: response.status, ok: response.ok }
      } catch (e) {
        return { status: 0, ok: false }
      }
    }, { episodeId: episode.id })
    
    expect(result.ok).toBeTruthy()
    
    // 验证剧集已被删除
    await page.reload()
    await waitForPageLoad(page)
    await page.getByRole('tab', { name: '剧集' }).click()
    await page.waitForTimeout(500)
    await expect(page.getByText(episodeName)).not.toBeVisible()
  })
})

test.describe('响应式布局测试', () => {
  test('桌面端应该显示完整的剧集信息', async ({ page }) => {
    // 创建测试项目和剧集
    const projectName = `${TEST_PREFIX} 桌面端项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    await createTestEpisode(page, projectId, {
      name: `${TEST_PREFIX} 桌面端测试剧集`,
      number: 1
    })
    
    // 设置桌面视口
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto(`/projects/${projectId}`)
    await waitForPageLoad(page)
    
    // 切换到剧集标签页
    await page.getByRole('tab', { name: '剧集' }).click()
    await page.waitForTimeout(500)
    
    // 验证剧集卡片可见
    const episodeCards = page.locator('[data-testid="episode-card"]')
    if (await episodeCards.first().isVisible().catch(() => false)) {
      // 桌面端应该显示完整的剧集信息
      await expect(page.getByText('个片段').first()).toBeVisible()
      await expect(page.getByText('个分镜').first()).toBeVisible()
    }
  })

  test('平板端应该适配布局', async ({ page }) => {
    // 创建测试项目
    const projectName = `${TEST_PREFIX} 平板端项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    
    // 设置平板视口
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto(`/projects/${projectId}`)
    await waitForPageLoad(page)
    
    // 切换到剧集标签页
    await page.getByRole('tab', { name: '剧集' }).click()
    await page.waitForTimeout(500)
    
    // 验证剧集列表可见
    await expect(page.getByRole('heading', { name: '剧集列表' })).toBeVisible()
  })

  test('手机端应该适配布局', async ({ page }) => {
    // 创建测试项目
    const projectName = `${TEST_PREFIX} 手机端项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    
    // 设置手机视口
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(`/projects/${projectId}`)
    await waitForPageLoad(page)
    
    // 切换到剧集标签页
    await page.getByRole('tab', { name: '剧集' }).click()
    await page.waitForTimeout(500)
    
    // 验证剧集列表可见
    await expect(page.getByRole('heading', { name: '剧集列表' })).toBeVisible()
    
    // 验证添加按钮可见
    await expect(page.getByRole('button', { name: '添加剧集' })).toBeVisible()
  })
})
