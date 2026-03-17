/**
 * 日志工具
 */

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
}

export const logger = {
  info: (msg: string) => {
    console.log(`${colors.blue}ℹ${colors.reset} ${msg}`)
  },
  
  success: (msg: string) => {
    console.log(`${colors.green}✓${colors.reset} ${msg}`)
  },
  
  warn: (msg: string) => {
    console.log(`${colors.yellow}⚠${colors.reset} ${msg}`)
  },
  
  error: (msg: string) => {
    console.log(`${colors.red}✗${colors.reset} ${msg}`)
  },
  
  debug: (msg: string) => {
    if (process.env.DEBUG) {
      console.log(`${colors.gray}[DEBUG]${colors.reset} ${msg}`)
    }
  },
  
  title: (msg: string) => {
    console.log(`\n${colors.cyan}${msg}${colors.reset}`)
    console.log(colors.cyan + '='.repeat(msg.length) + colors.reset)
  }
}
