#!/usr/bin/env tsx
/**
 * 简化版 MCP 服务器 - 使用标准输入输出
 * 不依赖 @modelcontextprotocol/sdk
 */

import { chromium, Browser, Page } from 'playwright'
import { ErrorAnalyzer } from './analyzer'
import { ErrorFixer } from './fixer'
import { logger } from './logger'

// 全局状态
let browser: Browser | null = null
let page: Page | null = null
const analyzer = new ErrorAnalyzer()
const fixer = new ErrorFixer()
const capturedErrors: any[] = []

// 工具定义
const TOOLS = [
  {
    name: 'start_monitoring',
    description: '启动浏览器控制台错误监控',
    parameters: {
      url: { type: 'string', description: '目标 URL', default: 'http://localhost:3333' },
      headless: { type: 'boolean', description: '无头模式', default: false }
    }
  },
  {
    name: 'get_errors',
    description: '获取捕获到的错误',
    parameters: {
      filter: { type: 'string', description: '过滤条件', default: 'all' }
    }
  },
  {
    name: 'analyze_error',
    description: '分析指定错误',
    parameters: {
      errorId: { type: 'string', description: '错误 ID' }
    }
  },
  {
    name: 'fix_error',
    description: '尝试修复错误',
    parameters: {
      errorId: { type: 'string', description: '错误 ID' },
      strategy: { type: 'string', description: '修复策略', default: 'auto' }
    }
  },
  {
    name: 'stop_monitoring',
    description: '停止监控',
    parameters: {}
  }
]

// 设置控制台监听
function setupConsoleListeners(page: Page) {
  page.on('console', async (msg) => {
    const type = msg.type()
    if (type === 'error' || type === 'warning') {
      const error = {
        id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        message: msg.text(),
        location: msg.location(),
        timestamp: new Date().toISOString()
      }
      capturedErrors.push(error)
      logger.error(`[捕获] ${error.message.substring(0, 100)}`)
    }
  })

  page.on('pageerror', (err) => {
    const error = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'error',
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString()
    }
    capturedErrors.push(error)
    logger.error(`[页面错误] ${err.message.substring(0, 100)}`)
  })
}

// 处理工具调用
async function handleToolCall(name: string, args: any): Promise<string> {
  switch (name) {
    case 'start_monitoring': {
      const url = args?.url || 'http://localhost:3333'
      
      if (browser) {
        return '监控已经在运行中'
      }

      browser = await chromium.launch({ headless: false, devtools: true })
      page = await browser.newPage()
      setupConsoleListeners(page)
      await page.goto(url)

      return `✅ 监控已启动\n📍 URL: ${url}\n💡 请在浏览器中操作，错误将被自动捕获。\n\n提示：使用 get_errors 查看已捕获的错误。`
    }

    case 'get_errors': {
      if (capturedErrors.length === 0) {
        return '暂无捕获的错误。请在浏览器中进行操作以触发错误。'
      }

      const errors = capturedErrors.slice(-10) // 最近 10 条
      const summary = errors.map((e, i) => {
        const analysis = e.analyzed ? ` | ${e.analyzed.category}` : ''
        return `${i + 1}. [${e.type}] ${e.message.substring(0, 60)}...${analysis}`
      }).join('\n')

      return `📋 最近 ${errors.length} 个错误（共 ${capturedErrors.length} 个）：\n\n${summary}\n\n使用 analyze_error 分析特定错误，或 fix_error 尝试修复。`
    }

    case 'analyze_error': {
      const errorId = args?.errorId
      const error = capturedErrors.find(e => e.id === errorId) || capturedErrors[capturedErrors.length - 1]
      
      if (!error) {
        return '未找到错误'
      }

      const analysis = await analyzer.analyze(error)
      error.analyzed = analysis

      return `## 错误分析\n\n**ID:** ${error.id}\n**消息:** ${error.message.substring(0, 200)}\n**分类:** ${analysis.category}\n**严重程度:** ${analysis.severity}\n\n### 可能原因\n${analysis.probableCause}\n\n### 建议修复\n${analysis.suggestedFix || '暂无自动修复建议，需手动检查代码'}`
    }

    case 'fix_error': {
      if (!page) {
        return '浏览器未启动，请先调用 start_monitoring'
      }

      const errorId = args?.errorId
      const error = capturedErrors.find(e => e.id === errorId) || capturedErrors[capturedErrors.length - 1]
      
      if (!error) {
        return '未找到错误'
      }

      const result = await fixer.fix(error, page)
      error.fixed = result.success
      error.fixResult = result.message

      return result.success 
        ? `✅ 修复成功\n\n${result.message}\n操作: ${result.action}`
        : `⚠️ 自动修复失败\n\n${result.message}\n\n建议手动检查代码或使用 analyze_error 获取修复建议。`
    }

    case 'stop_monitoring': {
      if (browser) {
        await browser.close()
        browser = null
        page = null
      }
      
      const count = capturedErrors.length
      return `监控已停止。共捕获 ${count} 个错误。`
    }

    default:
      return `未知工具: ${name}。可用工具: ${TOOLS.map(t => t.name).join(', ')}`
  }
}

// 简单的 MCP 协议处理
async function processRequest(line: string): Promise<void> {
  try {
    const request = JSON.parse(line)
    
    if (request.method === 'list_tools') {
      console.log(JSON.stringify({
        tools: TOOLS
      }))
    } else if (request.method === 'call_tool') {
      const result = await handleToolCall(request.params.name, request.params.arguments)
      console.log(JSON.stringify({
        content: result,
        isError: false
      }))
    } else {
      console.log(JSON.stringify({
        error: `未知方法: ${request.method}`
      }))
    }
  } catch (e) {
    // 可能是初始化消息，忽略
    console.log(JSON.stringify({ status: 'ok' }))
  }
}

// 启动
async function main() {
  logger.info('Playwright Error Monitor MCP Server started')
  
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', async (data) => {
    const lines = data.toString().trim().split('\n')
    for (const line of lines) {
      if (line) await processRequest(line)
    }
  })
}

main().catch(console.error)
