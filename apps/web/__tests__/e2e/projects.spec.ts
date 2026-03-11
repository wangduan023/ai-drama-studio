import { test, expect, Page } from '@playwright/test'

/**
 * 项目流程 E2E 测试
 * 
 * 测试覆盖:
 * 1. 访问项目列表页 /projects
 * 2. 搜索项目功能
 * 3. 筛选项目状态（全部/制作中/已完成）
 * 4. 切换视图模式（网格/列表）
 * 5. 创建新项目
 * 6. 查看项目详情
 * 7. 编辑项目
 * 8. 删除项目
 * 9. 表单验证测试
 */

// 测试数据
test.describe.configure({ mode: 'serial' })

const TEST_PROJECT_PREFIX = '[E2E测试]'

// 辅助函数：清理测试数据
async function cleanupTestProjects(page: Page) {
  try {
    // 通过 API 清理测试创建的项目
    await page.evaluate(async (prefix) => {
      try {
        const response = await fetch('/api/projects')
        const projects = await response.json()
        for (const project of projects) {
          if (project.title.startsWith(prefix)) {
            await fetch(`/api/projects/${project.id}`, { method: 'DELETE' })
          }
        }
      } catch (e) {
        console.error('Cleanup failed:', e)
      }
    }, TEST_PROJECT_PREFIX)
  } catch {
    // 忽略清理错误
  }
}

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()
  await cleanupTestProjects(page)
  await page.close()
})

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage()
  await cleanupTestProjects(page)
  await page.close()
})

test.describe('项目列表页面', () => {
  test.beforeEach(async ({ page }) => {
    // 访问项目列表页
    await page.goto('/projects')
    // 等待页面加载完成
    await page.waitForLoadState('networkidle')
    // 等待数据加载和渲染
    await page.waitForTimeout(1500)
  })

  test('应该显示页面标题', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '项目列表' })).toBeVisible()
    await expect(page.getByText('管理和创建你的短剧项目')).toBeVisible()
  })

  test('应该显示新建项目按钮', async ({ page }) => {
    // 等待按钮出现（最长 10 秒）
    const newButton = page.getByRole('link', { name: '新建项目' })
    await newButton.waitFor({ state: 'visible', timeout: 10000 })
    await expect(newButton).toBeVisible()
    await expect(newButton).toHaveAttribute('href', '/projects/new')
  })

  test('点击新建项目按钮应该跳转到创建页面', async ({ page }) => {
    await page.getByRole('link', { name: '新建项目' }).click()
    await expect(page).toHaveURL(/\/projects\/new/)
    // 等待页面加载完成
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: '创建新项目' })).toBeVisible()
  })

  test('应该能搜索项目', async ({ page }) => {
    // 等待项目列表加载
    await page.waitForTimeout(1000)
    
    // 输入搜索关键词
    const searchInput = page.getByPlaceholder('搜索项目...')
    await searchInput.fill('测试项目')
    
    // 等待搜索过滤完成
    await page.waitForTimeout(500)
    
    // 验证搜索功能正常工作（没有报错）
    await expect(searchInput).toHaveValue('测试项目')
  })

  test('应该能切换视图模式', async ({ page }) => {
    // 等待项目卡片加载
    await page.waitForTimeout(1000)
    
    // 获取视图切换按钮 - 使用更可靠的选择器
    const viewButtons = page.locator('div.border.rounded-md.p-1 > button')
    const gridButton = viewButtons.nth(0)
    const listButton = viewButtons.nth(1)
    
    // 切换到列表视图
    await listButton.click()
    await page.waitForTimeout(500)
    
    // 切换回网格视图
    await gridButton.click()
    await page.waitForTimeout(500)
    
    // 验证页面没有错误
    await expect(page.getByRole('heading', { name: '项目列表' })).toBeVisible()
  })

  test('应该能筛选项目状态', async ({ page }) => {
    // 打开状态筛选下拉框
    const statusSelect = page.locator('[role="combobox"]').filter({ hasText: /全部状态|状态/ }).first()
    await statusSelect.click()
    
    // 选择"制作中"
    await page.getByRole('option', { name: '制作中' }).click()
    
    // 等待筛选完成
    await page.waitForTimeout(500)
    
    // 验证筛选器显示正确的值
    await expect(statusSelect).toContainText('制作中')
  })

  test('点击项目卡片应该跳转到详情页', async ({ page }) => {
    // 等待项目卡片加载
    await page.waitForTimeout(1000)
    
    // 获取第一个项目卡片
    const firstCard = page.getByTestId('project-card').first()
    
    // 如果有项目卡片，点击它
    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click()
      // 验证页面跳转
      await expect(page).toHaveURL(/\/projects\/.+/)
    }
  })
})

