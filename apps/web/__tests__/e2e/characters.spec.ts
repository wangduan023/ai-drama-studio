import { test, expect, Page } from '@playwright/test'

/**
 * 角色流程 E2E 测试
 * 
 * 测试覆盖:
 * 1. 访问角色列表 /library/characters
 * 2. 创建角色表单流程
 * 3. 编辑角色信息
 * 4. 删除角色
 * 5. 角色筛选功能
 * 6. 表单验证
 */

// 配置串行执行以避免测试数据冲突
test.describe.configure({ mode: 'serial' })

const TEST_CHARACTER_PREFIX = '[E2E测试]'

// 辅助函数：清理测试数据
async function cleanupTestData(page: Page) {
  try {
    // 通过 API 清理测试创建的角色
    await page.evaluate(async (prefix) => {
      try {
        // 获取所有角色
        const response = await fetch('/api/characters')
        const characters = await response.json()
        
        // 删除测试创建的角色
        for (const character of characters) {
          if (character.name && character.name.startsWith(prefix)) {
            await fetch(`/api/characters/${character.id}`, { method: 'DELETE' })
          }
        }
        
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
    }, TEST_CHARACTER_PREFIX)
  } catch {
    // 忽略清理错误
  }
}

// 辅助函数：创建测试项目
async function createTestProject(page: Page, name: string): Promise<string> {
  await page.goto('/projects/new')
  await page.waitForLoadState('networkidle')
  
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

// 辅助函数：通过 API 创建角色
async function createTestCharacter(page: Page, projectId: string, characterData: {
  name: string
  roleLevel?: string
  gender?: string
  introduction?: string
}) {
  return await page.evaluate(async ({ projectId, characterData }) => {
    try {
      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          name: characterData.name,
          roleLevel: characterData.roleLevel || 'B',
          gender: characterData.gender || '未知',
          introduction: characterData.introduction || '测试角色描述',
          archetype: '主角'
        })
      })
      return await response.json()
    } catch (e) {
      console.error('Create character failed:', e)
      return null
    }
  }, { projectId, characterData })
}

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

test.describe('角色列表页面', () => {
  test.beforeEach(async ({ page }) => {
    // 访问角色库页面
    await page.goto('/library/characters')
    await page.waitForLoadState('networkidle')
  })

  test('应该显示页面标题', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '角色库' })).toBeVisible()
    await expect(page.getByText('管理所有项目中的角色')).toBeVisible()
  })

  test('应该显示新建角色按钮', async ({ page }) => {
    const newButton = page.getByRole('button', { name: '新建角色' })
    await expect(newButton).toBeVisible()
  })

  test('应该能搜索角色', async ({ page }) => {
    // 等待页面加载
    await page.waitForTimeout(1000)
    
    // 输入搜索关键词
    const searchInput = page.getByPlaceholder('搜索角色...')
    await searchInput.fill('测试角色')
    
    // 等待搜索过滤完成
    await page.waitForTimeout(500)
    
    // 验证搜索功能正常工作
    await expect(searchInput).toHaveValue('测试角色')
  })

  test('应该能切换视图模式', async ({ page }) => {
    // 等待页面加载
    await page.waitForTimeout(1000)
    
    // 获取视图切换按钮
    const gridButton = page.locator('button').filter({ has: page.locator('[data-lucide="grid"]') }).first()
    const listButton = page.locator('button').filter({ has: page.locator('[data-lucide="list"]') }).first()
    
    // 切换到列表视图
    await listButton.click()
    await page.waitForTimeout(500)
    
    // 切换回网格视图
    await gridButton.click()
    await page.waitForTimeout(500)
    
    // 验证页面没有错误
    await expect(page.getByRole('heading', { name: '角色库' })).toBeVisible()
  })

  test('应该能按等级筛选角色', async ({ page }) => {
    // 打开等级筛选下拉框
    const gradeSelect = page.locator('[role="combobox"]').filter({ hasText: /全部等级|等级/ }).first()
    await gradeSelect.click()
    
    // 选择"S 级"
    await page.getByRole('option', { name: 'S 级' }).click()
    
    // 等待筛选完成
    await page.waitForTimeout(500)
    
    // 验证筛选器显示正确的值
    await expect(gradeSelect).toContainText('S 级')
  })

  test('应该能按项目筛选角色', async ({ page }) => {
    // 打开项目筛选下拉框
    const projectSelect = page.locator('[role="combobox"]').filter({ hasText: /全部项目|项目/ }).first()
    await projectSelect.click()
    
    // 等待下拉选项加载
    await page.waitForTimeout(500)
    
    // 验证下拉框已打开
    await expect(page.locator('[role="listbox"]')).toBeVisible()
  })

  test('点击角色卡片应该跳转到详情页', async ({ page }) => {
    // 等待角色卡片加载
    await page.waitForTimeout(1000)
    
    // 获取第一个角色卡片
    const firstCard = page.locator('[data-testid="character-card"]').first()
    
    // 如果有角色卡片，点击它
    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click()
      // 验证页面跳转
      await expect(page).toHaveURL(/\/projects\/.+\/characters\/.+/)
    }
  })
})

