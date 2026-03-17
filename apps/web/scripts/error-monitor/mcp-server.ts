#!/usr/bin/env tsx
/**
 * Playwright 错误监控 MCP 服务器
 * 
 * 为 Kimi Code CLI 提供工具来监控和修复浏览器错误
 * 
 * 配置到 .kimi/mcp.json:
 * {
 *   "mcpServers": {
 *     "error-monitor": {
 *       "command": "npx",
 *       "args": ["tsx", "apps/web/scripts/error-monitor/mcp-server.ts"]
 *     }
 *   }
 * }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js'
import { chromium, Browser, Page } from 'playwright'
import { ErrorAnalyzer } from './analyzer'
import { ErrorFixer } from './fixer'
import { logger } from './logger'

// 全局状态
let browser: Browser | null = null
let page: Page | null = null
const analyzer = new ErrorAnalyzer()
const fixer = new ErrorFixer()

// 错误存储
const capturedErrors: any[] = []

// MCP 工具定义
const TOOLS: Tool[] = [
  {
    name: 'start_monitoring',
    description: '启动浏览器控制台错误监控，打开目标页面准备捕获错误',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要监控的页面 URL',
          default: 'http://localhost:3333'
        },
        headless: {
          type: 'boolean',
          description: '是否使用无头模式',
          default: false
        }
      }
    }
  },
  {
    name: 'get_errors',
    description: '获取捕获到的所有控制台错误',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          description: '过滤条件: error|warning|all',
          default: 'all'
        },
        severity: {
          type: 'string',
          description: '按严重程度过滤: critical|high|medium|low',
        }
      }
    }
  },
  {
    name: 'analyze_error',
    description: '分析指定错误的根本原因和修复建议',
    inputSchema: {
      type: 'object',
      properties: {
        errorId: {
          type: 'string',
          description: '错误 ID'
        },
        errorMessage: {
          type: 'string',
          description: '错误消息（如果没有 ID）'
        }
      }
    }
  },
  {
    name: 'fix_error',
    description: '尝试自动修复指定错误',
    inputSchema: {
      type: 'object',
      properties: {
        errorId: {
          type: 'string',
          description: '错误 ID'
        },
        strategy: {
          type: 'string',
          description: '修复策略: auto|retry|reload|clear_storage',
          default: 'auto'
        }
      }
    }
  },
  {
    name: 'generate_fix_report',
    description: '生成错误修复报告，包含所有错误和修复建议',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          description: '报告格式: markdown|json',
          default: 'markdown'
        }
      }
    }
  },
  {
    name: 'stop_monitoring',
    description: '停止监控并关闭浏览器',
    inputSchema: {
      type: 'object',
      properties: {}
    }
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
      logger.error(`[捕获] ${error.message}`)
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
    logger.error(`[页面错误] ${err.message}`)
  })
}

// 处理工具调用
async function handleToolCall(name: string, args: any): Promise<any> {
  switch (name) {
    case 'start_monitoring': {
      const url = args?.url || 'http://localhost:3333'
      const headless = args?.headless ?? false

      if (browser) {
        return {
          content: [{ type: 'text', text: '监控已经在运行中' }],
          isError: false
        }
      }

      browser = await chromium.launch({ headless, devtools: !headless })
      page = await browser.newPage()
      setupConsoleListeners(page)
      await page.goto(url)

      return {
        content: [{
          type: 'text',
          text: `✅ 监控已启动\n📍 URL: ${url}\n💡 请在浏览器中操作，错误将被自动捕获`
        }],
        isError: false
      }
    }

    case 'get_errors': {
      const filter = args?.filter || 'all'
      const severity = args?.severity

      let errors = capturedErrors
      if (filter !== 'all') {
        errors = errors.filter(e => e.type === filter)
      }

      if (severity && errors.some(e => e.analyzed)) {
        errors = errors.filter(e => e.analyzed?.severity === severity)
      }

      if (errors.length === 0) {
        return {
          content: [{ type: 'text', text: '暂无捕获的错误' }],
          isError: false
        }
      }

      const summary = errors.map(e => {
        const analysis = e.analyzed ? `\n  📊 ${e.analyzed.category} | ${e.analyzed.severity}` : ''
        const fixed = e.fixed ? ' ✅ 已修复' : ''
        return `[${e.type}] ${e.message.substring(0, 100)}${analysis}${fixed}`
      }).join('\n---\n')

      return {
        content: [{
          type: 'text',
          text: `📋 共 ${errors.length} 个错误\n\n${summary}`
        }],
        isError: false
      }
    }

    case 'analyze_error': {
      const errorId = args?.errorId
      const errorMessage = args?.errorMessage

      let error = errorId 
        ? capturedErrors.find(e => e.id === errorId)
        : capturedErrors.find(e => e.message.includes(errorMessage))

      if (!error && errorMessage) {
        // 创建临时错误进行分析
        error = { message: errorMessage, type: 'error', timestamp: Date.now() }
      }

      if (!error) {
        return {
          content: [{ type: 'text', text: '未找到指定错误' }],
          isError: true
        }
      }

      const analysis = await analyzer.analyze(error)
      error.analyzed = analysis

      const report = `
## 错误分析

**消息:** ${error.message}
**类型:** ${error.type}
**分类:** ${analysis.category}
**严重程度:** ${analysis.severity}

### 可能原因
${analysis.probableCause}

### 建议修复
${analysis.suggestedFix || '暂无自动修复建议'}

### 相关文件
${analysis.relatedFiles?.join('\n') || '未能提取文件路径'}
`

      return {
        content: [{ type: 'text', text: report }],
        isError: false
      }
    }

    case 'fix_error': {
      const errorId = args?.errorId
      const strategy = args?.strategy || 'auto'

      const error = capturedErrors.find(e => e.id === errorId)
      if (!error) {
        return {
          content: [{ type: 'text', text: '未找到指定错误' }],
          isError: true
        }
      }

      if (!page) {
        return {
          content: [{ type: 'text', text: '浏览器未启动，请先调用 start_monitoring' }],
          isError: true
        }
      }

      // 特定策略处理
      if (strategy === 'reload') {
        await page.reload({ waitUntil: 'networkidle' })
        error.fixed = true
        error.fixResult = '页面已刷新'
        return {
          content: [{ type: 'text', text: '✅ 已刷新页面' }],
          isError: false
        }
      }

      const result = await fixer.fix(error, page)
      error.fixed = result.success
      error.fixResult = result.message

      return {
        content: [{
          type: 'text',
          text: result.success 
            ? `✅ ${result.message}\n操作: ${result.action}`
            : `⚠️ ${result.message}`
        }],
        isError: !result.success
      }
    }

    case 'generate_fix_report': {
      const format = args?.format || 'markdown'

      if (capturedErrors.length === 0) {
        return {
          content: [{ type: 'text', text: '暂无错误报告' }],
          isError: false
        }
      }

      // 批量分析
      for (const error of capturedErrors) {
        if (!error.analyzed) {
          error.analyzed = await analyzer.analyze(error)
        }
      }

      const batch = analyzer.analyzeBatch(capturedErrors)

      if (format === 'json') {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              summary: batch,
              errors: capturedErrors
            }, null, 2)
          }],
          isError: false
        }
      }

      // Markdown 报告
      const md = `
# 错误修复报告

生成时间: ${new Date().toLocaleString()}

## 统计

| 类别 | 数量 |
|------|------|
${Object.entries(batch.commonCategories).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}

**严重错误:** ${batch.criticalErrors.length}

## 关键错误

${batch.criticalErrors.map(e => `- [${e.type}] ${e.message.substring(0, 80)}...`).join('\n') || '无'}

## 修复建议

${batch.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## 详细错误列表

${capturedErrors.map((e, i) => `
### 错误 ${i + 1}
- **消息:** ${e.message.substring(0, 200)}
- **类型:** ${e.type}
- **分类:** ${e.analyzed?.category || '未分类'}
- **严重程度:** ${e.analyzed?.severity || 'unknown'}
- **状态:** ${e.fixed ? '✅ 已修复' : '⏳ 待处理'}
`).join('\n---\n')}
`

      return {
        content: [{ type: 'text', text: md }],
        isError: false
      }
    }

    case 'stop_monitoring': {
      if (browser) {
        await browser.close()
        browser = null
        page = null
      }
      
      const report = capturedErrors.length > 0 
        ? `共捕获 ${capturedErrors.length} 个错误，使用 get_errors 查看详情`
        : '未捕获任何错误'

      return {
        content: [{ type: 'text', text: `监控已停止\n${report}` }],
        isError: false
      }
    }

    default:
      return {
        content: [{ type: 'text', text: `未知工具: ${name}` }],
        isError: true
      }
  }
}

// 启动 MCP 服务器
async function main() {
  const server = new Server(
    {
      name: 'playwright-error-monitor',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      return await handleToolCall(request.params.name, request.params.arguments)
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `执行失败: ${error}`
        }],
        isError: true
      }
    }
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
  
  logger.info('Playwright Error Monitor MCP Server running on stdio')
}

main().catch(console.error)