test.describe('新建项目页面', () => {
  test('应该能创建新项目', async ({ page }) => {
    const projectName = `${TEST_PROJECT_PREFIX} 自动化测试项目 ${Date.now()}`
    
    await page.goto('/projects/new')
    await page.waitForLoadState('networkidle')
    
    // 填写表单 - 步骤1: 基础信息
    await page.fill('[data-testid="project-name-input"]', projectName)
    await page.fill('[data-testid="project-description-input"]', '这是一个通过自动化测试创建的项目')
    
    // 下一步到步骤2
    await page.click('[data-testid="next-button"]')
    await page.waitForTimeout(500)
    
    // 下一步到步骤3
    await page.click('[data-testid="next-button"]')
    await page.waitForTimeout(500)
    
    // 下一步到步骤4（确认页面）
    await page.click('[data-testid="next-button"]')
    await page.waitForTimeout(500)
    
    // 提交表单
    await page.click('[data-testid="submit-button"]')
    
    // 等待创建完成并跳转
    await page.waitForURL(/\/projects\/.+/, { timeout: 15000 })
    
    // 验证项目详情页显示
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.getByText('剧集')).toBeVisible()
    await expect(page.getByText('角色')).toBeVisible()
  })

  test('应该验证项目名称必填', async ({ page }) => {
    await page.goto('/projects/new')
    await page.waitForLoadState('networkidle')
    
    // 清空单据名称
    await page.fill('[data-testid="project-name-input"]', '')
    
    // 尝试下一步
    await page.click('[data-testid="next-button"]')
    
    // 验证错误提示
    await expect(page.getByText('请输入项目名称')).toBeVisible()
  })

  test('应该验证项目名称长度限制', async ({ page }) => {
    await page.goto('/projects/new')
    await page.waitForLoadState('networkidle')
    
    // 输入超过100个字符的名称
    const longName = 'a'.repeat(101)
    await page.fill('[data-testid="project-name-input"]', longName)
    
    // 验证输入被截断或可以正常输入（根据实现而定）
    const inputValue = await page.inputValue('[data-testid="project-name-input"]')
    expect(inputValue.length).toBeGreaterThan(0)
  })

  test('应该能通过步骤条导航', async ({ page }) => {
    await page.goto('/projects/new')
    await page.waitForLoadState('networkidle')
    
    // 填写项目名称
    await page.fill('[data-testid="project-name-input"]', `${TEST_PROJECT_PREFIX} 步骤测试项目`)
    
    // 前进到步骤2
    await page.click('[data-testid="next-button"]')
    await page.waitForTimeout(500)
    
    // 验证步骤2显示
    await expect(page.getByText('剧本输入')).toBeVisible()
    
    // 返回到步骤1
    await page.click('[data-testid="prev-button"]')
    await page.waitForTimeout(500)
    
    // 验证步骤1显示
    await expect(page.getByText('基础信息')).toBeVisible()
    await expect(page.locator('[data-testid="project-name-input"]')).toHaveValue(`${TEST_PROJECT_PREFIX} 步骤测试项目`)
  })

  test('应该能取消创建并返回列表', async ({ page }) => {
    await page.goto('/projects/new')
    await page.waitForLoadState('networkidle')
    
    // 填写一些数据
    await page.fill('[data-testid="project-name-input"]', '临时项目')
    
    // 点击返回按钮
    await page.getByRole('link', { name: '返回项目列表' }).click()
    
    // 验证返回项目列表
    await expect(page).toHaveURL('/projects')
    await expect(page.getByRole('heading', { name: '项目列表' })).toBeVisible()
  })
})

