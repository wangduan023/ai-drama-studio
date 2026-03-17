#!/usr/bin/env tsx
/**
 * Playwright 控制台错误监控服务
 * 
 * 使用方法:
 * 1. 人工在前端操作
 * 2. 此脚本在后台自动捕获控制台错误
 * 3. 错误会被分析并尝试自动修复
 * 
 * npx tsx scripts/error-monitor/index.ts
 */

import { chromium, Browser, Page, ConsoleMessage } from 'playwright'
import { ErrorAnalyzer } from './analyzer'
import { ErrorFixer } from './fixer'
import { logger } from './logger'

interface MonitorOptions {
  /** 目标 URL */
  url: string
  /** 是否自动修复 */
  autoFix: boolean
  /** 监控时长 (ms), 0 表示无限 */
  duration: number
  /** 错误回调 */
  onError?: (error: CapturedError) => void
}

interface CapturedError {
  id: string
  type: 'error' | 'warning' | 'info' | 'debug'
  message: string
  location?: {
    url: string
    line: number
    column: number
  }
  stack?: string
  timestamp: number
  analyzed?: {
    category: string
    severity: 'critical' | 'high' | 'medium' | 'low'
    probableCause: string
    suggestedFix?: string
  }
  fixed?: boolean
  fixResult?: string
}

class ConsoleErrorMonitor {
  private browser: Browser | null = null
  private page: Page | null = null
  private errors: CapturedError[] = []
  private analyzer = new ErrorAnalyzer()
  private fixer = new ErrorFixer()
  private options: MonitorOptions

  constructor(options: Partial<MonitorOptions> = {}) {
    this.options = {
      url: process.env.MONITOR_URL || 'http://localhost:3333',
      autoFix: process.env.AUTO_FIX === 'true',
      duration: parseInt(process.env.MONITOR_DURATION || '0'),
      ...options
    }
  }

  async start(): Promise<void> {
    logger.info('🚀 启动控制台错误监控服务...')
    logger.info(`📍 目标: ${this.options.url}`)
    logger.info(`🔧 自动修复: ${this.options.autoFix ? '开启' : '关闭'}`)

    // 启动浏览器
    this.browser = await chromium.launch({
      headless: false, // 可见模式，方便人工操作
      devtools: true,  // 自动打开开发者工具
      args: ['--start-maximized']
    })

    // 创建页面
    this.page = await this.browser.newPage()

    // 监听控制台消息
    this.page.on('console', this.handleConsoleMessage.bind(this))
    
    // 监听页面错误
    this.page.on('pageerror', this.handlePageError.bind(this))
    
    // 监听请求失败
    this.page.on('requestfailed', this.handleRequestFailed.bind(this))

    // 注入全局错误捕获脚本
    await this.injectErrorCapture()

    // 导航到目标页面
    await this.page.goto(this.options.url)

    logger.info('✅ 监控已启动，请在浏览器中操作...')
    logger.info('💡 按 Ctrl+C 停止监控')

    // 设置监控时长
    if (this.options.duration > 0) {
      setTimeout(() => this.stop(), this.options.duration)
    }

    // 保持运行
    await new Promise(() => {}) // 永不 resolve
  }

