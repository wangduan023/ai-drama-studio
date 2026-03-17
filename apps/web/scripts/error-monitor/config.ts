/**
 * 错误监控配置文件
 */

import { FixStrategy } from './fixer'
import { CapturedError } from './index'

export interface MonitorConfig {
  /** 目标 URL */
  url: string
  /** 是否使用无头模式 */
  headless: boolean
  /** 监控时长 (ms), 0 = 无限 */
  duration: number
  /** 是否自动修复 */
  autoFix: boolean
  /** 自动刷新页面 */
  autoReload: boolean
  /** 忽略的错误模式 */
  ignorePatterns: RegExp[]
  /** 错误回调 */
  onError?: (error: CapturedError) => void
  /** 自定义修复策略 */
  customStrategies?: FixStrategy[]
  /** 报告输出目录 */
  reportDir: string
  /** 是否保存截图 */
  saveScreenshot: boolean
  /** 是否录制视频 */
  recordVideo: boolean
}

export const defaultConfig: MonitorConfig = {
  url: process.env.MONITOR_URL || 'http://localhost:3333',
  headless: process.env.HEADLESS === 'true',
  duration: parseInt(process.env.MONITOR_DURATION || '0'),
  autoFix: process.env.AUTO_FIX === 'true',
  autoReload: false,
  ignorePatterns: [
    // 第三方库警告
    /deprecated/i,
    /Third-party cookie/i,
    /Chrome DevTools/i,
    // 非错误信息
    /\[HMR\]/i,
    /\[WDS\]/i,
    // 开发环境特定
    /Download the React DevTools/i,
  ],
  reportDir: './error-reports',
  saveScreenshot: true,
  recordVideo: false,
}

export function loadConfig(): MonitorConfig {
  try {
    // 尝试加载用户配置
    const userConfig = require('./error-monitor.config').default
    return { ...defaultConfig, ...userConfig }
  } catch {
    return defaultConfig
  }
}