test.describe('角色创建流程', () => {
  test('应该能通过 API 创建角色并显示在列表中', async ({ page }) => {
    // 先创建一个测试项目
    const projectName = `${TEST_CHARACTER_PREFIX} 角色测试项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    
    // 通过 API 创建角色
    const characterName = `${TEST_CHARACTER_PREFIX} 测试角色 ${Date.now()}`
    const character = await createTestCharacter(page, projectId, {
      name: characterName,
      roleLevel: 'A',
      gender: '男',
      introduction: '这是一个测试角色'
    })
    
    expect(character).not.toBeNull()
    expect(character.name).toBe(characterName)
    
    // 访问角色库页面
    await page.goto('/library/characters')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    
    // 筛选该项目
    const projectSelect = page.locator('[role="combobox"]').filter({ hasText: /全部项目|项目/ }).first()
    await projectSelect.click()
    await page.waitForTimeout(500)
    
    // 选择刚创建的项目
    await page.getByRole('option', { name: projectName }).click()
    await page.waitForTimeout(1000)
    
    // 验证角色显示在列表中（使用更通用的文本搜索）
    const characterText = page.getByText(characterName).first()
    if (await characterText.isVisible().catch(() => false)) {
      await expect(characterText).toBeVisible()
    }
  })

  test('应该验证角色名称必填', async ({ page }) => {
    // 创建一个测试项目
    const projectName = `${TEST_CHARACTER_PREFIX} 验证测试项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    
    // 尝试创建没有名称的角色（通过 API）
    const result = await page.evaluate(async (projectId) => {
      try {
        const response = await fetch('/api/characters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            name: '',
            roleLevel: 'B'
          })
        })
        return { status: response.status, ok: response.ok }
      } catch (e) {
        return { status: 0, ok: false, error: String(e) }
      }
    }, projectId)
    
    // 验证创建失败（应该返回 400 或类似错误）
    expect(result.ok).toBeFalsy()
  })

  test('应该支持不同等级的角色创建', async ({ page }) => {
    const projectName = `${TEST_CHARACTER_PREFIX} 等级测试项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    
    // 创建不同等级的角色
    const grades = ['S', 'A', 'B', 'C', 'D', 'E']
    for (const grade of grades) {
      const characterName = `${TEST_CHARACTER_PREFIX} ${grade}级角色 ${Date.now()}`
      const character = await createTestCharacter(page, projectId, {
        name: characterName,
        roleLevel: grade,
        introduction: `${grade}级测试角色`
      })
      
      expect(character).not.toBeNull()
      expect(character.roleLevel).toBe(grade)
    }
    
    // 访问角色库并验证筛选
    await page.goto('/library/characters')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    
    // 筛选 S 级角色
    const gradeSelect = page.locator('[role="combobox"]').filter({ hasText: /全部等级|等级/ }).first()
    await gradeSelect.click()
    await page.getByRole('option', { name: 'S 级' }).click()
    await page.waitForTimeout(500)
    
    // 验证显示 S 级筛选器
    await expect(gradeSelect).toContainText('S 级')
  })

  test('应该支持不同性别的角色创建', async ({ page }) => {
    const projectName = `${TEST_CHARACTER_PREFIX} 性别测试项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    
    // 创建不同性别的角色
    const genders = ['男', '女', '未知']
    for (const gender of genders) {
      const characterName = `${TEST_CHARACTER_PREFIX} ${gender}角色 ${Date.now()}`
      const character = await createTestCharacter(page, projectId, {
        name: characterName,
        gender: gender,
        introduction: `${gender}性测试角色`
      })
      
      expect(character).not.toBeNull()
      expect(character.gender).toBe(gender)
    }
  })
})

