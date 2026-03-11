# E2E 测试文档

## 概述

本项目使用 [Playwright](https://playwright.dev/) 进行端到端（E2E）测试。

## 测试文件

- `projects.spec.ts` - 项目流程测试
- `characters.spec.ts` - 角色流程测试
- `episodes.spec.ts` - 剧集流程测试
- `locations.spec.ts` - 场景流程测试
- `navigation.spec.ts` - 导航流程测试
- `theme.spec.ts` - 主题切换测试

## 运行测试

### 运行所有 E2E 测试

```bash
pnpm test:e2e
```

### 运行特定测试文件

```bash
pnpm test:e2e projects.spec.ts
pnpm test:e2e characters.spec.ts
```

### 使用 UI 模式运行（推荐开发时使用）

```bash
pnpm test:e2e:ui
```

### 调试模式

```bash
pnpm test:e2e:debug
```

## 测试结构

### 项目流程测试 (projects.spec.ts)

1. **项目列表页面**
   - 显示页面标题
   - 显示新建项目按钮
   - 点击跳转到创建页面
   - 搜索项目功能
   - 切换视图模式（网格/列表）
   - 筛选项目状态
   - 点击项目卡片跳转详情页

2. **新建项目页面**
   - 创建新项目
   - 验证必填字段
   - 步骤条导航

3. **项目详情页面**
   - 显示项目基本信息
   - 编辑项目信息
   - 取消编辑
   - 标签页切换

4. **删除项目流程**
   - 从列表页面删除
   - 从详情页面删除

### 角色流程测试 (characters.spec.ts)

1. **角色列表页面**
   - 显示页面标题
   - 显示新建角色按钮
   - 搜索角色功能
   - 切换视图模式
   - 按等级筛选
   - 按项目筛选
   - 点击角色卡片跳转详情页

2. **角色创建流程**
   - 通过角色库页面创建
   - 通过项目详情页创建

3. **角色筛选功能**
   - 组合使用多个筛选条件
   - 清除筛选条件

4. **角色列表视图模式**
   - 网格视图显示
   - 列表视图显示

5. **角色选择与批量操作**
   - 选择单个角色
   - 批量操作栏显示

6. **角色详情页面**
   - 显示角色详细信息

7. **角色删除流程**
   - 从列表删除角色

8. **空状态和错误处理**
   - 空状态显示
   - 搜索无结果处理

## 数据测试 ID

### 项目页面

- `data-testid="create-project-button"` - 创建项目按钮
- `data-testid="project-card"` - 项目卡片
- `data-testid="project-title"` - 项目标题
- `data-testid="delete-project-button"` - 删除项目按钮

### 角色页面

- `data-testid="create-character-button"` - 创建角色按钮
- `data-testid="character-card"` - 角色卡片
- `data-testid="character-list-item"` - 角色列表项
- `data-testid="character-name"` - 角色名称
- `data-testid="delete-character-button"` - 删除角色按钮

## 测试数据管理

测试使用 `[E2E测试]` 前缀来标识测试创建的数据，并在测试前后进行清理。

## 注意事项

1. 测试使用串行模式 (`mode: 'serial'`) 以避免测试数据冲突
2. 测试包含自动截图和视频录制（失败时）
3. 测试超时设置为 30 秒
4. 支持多浏览器测试（Chromium、Firefox、WebKit）
