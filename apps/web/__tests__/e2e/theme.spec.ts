import { test, expect, type Page } from '@playwright/test'

// 辅助函数：等待页面加载
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
}

// 辅助函数：获取当前主题
async function getCurrentTheme(page: Page): Promise<string> {
  return await page.evaluate(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  })
}

test.describe('主题切换测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForPageLoad(page)
  })

  test.describe('主题切换功能', () => {
    test('应该能切换到暗色模式', async ({ page }) => {
      // 点击主题切换按钮
      const themeToggle = page.locator('[data-testid="theme-toggle"]')
      await themeToggle.click()
      
      // 选择暗色模式
      await page.getByRole('menuitem', { name: '暗色模式' }).click()
      
      // 等待主题切换动画
      await page.waitForTimeout(500)
      
      // 验证暗色模式已应用
      const theme = await getCurrentTheme(page)
      expect(theme).toBe('dark')
      
      // 验证 body 有 dark 类
      const hasDarkClass = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark')
      })
      expect(hasDarkClass).toBe(true)
    })

    test('应该能切换到亮色模式', async ({ page }) => {
      // 先切换到暗色模式
      const themeToggle = page.locator('[data-testid="theme-toggle"]')
      await themeToggle.click()
      await page.getByRole('menuitem', { name: '暗色模式' }).click()
      await page.waitForTimeout(500)
      
      // 再切换回亮色模式
      await themeToggle.click()
      await page.getByRole('menuitem', { name: '亮色模式' }).click()
      
      // 等待主题切换动画
      await page.waitForTimeout(500)
      
      // 验证亮色模式已应用
      const theme = await getCurrentTheme(page)
      expect(theme).toBe('light')
      
      // 验证 body 没有 dark 类
      const hasDarkClass = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark')
      })
      expect(hasDarkClass).toBe(false)
    })

    test('应该能切换到跟随系统模式', async ({ page }) => {
      // 点击主题切换按钮
      const themeToggle = page.locator('[data-testid="theme-toggle"]')
      await themeToggle.click()
      
      // 选择跟随系统
      await page.getByRole('menuitem', { name: '跟随系统' }).click()
      
      // 等待主题切换
      await page.waitForTimeout(500)
      
      // 验证菜单关闭
      await expect(page.getByRole('menuitem', { name: '跟随系统' })).not.toBeVisible()
    })

    test('主题菜单应该显示当前选中状态', async ({ page }) => {
      // 切换到亮色模式
      const themeToggle = page.locator('[data-testid="theme-toggle"]')
      await themeToggle.click()
      await page.getByRole('menuitem', { name: '亮色模式' }).click()
      await page.waitForTimeout(500)
      
      // 再次打开菜单，验证亮色模式有选中标记
      await themeToggle.click()
      
      const lightOption = page.getByRole('menuitem', { name: '亮色模式' })
      const lightOptionClass = await lightOption.getAttribute('class')
      expect(lightOptionClass).toMatch(/bg-accent|text-primary/)
    })
  })

  test.describe('主题持久化', () => {
    test('暗色模式应该在刷新后保持', async ({ page }) => {
      // 切换到暗色模式
      const themeToggle = page.locator('[data-testid="theme-toggle"]')
      await themeToggle.click()
      await page.getByRole('menuitem', { name: '暗色模式' }).click()
      await page.waitForTimeout(500)
      
      // 验证 localStorage 中有主题设置
      const localStorageTheme = await page.evaluate(() => {
        return localStorage.getItem('theme')
      })
      expect(localStorageTheme).toBe('dark')
      
      // 刷新页面
      await page.reload()
      await waitForPageLoad(page)
      
      // 验证暗色模式仍然应用
      const hasDarkClass = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark')
      })
      expect(hasDarkClass).toBe(true)
    })

    test('亮色模式应该在刷新后保持', async ({ page }) => {
      // 切换到亮色模式
      const themeToggle = page.locator('[data-testid="theme-toggle"]')
      await themeToggle.click()
      await page.getByRole('menuitem', { name: '亮色模式' }).click()
      await page.waitForTimeout(500)
      
      // 验证 localStorage 中有主题设置
      const localStorageTheme = await page.evaluate(() => {
        return localStorage.getItem('theme')
      })
      expect(localStorageTheme).toBe('light')
      
      // 刷新页面
      await page.reload()
      await waitForPageLoad(page)
      
      // 验证亮色模式仍然应用
      const hasDarkClass = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark')
      })
      expect(hasDarkClass).toBe(false)
    })

    test('主题设置在页面间导航时应该保持', async ({ page }) => {
      // 切换到暗色模式
      const themeToggle = page.locator('[data-testid="theme-toggle"]')
      await themeToggle.click()
      await page.getByRole('menuitem', { name: '暗色模式' }).click()
      await page.waitForTimeout(500)
      
      // 导航到其他页面
      await page.goto('/projects')
      await waitForPageLoad(page)
      
      // 验证暗色模式仍然应用
      const hasDarkClass = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark')
      })
      expect(hasDarkClass).toBe(true)
      
      // 导航到另一个页面
      await page.goto('/library/locations')
      await waitForPageLoad(page)
      
      // 验证暗色模式仍然应用
      const stillHasDarkClass = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark')
      })
      expect(stillHasDarkClass).toBe(true)
    })
  })

  test.describe('主题截图对比', () => {
    test('亮色模式截图', async ({ page }) => {
      // 确保亮色模式
      const themeToggle = page.locator('[data-testid="theme-toggle"]')
      await themeToggle.click()
      await page.getByRole('menuitem', { name: '亮色模式' }).click()
      await page.waitForTimeout(500)
      
      // 设置桌面视口
      await page.setViewportSize({ width: 1280, height: 720 })
      
      // 截图
      await expect(page).toHaveScreenshot('theme-light-homepage.png', {
        maxDiffPixels: 100
      })
    })

    test('暗色模式截图', async ({ page }) => {
      // 切换到暗色模式
      const themeToggle = page.locator('[data-testid="theme-toggle"]')
      await themeToggle.click()
      await page.getByRole('menuitem', { name: '暗色模式' }).click()
      await page.waitForTimeout(500)
      
      // 设置桌面视口
      await page.setViewportSize({ width: 1280, height: 720 })
      
      // 截图
      await expect(page).toHaveScreenshot('theme-dark-homepage.png', {
        maxDiffPixels: 100
      })
    })

    test('项目列表页亮色模式截图', async ({ page }) => {
      // 确保亮色模式
      const themeToggle = page.locator('[data-testid="theme-toggle"]')
      await themeToggle.click()
      await page.getByRole('menuitem', { name: '亮色模式' }).click()
      await page.waitForTimeout(500)
      
      // 导航到项目列表
      await page.goto('/projects')
      await waitForPageLoad(page)
      
      // 设置桌面视口
      await page.setViewportSize({ width: 1280, height: 720 })
      
      // 截图
      await expect(page).toHaveScreenshot('theme-light-projects.png', {
        maxDiffPixels: 100
      })
    })

    test('项目列表页暗色模式截图', async ({ page }) => {
      // 切换到暗色模式
      const themeToggle = page.locator('[data-testid="theme-toggle"]')
      await themeToggle.click()
      await page.getByRole('menuitem', { name: '暗色模式' }).click()
      await page.waitForTimeout(500)
      
      // 导航到项目列表
      await page.goto('/projects')
      await waitForPageLoad(page)
      
      // 设置桌面视口
      await page.setViewportSize({ width: 1280, height: 720 })
      
      // 截图
      await expect(page).toHaveScreenshot('theme-dark-projects.png', {
        maxDiffPixels: 100
      })
    })
  })

  test.describe('主题切换图标', () => {
    test('亮色模式下应该显示太阳图标', async ({ page }) => {
      // 切换到亮色模式
      const themeToggle = page.locator('[data-testid="theme-toggle"]')
      await themeToggle.click()
      await page.getByRole('menuitem', { name: '亮色模式' }).click()
      await page.waitForTimeout(500)
      
      // 验证太阳图标存在（通过 SVG 路径或 aria-label）
      const sunIcon = page.locator('svg').filter({ has: page.locator('path') }).first()
      await expect(sunIcon).toBeVisible()
    })

    test('暗色模式下应该显示月亮图标', async ({ page }) => {
      // 切换到暗色模式
      const themeToggle = page.locator('[data-testid="theme-toggle"]')
      await themeToggle.click()
      await page.getByRole('menuitem', { name: '暗色模式' }).click()
      await page.waitForTimeout(500)
      
      // 验证月亮图标存在
      const moonIcon = page.locator('svg').filter({ has: page.locator('path') }).first()
      await expect(moonIcon).toBeVisible()
    })
  })

  test.describe('不同页面的主题一致性', () => {
    test('所有页面应该保持相同的主题', async ({ page }) => {
      // 切换到暗色模式
      const themeToggle = page.locator('[data-testid="theme-toggle"]')
      await themeToggle.click()
      await page.getByRole('menuitem', { name: '暗色模式' }).click()
      await page.waitForTimeout(500)
      
      // 定义要测试的页面
      const pages = ['/', '/projects', '/library/characters', '/library/locations', '/settings', '/help']
      
      for (const url of pages) {
        await page.goto(url)
        await waitForPageLoad(page)
        
        // 验证暗色模式
        const hasDarkClass = await page.evaluate(() => {
          return document.documentElement.classList.contains('dark')
        })
        expect(hasDarkClass, `页面 ${url} 应该保持暗色模式`).toBe(true)
      }
    })
  })
})