  private async injectErrorCapture(): Promise<void> {
    if (!this.page) return

    await this.page.addInitScript(() => {
      // 捕获全局错误
      window.addEventListener('error', (event) => {
        console.error('[CAPTURED_ERROR]', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error?.stack
        })
      })

      // 捕获未处理的 Promise 错误
      window.addEventListener('unhandledrejection', (event) => {
        console.error('[CAPTURED_PROMISE_ERROR]', {
          reason: event.reason?.message || event.reason,
          stack: event.reason?.stack
        })
      })

      // 重写 console 方法以捕获更详细的调用栈
      const originalError = console.error
      console.error = (...args: any[]) => {
        const stack = new Error().stack
        originalError.apply(console, [...args, '\n[STACK]', stack])
      }
    })
  }

  private async handleConsoleMessage(msg: ConsoleMessage): Promise<void> {
    const type = msg.type() as CapturedError['type']
    
    // 只关注错误和警告
    if (type !== 'error' && type !== 'warning') return

    const location = msg.location()
    const error: CapturedError = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message: msg.text(),
      location: {
        url: location.url || 'unknown',
        line: location.lineNumber || 0,
        column: location.columnNumber || 0
      },
      timestamp: Date.now()
    }

    // 过滤重复错误
    if (this.isDuplicate(error)) {
      return
    }

    this.errors.push(error)
    logger.error(`[${type.toUpperCase()}] ${error.message}`)
    
    if (error.location) {
      logger.info(`  📍 ${error.location.url}:${error.location.line}`)
    }

    // 分析错误
    await this.analyzeError(error)

    // 自动修复
    if (this.options.autoFix && error.analyzed?.severity !== 'low') {
      await this.attemptFix(error)
    }

    // 回调
    this.options.onError?.(error)
  }

  private async handlePageError(error: Error): Promise<void> {
    const capturedError: CapturedError = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'error',
      message: error.message,
      stack: error.stack,
      timestamp: Date.now()
    }

    this.errors.push(capturedError)
    logger.error(`[PAGE_ERROR] ${error.message}`)
    
    await this.analyzeError(capturedError)
  }

  private async handleRequestFailed(request: any): Promise<void> {
    const error: CapturedError = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'error',
      message: `请求失败: ${request.url()} - ${request.failure()?.errorText || '未知错误'}`,
      timestamp: Date.now()
    }

    this.errors.push(error)
    logger.error(`[REQUEST_FAILED] ${error.message}`)
    
    await this.analyzeError(error)
  }

  private isDuplicate(error: CapturedError): boolean {
    const recentErrors = this.errors.filter(e => 
      Date.now() - e.timestamp < 5000 // 5秒内的错误
    )
    
    return recentErrors.some(e => 
      e.message === error.message && 
      e.location?.url === error.location?.url
    )
  }

  private async analyzeError(error: CapturedError): Promise<void> {
    logger.info('  🔍 分析错误中...')
    
    error.analyzed = await this.analyzer.analyze(error)
    
    logger.info(`  📊 分类: ${error.analyzed.category}`)
    logger.info(`  ⚠️  严重程度: ${error.analyzed.severity}`)
    logger.info(`  💭 可能原因: ${error.analyzed.probableCause}`)
    
    if (error.analyzed.suggestedFix) {
      logger.info(`  💡 建议修复: ${error.analyzed.suggestedFix}`)
    }
  }

  private async attemptFix(error: CapturedError): Promise<void> {
    if (!this.page) return

    logger.info('  🔧 尝试自动修复...')
    
    try {
      const result = await this.fixer.fix(error, this.page)
      error.fixed = result.success
      error.fixResult = result.message
      
      if (result.success) {
        logger.success(`  ✅ 修复成功: ${result.message}`)
      } else {
        logger.warn(`  ⚠️  修复失败: ${result.message}`)
      }
    } catch (e) {
      logger.error(`  ❌ 修复异常: ${e}`)
    }
  }

  async stop(): Promise<void> {
    logger.info('\n📊 监控报告')
    logger.info('='.repeat(50))
    logger.info(`总计错误: ${this.errors.length}`)
    
    const categories = this.groupByCategory()
    for (const [cat, count] of Object.entries(categories)) {
      logger.info(`  ${cat}: ${count}`)
    }

    const fixed = this.errors.filter(e => e.fixed).length
    logger.info(`自动修复: ${fixed}/${this.errors.length}`)

    // 保存报告
    await this.saveReport()

    await this.browser?.close()
    process.exit(0)
  }

  private groupByCategory(): Record<string, number> {
    return this.errors.reduce((acc, err) => {
      const cat = err.analyzed?.category || '未分类'
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  private async saveReport(): Promise<void> {
    const fs = await import('fs/promises')
    const report = {
      timestamp: new Date().toISOString(),
      url: this.options.url,
      summary: {
        total: this.errors.length,
        fixed: this.errors.filter(e => e.fixed).length,
        byCategory: this.groupByCategory()
      },
      errors: this.errors
    }

    const filename = `error-report-${Date.now()}.json`
    await fs.writeFile(filename, JSON.stringify(report, null, 2))
    logger.info(`\n📝 报告已保存: ${filename}`)
  }

  getErrors(): CapturedError[] {
    return [...this.errors]
  }
}

// CLI 入口 - 通过 cli.ts 调用
export { ConsoleErrorMonitor, type CapturedError, type MonitorOptions }

export { ConsoleErrorMonitor, type CapturedError, type MonitorOptions }
