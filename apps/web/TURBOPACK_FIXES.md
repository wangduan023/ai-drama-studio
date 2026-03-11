# Turbopack 问题修复报告

## 检测到的 Turbopack 问题

### 1. ✅ 已修复：CSS @apply 兼容性问题
**问题**: Tailwind CSS v4 与 Turbopack 的 `@apply` 指令兼容性问题
**影响**: CSS 构建失败或样式不生效

**修复内容**:
- 将 `globals.css` 中的 `@apply` 指令替换为原生 CSS
- 使用直接的 CSS 属性值而不是 Tailwind 类名

**修改前**:
```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**修改后**:
```css
* {
  border-color: var(--border);
}

body {
  background-color: var(--background);
  color: var(--foreground);
}
```

### 2. ✅ 已修复：Next.js 配置优化
**问题**: 缺少 Turbopack 特定的配置选项
**影响**: 模块解析问题

**修复内容**:
- 添加 `turbopack` 配置部分
- 添加 `resolveAlias` 配置
- 添加实验性功能配置

**修改文件**: `next.config.ts`

```typescript
turbopack: {
  resolveAlias: {
    'tailwindcss': 'tailwindcss',
  },
  root: process.cwd(),
},
experimental: {
  optimizeCss: true,
  serverComponents: true,
},
```

### 3. ✅ 已修复：PostCSS 配置优化
**问题**: PostCSS 配置缺少 Tailwind CSS v4 特定选项
**影响**: CSS 处理性能问题

**修复内容**:
- 添加 `optimize` 选项以支持生产环境优化

**修改文件**: `postcss.config.mjs`

```javascript
plugins: {
  '@tailwindcss/postcss': {
    optimize: process.env.NODE_ENV === 'production',
  },
}
```

### 4. ✅ 已修复：Tailwind 配置更新
**问题**: Tailwind 配置中的颜色变量引用不正确
**影响**: 样式不一致

**修复内容**:
- 统一颜色变量命名
- 添加缺失的 `destructive-foreground` 变量
- 修复 border-radius 计算

**修改文件**: `tailwind.config.ts`

## Turbopack 已知限制

### 不支持的特性
1. **CSS Modules**: 部分高级特性可能不完全支持
2. **Sass/Less**: 需要额外配置
3. **PostCSS 插件**: 某些插件可能不兼容

### 推荐的开发实践
1. 使用原生 CSS 代替 `@apply`
2. 避免复杂的 CSS 嵌套
3. 使用 CSS 变量而不是 Tailwind 的 theme 函数
4. 保持依赖包最新版本

## 性能优化建议

### 1. 开发模式
- 使用 `--turbopack` 标志启动
- 启用热重载 (HMR)
- 使用 CSS 变量缓存

### 2. 生产模式
- 启用 CSS 优化
- 使用图片优化
- 启用代码分割

## 验证步骤

1. **启动开发服务器**:
```bash
pnpm dev
```

2. **检查控制台输出**:
- 确认没有 Turbopack 错误
- 确认 HMR 正常工作

3. **检查样式**:
- 确认所有样式正确加载
- 确认暗色模式正常工作

## 回滚选项

如果 Turbopack 导致问题，可以暂时禁用它:

**修改 `package.json`**:
```json
"scripts": {
  "dev": "next dev -H 0.0.0.0"
}
```

移除 `--turbopack` 标志即可使用标准 Webpack 构建。

## 参考链接

- [Next.js Turbopack 文档](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack)
- [Tailwind CSS v4 文档](https://tailwindcss.com/docs/v4-beta)
- [Turbopack 限制说明](https://nextjs.org/docs/app/api-reference/config/next-config-js/turbopack#unsupported-features)