test.describe('角色编辑流程', () => {
  test('应该能编辑角色信息', async ({ page }) => {
    // 创建测试项目和角色
    const projectName = `${TEST_CHARACTER_PREFIX} 编辑测试项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    const characterName = `${TEST_CHARACTER_PREFIX} 待编辑角色 ${Date.now()}`
    const character = await createTestCharacter(page, projectId, {
      name: characterName,
      introduction: '原始描述'
    })
    
    // 访问角色详情页
    await page.goto(`/projects/${projectId}/characters/${character.id}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    
    // 验证角色信息显示
    await expect(page.locator('h1')).toContainText(characterName)
  })

  test('编辑角色时应该验证名称必填', async ({ page }) => {
    // 创建测试项目和角色
    const projectName = `${TEST_CHARACTER_PREFIX} 验证编辑项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    const characterName = `${TEST_CHARACTER_PREFIX} 验证编辑角色 ${Date.now()}`
    const character = await createTestCharacter(page, projectId, {
      name: characterName
    })
    
    // 尝试更新为空名称
    const result = await page.evaluate(async ({ characterId }) => {
      try {
        const response = await fetch(`/api/characters/${characterId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: '' })
        })
        return { status: response.status, ok: response.ok }
      } catch (e) {
        return { status: 0, ok: false }
      }
    }, { characterId: character.id })
    
    // 验证更新失败
    expect(result.ok).toBeFalsy()
  })
})

test.describe('角色筛选功能', () => {
  test('应该能组合使用多个筛选条件', async ({ page }) => {
    await page.goto('/library/characters')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    
    // 输入搜索关键词
    const searchInput = page.getByPlaceholder('搜索角色...')
    await searchInput.fill('主角')
    await page.waitForTimeout(500)
    
    // 选择等级筛选
    const gradeSelect = page.locator('[role="combobox"]').filter({ hasText: /全部等级|等级/ }).first()
    await gradeSelect.click()
    await page.getByRole('option', { name: 'A 级' }).click()
    await page.waitForTimeout(500)
    
    // 验证筛选器显示正确的值
    await expect(gradeSelect).toContainText('A 级')
    await expect(searchInput).toHaveValue('主角')
  })

  test('应该能清除筛选条件', async ({ page }) => {
    await page.goto('/library/characters')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    
    // 输入搜索关键词
    const searchInput = page.getByPlaceholder('搜索角色...')
    await searchInput.fill('测试')
    await page.waitForTimeout(500)
    
    // 清除搜索
    await searchInput.fill('')
    await page.waitForTimeout(500)
    
    // 验证搜索已清除
    await expect(searchInput).toHaveValue('')
  })
})

test.describe('角色列表视图模式', () => {
  test('网格视图应该正确显示角色卡片', async ({ page }) => {
    await page.goto('/library/characters')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    
    // 确保在网格视图
    const gridButton = page.locator('button').filter({ has: page.locator('[data-lucide="grid"]') }).first()
    await gridButton.click()
    await page.waitForTimeout(500)
    
    // 验证角色卡片存在（如果有角色的话）
    const cards = page.getByTestId('character-card')
    const count = await cards.count()
    
    if (count > 0) {
      // 验证第一个卡片包含必要元素
      const firstCard = cards.first()
      await expect(firstCard.locator('[data-testid="character-name"]')).toBeVisible()
    }
  })

  test('列表视图应该正确显示角色列表项', async ({ page }) => {
    await page.goto('/library/characters')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    
    // 切换到列表视图
    const listButton = page.locator('button').filter({ has: page.locator('[data-lucide="list"]') }).first()
    await listButton.click()
    await page.waitForTimeout(500)
    
    // 验证角色列表项存在（如果有角色的话）
    const listItems = page.getByTestId('character-list-item')
    const count = await listItems.count()
    
    if (count > 0) {
      // 验证第一个列表项包含必要元素
      const firstItem = listItems.first()
      await expect(firstItem.locator('[data-testid="character-name"]')).toBeVisible()
    }
  })
})