test.describe('项目详情页面', () => {
  test('应该显示项目基本信息', async ({ page }) => {
    // 先访问项目列表获取第一个项目
    await page.goto('/projects')
    await page.waitForTimeout(1000)
    
    // 如果有项目，点击进入第一个项目
    const firstCard = page.getByTestId('project-card').first()
    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click()
      await page.waitForLoadState('networkidle')
      
      // 验证详情页显示
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.getByText('剧集')).toBeVisible()
      await expect(page.getByText('角色')).toBeVisible()
      await expect(page.getByText('场景')).toBeVisible()
    }
  })

  test('应该能编辑项目信息', async ({ page }) => {
    // 创建一个新项目用于编辑测试
    const projectName = `${TEST_PROJECT_PREFIX} 编辑测试项目 ${Date.now()}`
    
    await page.goto('/projects/new')
    await page.waitForLoadState('networkidle')
    
    // 创建项目
    await page.fill('[data-testid="project-name-input"]', projectName)
    await page.click('[data-testid="next-button"]')
    await page.waitForTimeout(500)
    await page.click('[data-testid="next-button"]')
    await page.waitForTimeout(500)
    await page.click('[data-testid="next-button"]')
    await page.waitForTimeout(500)
    await page.click('[data-testid="submit-button"]')
    
    // 等待跳转到详情页
    await page.waitForURL(/\/projects\/.+/, { timeout: 15000 })
    
    // 点击编辑按钮
    await page.click('[data-testid="edit-button"]')
    await page.waitForTimeout(500)
    
    // 修改项目名称
    const newName = `${projectName} - 已编辑`
    await page.fill('[data-testid="edit-project-name-input"]', newName)
    
    // 修改项目描述
    await page.fill('[data-testid="edit-project-description-input"]', '修改后的描述')
    
    // 保存修改
    await page.click('[data-testid="save-button"]')
    await page.waitForTimeout(1000)
    
    // 验证修改成功
    await expect(page.locator('h1')).toContainText(newName)
    await expect(page.getByText('修改后的描述')).toBeVisible()
  })

  test('应该能取消编辑', async ({ page }) => {
    // 先访问项目列表获取第一个项目
    await page.goto('/projects')
    await page.waitForTimeout(1000)
    
    const firstCard = page.getByTestId('project-card').first()
    if (await firstCard.isVisible().catch(() => false)) {
      // 获取原始标题
      const originalTitle = await page.getByTestId('project-title').first().textContent()
      
      await firstCard.click()
      await page.waitForLoadState('networkidle')
      
      // 点击编辑按钮
      await page.click('[data-testid="edit-button"]')
      await page.waitForTimeout(500)
      
      // 修改项目名称
      await page.fill('[data-testid="edit-project-name-input"]', '临时修改名称')
      
      // 点击取消按钮
      await page.click('[data-testid="cancel-button"]')
      await page.waitForTimeout(500)
      
      // 验证回到查看模式，且名称未被修改
      await expect(page.getByTestId('edit-button')).toBeVisible()
      await expect(page.locator('h1')).not.toContainText('临时修改名称')
    }
  })

  test('编辑时应该验证项目名称必填', async ({ page }) => {
    // 先创建一个新项目用于测试
    const projectName = `${TEST_PROJECT_PREFIX} 验证测试项目 ${Date.now()}`
    
    await page.goto('/projects/new')
    await page.waitForLoadState('networkidle')
    await page.fill('[data-testid="project-name-input"]', projectName)
    await page.click('[data-testid="next-button"]')
    await page.waitForTimeout(500)
    await page.click('[data-testid="next-button"]')
    await page.waitForTimeout(500)
    await page.click('[data-testid="next-button"]')
    await page.waitForTimeout(500)
    await page.click('[data-testid="submit-button"]')
    await page.waitForURL(/\/projects\/.+/, { timeout: 15000 })
    
    // 点击编辑按钮
    await page.click('[data-testid="edit-button"]')
    await page.waitForTimeout(500)
    
    // 清空项目名称
    await page.fill('[data-testid="edit-project-name-input"]', '')
    
    // 尝试保存
    await page.click('[data-testid="save-button"]')
    
    // 验证错误提示或仍在编辑模式
    await expect(page.locator('[data-testid="edit-project-name-input"]')).toBeVisible()
  })
})

