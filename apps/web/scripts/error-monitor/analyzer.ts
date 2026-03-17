/**
 * 错误分析器
 * 对捕获的控制台错误进行分类和诊断
 */

import { CapturedError } from './index'

interface AnalysisResult {
  category: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  probableCause: string
  suggestedFix?: string
  relatedFiles?: string[]
}

// 错误模式定义
const ERROR_PATTERNS = [
  // React 相关
  {
    pattern: /react.*hydrat/i,
    category: 'React Hydration',
    severity: 'high' as const,
    cause: '服务端渲染与客户端渲染不一致',
    fix: '检查 SSR/CSR 数据差异，使用 suppressHydrationWarning'
  },
  {
    pattern: /react.*key/i,
    category: 'React Key',
    severity: 'medium' as const,
    cause: '列表渲染缺少唯一的 key 属性',
    fix: '为列表项添加唯一的 key 属性'
  },
  {
    pattern: /react.*prop/i,
    category: 'React Props',
    severity: 'medium' as const,
    cause: '组件 props 类型不匹配或传递错误',
    fix: '检查组件 props 类型定义和传递值'
  },
  
  // API/网络相关
  {
    pattern: /fetch|axios|request.*failed|network.*error/i,
    category: 'Network',
    severity: 'high' as const,
    cause: '网络请求失败',
    fix: '检查 API 地址、网络连接和 CORS 配置'
  },
  {
    pattern: /404|not found/i,
    category: 'Resource Not Found',
    severity: 'medium' as const,
    cause: '请求的资源不存在',
    fix: '检查 API 端点或文件路径'
  },
  {
    pattern: /500|502|503|504|internal server error/i,
    category: 'Server Error',
    severity: 'critical' as const,
    cause: '服务器端错误',
    fix: '检查后端日志和服务器状态'
  },
  {
    pattern: /cors|cross.*origin/i,
    category: 'CORS',
    severity: 'high' as const,
    cause: '跨域请求被阻止',
    fix: '配置 CORS 策略或使用代理'
  },
  {
    pattern: /timeout|etimedout/i,
    category: 'Timeout',
    severity: 'medium' as const,
    cause: '请求超时',
    fix: '增加超时时间或优化请求性能'
  },

  // TypeScript/类型相关
  {
    pattern: /cannot read propert.*undefined|null|cannot read propert.*of undefined/i,
    category: 'Null Reference',
    severity: 'critical' as const,
    cause: '访问了 undefined 或 null 对象的属性',
    fix: '添加空值检查或使用可选链操作符 ?.'
  },
  {
    pattern: /is not a function|is not iterable/i,
    category: 'Type Error',
    severity: 'high' as const,
    cause: '变量类型与预期不符',
    fix: '检查变量类型和赋值'
  },
  {
    pattern: /cannot find module|module not found/i,
    category: 'Module',
    severity: 'critical' as const,
    cause: '模块导入失败',
    fix: '检查模块名称和安装状态'
  },

  // 资源加载
  {
    pattern: /failed to load|loading.*failed/i,
    category: 'Resource Loading',
    severity: 'medium' as const,
    cause: '资源加载失败（图片、脚本、CSS等）',
    fix: '检查资源路径和可用性'
  },
  {
    pattern: /chunk load|loading chunk/i,
    category: 'Code Splitting',
    severity: 'high' as const,
    cause: '动态加载的代码块失败',
    fix: '检查网络连接或增加重试逻辑'
  },

  // 存储相关
  {
    pattern: /localstorage|sessionstorage|quota.*exceeded/i,
    category: 'Storage',
    severity: 'medium' as const,
    cause: '本地存储操作失败或空间不足',
    fix: '清理存储空间或处理存储异常'
  },

  // WebSocket
  {
    pattern: /websocket|ws.*error/i,
    category: 'WebSocket',
    severity: 'high' as const,
    cause: 'WebSocket 连接错误',
    fix: '检查 WebSocket 服务器和连接配置'
  },

  // 权限相关
  {
    pattern: /permission denied|not allowed|unauthorized/i,
    category: 'Permission',
    severity: 'high' as const,
    cause: '权限不足或认证失败',
    fix: '检查用户权限和登录状态'
  },

  // 内存相关
  {
    pattern: /out of memory|memory.*exceeded|heap.*overflow/i,
    category: 'Memory',
    severity: 'critical' as const,
    cause: '内存溢出',
    fix: '检查内存泄漏，优化大数据处理'
  },

  // 性能相关
  {
    pattern: /long task|blocking.*time/i,
    category: 'Performance',
    severity: 'medium' as const,
    cause: '主线程被长时间阻塞',
    fix: '优化代码性能，使用 Web Worker'
  },

  // 废弃特性
  {
    pattern: /deprecated|obsolete/i,
    category: 'Deprecation',
    severity: 'low' as const,
    cause: '使用了废弃的 API 或特性',
    fix: '迁移到推荐的替代方案'
  }
]