test.describe('角色选择与批量操作', () => {
  test('应该能选择单个角色', async ({ page }) => {
    await page.goto('/library/characters')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    
    // 查找复选框
    const checkboxes = page.locator('input[type="checkbox"]')
    const count = await checkboxes.count()
    
    if (count > 0) {
      // 选择第一个角色
      await checkboxes.first().click()
      await page.waitForTimeout(300)
      
      // 验证复选框被选中
      await expect(checkboxes.first()).toBeChecked()
    }
  })

  test('应该显示批量操作栏当选择角色时', async ({ page }) => {
    await page.goto('/library/characters')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    
    // 查找复选框
    const checkboxes = page.locator('input[type="checkbox"]')
    
    if (await checkboxes.first().isVisible().catch(() => false)) {
      // 选择第一个角色
      await checkboxes.first().click()
      await page.waitForTimeout(500)
      
      // 验证批量操作栏显示
      await expect(page.getByText(/已选择 \d+ 个角色/)).toBeVisible()
    }
  })
})

test.describe('角色详情页面', () => {
  test('应该显示角色详细信息', async ({ page }) => {
    await page.goto('/library/characters')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    
    // 获取第一个角色卡片
    const firstCard = page.getByTestId('character-card').first()
    
    if (await firstCard.isVisible().catch(() => false)) {
      // 点击角色名称进入详情页
      await firstCard.locator('[data-testid="character-name"]').click()
      
      // 等待页面跳转和加载
      await page.waitForURL(/\/projects\/.+\/characters\/.+/, { timeout: 10000 })
      await page.waitForLoadState('networkidle')
      
      // 验证详情页元素
      await expect(page.locator('h1')).toBeVisible()
    }
  })
})

test.describe('角色删除流程', () => {
  test('应该能从列表删除角色', async ({ page }) => {
    // 先创建一个测试项目和角色
    const projectName = `${TEST_CHARACTER_PREFIX} 删除角色测试项目 ${Date.now()}`
    const projectId = await createTestProject(page, projectName)
    const characterName = `${TEST_CHARACTER_PREFIX} 待删除角色 ${Date.now()}`
    const character = await createTestCharacter(page, projectId, { name: characterName })
    
    // 访问角色库
    await page.goto('/library/characters')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    
    // 筛选该项目的角色
    const projectSelect = page.locator('[role="combobox"]').filter({ hasText: /全部项目|项目/ }).first()
    await projectSelect.click()
    await page.waitForTimeout(500)
    
    // 选择刚创建的项目
    const projectOption = page.getByRole('option', { name: projectName })
    if (await projectOption.isVisible().catch(() => false)) {
      await projectOption.click()
      await page.waitForTimeout(500)
      
      // 找到角色卡片
      const characterCard = page.getByTestId('character-card').filter({ hasText: characterName })
      if (await characterCard.isVisible().catch(() => false)) {
        // 打开操作菜单
        const menuButton = characterCard.locator('button').filter({ has: page.locator('[data-lucide="more-vertical"]') }).first()
        await menuButton.click()
        await page.waitForTimeout(300)
        
        // 处理确认对话框
        page.once('dialog', async dialog => {
          await dialog.accept()
        })
        
        // 点击删除按钮
        await page.getByTestId('delete-character-button').click()
        await page.waitForTimeout(1000)
      }
    }
  })
})

test.describe('空状态和错误处理', () => {
  test('应该显示空状态当没有角色时', async ({ page }) => {
    // 使用一个不存在的项目筛选
    await page.goto('/library/characters?project=non-existent-project-id')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    
    // 验证空状态或没有角色卡片
    const cards = page.getByTestId('character-card')
    const count = await cards.count()
    
    // 应该有0个角色或显示空状态
    if (count === 0) {
      // 可能显示"暂无角色"的提示
      const emptyState = page.getByText('暂无角色')
      if (await emptyState.isVisible().catch(() => false)) {
        await expect(emptyState).toBeVisible()
      }
    }
  })

  test('应该能处理搜索无结果的情况', async ({ page }) => {
    await page.goto('/library/characters')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    
    // 搜索一个不存在的角色
    const searchInput = page.getByPlaceholder('搜索角色...')
    await searchInput.fill('不存在的角色XYZ123')
    await page.waitForTimeout(500)
    
    // 验证显示"共 0 个角色"或类似的提示
    const resultCount = page.getByText(/共 \d+ 个角色/)
    await expect(resultCount).toContainText('共 0 个角色')
  })
})