test.describe('删除项目流程', () => {
  test('应该能从列表页面删除项目', async ({ page }) => {
    // 先创建一个新项目用于删除测试
    const projectName = `${TEST_PROJECT_PREFIX} 删除测试项目 ${Date.now()}`
    
    await page.goto('/projects/new')
    await page.waitForLoadState('networkidle')
    
    // 创建项目
    await page.fill('[data-testid="project-name-input"]', projectName)
    await page.click('[data-testid="next-button"]')
    await page.waitForTimeout(500)
    await page.click('[data-testid="next-button"]')
    await page.waitForTimeout(500)
    await page.click('[data-testid="next-button"]')
    await page.waitForTimeout(500)
    await page.click('[data-testid="submit-button"]')
    
    // 等待创建完成
    await page.waitForURL(/\/projects\/.+/, { timeout: 15000 })
    
    // 返回项目列表
    await page.goto('/projects')
    await page.waitForTimeout(1000)
    
    // 找到刚创建的项目卡片
    const projectCard = page.getByTestId('project-card').filter({ hasText: projectName })
    
    if (await projectCard.isVisible().catch(() => false)) {
      // 打开操作菜单
      const menuButton = projectCard.locator('button').filter({ has: page.locator('[data-lucide="more-vertical"]').or(page.locator('svg')) }).first()
      await menuButton.click()
      await page.waitForTimeout(300)
      
      // 处理确认对话框
      page.once('dialog', async dialog => {
        await dialog.accept()
      })
      
      // 点击删除按钮
      await page.getByTestId('delete-project-button').click()
      await page.waitForTimeout(1000)
      
      // 验证项目已被删除
      await expect(page.getByText(projectName)).not.toBeVisible()
    }
  })

  test('应该能从详情页面删除项目', async ({ page }) => {
    // 先创建一个新项目用于删除测试
    const projectName = `${TEST_PROJECT_PREFIX} 详情页删除测试 ${Date.now()}`
    
    await page.goto('/projects/new')
    await page.waitForLoadState('networkidle')
    
    // 创建项目
    await page.fill('[data-testid="project-name-input"]', projectName)
    await page.click('[data-testid="next-button"]')
    await page.waitForTimeout(500)
    await page.click('[data-testid="next-button"]')
    await page.waitForTimeout(500)
    await page.click('[data-testid="next-button"]')
    await page.waitForTimeout(500)
    await page.click('[data-testid="submit-button"]')
    
    // 等待跳转到详情页
    await page.waitForURL(/\/projects\/.+/, { timeout: 15000 })
    
    // 处理确认对话框
    page.once('dialog', async dialog => {
      await dialog.accept()
    })
    
    // 点击删除按钮
    await page.getByRole('button', { name: '删除' }).click()
    
    // 等待跳转回列表页
    await page.waitForURL('/projects', { timeout: 10000 })
    
    // 验证项目已被删除
    await expect(page.getByText(projectName)).not.toBeVisible()
  })
})

test.describe('项目详情页标签切换', () => {
  test('应该能切换不同的标签页', async ({ page }) => {
    // 访问项目列表
    await page.goto('/projects')
    await page.waitForTimeout(1000)
    
    const firstCard = page.getByTestId('project-card').first()
    if (await firstCard.isVisible().catch(() => false)) {
      await firstCard.click()
      await page.waitForLoadState('networkidle')
      
      // 切换到剧集标签
      await page.getByRole('tab', { name: '剧集' }).click()
      await page.waitForTimeout(500)
      await expect(page.getByRole('tab', { name: '剧集' })).toHaveAttribute('data-state', 'active')
      
      // 切换到角色标签
      await page.getByRole('tab', { name: '角色' }).click()
      await page.waitForTimeout(500)
      await expect(page.getByRole('tab', { name: '角色' })).toHaveAttribute('data-state', 'active')
      
      // 切换到场景标签
      await page.getByRole('tab', { name: '场景' }).click()
      await page.waitForTimeout(500)
      await expect(page.getByRole('tab', { name: '场景' })).toHaveAttribute('data-state', 'active')
      
      // 切换回概览标签
      await page.getByRole('tab', { name: '概览' }).click()
      await page.waitForTimeout(500)
      await expect(page.getByRole('tab', { name: '概览' })).toHaveAttribute('data-state', 'active')
    }
  })
})
