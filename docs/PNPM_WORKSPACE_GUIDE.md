# AI Drama Studio - pnpm Workspace 优化配置

## 概述

本项目是一个 monorepo 结构，包含多个相互依赖的包。我们使用 pnpm workspace 来优化依赖管理和项目结构。

## 项目结构

```
ai-drama-studio/
├── apps/
│   ├── web/          # Web 应用前端
│   └── worker/       # Worker 任务处理器
├── packages/
│   ├── ai-client/    # AI 客户端抽象层
│   ├── core/         # 核心业务逻辑
│   ├── db/           # 数据库层 (Prisma)
│   ├── prompt-system/# 提示词管理系统
│   ├── queue/        # 队列系统 (BullMQ)
│   ├── sse/          # 实时推送系统
│   └── workflow/     # 工作流引擎
├── node_modules/     # 集中管理的依赖 (由 pnpm 管理)
├── pnpm-workspace.yaml  # Workspace 配置
└── package.json      # 根目录依赖
```

## 配置说明

### 1. Workspace 配置 (`pnpm-workspace.yaml`)

- **包发现**：自动包含 `apps/*` 和 `packages/*` 目录
- **依赖提升**：公共依赖提升到根目录，避免重复安装
- **依赖共享**：使用符号链接和硬链接共享相同版本的依赖
- **构建优化**：对需要编译的原生依赖进行特殊处理

### 2. pnpm 配置 (`.pnpmrc`)

- `shamefully-hoist=true`: 扁平化 node_modules 结构
- `prefer-workspace-packages=true`: 优先使用工作区内包
- `hoist-pattern=*`: 提升所有依赖到顶层
- `save-workspace-protocol=true`: 使用 workspace 协议保存依赖

## 主要优势

1. **节省磁盘空间**: 通过符号链接避免重复依赖
2. **快速安装**: 依赖只需下载一次，然后符号链接到各包
3. **一致版本**: 所有包使用相同的依赖版本
4. **本地开发**: 包之间的更改立即可见，无需发布

## 最佳实践

### 安装依赖
```bash
# 总是在根目录运行
pnpm install
```

### 开发命令
```bash
# 在根目录运行开发命令
pnpm run dev
pnpm run test
pnpm run build
```

### 添加新依赖
```bash
# 添加到根目录
pnpm add package-name

# 添加为开发依赖
pnpm add -D package-name

# 添加到特定包 (在根目录执行)
pnpm add package-name --filter @ai-drama-studio/core
```

### 运行特定包的脚本
```bash
# 运行特定包的脚本
pnpm --filter @ai-drama-studio/core test
pnpm --filter @ai-drama-studio/web build
```

## 依赖管理

- 所有共享依赖都在根目录的 `package.json` 中定义
- 各包的 `package.json` 只定义其特有的依赖或 workspace 内部依赖
- 使用 `workspace:*` 协议引用内部包
- 依赖冲突时，pnpm 会选择满足所有包需求的版本

## 故障排除

### 如果遇到依赖问题：
```bash
# 清理并重新安装
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 检查 workspace 连接：
```bash
pnpm list --filter "*"
```

### 查看包之间的连接：
```bash
pnpm graph
```

## 注意事项

1. 不要在子目录单独运行 `pnpm install`，总是在根目录执行
2. 添加新包时，将其路径添加到 `pnpm-workspace.yaml`
3. 依赖版本冲突时，使用 resolutions 或更新依赖兼容性
4. 定期运行 `pnpm update` 保持依赖更新