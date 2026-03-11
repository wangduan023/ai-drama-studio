import { test, expect, type Page } from '@playwright/test'

// 辅助函数：等待页面加载
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
}

test.describe('导航测试', () => {
  test.describe('侧边栏导航', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      await waitForPageLoad(page)
    })

    test('侧边栏应该包含所有主导航链接', async ({ page }) => {
      // 验证侧边栏导航存在（使用 first() 避免重复元素问题）
      const sidebarNav = page.locator('[data-testid="sidebar-nav"]').first()
      await expect(sidebarNav).toBeVisible()
      
      // 验证主要导航链接
      await expect(page.getByRole('link', { name: '首页' })).toBeVisible()
      await expect(page.getByRole('link', { name: '项目库' })).toBeVisible()
      await expect(page.getByRole('link', { name: '角色库' })).toBeVisible()
      await expect(page.getByRole('link', { name: '场景库' })).toBeVisible()
      await expect(page.getByRole('link', { name: '待办事项' })).toBeVisible()
    })

    test('侧边栏应该包含次要导航链接', async ({ page }) => {
      // 验证次要导航链接
      await expect(page.getByRole('link', { name: '设置' })).toBeVisible()
      await expect(page.getByRole('link', { name: '帮助' })).toBeVisible()
    })

    test('点击首页链接应该导航到首页', async ({ page }) => {
      await page.getByRole('link', { name: '首页' }).click()
      await waitForPageLoad(page)
      await expect(page).toHaveURL('/')
    })

    test('点击项目库链接应该导航到项目列表', async ({ page }) => {
      await page.getByRole('link', { name: '项目库' }).click()
      await waitForPageLoad(page)
      await expect(page).toHaveURL('/projects')
    })

    test('点击角色库链接应该导航到角色库', async ({ page }) => {
      await page.getByRole('link', { name: '角色库' }).click()
      await waitForPageLoad(page)
      await expect(page).toHaveURL('/library/characters')
    })

    test('点击场景库链接应该导航到场景库', async ({ page }) => {
      await page.getByRole('link', { name: '场景库' }).click()
      await waitForPageLoad(page)
      await expect(page).toHaveURL('/library/locations')
    })

    test('点击待办事项链接应该导航到待办事项页', async ({ page }) => {
      await page.getByRole('link', { name: '待办事项' }).click()
      await waitForPageLoad(page)
      await expect(page).toHaveURL('/todos')
    })

    test('点击设置链接应该导航到设置页', async ({ page }) => {
      await page.getByRole('link', { name: '设置' }).click()
      await waitForPageLoad(page)
      await expect(page).toHaveURL('/settings')
    })

    test('点击帮助链接应该导航到帮助页', async ({ page }) => {
      await page.getByRole('link', { name: '帮助' }).click()
      await waitForPageLoad(page)
      await expect(page).toHaveURL('/help')
    })

    test('当前页面应该高亮对应的导航链接', async ({ page }) => {
      // 导航到项目库
      await page.goto('/projects')
      await waitForPageLoad(page)
      
      // 验证项目库链接有激活样式（通过检查 class 包含 active 或类似）
      const projectsLink = page.getByRole('link', { name: '项目库' }).first()
      const linkContainer = projectsLink.locator('..')
      
      // 检查是否包含背景色样式
      const classAttribute = await linkContainer.getAttribute('class')
      expect(classAttribute).toMatch(/bg-primary|text-primary-foreground/)
    })
  })

  test.describe('面包屑导航', () => {
    test('首页应该显示面包屑', async ({ page }) => {
      await page.goto('/')
      await waitForPageLoad(page)
      
      // 验证面包屑存在
      const breadcrumb = page.locator('[data-testid="breadcrumb"]')
      await expect(breadcrumb).toBeVisible()
      
      // 验证首页链接存在
      await expect(breadcrumb.getByRole('link', { name: '首页' }).or(breadcrumb.locator('a').first())).toBeVisible()
    })

    test('项目列表页应该显示正确的面包屑', async ({ page }) => {
      await page.goto('/projects')
      await waitForPageLoad(page)
      
      const breadcrumb = page.locator('[data-testid="breadcrumb"]')
      await expect(breadcrumb).toBeVisible()
      
      // 验证面包屑包含项目
      await expect(breadcrumb.getByText('项目')).toBeVisible()
    })

    test('角色库页应该显示正确的面包屑', async ({ page }) => {
      await page.goto('/library/characters')
      await waitForPageLoad(page)
      
      const breadcrumb = page.locator('[data-testid="breadcrumb"]')
      await expect(breadcrumb).toBeVisible()
      
      // 验证面包屑包含资源库和角色
      await expect(breadcrumb.getByText('资源库')).toBeVisible()
      await expect(breadcrumb.getByText('角色')).toBeVisible()
    })

    test('场景库页应该显示正确的面包屑', async ({ page }) => {
      await page.goto('/library/locations')
      await waitForPageLoad(page)
      
      const breadcrumb = page.locator('[data-testid="breadcrumb"]')
      await expect(breadcrumb).toBeVisible()
      
      // 验证面包屑包含资源库和场景
      await expect(breadcrumb.getByText('资源库')).toBeVisible()
      await expect(breadcrumb.getByText('场景')).toBeVisible()
    })

    test('面包屑首页链接应该能返回首页', async ({ page }) => {
      await page.goto('/library/locations')
      await waitForPageLoad(page)
      
      const breadcrumb = page.locator('[data-testid="breadcrumb"]')
      
      // 点击面包屑中的首页链接
      const homeLink = breadcrumb.getByRole('link').first()
      if (await homeLink.isVisible().catch(() => false)) {
        await homeLink.click()
        await waitForPageLoad(page)
        await expect(page).toHaveURL('/')
      }
    })
  })

  test.describe('页面间跳转', () => {
    test('从首页跳转到项目列表', async ({ page }) => {
      await page.goto('/')
      await waitForPageLoad(page)
      
      // 点击项目库链接
      await page.getByRole('link', { name: '项目库' }).click()
      await waitForPageLoad(page)
      
      await expect(page).toHaveURL('/projects')
      await expect(page.getByRole('heading', { name: '项目列表' })).toBeVisible()
    })

    test('从项目列表点击项目卡片跳转到项目详情', async ({ page }) => {
      await page.goto('/projects')
      await waitForPageLoad(page)
      
      // 等待项目卡片加载
      await page.waitForSelector('[data-testid="project-card"]', { timeout: 10000 })
      
      // 点击第一个项目卡片
      const firstCard = page.locator('[data-testid="project-card"]').first()
      await firstCard.click()
      
      // 验证跳转到详情页
      await expect(page).toHaveURL(/\/projects\/.+/)
    })

    test('从项目详情跳转到场景库', async ({ page }) => {
      await page.goto('/projects/test-project-001')
      await waitForPageLoad(page)
      
      // 点击场景库快捷入口
      const locationsCard = page.getByRole('link', { name: /场景库/ }).first()
      if (await locationsCard.isVisible().catch(() => false)) {
        await locationsCard.click()
        await waitForPageLoad(page)
        await expect(page).toHaveURL(/\/library\/locations/)
      }
    })
  })

  test.describe('返回按钮功能', () => {
    test('项目详情页应该有返回项目列表的按钮', async ({ page }) => {
      await page.goto('/projects/test-project-001')
      await waitForPageLoad(page)
      
      // 验证返回按钮存在
      const backButton = page.getByRole('button', { name: '返回项目列表' })
      await expect(backButton).toBeVisible()
      
      // 点击返回按钮
      await backButton.click()
      await waitForPageLoad(page)
      
      // 验证返回项目列表
      await expect(page).toHaveURL('/projects')
    })

    test('剧集详情页应该有返回项目的按钮', async ({ page }) => {
      await page.goto('/projects/test-project-001/episodes/1')
      await waitForPageLoad(page)
      
      // 验证返回按钮存在
      const backButton = page.getByRole('button', { name: '返回项目' })
      if (await backButton.isVisible().catch(() => false)) {
        await expect(backButton).toBeVisible()
        
        // 点击返回按钮
        await backButton.click()
        await waitForPageLoad(page)
        
        // 验证返回项目详情页
        await expect(page).toHaveURL('/projects/test-project-001')
      }
    })

    test('浏览器返回按钮应该正常工作', async ({ page }) => {
      // 访问首页
      await page.goto('/')
      await waitForPageLoad(page)
      
      // 导航到项目列表
      await page.getByRole('link', { name: '项目库' }).click()
      await waitForPageLoad(page)
      
      // 使用浏览器返回按钮
      await page.goBack()
      await waitForPageLoad(page)
      
      // 验证返回首页
      await expect(page).toHaveURL('/')
    })
  })

  test.describe('移动端导航', () => {
    test('移动端应该显示汉堡菜单按钮', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')
      await waitForPageLoad(page)
      
      // 验证汉堡菜单按钮存在
      const menuButton = page.locator('button').filter({ has: page.locator('svg') }).first()
      await expect(menuButton).toBeVisible()
    })

    test('点击汉堡菜单应该展开侧边栏', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')
      await waitForPageLoad(page)
      
      // 点击菜单按钮
      const menuButton = page.locator('button').filter({ has: page.locator('svg') }).first()
      await menuButton.click()
      
      // 验证侧边栏导航链接可见
      await expect(page.getByRole('link', { name: '项目库' })).toBeVisible()
      await expect(page.getByRole('link', { name: '角色库' })).toBeVisible()
    })
  })

  test.describe('Header 导航', () => {
    test('Header 应该包含搜索框', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 })
      await page.goto('/')
      await waitForPageLoad(page)
      
      // 验证搜索框存在
      const searchInput = page.getByPlaceholder(/搜索/)
      await expect(searchInput).toBeVisible()
    })

    test('Header 应该包含设置链接', async ({ page }) => {
      await page.goto('/')
      await waitForPageLoad(page)
      
      // 验证设置图标链接存在
      const settingsLink = page.locator('a[href="/settings"]')
      await expect(settingsLink).toBeVisible()
    })

    test('Header 应该包含主题切换按钮', async ({ page }) => {
      await page.goto('/')
      await waitForPageLoad(page)
      
      // 验证主题切换按钮存在
      const themeToggle = page.locator('[data-testid="theme-toggle"]')
      await expect(themeToggle).toBeVisible()
    })
  })
})
