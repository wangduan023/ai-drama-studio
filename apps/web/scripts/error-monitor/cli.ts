#!/usr/bin/env tsx
/**
 * 命令行入口
 * 
 * 用法:
 *   npx tsx scripts/error-monitor/cli.ts [options]
 * 
 * 选项:
 *   --url, -u      目标 URL (默认: http://localhost:3333)
 *   --headless, -h 无头模式
 *   --fix, -f      自动修复
 *   --duration, -d 监控时长(秒)
 *   --report, -r   生成报告
 */

import { ConsoleErrorMonitor } from './index'
import { logger } from './logger'

function parseArgs() {
  const args = process.argv.slice(2)
  const options: any = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '--url':
      case '-u':
        options.url = args[++i]
        break
      case '--headless':
      case '-h':
        options.headless = true
        break
      case '--fix':
      case '-f':
        options.autoFix = true
        break
      case '--duration':
      case '-d':
        options.duration = parseInt(args[++i]) * 1000
        break
      case '--report':
      case '-r':
        options.report = true
        break
      case '--help':
        showHelp()
        process.exit(0)
    }
  }

  return options
}

function showHelp() {
  console.log(`
控制台错误监控工具

用法: npx tsx scripts/error-monitor/cli.ts [选项]

选项:
  -u, --url <url>       目标 URL (默认: http://localhost:3333)
  -h, --headless        无头模式运行
  -f, --fix             自动修复错误
  -d, --duration <秒>    监控时长
  -r, --report          生成报告
  --help                显示帮助

示例:
  # 基础监控
  npx tsx scripts/error-monitor/cli.ts

  # 监控生产环境并自动修复
  npx tsx scripts/error-monitor/cli.ts -u https://example.com -f

  # 监控 60 秒并生成报告
  npx tsx scripts/error-monitor/cli.ts -d 60 -r
`)
}

async function main() {
  const options = parseArgs()
  
  const monitor = new ConsoleErrorMonitor({
    url: options.url,
    autoFix: options.autoFix,
    duration: options.duration
  })

  // 优雅退出
  process.on('SIGINT', () => monitor.stop())
  process.on('SIGTERM', () => monitor.stop())

  await monitor.start()
}

main().catch((err) => {
  logger.error(`启动失败: ${err.message}`)
  process.exit(1)
})
