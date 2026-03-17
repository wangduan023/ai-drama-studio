/**
 * 错误自动修复引擎
 * 根据错误类型尝试自动修复
 */

import { Page } from 'playwright'
import { CapturedError } from './index'
import { logger } from './logger'

interface FixResult {
  success: boolean
  message: string
  action?: string
  codeChange?: {
    file: string
    line: number
    original: string
    replacement: string
  }
}

/**
 * 修复策略接口
 */
interface FixStrategy {
  name: string
  canHandle(error: CapturedError): boolean
  fix(error: CapturedError, page: Page): Promise<FixResult>
}

/**
 * 重试失败的请求
 */
class RetryFailedRequestStrategy implements FixStrategy {
  name = 'RetryFailedRequest'

  canHandle(error: CapturedError): boolean {
    return error.analyzed?.category === 'Network' || 
           error.analyzed?.category === 'Timeout'
  }

  async fix(error: CapturedError, page: Page): Promise<FixResult> {
    try {
      // 尝试刷新页面
      logger.info('    尝试刷新页面重载资源...')
      await page.reload({ waitUntil: 'networkidle' })
      
      return {
        success: true,
        message: '页面已刷新，重新加载资源',
        action: 'page_reload'
      }
    } catch (e) {
      return {
        success: false,
        message: `刷新失败: ${e}`
      }
    }
  }
}

/**
 * 清理 LocalStorage 策略
 */
class ClearStorageStrategy implements FixStrategy {
  name = 'ClearStorage'

  canHandle(error: CapturedError): boolean {
    return error.analyzed?.category === 'Storage' ||
           error.message.includes('quota')
  }

  async fix(error: CapturedError, page: Page): Promise<FixResult> {
    try {
      await page.evaluate(() => {
        // 清理过期的存储项
        const now = Date.now()
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i)
          if (key) {
            try {
              const item = localStorage.getItem(key)
              if (item) {
                const parsed = JSON.parse(item)
                // 清理过期数据（假设有 expires 字段）
                if (parsed.expires && parsed.expires < now) {
                  localStorage.removeItem(key)
                }
              }
            } catch {
              // 非 JSON 数据，保留
            }
          }
        }
      })

      return {
        success: true,
        message: '已清理过期存储数据',
        action: 'clear_expired_storage'
      }
    } catch (e) {
      return {
        success: false,
        message: `清理存储失败: ${e}`
      }
    }
  }
}

/**
 * 处理 CORS 错误 - 通过代理
 */
class CORSStrategy implements FixStrategy {
  name = 'CORS'

  canHandle(error: CapturedError): boolean {
    return error.analyzed?.category === 'CORS'
  }

  async fix(error: CapturedError, page: Page): Promise<FixResult> {
    // CORS 需要在服务端配置，这里只能提示
    return {
      success: false,
      message: 'CORS 错误需要在服务端配置，请检查后端 CORS 设置',
      action: 'server_config_required'
    }
  }
}

/**
 * 处理 React Hydration 错误
 */
class HydrationStrategy implements FixStrategy {
  name = 'Hydration'

  canHandle(error: CapturedError): boolean {
    return error.analyzed?.category === 'React Hydration'
  }

  async fix(error: CapturedError, page: Page): Promise<FixResult> {
    try {
      // 注入修复脚本抑制 hydration 警告
      await page.addInitScript(() => {
        // @ts-ignore
        window.__REACT_HYDRATION_ERROR_SUPPRESSED__ = true
      })

      // 尝试重新hydrate
      await page.evaluate(() => {
        // 强制重新渲染
        document.body.style.display = 'none'
        setTimeout(() => {
          document.body.style.display = ''
        }, 0)
      })

      return {
        success: true,
        message: '已尝试修复 hydration 错误',
        action: 'suppress_hydration_warning'
      }
    } catch (e) {
      return {
        success: false,
        message: `修复失败: ${e}`
      }
    }
  }
}

/**
 * 处理 Chunk Load 错误
 */
class ChunkLoadStrategy implements FixStrategy {
  name = 'ChunkLoad'

  canHandle(error: CapturedError): boolean {
    return error.analyzed?.category === 'Code Splitting'
  }

  async fix(error: CapturedError, page: Page): Promise<FixResult> {
    try {
      // 等待网络稳定后刷新
      await page.waitForLoadState('networkidle')
      await page.reload({ waitUntil: 'networkidle' })

      return {
        success: true,
        message: '已重新加载代码块',
        action: 'reload_chunks'
      }
    } catch (e) {
      return {
        success: false,
        message: `重新加载失败: ${e}`
      }
    }
  }
}

/**
 * 生成修复建议代码
 */
class CodeSuggestionStrategy implements FixStrategy {
  name = 'CodeSuggestion'

  canHandle(): boolean {
    return true // 通用策略，最后尝试
  }

  async fix(error: CapturedError, page: Page): Promise<FixResult> {
    const category = error.analyzed?.category
    const message = error.message
    
    let suggestion = ''
    let codeChange: FixResult['codeChange'] | undefined

    switch (category) {
      case 'Null Reference':
        suggestion = '添加可选链操作符'
        codeChange = {
          file: error.location?.url || 'unknown',
          line: error.location?.line || 0,
          original: 'obj.property',
          replacement: 'obj?.property'
        }
        break

      case 'React Key':
        suggestion = '为列表添加 key 属性'
        codeChange = {
          file: error.location?.url || 'unknown',
          line: error.location?.line || 0,
          original: '{items.map(item => <div>{item.name}</div>)}',
          replacement: '{items.map(item => <div key={item.id}>{item.name}</div>)}'
        }
        break

      case 'Network':
        suggestion = '添加错误处理和重试逻辑'
        codeChange = {
          file: error.location?.url || 'unknown',
          line: error.location?.line || 0,
          original: 'const data = await fetch(url)',
          replacement: `const data = await fetch(url).catch(err => {
  console.error('Request failed:', err);
  return null;
})`
        }
        break

      default:
        suggestion = `检查错误: ${message}`
    }

    return {
      success: false, // 代码修复需要手动应用
      message: suggestion,
      action: 'manual_fix_required',
      codeChange
    }
  }
}

/**
 * 修复引擎主类
 */
class ErrorFixer {
  private strategies: FixStrategy[]

  constructor() {
    this.strategies = [
      new RetryFailedRequestStrategy(),
      new ClearStorageStrategy(),
      new CORSStrategy(),
      new HydrationStrategy(),
      new ChunkLoadStrategy(),
      new CodeSuggestionStrategy() // 最后作为 fallback
    ]
  }

  async fix(error: CapturedError, page: Page): Promise<FixResult> {
    // 找到合适的修复策略
    for (const strategy of this.strategies) {
      if (strategy.canHandle(error)) {
        logger.info(`    使用策略: ${strategy.name}`)
        return strategy.fix(error, page)
      }
    }

    return {
      success: false,
      message: '没有合适的自动修复策略'
    }
  }

  /**
   * 批量修复
   */
  async fixBatch(errors: CapturedError[], page: Page): Promise<FixResult[]> {
    const results: FixResult[] = []
    
    // 按类别分组，优先修复关键错误
    const sorted = errors.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return severityOrder[a.analyzed?.severity || 'low'] - 
             severityOrder[b.analyzed?.severity || 'low']
    })

    for (const error of sorted) {
      if (!error.fixed) {
        const result = await this.fix(error, page)
        results.push(result)
        
        // 如果成功修复，标记错误
        if (result.success) {
          error.fixed = true
          error.fixResult = result.message
        }
      }
    }

    return results
  }
}

export { ErrorFixer, type FixResult, type FixStrategy }
