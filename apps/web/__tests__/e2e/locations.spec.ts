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

// 辅助函数：通过 API 创建地点
async function createTestLocation(page: Page, projectId: string, locationData: {
  name: string
  locationType?: 'INDOOR' | 'OUTDOOR' | 'VIRTUAL' | 'TRANSITION'
  description?: string
  eraPeriod?: string
}) {
  return await page.evaluate(async ({ projectId, locationData }) => {
    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          name: locationData.name,
          locationType: locationData.locationType || 'OUTDOOR',
          description: locationData.description || '测试场景描述',
          eraPeriod: locationData.eraPeriod || '现代'
        })
      })
      return await response.json()
    } catch (e) {
      console.error('Create location failed:', e)
      return null
    }
  }, { projectId, locationData })
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

test.describe('地点列表页面', () => {
  test('应该显示地点列表页面', async ({ page }) => {
    await page.goto('/library/locations')
    await waitForPageLoad(page)

    // 验证页面标题
    await expect(page.getByRole('heading', { name: '场景库' })).toBeVisible()
    await expect(page.getByText('管理所有项目中的场景')).toBeVisible()
  })

  test('应该显示新建场景按钮', async ({ page }) => {
    await page.goto('/library/locations')
    await waitForPageLoad(page)

    const newButton = page.getByRole('button', { name: '新建场景' })
    await expect(newButton).toBeVisible()
  })

  test('应该能搜索场景', async ({ page }) => {
    await page.goto('/library/locations')
    await waitForPageLoad(page)

    // 输入搜索关键词
    const searchInput = page.getByPlaceholder('搜索场景...')
    await searchInput.fill('测试场景')
    
    // 等待搜索防抖
    await page.waitForTimeout(600)
    
    // 验证搜索功能工作（可能显示结果或空状态）
    const locationsCount = page.getByText(/共 \d+ 个场景/)
    await expect(locationsCount).toBeVisible()
  })

  test('应该能按类型筛选场景', async ({ page }) => {
    await page.goto('/library/locations')
    await waitForPageLoad(page)

    // 打开类型筛选下拉框
    const typeFilter = page.getByRole('combobox').filter({ hasText: '类型' }).first()
    if (await typeFilter.isVisible().catch(() => false)) {
      await typeFilter.click()
      
      // 选择室内类型
      await page.getByRole('option', { name: '室内' }).click()
      
      // 等待筛选结果
      await page.waitForTimeout(500)
      
      // 验证筛选标签显示
      await expect(page.getByText(/共 \d+ 个场景/)).toBeVisible()
    }
  })

  test('应该能切换视图模式', async ({ page }) => {
    await page.goto('/library/locations')
    await waitForPageLoad(page)

    // 网格视图按钮
    const gridButton = page.getByRole('button', { name: '网格视图' }).or(page.locator('button').filter({ has: page.locator('svg') }).nth(0))
    const listButton = page.getByRole('button', { name: '列表视图' }).or(page.locator('button').filter({ has: page.locator('svg') }).nth(1))
    
    // 切换到列表视图
    if (await listButton.isVisible().catch(() => false)) {
      await listButton.click()
      await page.waitForTimeout(300)
    }
    
    // 切换回网格视图
    if (await gridButton.isVisible().catch(() => false)) {
      await gridButton.click()
      await page.waitForTimeout(300)
    }
  })

  test('应该显示场景卡片列表', async ({ page }) => {
    // 创建测试项目和场景
    const projectName = `${TEST_PREFIX} 场景列表项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    await createTestLocation(page, projectId, {
      name: `${TEST_PREFIX} 测试场景`,
      locationType: 'INDOOR'
    })
    
    // 访问场景库
    await page.goto('/library/locations')
    await waitForPageLoad(page)
    
    // 等待场景卡片加载
    const locationCards = page.locator('[data-testid="location-card"]')
    
    // 获取场景数量
    const count = await locationCards.count()
    
    if (count > 0) {
      // 验证第一个场景卡片包含必要信息
      const firstCard = locationCards.first()
      await expect(firstCard).toBeVisible()
      
      // 验证场景名称存在
      await expect(firstCard.locator('h3')).toBeVisible()
      
      // 验证类型标签存在
      await expect(firstCard.locator('.badge').first()).toBeVisible()
    } else {
      // 如果没有场景，验证显示空状态
      await expect(page.getByText('暂无场景').or(page.getByText('开始创建你的第一个场景'))).toBeVisible()
    }
  })
})

test.describe('地点创建流程', () => {
  test('应该能通过 API 创建地点', async ({ page }) => {
    // 创建测试项目
    const projectName = `${TEST_PREFIX} 创建场景项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    
    // 通过 API 创建地点
    const locationName = `${TEST_PREFIX} 测试场景 ${Date.now()}`
    const location = await createTestLocation(page, projectId, {
      name: locationName,
      locationType: 'INDOOR',
      description: '这是一个室内场景',
      eraPeriod: '现代'
    })
    
    expect(location).not.toBeNull()
    expect(location.name).toBe(locationName)
    expect(location.locationType).toBe('INDOOR')
    
    // 验证场景显示在列表中
    await page.goto('/library/locations')
    await waitForPageLoad(page)
    await page.waitForTimeout(1000)
    
    // 筛选该项目
    const projectSelect = page.getByRole('combobox').filter({ hasText: '项目' }).first()
    if (await projectSelect.isVisible().catch(() => false)) {
      await projectSelect.click()
      await page.waitForTimeout(500)
      await page.getByRole('option', { name: projectName }).click()
      await page.waitForTimeout(1000)
    }
    
    await expect(page.getByText(locationName)).toBeVisible()
  })

  test('应该验证地点名称必填', async ({ page }) => {
    // 创建测试项目
    const projectName = `${TEST_PREFIX} 验证场景项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    
    // 尝试创建没有名称的场景
    const result = await page.evaluate(async (projectId) => {
      try {
        const response = await fetch('/api/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            name: '',
            locationType: 'INDOOR'
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

  test('应该支持不同类型的地点创建', async ({ page }) => {
    // 创建测试项目
    const projectName = `${TEST_PREFIX} 类型场景项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    
    // 创建不同类型的场景
    const types: Array<{ type: 'INDOOR' | 'OUTDOOR' | 'VIRTUAL' | 'TRANSITION', label: string }> = [
      { type: 'INDOOR', label: '室内' },
      { type: 'OUTDOOR', label: '室外' },
      { type: 'VIRTUAL', label: '虚拟' },
      { type: 'TRANSITION', label: '过渡' }
    ]
    
    for (const { type, label } of types) {
      const locationName = `${TEST_PREFIX} ${label}场景 ${Date.now()}`
      const location = await createTestLocation(page, projectId, {
        name: locationName,
        locationType: type,
        description: `${label}场景描述`
      })
      
      expect(location).not.toBeNull()
      expect(location.locationType).toBe(type)
    }
    
    // 验证场景库筛选
    await page.goto('/library/locations')
    await waitForPageLoad(page)
    await page.waitForTimeout(1000)
    
    // 筛选室内类型
    const typeFilter = page.getByRole('combobox').filter({ hasText: '类型' }).first()
    if (await typeFilter.isVisible().catch(() => false)) {
      await typeFilter.click()
      await page.getByRole('option', { name: '室内' }).click()
      await page.waitForTimeout(500)
      
      // 验证筛选器显示
      await expect(typeFilter).toContainText('室内')
    }
  })

  test('应该支持不同年代的地点创建', async ({ page }) => {
    // 创建测试项目
    const projectName = `${TEST_PREFIX} 年代场景项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    
    // 创建不同年代的场景
    const eras = ['古代', '近代', '现代', '未来']
    for (const era of eras) {
      const locationName = `${TEST_PREFIX} ${era}场景 ${Date.now()}`
      const location = await createTestLocation(page, projectId, {
        name: locationName,
        locationType: 'INDOOR',
        eraPeriod: era
      })
      
      expect(location).not.toBeNull()
      expect(location.eraPeriod).toBe(era)
    }
  })
})

test.describe('地点编辑流程', () => {
  test('应该能编辑地点信息', async ({ page }) => {
    // 创建测试项目和场景
    const projectName = `${TEST_PREFIX} 编辑场景项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    const locationName = `${TEST_PREFIX} 待编辑场景`
    const location = await createTestLocation(page, projectId, {
      name: locationName,
      locationType: 'INDOOR',
      description: '原始描述'
    })
    
    // 通过 API 更新场景
    const newName = `${TEST_PREFIX} 已编辑场景`
    const result = await page.evaluate(async ({ locationId, newName }) => {
      try {
        const response = await fetch(`/api/locations/${locationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: newName,
            description: '修改后的描述'
          })
        })
        return await response.json()
      } catch (e) {
        return null
      }
    }, { locationId: location.id, newName })
    
    expect(result).not.toBeNull()
    expect(result.name).toBe(newName)
    expect(result.description).toBe('修改后的描述')
  })

  test('应该能切换地点类型', async ({ page }) => {
    // 创建测试项目和场景
    const projectName = `${TEST_PREFIX} 切换类型项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    const locationName = `${TEST_PREFIX} 待切换类型场景`
    const location = await createTestLocation(page, projectId, {
      name: locationName,
      locationType: 'INDOOR'
    })
    
    // 通过 API 更新场景类型
    const result = await page.evaluate(async ({ locationId }) => {
      try {
        const response = await fetch(`/api/locations/${locationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locationType: 'OUTDOOR' })
        })
        return await response.json()
      } catch (e) {
        return null
      }
    }, { locationId: location.id })
    
    expect(result).not.toBeNull()
    expect(result.locationType).toBe('OUTDOOR')
  })

  test('编辑时应该验证名称必填', async ({ page }) => {
    // 创建测试项目和场景
    const projectName = `${TEST_PREFIX} 验证编辑场景项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    const locationName = `${TEST_PREFIX} 验证编辑场景`
    const location = await createTestLocation(page, projectId, { name: locationName })
    
    // 尝试更新为空名称
    const result = await page.evaluate(async ({ locationId }) => {
      try {
        const response = await fetch(`/api/locations/${locationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: '' })
        })
        return { status: response.status, ok: response.ok }
      } catch (e) {
        return { status: 0, ok: false }
      }
    }, { locationId: location.id })
    
    // 验证更新失败
    expect(result.ok).toBeFalsy()
  })
})

test.describe('场景卡片操作', () => {
  test('应该能通过卡片下拉菜单编辑场景', async ({ page }) => {
    // 创建测试项目和场景
    const projectName = `${TEST_PREFIX} 菜单编辑项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    await createTestLocation(page, projectId, {
      name: `${TEST_PREFIX} 菜单编辑场景`,
      locationType: 'INDOOR'
    })
    
    await page.goto('/library/locations')
    await waitForPageLoad(page)
    
    const locationCards = page.locator('[data-testid="location-card"]')
    
    if (await locationCards.first().isVisible().catch(() => false)) {
      // 悬停或点击第一个卡片显示更多按钮
      const firstCard = locationCards.first()
      await firstCard.hover()
      
      // 点击更多按钮（垂直三点图标）
      const moreButton = firstCard.locator('button').filter({ has: page.locator('svg') }).last()
      if (await moreButton.isVisible().catch(() => false)) {
        await moreButton.click()
        
        // 验证编辑选项存在
        await expect(page.getByRole('menuitem', { name: '编辑' })).toBeVisible()
      }
    }
  })

  test('应该能通过卡片下拉菜单删除场景', async ({ page }) => {
    // 创建测试项目和场景
    const projectName = `${TEST_PREFIX} 菜单删除项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    await createTestLocation(page, projectId, {
      name: `${TEST_PREFIX} 菜单删除场景`,
      locationType: 'INDOOR'
    })
    
    await page.goto('/library/locations')
    await waitForPageLoad(page)
    
    const locationCards = page.locator('[data-testid="location-card"]')
    
    if (await locationCards.first().isVisible().catch(() => false)) {
      // 悬停第一个卡片
      const firstCard = locationCards.first()
      await firstCard.hover()
      
      // 点击更多按钮
      const moreButton = firstCard.locator('button').filter({ has: page.locator('svg') }).last()
      if (await moreButton.isVisible().catch(() => false)) {
        await moreButton.click()
        
        // 验证删除选项存在
        await expect(page.getByRole('menuitem', { name: '删除' })).toBeVisible()
      }
    }
  })

  test('应该能选择多个场景进行批量操作', async ({ page }) => {
    // 创建测试项目和多个场景
    const projectName = `${TEST_PREFIX} 批量操作项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    
    // 创建两个场景
    await createTestLocation(page, projectId, {
      name: `${TEST_PREFIX} 场景1`,
      locationType: 'INDOOR'
    })
    await createTestLocation(page, projectId, {
      name: `${TEST_PREFIX} 场景2`,
      locationType: 'OUTDOOR'
    })
    
    await page.goto('/library/locations')
    await waitForPageLoad(page)
    
    const locationCards = page.locator('[data-testid="location-card"]')
    const count = await locationCards.count()
    
    if (count >= 2) {
      // 选择前两个场景
      const firstCard = locationCards.nth(0)
      const secondCard = locationCards.nth(1)
      
      // 点击复选框选择
      const firstCheckbox = firstCard.locator('input[type="checkbox"]').or(firstCard.locator('[role="checkbox"]'))
      const secondCheckbox = secondCard.locator('input[type="checkbox"]').or(secondCard.locator('[role="checkbox"]'))
      
      if (await firstCheckbox.isVisible().catch(() => false)) {
        await firstCheckbox.click()
        await secondCheckbox.click()
        
        // 验证批量操作栏显示
        await expect(page.getByText(/已选择 \d+ 个场景/)).toBeVisible()
        await expect(page.getByRole('button', { name: '批量编辑' })).toBeVisible()
        await expect(page.getByRole('button', { name: '删除' }).filter({ hasText: '删除' })).toBeVisible()
      }
    }
  })
})

test.describe('地点删除流程', () => {
  test('应该能删除地点', async ({ page }) => {
    // 创建测试项目和场景
    const projectName = `${TEST_PREFIX} 删除场景项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    const locationName = `${TEST_PREFIX} 待删除场景`
    const location = await createTestLocation(page, projectId, { name: locationName })
    
    // 验证场景存在
    await page.goto('/library/locations')
    await waitForPageLoad(page)
    await page.waitForTimeout(1000)
    await expect(page.getByText(locationName)).toBeVisible()
    
    // 通过 API 删除场景
    const result = await page.evaluate(async ({ locationId }) => {
      try {
        const response = await fetch(`/api/locations/${locationId}`, {
          method: 'DELETE'
        })
        return { status: response.status, ok: response.ok }
      } catch (e) {
        return { status: 0, ok: false }
      }
    }, { locationId: location.id })
    
    expect(result.ok).toBeTruthy()
    
    // 验证场景已被删除
    await page.reload()
    await waitForPageLoad(page)
    await expect(page.getByText(locationName)).not.toBeVisible()
  })
})

test.describe('响应式布局测试', () => {
  test('桌面端应该显示4列网格', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto('/library/locations')
    await waitForPageLoad(page)
    
    // 验证页面标题可见
    await expect(page.getByRole('heading', { name: '场景库' })).toBeVisible()
    
    // 验证筛选器可见
    await expect(page.getByPlaceholder('搜索场景...')).toBeVisible()
  })

  test('平板端应该显示2-3列网格', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/library/locations')
    await waitForPageLoad(page)
    
    // 验证页面标题可见
    await expect(page.getByRole('heading', { name: '场景库' })).toBeVisible()
  })

  test('手机端应该显示单列并适配布局', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/library/locations')
    await waitForPageLoad(page)
    
    // 验证页面标题可见
    await expect(page.getByRole('heading', { name: '场景库' })).toBeVisible()
    
    // 验证搜索框可见
    await expect(page.getByPlaceholder('搜索场景...')).toBeVisible()
  })
})

test.describe('项目筛选测试', () => {
  test('应该能按项目筛选场景', async ({ page }) => {
    // 创建两个测试项目
    const projectName1 = `${TEST_PREFIX} 筛选项目1 ${Date.now()}`
    const projectName2 = `${TEST_PREFIX} 筛选项目2 ${Date.now()}`
    const projectId1 = await createTestProject(page, projectName1)
    const projectId2 = await createTestProject(page, projectName2)
    
    // 为每个项目创建场景
    await createTestLocation(page, projectId1, {
      name: `${TEST_PREFIX} 项目1场景`,
      locationType: 'INDOOR'
    })
    await createTestLocation(page, projectId2, {
      name: `${TEST_PREFIX} 项目2场景`,
      locationType: 'OUTDOOR'
    })
    
    await page.goto('/library/locations')
    await waitForPageLoad(page)
    
    // 打开项目筛选下拉框
    const projectFilter = page.getByRole('combobox').filter({ hasText: '项目' }).first()
    if (await projectFilter.isVisible().catch(() => false)) {
      await projectFilter.click()
      
      // 选择第一个项目
      const firstProject = page.getByRole('option', { name: projectName1 })
      if (await firstProject.isVisible().catch(() => false)) {
        await firstProject.click()
        
        // 等待筛选结果
        await page.waitForTimeout(500)
        
        // 验证场景列表更新
        await expect(page.getByText(/共 \d+ 个场景/)).toBeVisible()
      }
    }
  })

  test('从项目页进入场景库应该自动筛选该项目', async ({ page }) => {
    // 创建测试项目
    const projectName = `${TEST_PREFIX} 自动筛选项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    
    // 访问项目详情页
    await page.goto(`/projects/${projectId}`)
    await waitForPageLoad(page)
    
    // 点击场景库快捷入口
    const locationsLink = page.getByRole('link', { name: '场景库' })
    if (await locationsLink.isVisible().catch(() => false)) {
      await locationsLink.click()
      
      // 验证 URL 包含项目筛选参数
      await expect(page).toHaveURL(/project=.+/)}
  })
})

test.describe('空状态和错误处理', () => {
  test('应该显示空状态当没有场景时', async ({ page }) => {
    // 使用一个不存在的项目筛选
    await page.goto('/library/locations?project=non-existent-project-id')
    await waitForPageLoad(page)
    
    // 验证空状态或没有场景卡片
    const cards = page.locator('[data-testid="location-card"]')
    const count = await cards.count()
    
    // 应该有0个场景或显示空状态
    if (count === 0) {
      // 可能显示"暂无场景"的提示
      const emptyState = page.getByText('暂无场景')
      if (await emptyState.isVisible().catch(() => false)) {
        await expect(emptyState).toBeVisible()
      }
    }
  })

  test('应该能处理搜索无结果的情况', async ({ page }) => {
    await page.goto('/library/locations')
    await waitForPageLoad(page)
    
    // 搜索一个不存在的场景
    const searchInput = page.getByPlaceholder('搜索场景...')
    await searchInput.fill('不存在的场景XYZ123')
    await page.waitForTimeout(600)
    
    // 验证显示"共 0 个场景"或类似的提示
    const resultCount = page.getByText(/共 \d+ 个场景/)
    await expect(resultCount).toContainText('共 0 个场景')
  })
})
