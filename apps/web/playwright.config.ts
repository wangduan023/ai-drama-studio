import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E 测试配置
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './__tests__/e2e',
  
  // 测试文件匹配模式
  testMatch: '**/*.spec.ts',
  
  // 每个测试的全局超时
  timeout: 30 * 1000,
  
  // 全局 setup 文件
  globalSetup: './test/global-setup.ts',
  
  // 全局 teardown 文件
  globalTeardown: './test/global-teardown.ts',
  
  expect: {
    // 断言超时
    timeout: 5000,
  },
  
  // 并行运行测试的 worker 数量
  workers: process.env.CI ? 1 : undefined,
  
  // 测试重试次数
  retries: process.env.CI ? 2 : 0,
  
  // 并发模式
  fullyParallel: true,
  
  // 测试报告器
  reporter: [
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],
  
  // 共享配置
  use: {
    // 基础 URL
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3003',
    
    // 所有测试的默认 viewport
    viewport: { width: 1280, height: 720 },
    
    // 自动记录跟踪（失败时保留）
    trace: 'retain-on-failure',
    
    // 自动截图（失败时保留）
    screenshot: 'only-on-failure',
    
    // 自动录制视频（失败时保留）
    video: 'retain-on-failure',
    
    // 测试数据属性
    testIdAttribute: 'data-testid',
    
    // 动作超时
    actionTimeout: 10000,
    
    // 导航超时
    navigationTimeout: 10000,
  },
  
  // 项目配置（多浏览器测试）
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // 移动端测试
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  
  // 本地开发服务器配置
  webServer: {
    command: 'next dev -H 0.0.0.0',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