class ErrorAnalyzer {
  async analyze(error: CapturedError): Promise<AnalysisResult> {
    const message = error.message.toLowerCase()
    const stack = (error.stack || '').toLowerCase()
    const combinedText = `${message} ${stack}`

    // 匹配错误模式
    for (const pattern of ERROR_PATTERNS) {
      if (pattern.pattern.test(combinedText)) {
        return {
          category: pattern.category,
          severity: pattern.severity,
          probableCause: pattern.cause,
          suggestedFix: pattern.fix,
          relatedFiles: this.extractFilePaths(error.stack || error.message)
        }
      }
    }

    // 默认分析
    return this.defaultAnalysis(error)
  }

  private defaultAnalysis(error: CapturedError): AnalysisResult {
    const message = error.message.toLowerCase()

    // 根据消息特征推断
    if (message.includes('error') || message.includes('exception')) {
      return {
        category: 'General Error',
        severity: 'medium',
        probableCause: '运行时错误',
        suggestedFix: '查看详细错误信息和堆栈',
        relatedFiles: this.extractFilePaths(error.stack || '')
      }
    }

    if (message.includes('warn')) {
      return {
        category: 'Warning',
        severity: 'low',
        probableCause: '非关键警告',
        suggestedFix: '根据警告内容优化代码'
      }
    }

    return {
      category: 'Unknown',
      severity: 'low',
      probableCause: '无法识别的错误类型',
      suggestedFix: '手动检查错误详情'
    }
  }

  private extractFilePaths(text: string): string[] {
    // 从堆栈中提取文件路径
    const patterns = [
      /(src\/[\w\/\-.]+\.(ts|tsx|js|jsx))/gi,
      /(apps\/[\w\/\-.]+\.(ts|tsx|js|jsx))/gi,
      /(packages\/[\w\/\-.]+\.(ts|tsx|js|jsx))/gi,
      /(http:\/\/[^\s:]+:\d+)/gi,
      /(https:\/\/[^\s:]+:\d+)/gi
    ]

    const files = new Set<string>()
    
    for (const pattern of patterns) {
      const matches = text.match(pattern)
      if (matches) {
        matches.forEach(m => files.add(m))
      }
    }

    return Array.from(files)
  }

  /**
   * 批量分析多个错误，找出共同原因
   */
  analyzeBatch(errors: CapturedError[]): {
    commonCategories: Record<string, number>
    criticalErrors: CapturedError[]
    suggestions: string[]
  } {
    const categories: Record<string, number> = {}
    const criticalErrors: CapturedError[] = []
    const allSuggestions = new Set<string>()

    for (const error of errors) {
      if (!error.analyzed) continue
      
      const cat = error.analyzed.category
      categories[cat] = (categories[cat] || 0) + 1

      if (error.analyzed.severity === 'critical') {
        criticalErrors.push(error)
      }

      if (error.analyzed.suggestedFix) {
        allSuggestions.add(error.analyzed.suggestedFix)
      }
    }

    return {
      commonCategories: categories,
      criticalErrors,
      suggestions: Array.from(allSuggestions)
    }
  }
}

export { ErrorAnalyzer, type AnalysisResult, ERROR_PATTERNS }
