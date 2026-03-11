#!/usr/bin/env node
/**
 * Turbopack 配置验证脚本
 */

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const webDir = process.cwd()
const issues = []
const warnings = []

console.log('🔍 检测 Turbopack 配置...\n')

// 1. 检查 next.config.ts
console.log('1️⃣ 检查 Next.js 配置...')
const nextConfigPath = join(webDir, 'next.config.ts')
if (existsSync(nextConfigPath)) {
  const config = readFileSync(nextConfigPath, 'utf-8')
  if (config.includes('turbopack:')) {
    console.log('   ✅ Turbopack 配置已添加')
  } else {
    warnings.push('Turbopack 配置未找到，使用默认配置')
  }
  
  if (config.includes('experimental:')) {
    console.log('   ✅ 实验性功能已配置')
  }
} else {
  issues.push('next.config.ts 不存在')
}

// 2. 检查 PostCSS 配置
console.log('\n2️⃣ 检查 PostCSS 配置...')
const postcssConfigPath = join(webDir, 'postcss.config.mjs')
if (existsSync(postcssConfigPath)) {
  const config = readFileSync(postcssConfigPath, 'utf-8')
  if (config.includes('@tailwindcss/postcss')) {
    console.log('   ✅ Tailwind CSS v4 PostCSS 插件已配置')
  } else {
    issues.push('Tailwind CSS PostCSS 插件未配置')
  }
} else {
  issues.push('postcss.config.mjs 不存在')
}

// 3. 检查 globals.css
console.log('\n3️⃣ 检查全局 CSS...')
const globalsCssPath = join(webDir, 'app', 'globals.css')
if (existsSync(globalsCssPath)) {
  const css = readFileSync(globalsCssPath, 'utf-8')
  
  // 检查实际的 @apply 使用（不包括注释）
  // 移除注释后再检查
  const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  if (cssWithoutComments.includes('@apply')) {
    warnings.push('globals.css 仍包含 @apply 指令，可能影响 Turbopack 兼容性')
  } else {
    console.log('   ✅ 未发现 @apply 指令')
  }
  
  if (css.includes('@import \'tailwindcss\'') || css.includes('@import "tailwindcss"')) {
    console.log('   ✅ Tailwind CSS v4 导入语法正确')
  } else {
    issues.push('Tailwind CSS 导入语法可能不正确')
  }
} else {
  issues.push('app/globals.css 不存在')
}

// 4. 检查 package.json
console.log('\n4️⃣ 检查依赖...')
const packageJsonPath = join(webDir, 'package.json')
if (existsSync(packageJsonPath)) {
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
  
  const tailwindVersion = pkg.devDependencies?.tailwindcss || ''
  if (tailwindVersion.startsWith('4') || tailwindVersion === '^4') {
    console.log('   ✅ Tailwind CSS v4 已安装')
  } else {
    issues.push('Tailwind CSS v4 未安装')
  }
  
  if (pkg.devDependencies?.['@tailwindcss/postcss']) {
    console.log('   ✅ @tailwindcss/postcss 已安装')
  } else {
    issues.push('@tailwindcss/postcss 未安装')
  }
  
  if (pkg.scripts?.dev?.includes('--turbopack')) {
    console.log('   ✅ Turbopack 在 dev 脚本中启用')
  } else {
    warnings.push('Turbopack 未在 dev 脚本中启用')
  }
} else {
  issues.push('package.json 不存在')
}

// 5. 检查 tsconfig.json
console.log('\n5️⃣ 检查 TypeScript 配置...')
const tsconfigPath = join(webDir, 'tsconfig.json')
if (existsSync(tsconfigPath)) {
  const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'))
  if (tsconfig.compilerOptions?.moduleResolution === 'bundler') {
    console.log('   ✅ moduleResolution 设置为 bundler')
  } else {
    warnings.push('moduleResolution 建议设置为 bundler')
  }
} else {
  issues.push('tsconfig.json 不存在')
}

// 输出结果
console.log('\n' + '='.repeat(50))
if (issues.length === 0 && warnings.length === 0) {
  console.log('✅ 所有 Turbopack 配置检查通过！')
} else {
  if (issues.length > 0) {
    console.log(`\n❌ 发现 ${issues.length} 个问题:`)
    issues.forEach((issue, i) => console.log(`   ${i + 1}. ${issue}`))
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  发现 ${warnings.length} 个警告:`)
    warnings.forEach((warning, i) => console.log(`   ${i + 1}. ${warning}`))
  }
}
console.log('='.repeat(50))

// 退出码
process.exit(issues.length > 0 ? 1 : 0)
