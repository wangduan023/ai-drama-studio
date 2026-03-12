# 统一 RBAC 权限系统文档

## 概述

本系统实现了统一的基于角色的访问控制（RBAC），支持系统级和项目级两种权限范围。

## 核心概念

### 角色（Role）

角色是一组权限的集合，分为两种类型：

- **SYSTEM**: 系统级角色，全局有效
- **PROJECT**: 项目级角色，仅在特定项目内有效

### 权限（Permission）

权限由 `resource:action` 格式定义：

```
ai_key:create    - 创建 API Key
ai_key:read      - 读取 API Key
ai_key:update    - 更新 API Key
ai_key:delete    - 删除 API Key
project:manage   - 管理项目成员
episode:create   - 创建剧集
...
```

### 用户角色分配

#### 系统级角色

```
User --> UserSystemRole --> Role --> RolePermission --> Permission
```

#### 项目级角色

```
User --> ProjectMemberRole --> Role --> RolePermission --> Permission
                                    |
                                    +--> Project
```

## 默认角色

### 系统级角色

| 角色名 | 描述 | 默认权限 |
|--------|------|---------|
| SUPER_ADMIN | 超级管理员 | 所有权限 |
| ADMIN | 管理员 | 系统管理权限（除角色管理外） |
| USER | 普通用户 | 基本操作权限 |

### 项目级角色

| 角色名 | 描述 | 默认权限 |
|--------|------|---------|
| PROJECT_OWNER | 项目所有者 | 项目内所有权限 |
| PROJECT_ADMIN | 项目管理员 | 项目管理和编辑权限 |
| PROJECT_EDITOR | 编辑者 | 编辑权限（不能管理成员） |
| PROJECT_VIEWER | 查看者 | 只读权限 |

## API 使用

### 检查权限

```typescript
import { requirePermission, checkPermission } from '@/lib/rbac'

// 检查系统权限
const result = await requirePermission(request, 'ai_key', 'create')

// 检查项目权限
const result = await requirePermission(request, 'episode', 'create', projectId)

// 直接检查
const hasPerm = await checkPermission(userId, 'ai_key', 'update')
```

### HOF 包装器

```typescript
import { withPermission } from '@/lib/rbac'

export const POST = withPermission('ai_key', 'create', async (request, context) => {
  // 已验证权限，直接处理
  return NextResponse.json({ success: true })
})
```

## 初始化默认数据

```typescript
import { PermissionRepository, RoleRepository } from '@ai-drama-studio/db'

const permRepo = new PermissionRepository(prisma)
const roleRepo = new RoleRepository(prisma)

// 1. 初始化权限
await permRepo.initDefaultPermissions()

// 2. 创建系统角色
const adminRole = await roleRepo.create({
  name: 'ADMIN',
  type: 'SYSTEM',
  label: '管理员',
  description: '系统管理员',
  permissionIds: ['perm-1', 'perm-2', ...],
})

// 3. 分配角色给用户
await roleRepo.assignToUser(userId, adminRole.id)
```

## 权限列表

### AI 管理权限

| 资源 | 动作 | 描述 |
|------|------|------|
| ai_key | create | 创建密钥 |
| ai_key | read | 查看密钥 |
| ai_key | update | 更新密钥 |
| ai_key | delete | 删除密钥 |
| ai_key | test | 测试密钥 |
| ai_proxy | create | 创建代理 |
| ai_proxy | read | 查看代理 |
| ai_proxy | update | 更新代理 |
| ai_proxy | delete | 删除代理 |
| ai_proxy | test | 测试代理 |

### 项目管理权限

| 资源 | 动作 | 描述 |
|------|------|------|
| project | create | 创建项目 |
| project | read | 查看项目 |
| project | update | 更新项目 |
| project | delete | 删除项目 |
| project | manage | 管理项目成员 |
| episode | create | 创建剧集 |
| episode | read | 查看剧集 |
| episode | update | 更新剧集 |
| episode | delete | 删除剧集 |

## 与旧权限系统对比

| 特性 | 旧系统 | 新 RBAC 系统 |
|------|--------|-------------|
| 权限粒度 | 粗粒度（角色级别） | 细粒度（资源+动作） |
| 项目权限 | 硬编码 | 可配置 |
| 权限扩展 | 修改代码 | 数据库配置 |
| 多项目支持 | 有限 | 完整支持 |
| 审计能力 | 弱 | 强 |

## 迁移指南

从旧权限系统迁移：

```typescript
// 1. 初始化新权限
await permRepo.initDefaultPermissions()

// 2. 创建对应角色
await roleRepo.create({
  name: 'PROJECT_OWNER',
  type: 'PROJECT',
  label: '项目所有者',
  permissionIds: [...allProjectPermissions],
})

// 3. 迁移用户角色
const oldMembers = await prisma.projectMember.findMany()
for (const member of oldMembers) {
  await roleRepo.assignToProjectMember(
    member.projectId,
    member.userId,
    roleMap[member.role] // 映射旧角色到新角色
  )
}
```
