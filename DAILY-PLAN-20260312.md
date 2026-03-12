# 📋 今日开发计划 - 2026-03-12

> **日期**: 2026-03-12  
> **目标**: 完成 AI 密钥管理系统 + 代理管理系统  
> **预计工时**: **14 小时** (含详细测试 + 90% 覆盖率要求)

---

## 🎯 项目概述

构建完整的 AI 密钥管理和代理管理系统，支持：
- 单渠道多密钥配置
- 密钥功能支持标记（文字/图像/视频/语音）
- 智能负载均衡与故障转移
- HTTP/HTTPS/SOCKS5 代理管理
- 代理健康检查与自动切换
- **统一 RBAC 权限管理**（一套权限系统管理项目和 AI 管理功能）

> **🔄 架构升级**: 将现有的 `ProjectRole`（OWNER/EDITOR/VIEWER）**迁移**到统一 RBAC 系统，使用 `Role` + `Permission` 表管理所有权限，支持更细粒度的资源控制。

---

## 🔐 现有权限系统分析

### 1. 项目级权限（已存在）

**数据库模型**:
```prisma
enum ProjectRole {
  OWNER     // 项目所有者
  EDITOR    // 编辑者
  VIEWER    // 查看者
}

model ProjectMember {
  projectId String
  userId    String
  role      ProjectRole @default(VIEWER)
}
```

**使用场景**: 控制用户在**项目内**的权限
- 项目文件访问
- 剧集编辑
- 角色管理
- 成员邀请

**前端实现**:
- `useProjectPermissions()` Hook
- `<PermissionGuard projectId={id} />` 组件
- 位置: `apps/web/hooks/usePermissions.ts`, `components/permissions/PermissionGuard.tsx`

### 2. 系统级 RBAC 权限（本次新增）

**数据库模型**:
```prisma
model Role {
  id   String @id
  name String @unique  // ADMIN, MANAGER, VIEWER, OPERATOR
}

model Permission {
  id       String @id
  resource String  // ai_key, ai_proxy, ai_provider
  action   String  // create, read, update, delete
}

model RolePermission {
  roleId       String
  permissionId String
}

model UserRole {
  userId String
  roleId String
}
```

**使用场景**: 控制用户访问**AI 管理后台**功能
- 密钥管理
- 代理管理
- 渠道管理
- 系统配置

**前端实现**（新增）:
- `useSystemPermissions()` Hook
- `<SystemPermissionGuard resource="ai_key" action="create" />` 组件

### 3. 权限体系对比

| 维度 | 项目级权限 | 系统级 RBAC |
|------|-----------|------------|
| **范围** | 单个项目内 | 整个系统 |
| **模型** | ProjectRole (3角色) | Role + Permission (多角色+细粒度) |
| **粒度** | 角色级别 | 资源+操作级别 |
| **存储** | ProjectMember 表 | UserRole + RolePermission 表 |
| **Hook** | `useProjectPermissions()` | `useSystemPermissions()` (新增) |
| **Guard** | `<PermissionGuard projectId />` | `<SystemPermissionGuard />` (新增) |

### 4. 用户权限判断流程

```
用户访问 AI 管理后台
        │
        ▼
┌───────────────┐
│ 1. 登录检查    │  ← middleware.ts (已存在)
│    (JWT)      │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ 2. 系统权限检查 │  ← 本次新增
│   (RBAC)      │     检查 UserRole + Permission
└───────┬───────┘
        │ 有权限
        ▼
┌───────────────┐
│ 3. 页面渲染    │
│   + 组件级权限 │  ← SystemPermissionGuard
└───────────────┘
```

---

## 📊 任务列表

### Phase 1: 数据库模型 (2.5 小时) - 密钥默认绑定渠道 + 统一 RBAC 权限

| 序号 | 任务 | 状态 | 文件 |
|------|------|------|------|
| 1.1 | 扩展 `AiModel` 表（支持多模型功能标记） | ⬜ | `packages/db/prisma/schema.prisma` |
| 1.2 | 创建 `AiApiKey` 表模型（`modelId` 可选） | ⬜ | `packages/db/prisma/schema.prisma` |
| 1.3 | 扩展 `AiProxy` 表（增强字段） | ⬜ | `packages/db/prisma/schema.prisma` |
| 1.4 | 创建 `ProxyUsageLog` 日志表 | ⬜ | `packages/db/prisma/schema.prisma` |
| 1.5 | **创建统一 RBAC 权限表（Role/Permission/RolePermission）** | ⬜ | `packages/db/prisma/schema.prisma` |
| 1.6 | **创建用户角色关联表（UserRole）** | ⬜ | `packages/db/prisma/schema.prisma` |
| 1.7 | **创建项目成员角色关联表（ProjectMemberRole）** | ⬜ | `packages/db/prisma/schema.prisma` |
| 1.8 | 执行数据库迁移 | ⬜ | `npx prisma migrate dev` |

> **🔄 统一 RBAC**: 将 `ProjectRole` 迁移到 RBAC 系统，使用 `Permission` 表定义 `project:read`、`project:edit` 等细粒度权限，支持资源实例级授权（如特定项目）。

**模型要点**:

```
┌─────────────────────────────────────────────────────────────────┐
│                   渠道-模型-密钥 灵活绑定设计                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐         ┌─────────────┐                       │
│   │ AiProvider  │◄────────┤  AiModel    │                       │
│   │   渠道      │  1:N    │    模型     │                       │
│   └──────┬──────┘         └─────────────┘                       │
│          │                                                       │
│          │ 1:N 【默认】渠道通用密钥                                │
│          ▼                                                       │
│   ┌─────────────┐                                                │
│   │  AiApiKey   │◄──────── 可选绑定到模型 (特殊场景)               │
│   │  通用密钥   │                                                │
│   └─────────────┘                                                │
│                                                                 │
│   OpenAI (渠道)                                                  │
│   ├── gpt-4o (模型) - [TEXT, IMAGE]                             │
│   ├── dall-e-3 (模型) - [IMAGE]                                 │
│   └── tts-1 (模型) - [VOICE]                                    │
│                                                                 │
│   密钥配置示例:                                                   │
│   • sk-xxx1 ──────► 【渠道通用】可用于 OpenAI 任意模型            │
│   • sk-xxx2 ──────► 【绑定 gpt-4o】仅用于 gpt-4o                 │
│   • sk-xxx3 ──────► 【渠道通用 + 限制 IMAGE】仅用于图像模型        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**核心关系**:
- `AiProvider` (渠道) 1:N `AiModel` (模型) - 一个渠道有多个模型
- `AiProvider` (渠道) 1:N `AiApiKey` (密钥) - 一个渠道有多个密钥（默认）
- `AiModel` (模型) 1:N `AiApiKey` (密钥) - 一个模型可有多个专用密钥（可选）
- `AiApiKey` 可选关联到 `AiModel`，`modelId` 为 null 时表示渠道通用密钥
- `AiModel` 通过 `capabilities` 标记功能，密钥可继承或自定义

**统一 RBAC 权限模型**:

```prisma
/// 角色表（系统级角色）
model Role {
  id          String    @id @default(uuid())
  name        String    @unique    // SUPER_ADMIN, ADMIN, USER
  label       String                // 显示名称
  description String?
  isSystem    Boolean   @default(false)  // 系统角色不可删除
  createdAt   DateTime  @default(now())
  
  // 关联
  permissions RolePermission[]
  userRoles   UserRole[]
  projectMemberRoles ProjectMemberRole[]
  
  @@map("roles")
}

/// 权限表（资源+操作粒度）
model Permission {
  id          String    @id @default(uuid())
  resource    String              // ai_key, ai_proxy, project, episode, character
  action      String              // create, read, update, delete, test, manage
  name        String    @unique   // ai_key:create, project:delete
  description String?
  createdAt   DateTime  @default(now())
  
  // 关联
  roles       RolePermission[]
  
  @@unique([resource, action])
  @@map("permissions")
}

/// 角色-权限关联
model RolePermission {
  id           String     @id @default(uuid())
  roleId       String
  permissionId String
  
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  
  @@unique([roleId, permissionId])
  @@map("role_permissions")
}

/// 用户-系统角色关联（全局角色）
model UserRole {
  id     String @id @default(uuid())
  userId String
  roleId String
  
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   Role   @relation(fields: [roleId], references: [id], onDelete: Cascade)
  
  @@unique([userId, roleId])
  @@map("user_roles")
}

/// 项目成员-角色关联（项目级角色，替代原有 ProjectMember.role 字段）
model ProjectMemberRole {
  id        String @id @default(uuid())
  projectId String
  userId    String
  roleId    String
  
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      Role    @relation(fields: [roleId], references: [id], onDelete: Cascade)
  
  @@unique([projectId, userId])
  @@map("project_member_roles")
}
```

**预定义角色与权限**:

| 角色 | 类型 | 权限 | 说明 |
|------|------|------|------|
| **SUPER_ADMIN** | 系统 | `*`（所有权限） | 超级管理员 |
| **ADMIN** | 系统 | `ai_key:*`, `ai_proxy:*`, `ai_provider:*` | AI 管理员 |
| **AI_VIEWER** | 系统 | `ai_key:read`, `ai_proxy:read` | AI 只读 |
| **PROJECT_OWNER** | 项目 | `project:*`, `episode:*`, `character:*` | 项目所有者 |
| **PROJECT_EDITOR** | 项目 | `project:read,update`, `episode:*` | 项目编辑者 |
| **PROJECT_VIEWER** | 项目 | `project:read`, `episode:read` | 项目查看者 |

**权限检查逻辑**:
```typescript
// 统一权限检查（系统级 + 项目级）
async function checkPermission(
  userId: string,
  resource: string,
  action: string,
  resourceId?: string  // 可选：特定资源实例ID
): Promise<boolean> {
  
  // 1. 检查系统级权限
  const systemRoles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } }
  })
  
  for (const userRole of systemRoles) {
    for (const rp of userRole.role.permissions) {
      if (rp.permission.resource === resource && rp.permission.action === action) {
        return true
      }
    }
  }
  
  // 2. 检查项目级权限（如果 resourceId 是项目ID）
  if (resourceId) {
    const projectRole = await prisma.projectMemberRole.findFirst({
      where: { projectId: resourceId, userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } }
    })
    
    if (projectRole) {
      for (const rp of projectRole.role.permissions) {
        if (rp.permission.resource === resource && rp.permission.action === action) {
          return true
        }
      }
    }
  }
  
  return false
}

// 使用示例
await checkPermission(userId, 'ai_key', 'create')           // 系统级
await checkPermission(userId, 'episode', 'create', 'proj-1') // 项目级
```

**模型设计详情**:

```prisma
/// AI 模型配置（增强版）
model AiModel {
  id            String         @id @default(uuid())
  providerId    String
  modelId       String         // 厂商模型ID，如 gpt-4o, dall-e-3
  name          String         // 显示名称
  
  // 功能支持（可多选）
  capabilities  ModelCapability[] // [TEXT, IMAGE] 或 [VIDEO] 等
  
  // 原有字段保留...
  isEnabled     Boolean        @default(true)
  isDefault     Boolean        @default(false)
  maxTokens     Int?
  contextWindow Int?
  inputCost     Float?
  outputCost     Float?
  imageCost     Float?
  videoCost     Float?
  voiceCost     Float?         // 新增语音成本
  currency      String         @default("USD")
  
  // 关联
  provider      AiProvider     @relation(fields: [providerId], references: [id], onDelete: Cascade)
  apiKeys       AiApiKey[]     // 关联的专用密钥列表（可选）
  
  @@unique([providerId, modelId])
  @@index([capabilities])
  @@map("ai_models")
}

/// 模型功能支持枚举（可多选）
enum ModelCapability {
  TEXT    // 文字生成
  IMAGE   // 图像生成
  VIDEO   // 视频生成
  VOICE   // 语音合成
  CHAT    // 对话能力
  VISION  // 视觉理解
}

/// AI 密钥（默认绑定渠道，可选绑定模型）
model AiApiKey {
  id              String    @id @default(uuid())
  providerId      String    // 必须绑定到渠道
  modelId         String?   // 【可选】绑定到具体模型，null 表示渠道通用密钥
  
  name            String    // 密钥名称
  apiKey          String    // 加密存储
  apiSecret       String?   // 部分厂商需要
  
  // 【新增】密钥自身的功能支持（覆盖或补充模型功能）
  capabilities    ModelCapability[]?  // null 表示使用模型功能或渠道通用
  
  // 状态配置
  isActive        Boolean   @default(true)
  priority        Int       @default(0)
  weight          Int       @default(1)
  
  // 配额管理
  quotaDaily      Int?
  quotaUsed       Int       @default(0)
  quotaResetAt    DateTime?
  
  // 使用统计
  successCount    Int       @default(0)
  failCount       Int       @default(0)
  lastUsedAt      DateTime?
  
  // 代理配置
  proxyMode       ProxyMode @default(AUTO)
  proxyId         String?
  
  // 关联
  provider        AiProvider @relation(fields: [providerId], references: [id])
  model           AiModel?   @relation(fields: [modelId], references: [id])  // 可选关联
  proxy           AiProxy?   @relation(fields: [proxyId], references: [id])
  
  @@index([providerId])
  @@index([modelId])
  @@index([isActive])
  @@index([providerId, isActive])
  @@index([providerId, modelId, isActive])
  @@map("ai_api_keys")
}
```

**密钥绑定规则**:

| 场景 | modelId | capabilities | 说明 |
|------|---------|--------------|------|
| **渠道通用密钥** | `null` | `null` | 可用于该渠道的任意模型，功能由调用时指定 |
| **渠道通用密钥(带功能限制)** | `null` | `[TEXT, IMAGE]` | 可用于该渠道，但仅限于指定功能 |
| **模型专用密钥** | `model-id` | `null` | 仅用于指定模型，功能继承自模型 |
| **模型专用密钥(覆盖功能)** | `model-id` | `[TEXT]` | 仅用于指定模型，但功能被限制为 TEXT |

---

### Phase 2: Repository 层 (1.5 小时)

| 序号 | 任务 | 状态 | 文件 |
|------|------|------|------|
| 2.1 | 创建 `AiApiKeyRepository` | ⬜ | `packages/db/src/repositories/ai-api-key.repository.ts` |
| 2.2 | 创建 `AiProxyRepository`（增强） | ⬜ | `packages/db/src/repositories/proxy.repository.ts` |
| 2.3 | 导出 Repository | ⬜ | `packages/db/src/repositories/index.ts` |

**Repository 功能**:
- `AiApiKeyRepository`: CRUD, 按功能查询, 配额管理, 使用统计
- `AiProxyRepository`: 健康检查更新, 使用统计, 负载查询

---

### Phase 3: API 路由层 (2 小时)

#### 3.1 AI 密钥 API

| 序号 | 端点 | 方法 | 功能 | 权限要求 | 状态 |
|------|------|------|------|----------|------|
| 3.1.1 | `/api/ai-keys` | GET | 获取密钥列表 | `ai_key:read` | ⬜ |
| 3.1.2 | `/api/ai-keys` | POST | 创建新密钥 | `ai_key:create` | ⬜ |
| 3.1.3 | `/api/ai-keys/[id]` | GET | 获取密钥详情 | `ai_key:read` | ⬜ |
| 3.1.4 | `/api/ai-keys/[id]` | PUT | 更新密钥 | `ai_key:update` | ⬜ |
| 3.1.5 | `/api/ai-keys/[id]` | DELETE | 删除密钥 | `ai_key:delete` | ⬜ |
| 3.1.6 | `/api/ai-keys/[id]/toggle` | POST | 启用/禁用密钥 | `ai_key:update` | ⬜ |
| 3.1.7 | `/api/ai-keys/[id]/reset-quota` | POST | 重置配额 | `ai_key:update` | ⬜ |
| 3.1.8 | `/api/ai-keys/[id]/test` | POST | 测试密钥连通性 | `ai_key:test` | ⬜ |

**文件位置**: `apps/web/app/api/ai-keys/**/route.ts`

**统一 RBAC 权限检查示例**:
```typescript
// lib/rbac/index.ts

export async function checkPermission(
  userId: string,
  resource: string,
  action: string,
  resourceId?: string
): Promise<boolean> {
  // SUPER_ADMIN 直接放行
  const isSuperAdmin = await prisma.userRole.findFirst({
    where: { userId, role: { name: 'SUPER_ADMIN' } }
  })
  if (isSuperAdmin) return true
  
  // 1. 检查系统级权限
  const hasSystemPermission = await prisma.rolePermission.findFirst({
    where: {
      role: { userRoles: { some: { userId } } },
      permission: { resource, action }
    }
  })
  if (hasSystemPermission) return true
  
  // 2. 检查项目级权限（如果提供了 resourceId）
  if (resourceId && resource.startsWith('project') || 
      ['episode', 'character', 'location'].includes(resource)) {
    const hasProjectPermission = await prisma.rolePermission.findFirst({
      where: {
        role: { projectMemberRoles: { some: { projectId: resourceId, userId } } },
        permission: { resource, action }
      }
    })
    if (hasProjectPermission) return true
  }
  
  return false
}

// API 路由中使用
// app/api/ai-keys/route.ts
export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const permitted = await checkPermission(user.id, 'ai_key', 'create')
  if (!permitted) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // 继续处理...
}

// 项目 API 中使用
// app/api/projects/[id]/route.ts
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const permitted = await checkPermission(user.id, 'project', 'update', params.id)
  if (!permitted) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  
  // 继续处理...
}
```

#### 3.2 AI 代理 API

| 序号 | 端点 | 方法 | 功能 | 权限要求 | 状态 |
|------|------|------|------|----------|------|
| 3.2.1 | `/api/ai-proxies` | GET | 获取代理列表 | `ai_proxy:read` | ⬜ |
| 3.2.2 | `/api/ai-proxies` | POST | 创建代理 | `ai_proxy:create` | ⬜ |
| 3.2.3 | `/api/ai-proxies/[id]` | GET | 获取代理详情 | `ai_proxy:read` | ⬜ |
| 3.2.4 | `/api/ai-proxies/[id]` | PUT | 更新代理 | `ai_proxy:update` | ⬜ |
| 3.2.5 | `/api/ai-proxies/[id]` | DELETE | 删除代理 | `ai_proxy:delete` | ⬜ |
| 3.2.6 | `/api/ai-proxies/[id]/toggle` | POST | 启用/禁用代理 | `ai_proxy:update` | ⬜ |
| 3.2.7 | `/api/ai-proxies/[id]/test` | POST | 测试代理连通性 | `ai_proxy:test` | ⬜ |
| 3.2.8 | `/api/ai-proxies/[id]/health` | GET | 获取健康状态 | `ai_proxy:read` | ⬜ |

**文件位置**: `apps/web/app/api/ai-proxies/**/route.ts`

#### 3.3 权限管理 API

| 序号 | 端点 | 方法 | 功能 | 权限要求 | 状态 |
|------|------|------|------|----------|------|
| 3.3.1 | `/api/admin/roles` | GET | 获取角色列表 | `admin:read` | ⬜ |
| 3.3.2 | `/api/admin/roles` | POST | 创建角色 | `admin:create` | ⬜ |
| 3.3.3 | `/api/admin/roles/[id]` | PUT | 更新角色 | `admin:update` | ⬜ |
| 3.3.4 | `/api/admin/roles/[id]` | DELETE | 删除角色 | `admin:delete` | ⬜ |
| 3.3.5 | `/api/admin/permissions` | GET | 获取权限列表 | `admin:read` | ⬜ |
| 3.3.6 | `/api/admin/users/[id]/roles` | GET | 获取用户角色 | `admin:read` | ⬜ |
| 3.3.7 | `/api/admin/users/[id]/roles` | POST | 分配用户角色 | `admin:update` | ⬜ |
| 3.3.8 | `/api/admin/check-permission` | POST | 检查当前用户权限 | 登录即可 | ⬜ |

**文件位置**: `apps/web/app/api/admin/**/route.ts`

**权限检查中间件**:
```typescript
// 统一权限检查装饰器
function requirePermission(resource: string, action: string) {
  return async (request: NextRequest) => {
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const hasPermission = await checkUserPermission(user.id, resource, action)
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return null // 检查通过
  }
}

// 使用示例
export async function POST(request: NextRequest) {
  // 1. 权限检查
  const permissionError = await requirePermission('ai_key', 'create')(request)
  if (permissionError) return permissionError
  
  // 2. 执行业务逻辑
  ...
}
```

---

### Phase 4: AI Client 集成 (1.5 小时)

| 序号 | 任务 | 状态 | 文件 |
|------|------|------|------|
| 4.1 | 更新 `ConfigManager` 支持多密钥 | ⬜ | `packages/ai-client/src/config/manager.ts` |
| 4.2 | 实现密钥选择器（负载均衡） | ⬜ | `packages/ai-client/src/key-selector.ts` |
| 4.3 | 实现代理选择器 | ⬜ | `packages/ai-client/src/proxy-selector.ts` |
| 4.4 | 集成故障转移机制 | ⬜ | `packages/ai-client/src/failover.ts` |
| 4.5 | 更新工厂方法 | ⬜ | `packages/ai-client/src/factory.ts` |

**核心算法**:
- 密钥选择: 优先级 + 加权轮询
- 代理选择: 延迟优先 + 负载均衡
- 故障转移: 自动切换备用密钥/代理

---

### Phase 5: 前端组件 - AI 密钥管理 (2 小时)

| 序号 | 任务 | 状态 | 文件 |
|------|------|------|------|
| 5.1 | 创建密钥列表页面（通用/专用筛选） | ⬜ | `apps/web/app/(admin)/ai-keys/page.tsx` |
| 5.2 | 创建密钥表单组件（可选绑定模型） | ⬜ | `apps/web/components/ai-keys/ai-key-form.tsx` |
| 5.3 | 创建密钥卡片组件（显示关联模型） | ⬜ | `apps/web/components/ai-keys/ai-key-card.tsx` |
| 5.4 | 创建模型选择器组件（可选绑定，默认不选） | ⬜ | `apps/web/components/ai-keys/model-selector.tsx` |
| 5.5 | 创建功能标签组件 | ⬜ | `apps/web/components/ai-keys/capability-badges.tsx` |
| 5.6 | 创建配额进度条组件 | ⬜ | `apps/web/components/ai-keys/quota-progress.tsx` |
| 5.7 | 创建新建/编辑页面 | ⬜ | `apps/web/app/(admin)/ai-keys/new/page.tsx` |
| 5.8 | 创建详情页面（显示通用/专用状态） | ⬜ | `apps/web/app/(admin)/ai-keys/[id]/page.tsx` |

**UI 要点**:
- 列表视图: 表格 + 卡片双模式
- 功能标签: 📝文字 🖼️图像 🎬视频 🔊语音
- 配额显示: 进度条 + 百分比
- 状态指示: 🟢正常 🟠告警 🔴禁用

---

### Phase 6: 前端组件 - AI 代理管理 (2 小时)

| 序号 | 任务 | 状态 | 文件 |
|------|------|------|------|
| 6.1 | 创建代理列表页面 | ⬜ | `apps/web/app/(admin)/ai-proxies/page.tsx` |
| 6.2 | 创建代理表单组件 | ⬜ | `apps/web/components/ai-proxies/proxy-form.tsx` |
| 6.3 | 创建代理卡片组件 | ⬜ | `apps/web/components/ai-proxies/proxy-card.tsx` |
| 6.4 | 创建健康状态组件 | ⬜ | `apps/web/components/ai-proxies/health-status.tsx` |
| 6.5 | 创建延迟图表组件 | ⬜ | `apps/web/components/ai-proxies/latency-chart.tsx` |
| 6.6 | 创建新建/编辑页面 | ⬜ | `apps/web/app/(admin)/ai-proxies/new/page.tsx` |
| 6.7 | 创建详情页面 | ⬜ | `apps/web/app/(admin)/ai-proxies/[id]/page.tsx` |
| 6.8 | 代理选择器（用于密钥表单） | ⬜ | `apps/web/components/ai-proxies/proxy-selector.tsx` |

**UI 要点**:
- 列表视图: 支持列表/地图双视图切换
- 健康状态: 🟢健康 🟠告警 🔴故障 ⚪禁用
- 延迟显示: 实时数值 + 趋势图表
- 位置信息: 国旗/地区标识

---

### Phase 7: 导航与布局 (0.5 小时) - 管理后台设计

#### 7.1 整体布局架构

```
┌─────────────────────────────────────────────────────────────────────┐
│  Admin Layout                                                        │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  TopBar (顶部栏)                                               │ │
│  │  ┌────────────┐ ┌────────────────────────┐ ┌───────────────┐ │ │
│  │  │ Logo       │ │ Breadcrumbs (面包屑)   │ │ User Actions  │ │ │
│  │  │ AI Studio  │ │ 管理 / 密钥管理 / 列表  │ │ 👤 Logout     │ │ │
│  │  └────────────┘ └────────────────────────┘ └───────────────┘ │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │                                                                │ │
│  │  ┌──────────┐  ┌───────────────────────────────────────────┐  │ │
│  │  │          │  │                                           │  │ │
│  │  │ Sidebar  │  │              Main Content                 │  │ │
│  │  │ (侧边栏) │  │           (动态加载页面内容)               │  │ │
│  │  │          │  │                                           │  │ │
│  │  │ 🔑 密钥  │  │  ┌─────────────────────────────────────┐  │  │ │
│  │  │ 🌐 代理  │  │  │         Page Header                 │  │  │ │
│  │  │ 🤖 渠道  │  │  │  Title + Actions                    │  │  │ │
│  │  │ 📊 统计  │  │  └─────────────────────────────────────┘  │  │ │
│  │  │          │  │                                           │  │ │
│  │  │ ─────────│  │  ┌─────────────────────────────────────┐  │  │ │
│  │  │ Settings │  │  │         Content Area                │  │  │ │
│  │  │ ⚙️ 系统  │  │  │  Tables / Forms / Cards             │  │  │ │
│  │  │          │  │  └─────────────────────────────────────┘  │  │ │
│  │  └──────────┘  └───────────────────────────────────────────┘  │ │
│  │                                                                │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

#### 7.2 任务清单

| 序号 | 任务 | 详细说明 | 状态 | 文件 |
|------|------|----------|------|------|
| 7.1 | 管理后台布局 | 创建 (admin) 路由组布局，含 Sidebar + TopBar + MainContent | ⬜ | `app/(admin)/layout.tsx` |
| 7.2 | 侧边栏组件 | 可折叠、子菜单、激活状态、**基于 RBAC 权限显示菜单项** | ⬜ | `components/layout/admin-sidebar.tsx` |
| 7.3 | 顶部栏组件 | Logo、面包屑、全局搜索、用户菜单、通知 | ⬜ | `components/layout/admin-topbar.tsx` |
| 7.4 | 面包屑导航 | 自动生成、支持自定义、点击返回 | ⬜ | `components/layout/breadcrumbs.tsx` |
| 7.5 | **统一权限 Hook** | `useRBAC()` Hook（替换 useProjectPermissions） | ⬜ | `hooks/use-rbac.ts` |
| 7.6 | **权限控制组件** | `<RBACGuard resource="" action="" />` 组件 | ⬜ | `components/rbac-guard.tsx` |
| 7.7 | 路由守卫 | 统一 RBAC 权限检查、未授权跳转、登录状态检测 | ⬜ | `middleware.ts` |
| 7.8 | 响应式适配 | 移动端侧边栏收起、触控适配 | ⬜ | `components/layout/admin-layout.tsx` |

#### 7.3 侧边栏导航设计（统一 RBAC）

**导航结构**:
```typescript
const navItems = [
  {
    group: "项目",
    items: [
      {
        id: "projects",
        label: "我的项目",
        icon: "📁",
        href: "/projects",
        requiredPermission: { resource: "project", action: "read" }
      },
      {
        id: "episodes",
        label: "剧集管理",
        icon: "🎬",
        href: "/episodes",
        requiredPermission: { resource: "episode", action: "read" },
        context: "project"  // 需要项目上下文
      }
    ]
  },
  {
    group: "AI 管理",
    items: [
      {
        id: "ai-keys",
        label: "密钥管理",
        icon: "🔑",
        href: "/ai-keys",
        badge: { count: 24, color: "blue" },
        requiredPermission: { resource: "ai_key", action: "read" }
      },
      {
        id: "ai-proxies",
        label: "代理管理",
        icon: "🌐",
        href: "/ai-proxies",
        badge: { count: 8, color: "green" },
        requiredPermission: { resource: "ai_proxy", action: "read" }
      },
      {
        id: "ai-providers",
        label: "渠道管理",
        icon: "🤖",
        href: "/ai-providers",
        requiredPermission: { resource: "ai_provider", action: "read" }
      }
    ]
  },
  {
    group: "系统",
    items: [
      {
        id: "roles",
        label: "角色权限",
        icon: "🔐",
        href: "/admin/roles",
        requiredPermission: { resource: "role", action: "read" }
      }
    ]
  }
]
```

**统一权限过滤逻辑**:
```typescript
// hooks/use-rbac.ts
export function useRBAC() {
  const { user } = useAuth()
  
  const { data: permissions } = useQuery({
    queryKey: ['rbac', 'permissions'],
    queryFn: async () => {
      const res = await fetch('/api/rbac/my-permissions')
      return res.json()  // { system: [...], projects: { 'proj-1': [...] } }
    }
  })
  
  const checkPermission = useCallback((
    resource: string, 
    action: string, 
    contextId?: string
  ): boolean => {
    // 1. 检查系统级权限
    if (permissions?.system?.some(p => p.resource === resource && p.action === action)) {
      return true
    }
    // 2. 检查上下文权限（如项目）
    if (contextId && permissions?.contexts?.[contextId]?.some(
      p => p.resource === resource && p.action === action
    )) {
      return true
    }
    return false
  }, [permissions])
  
  return { checkPermission, permissions }
}

// 导航过滤
function filterNavByRBAC(navItems: NavItem[]): NavItem[] {
  const { checkPermission } = useRBAC()
  
  return navItems
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (!item.requiredPermission) return true
        return checkPermission(
          item.requiredPermission.resource,
          item.requiredPermission.action
        )
      })
    }))
    .filter(group => group.items.length > 0)
}
```

**侧边栏交互**:
- 可折叠/展开（记忆用户偏好，存 localStorage）
- 子菜单支持（最多两级）
- 当前页面高亮
- 悬停显示 Tooltip（收起状态时）
- 底部显示系统版本

#### 7.4 面包屑导航设计

```typescript
// 面包屑配置映射
const breadcrumbMap: Record<string, BreadcrumbItem[]> = {
  "/ai-keys": [
    { label: "管理", href: null },
    { label: "密钥管理", href: "/ai-keys" }
  ],
  "/ai-keys/new": [
    { label: "管理", href: null },
    { label: "密钥管理", href: "/ai-keys" },
    { label: "新建密钥", href: null }
  ],
  "/ai-keys/[id]/edit": [
    { label: "管理", href: null },
    { label: "密钥管理", href: "/ai-keys" },
    { label: "编辑密钥", href: null }  // 动态显示密钥名称
  ],
  "/ai-proxies": [
    { label: "管理", href: null },
    { label: "代理管理", href: "/ai-proxies" }
  ]
}
```

**面包屑 UI**:
```
管理 / 密钥管理 / 编辑密钥
       ↑ 可点击      ↑ 当前页（不可点）
```

#### 7.7 统一 RBAC 路由守卫

```typescript
// middleware.ts
import { checkPermission } from '@/lib/rbac'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method
  
  // 1. 检查登录状态（所有受保护路由）
  const token = request.cookies.get('auth-token')
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login?redirect=' + pathname, request.url))
  }
  
  // 2. 验证 Token
  const user = await verifyToken(token.value)
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // 3. 获取路由所需权限
  const required = getRoutePermission(pathname, method)
  if (!required) {
    return NextResponse.next()  // 无需特殊权限
  }
  
  // 4. 统一 RBAC 权限检查
  const permitted = await checkPermission(
    user.id,
    required.resource,
    required.action,
    required.resourceId  // 可能包含项目ID等上下文
  )
  
  if (!permitted) {
    if (request.headers.get('Accept')?.includes('application/json')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/403', request.url))
  }
  
  return NextResponse.next()
}

// 统一路由权限映射（系统级 + 项目级）
function getRoutePermission(
  pathname: string, 
  method: string
): { resource: string, action: string, resourceId?: string } | null {
  
  // AI 管理权限（系统级）
  if (pathname.startsWith('/api/ai-keys')) {
    return {
      resource: 'ai_key',
      action: method === 'GET' ? 'read' : 
              method === 'POST' ? 'create' :
              method === 'PUT' ? 'update' : 'delete'
    }
  }
  
  if (pathname.startsWith('/ai-keys')) {
    return { resource: 'ai_key', action: 'read' }
  }
  
  // 项目权限（项目级，从路径提取 projectId）
  const projectMatch = pathname.match(/\/projects\/([^\/]+)/)
  if (projectMatch) {
    const projectId = projectMatch[1]
    
    if (pathname.includes('/episodes')) {
      return {
        resource: 'episode',
        action: method === 'GET' ? 'read' : method === 'POST' ? 'create' : 'update',
        resourceId: projectId
      }
    }
    
    return {
      resource: 'project',
      action: method === 'GET' ? 'read' : method === 'DELETE' ? 'delete' : 'update',
      resourceId: projectId
    }
  }
  
  return null
}

export const config = {
  matcher: [
    '/projects/:path*',
    '/ai-keys/:path*',
    '/api/:path*'
  ]
}
```

#### 7.5 前端权限控制 Hook 与组件

**useRBAC Hook（统一权限）**:
```typescript
// hooks/use-rbac.ts

interface UseRBACOptions {
  projectId?: string  // 项目上下文（可选）
}

export function useRBAC(options: UseRBACOptions = {}) {
  const { projectId } = options
  
  // 获取用户权限（系统级 + 项目级）
  const { data: permissions } = useQuery({
    queryKey: ['rbac', 'permissions', projectId],
    queryFn: async () => {
      const url = projectId 
        ? `/api/rbac/permissions?projectId=${projectId}`
        : '/api/rbac/permissions'
      const res = await fetch(url)
      return res.json()  // [{ resource, action }, ...]
    }
  })
  
  // 统一权限检查
  const checkPermission = useCallback((
    resource: string, 
    action: string
  ): boolean => {
    if (!permissions) return false
    
    // SUPER_ADMIN 检查（通配符）
    if (permissions.some(p => p.resource === '*' && p.action === '*')) {
      return true
    }
    
    return permissions.some(p => 
      p.resource === resource && p.action === action
    )
  }, [permissions])
  
  // 快捷方法
  const can = useCallback((resource: string, action: string) => {
    return checkPermission(resource, action)
  }, [checkPermission])
  
  return { 
    checkPermission, 
    can,
    permissions,
    isLoading: !permissions 
  }
}
```

**RBACGuard 组件（统一权限守卫）**:
```typescript
// components/rbac-guard.tsx

interface RBACGuardProps {
  resource: string
  action: string
  projectId?: string  // 项目上下文（可选）
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RBACGuard({ 
  resource, 
  action, 
  projectId,
  children, 
  fallback = null 
}: RBACGuardProps) {
  const { checkPermission, isLoading } = useRBAC({ projectId })
  
  if (isLoading) {
    return <Loading />
  }
  
  if (!checkPermission(resource, action)) {
    return fallback
  }
  
  return <>{children}</>
}

// 使用示例（AI 管理 - 系统级权限）
function AiKeyListPage() {
  return (
    <div>
      <h1>密钥管理</h1>
      
      <RBACGuard resource="ai_key" action="create">
        <Button>+ 新建密钥</Button>
      </RBACGuard>
      
      <RBACGuard resource="ai_key" action="read" fallback={<NoPermission />}>
        <KeyTable />
      </RBACGuard>
    </div>
  )
}

// 使用示例（项目管理 - 项目级权限）
function ProjectPage({ projectId }: { projectId: string }) {
  return (
    <div>
      <RBACGuard resource="project" action="update" projectId={projectId}>
        <EditButton />
      </RBACGuard>
      
      <RBACGuard resource="episode" action="create" projectId={projectId}>
        <NewEpisodeButton />
      </RBACGuard>
    </div>
  )
}
```

**RBACButton 权限按钮组件**:
```typescript
// components/rbac-button.tsx

interface RBACButtonProps extends ButtonProps {
  resource: string
  action: string
  projectId?: string
  hideWhenNoPermission?: boolean
}

export function RBACButton({ 
  resource, 
  action, 
  projectId,
  hideWhenNoPermission = false,
  ...buttonProps 
}: RBACButtonProps) {
  const { can } = useRBAC({ projectId })
  const permitted = can(resource, action)
  
  if (!permitted && hideWhenNoPermission) {
    return null
  }
  
  return (
    <Button 
      {...buttonProps} 
      disabled={!permitted || buttonProps.disabled}
      title={!permitted ? '没有权限执行此操作' : buttonProps.title}
    />
  )
}

// 使用示例（系统级）
<RBACButton resource="ai_key" action="delete" hideWhenNoPermission>
  删除密钥
</RBACButton>

// 使用示例（项目级）
<RBACButton resource="episode" action="delete" projectId={projectId} hideWhenNoPermission>
  删除剧集
</RBACButton>
```

#### 7.6 响应式布局设计

**桌面端 (≥1024px)**:
- 侧边栏固定宽度 260px
- 主内容区自适应

**平板端 (768px - 1023px)**:
- 侧边栏可折叠为图标模式（宽度 80px）
- 点击展开悬浮菜单

**移动端 (<768px)**:
- 侧边栏完全隐藏
- 点击汉堡菜单从左侧滑出
- 主内容区全宽

```typescript
// 响应式断点
const breakpoints = {
  mobile: 768,      // < 768px
  tablet: 1024,     // 768px - 1024px
  desktop: 1024     // ≥ 1024px
}

// 侧边栏状态
const sidebarState = {
  desktop: 'expanded',   // expanded | collapsed
  tablet: 'collapsed',   // 默认收起
  mobile: 'hidden'       // 默认隐藏
}
```

#### 7.7 页面加载状态

```
┌─────────────────────────────────────────┐
│  密钥管理                     [+ 新建]  │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │     ⏳ 加载中...                │   │
│  │                                 │   │
│  │     ████████████░░░░  80%      │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

#### 7.8 错误状态处理

```
┌─────────────────────────────────────────┐
│  密钥管理                     [+ 新建]  │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │     ❌ 加载失败                 │   │
│  │                                 │   │
│  │     无法连接到服务器            │   │
│  │                                 │   │
│  │     [重新加载]                  │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

#### 7.9 文件结构

```
app/
├── (admin)/                    # 管理后台路由组
│   ├── layout.tsx              # 管理后台布局
│   ├── page.tsx                # 管理后台首页（重定向到密钥管理）
│   ├── ai-keys/
│   ├── ai-proxies/
│   ├── ai-providers/
│   └── ai-analytics/
│
components/
└── layout/
    ├── admin-layout.tsx        # 管理后台整体布局
    ├── admin-sidebar.tsx       # 侧边栏导航
    ├── admin-topbar.tsx        # 顶部栏
    ├── breadcrumbs.tsx         # 面包屑导航
    ├── sidebar-nav-item.tsx    # 导航项组件
    └── mobile-nav.tsx          # 移动端导航抽屉
│
middleware.ts                   # 路由守卫
│
lib/
└── navigation/
    ├── admin-nav.ts            # 导航配置
    └── breadcrumbs.ts          # 面包屑工具函数
```

---

### Phase 8: 测试与验证 (3.5 小时) - 目标覆盖率 90%

#### 8.1 单元测试 (1.5 小时) - 目标 95% 覆盖率

| 序号 | 测试对象 | 测试用例 | 覆盖目标 | 状态 | 文件 |
|------|----------|----------|----------|------|------|
| 8.1.1 | AiApiKeyRepository | 创建密钥(通用/专用/重复名/空密钥) | 100% | ⬜ | `packages/db/__tests__/ai-api-key.repository.test.ts` |
| 8.1.2a | **RoleRepository** | **创建角色、分配权限** | **100%** | ⬜ | `packages/db/__tests__/role.repository.test.ts` |
| 8.1.2b | **PermissionRepository** | **查询权限、检查用户权限** | **100%** | ⬜ | `packages/db/__tests__/permission.repository.test.ts` |
| 8.1.2 | AiApiKeyRepository | 查询(按ID/按渠道/按模型null/按功能筛选) | 100% | ⬜ | `packages/db/__tests__/ai-api-key.repository.test.ts` |
| 8.1.3 | AiApiKeyRepository | 更新(全部字段/部分字段/不存在ID) | 100% | ⬜ | `packages/db/__tests__/ai-api-key.repository.test.ts` |
| 8.1.4 | AiApiKeyRepository | 配额管理(增加/重置/超限/无限制) | 100% | ⬜ | `packages/db/__tests__/ai-api-key.repository.test.ts` |
| 8.1.5 | AiApiKeyRepository | 统计记录(成功/失败/错误信息) | 100% | ⬜ | `packages/db/__tests__/ai-api-key.repository.test.ts` |
| 8.1.6 | AiApiKeyRepository | 删除与软删除 | 100% | ⬜ | `packages/db/__tests__/ai-api-key.repository.test.ts` |
| 8.1.7 | AiProxyRepository | 代理 CRUD(所有协议类型) | 100% | ⬜ | `packages/db/__tests__/proxy.repository.test.ts` |
| 8.1.8 | AiProxyRepository | 健康检查更新(正常/故障/恢复) | 100% | ⬜ | `packages/db/__tests__/proxy.repository.test.ts` |
| 8.1.9 | AiProxyRepository | 并发控制(增加/减少/超限) | 100% | ⬜ | `packages/db/__tests__/proxy.repository.test.ts` |
| 8.1.10 | KeySelector | 优先级排序(相同/不同优先级) | 100% | ⬜ | `packages/ai-client/__tests__/key-selector.test.ts` |
| 8.1.11 | KeySelector | 加权轮询(权重计算/分布验证) | 100% | ⬜ | `packages/ai-client/__tests__/key-selector.test.ts` |
| 8.1.12 | KeySelector | 边界条件(无可用密钥/全部禁用) | 100% | ⬜ | `packages/ai-client/__tests__/key-selector.test.ts` |
| 8.1.13 | ProxySelector | 延迟评分(排序/相同延迟) | 100% | ⬜ | `packages/ai-client/__tests__/proxy-selector.test.ts` |
| 8.1.14 | ProxySelector | 负载均衡(高负载排除/空载优先) | 100% | ⬜ | `packages/ai-client/__tests__/proxy-selector.test.ts` |
| 8.1.15 | Failover | 故障检测(连续失败/部分失败) | 100% | ⬜ | `packages/ai-client/__tests__/failover.test.ts` |
| 8.1.16 | Failover | 自动切换(备用选择/全部失败) | 100% | ⬜ | `packages/ai-client/__tests__/failover.test.ts` |
| 8.1.17 | Crypto | 加密解密(正常/空值/特殊字符) | 100% | ⬜ | `packages/db/__tests__/crypto.test.ts` |
| 8.1.18 | Crypto | 密钥脱敏(不同长度/空值) | 100% | ⬜ | `packages/db/__tests__/crypto.test.ts` |

#### 8.2 集成测试 (1 小时) - 目标 90% 覆盖率

| 序号 | 测试场景 | 测试用例 | 覆盖目标 | 状态 | 文件 |
|------|----------|----------|----------|------|------|
| 8.2.1 | 渠道-模型-密钥 | 创建渠道→添加模型→配置密钥→验证关联 | 100% | ⬜ | `packages/db/__tests__/integration/provider-model-key.test.ts` |
| 8.2.2 | 密钥-模型关联 | 创建密钥→关联模型→验证功能继承 | 100% | ⬜ | `packages/db/__tests__/integration/key-model.test.ts` |
| 8.2.3 | 密钥-代理关联 | 创建密钥→指定代理→验证代理选择 | 100% | ⬜ | `packages/db/__tests__/integration/ai-key-proxy.test.ts` |
| 8.2.4 | 模型功能筛选 | 多模型场景→按功能查询密钥→验证结果 | 100% | ⬜ | `packages/db/__tests__/integration/model-capability.test.ts` |
| 8.2.5 | 配额管理 | 消耗配额→重置→验证配额归零 | 100% | ⬜ | `packages/db/__tests__/integration/quota-reset.test.ts` |
| 8.2.6 | 负载均衡 | 同模型多密钥→轮询选择→验证分布 | 100% | ⬜ | `packages/ai-client/__tests__/integration/load-balance.test.ts` |
| 8.2.7 | 故障转移 | 主密钥失败→自动切换同模型备用密钥 | 100% | ⬜ | `packages/ai-client/__tests__/integration/failover.test.ts` |
| 8.2.8 | 代理健康检查 | 模拟代理故障→健康检查→状态更新 | 100% | ⬜ | `packages/ai-client/__tests__/integration/health-check.test.ts` |
| 8.2.9 | 代理-密钥绑定 | 代理禁用→密钥自动切换→验证 | 100% | ⬜ | `packages/ai-client/__tests__/integration/proxy-key-binding.test.ts` |

#### 8.3 API 测试 (0.5 小时) - 目标 85% 覆盖率

| 序号 | 端点 | 测试用例 | 覆盖目标 | 状态 | 文件 |
|------|------|----------|----------|------|------|
| 8.3.1 | GET /api/ai-keys | 权限验证、筛选参数、分页、排序 | 100% | ⬜ | `apps/web/__tests__/api/ai-keys/list.test.ts` |
| 8.3.2 | POST /api/ai-keys | 参数校验、加密存储、重复名称、无效渠道 | 100% | ⬜ | `apps/web/__tests__/api/ai-keys/create.test.ts` |
| 8.3.3 | GET /api/ai-keys/[id] | 正常获取、不存在ID、无权限 | 100% | ⬜ | `apps/web/__tests__/api/ai-keys/detail.test.ts` |
| 8.3.4 | PUT /api/ai-keys/[id] | 更新验证、部分更新、不存在ID、冲突 | 100% | ⬜ | `apps/web/__tests__/api/ai-keys/update.test.ts` |
| 8.3.5 | DELETE /api/ai-keys/[id] | 删除验证、级联影响、权限、不存在 | 100% | ⬜ | `apps/web/__tests__/api/ai-keys/delete.test.ts` |
| 8.3.6 | POST /api/ai-keys/[id]/toggle | 启用/禁用、状态切换、不存在 | 100% | ⬜ | `apps/web/__tests__/api/ai-keys/toggle.test.ts` |
| 8.3.7 | POST /api/ai-keys/[id]/reset-quota | 重置成功、权限验证 | 100% | ⬜ | `apps/web/__tests__/api/ai-keys/reset-quota.test.ts` |
| 8.3.8 | POST /api/ai-keys/[id]/test | 连通性测试、无效密钥处理、超时 | 100% | ⬜ | `apps/web/__tests__/api/ai-keys/test.test.ts` |
| 8.3.9 | GET /api/ai-proxies | 列表查询、健康状态筛选、协议筛选 | 100% | ⬜ | `apps/web/__tests__/api/ai-proxies/list.test.ts` |
| 8.3.10 | POST /api/ai-proxies | 创建代理、协议验证、重复名称 | 100% | ⬜ | `apps/web/__tests__/api/ai-proxies/create.test.ts` |
| 8.3.11 | PUT /api/ai-proxies/[id] | 更新代理、部分更新、不存在 | 100% | ⬜ | `apps/web/__tests__/api/ai-proxies/update.test.ts` |
| 8.3.12 | POST /api/ai-proxies/[id]/test | 代理连通性、延迟测试、认证失败 | 100% | ⬜ | `apps/web/__tests__/api/ai-proxies/test.test.ts` |
| 8.3.13 | GET /api/ai-proxies/[id]/health | 健康状态、历史记录、趋势 | 100% | ⬜ | `apps/web/__tests__/api/ai-proxies/health.test.ts` |
| 8.3.14 | **GET /api/admin/roles** | **角色列表、权限检查** | **100%** | ⬜ | `apps/web/__tests__/api/admin/roles.test.ts` |
| 8.3.15 | **POST /api/admin/users/[id]/roles** | **分配角色、权限验证** | **100%** | ⬜ | `apps/web/__tests__/api/admin/user-roles.test.ts` |
| 8.3.16 | **权限中间件测试** | **无权限返回403、有权限放行** | **100%** | ⬜ | `apps/web/__tests__/middleware/permission.test.ts` |

#### 8.4 前端组件测试 (0.5 小时) - 目标 80% 覆盖率

| 序号 | 组件 | 测试用例 | 覆盖目标 | 状态 | 文件 |
|------|------|----------|----------|------|------|
| 8.4.1 | AiKeyList | 列表渲染、空状态、加载状态、分页 | 100% | ⬜ | `apps/web/__tests__/components/ai-keys/ai-key-list.test.tsx` |
| 8.4.2 | AiKeyForm | 表单渲染、模型选择、验证逻辑、提交处理 | 100% | ⬜ | `apps/web/__tests__/components/ai-keys/ai-key-form.test.tsx` |
| 8.4.3 | AiKeyCard | 信息展示、模型显示、操作按钮、状态变化 | 100% | ⬜ | `apps/web/__tests__/components/ai-keys/ai-key-card.test.tsx` |
| 8.4.4 | ModelSelector | 级联选择、渠道→模型联动、功能显示 | 100% | ⬜ | `apps/web/__tests__/components/ai-keys/model-selector.test.tsx` |
| 8.4.5 | CapabilityBadges | 标签渲染、状态切换、多选/单选 | 100% | ⬜ | `apps/web/__tests__/components/ai-keys/capability-badges.test.tsx` |
| 8.4.6 | QuotaProgress | 进度计算、颜色变化(0/50/80/100%)、边界值 | 100% | ⬜ | `apps/web/__tests__/components/ai-keys/quota-progress.test.tsx` |
| 8.4.7 | ProxyList | 列表渲染、筛选、排序、状态筛选 | 100% | ⬜ | `apps/web/__tests__/components/ai-proxies/proxy-list.test.tsx` |
| 8.4.8 | ProxyForm | 协议切换、认证显示、提交验证、验证错误 | 100% | ⬜ | `apps/web/__tests__/components/ai-proxies/proxy-form.test.tsx` |
| 8.4.9 | ProxyCard | 信息展示、健康状态、延迟显示 | 100% | ⬜ | `apps/web/__tests__/components/ai-proxies/proxy-card.test.tsx` |
| 8.4.10 | HealthStatus | 状态图标、颜色、工具提示、动画 | 100% | ⬜ | `apps/web/__tests__/components/ai-proxies/health-status.test.tsx` |
| 8.4.11 | LatencyChart | 图表渲染、数据更新、空数据 | 100% | ⬜ | `apps/web/__tests__/components/ai-proxies/latency-chart.test.tsx` |
| 8.4.12 | ProxySelector | 选项渲染、选择逻辑、禁用状态、搜索 | 100% | ⬜ | `apps/web/__tests__/components/ai-proxies/proxy-selector.test.tsx` |
| 8.4.13 | AdminSidebar | 导航渲染、展开/折叠、激活状态 | 100% | ⬜ | `apps/web/__tests__/components/layout/admin-sidebar.test.tsx` |
| 8.4.14 | AdminTopbar | 面包屑、用户菜单、响应式 | 100% | ⬜ | `apps/web/__tests__/components/layout/admin-topbar.test.tsx` |
| 8.4.15 | Breadcrumbs | 路径解析、链接生成、当前页标识 | 100% | ⬜ | `apps/web/__tests__/components/layout/breadcrumbs.test.tsx` |
| 8.4.16 | **RBACGuard** | **有权限显示内容、无权限隐藏** | **100%** | ⬜ | `apps/web/__tests__/components/rbac-guard.test.tsx` |
| 8.4.17 | **useRBAC Hook** | **权限检查逻辑、SUPER_ADMIN放行、项目上下文** | **100%** | ⬜ | `apps/web/__tests__/hooks/use-rbac.test.ts` |
| 8.4.18 | **RBACButton** | **有权限可点击、无权限禁用/隐藏** | **100%** | ⬜ | `apps/web/__tests__/components/rbac-button.test.tsx` |

#### 8.5 E2E 测试 (Playwright) (0.5 小时)

| 序号 | 场景 | 测试用例 | 状态 | 文件 |
|------|------|----------|------|------|
| 8.5.1 | 完整流程-密钥 | 登录→创建密钥→验证列表→编辑→删除 | ⬜ | `apps/web/e2e/ai-keys/flow.spec.ts` |
| 8.5.2 | 完整流程-代理 | 登录→创建代理→测试连通性→绑定密钥 | ⬜ | `apps/web/e2e/ai-proxies/flow.spec.ts` |
| 8.5.3 | **统一RBAC-系统权限** | **ADMIN访问AI管理、VIEWER仅查看** | ⬜ | `apps/web/e2e/rbac/system.spec.ts` |
| 8.5.4 | **统一RBAC-项目权限** | **EDITOR编辑项目、VIEWER只读** | ⬜ | `apps/web/e2e/rbac/project.spec.ts` |
| 8.5.5 | **统一RBAC-跨项目** | **用户在项目A是OWNER、项目B是VIEWER** | ⬜ | `apps/web/e2e/rbac/cross-project.spec.ts` |
| 8.5.6 | **统一RBAC-无权限** | **无权限访问→403页面** | ⬜ | `apps/web/e2e/rbac/forbidden.spec.ts` |

#### 8.6 性能测试 (0.5 小时)

| 序号 | 测试项 | 目标 | 状态 |
|------|--------|------|------|
| 8.6.1 | 密钥查询 | 1000个密钥查询 < 100ms | ⬜ |
| 8.6.2 | 负载均衡 | 10000次选择操作 < 500ms | ⬜ |
| 8.6.3 | API响应 | CRUD接口平均响应 < 200ms | ⬜ |

#### 8.7 覆盖率验证 (必须)

| 序号 | 检查项 | 目标 | 未达标处理 |
|------|--------|------|------------|
| 8.7.1 | 运行全量测试 | `pnpm test:coverage` | - |
| 8.7.2 | 检查行覆盖率 | ≥ 90% | 补充测试用例 |
| 8.7.3 | 检查函数覆盖率 | ≥ 90% | 补充测试用例 |
| 8.7.4 | 检查分支覆盖率 | ≥ 85% | 补充条件分支测试 |
| 8.7.5 | 生成覆盖率报告 | HTML + JSON | 存档 |
| 8.7.6 | 覆盖率门禁 | 阻塞合并 | CI/CD 配置 |

---

## 📁 文件结构总览

```
ai-drama-studio/
├── packages/
│   ├── db/
│   │   ├── prisma/
│   │   │   └── schema.prisma           # 更新模型
│   │   ├── src/
│   │   │   └── repositories/
│   │   │       ├── ai-api-key.repository.ts    # 新增
│   │   │       └── proxy.repository.ts         # 增强
│   │   └── __tests__/                  # 测试文件
│   │       ├── ai-api-key.repository.test.ts
│   │       ├── proxy.repository.test.ts
│   │       ├── crypto.test.ts
│   │       └── integration/
│   │           ├── ai-key-provider.test.ts
│   │           ├── ai-key-proxy.test.ts
│   │           └── quota-reset.test.ts
│   │
│   └── ai-client/
│       ├── src/
│       │   ├── config/
│       │   │   └── manager.ts          # 更新多密钥支持
│       │   ├── key-selector.ts         # 新增
│       │   ├── proxy-selector.ts       # 新增
│       │   └── failover.ts             # 新增
│       └── __tests__/                  # 测试文件
│           ├── key-selector.test.ts
│           ├── proxy-selector.test.ts
│           ├── failover.test.ts
│           └── integration/
│               ├── failover.test.ts
│               └── health-check.test.ts
│
└── apps/web/
    ├── app/
    │   ├── (admin)/
    │   │   ├── layout.tsx              # 新增
    │   │   ├── ai-keys/
    │   │   │   ├── page.tsx            # 列表
    │   │   │   ├── new/page.tsx        # 新建
    │   │   │   └── [id]/
    │   │   │       ├── page.tsx        # 详情
    │   │   │       └── edit/page.tsx   # 编辑
    │   │   │
    │   │   └── ai-proxies/
    │   │       ├── page.tsx            # 列表
    │   │       ├── new/page.tsx        # 新建
    │   │       └── [id]/
    │   │           ├── page.tsx        # 详情
    │   │           └── edit/page.tsx   # 编辑
    │   │
    │   └── api/
    │       ├── ai-keys/
    │       │   └── [[...path]]/
    │       │       └── route.ts        # 密钥 API
    │       │
    │       └── ai-proxies/
    │           └── [[...path]]/
    │               └── route.ts        # 代理 API
    │
    ├── components/
    │   ├── layout/                     # 布局组件
    │   │   ├── admin-layout.tsx
    │   │   ├── admin-sidebar.tsx       # 侧边栏导航
    │   │   ├── admin-topbar.tsx        # 顶部栏
    │   │   ├── breadcrumbs.tsx         # 面包屑导航
    │   │   ├── sidebar-nav-item.tsx
    │   │   └── mobile-nav.tsx
    │   │
    │   ├── rbac/                       # 【统一RBAC】权限组件（本次新增）
    │   │   ├── rbac-guard.tsx          # 统一权限守卫
    │   │   └── rbac-button.tsx         # 权限按钮
    │   │
    │   ├── permissions/                # 【旧版项目级】权限组件（已存在，逐步迁移）
    │   │   └── PermissionGuard.tsx     # 项目权限守卫
    │   │
    │   ├── ai-keys/
    │   │   ├── ai-key-list.tsx
    │   │   ├── ai-key-form.tsx
    │   │   ├── ai-key-card.tsx
    │   │   ├── model-selector.tsx      # 渠道→模型级联选择
    │   │   ├── capability-badges.tsx
    │   │   └── quota-progress.tsx
    │   │
    │   └── ai-proxies/
    │       ├── proxy-list.tsx
    │       ├── proxy-form.tsx
    │       ├── proxy-card.tsx
    │       ├── health-status.tsx
    │       ├── latency-chart.tsx
    │       └── proxy-selector.tsx
    │
    └── __tests__/                      # 测试文件
        ├── api/
        │   ├── ai-keys/
        │   │   ├── list.test.ts
        │   │   ├── create.test.ts
        │   │   ├── update.test.ts
        │   │   ├── delete.test.ts
        │   │   └── test.test.ts
        │   └── ai-proxies/
        │       ├── list.test.ts
        │       └── test.test.ts
        ├── components/
        │   ├── layout/
        │   │   ├── admin-sidebar.test.tsx
        │   │   ├── admin-topbar.test.tsx
        │   │   └── breadcrumbs.test.tsx
        │   ├── ai-keys/
        │   │   ├── ai-key-list.test.tsx
        │   │   ├── ai-key-form.test.tsx
        │   │   ├── ai-key-card.test.tsx
        │   │   ├── model-selector.test.tsx
        │   │   ├── capability-badges.test.tsx
        │   │   └── quota-progress.test.tsx
        │   └── ai-proxies/
        │       ├── proxy-list.test.tsx
        │       ├── proxy-form.test.tsx
        │       ├── proxy-card.test.tsx
        │       ├── health-status.test.tsx
        │       ├── latency-chart.test.tsx
        │       └── proxy-selector.test.tsx
        └── e2e/                        # E2E 测试
            ├── ai-keys/
            │   └── flow.spec.ts
            ├── ai-proxies/
            │   └── flow.spec.ts
            └── admin/
                └── permission.spec.ts
```

---

## ⚡ 实施优先级

```
P0 (核心功能) ──────────────────────────────────────
  ├─ Phase 1: 数据库模型
  ├─ Phase 2: Repository 层
  ├─ Phase 3: API 路由 (基础 CRUD)
  └─ Phase 4: AI Client 集成

P1 (管理界面) ──────────────────────────────────────
  ├─ Phase 5: 前端组件 - 密钥管理
  ├─ Phase 6: 前端组件 - 代理管理
  └─ Phase 7: 导航与布局

P2 (测试验证 90% 覆盖) ─────────────────────────────
  ├─ Phase 8: 单元测试(95%) + 集成测试(90%)
  ├─ Phase 9: API 测试(85%) + 前端测试(80%)
  └─ Phase 10: E2E + 性能 + 覆盖率验证(必须 ≥90%)
```

---

## 📌 关键设计决策

| 决策 | 说明 |
|------|------|
| **密钥默认绑定渠道** | `AiApiKey` 必须绑定到 `AiProvider`，`modelId` 为 null 时表示渠道通用密钥 |
| **可选绑定模型** | `AiApiKey.modelId` 可选，有值时表示该密钥仅用于指定模型 |
| **渠道-模型关系** | `AiProvider` 1:N `AiModel`，一个渠道支持多种模型 |
| **模型功能支持** | 每个 `AiModel` 通过 `capabilities` 数组标记支持功能 |
| **密钥功能覆盖** | `AiApiKey.capabilities` 可选，用于覆盖或限制模型功能 |
| **负载均衡范围** | 通用密钥在渠道内所有模型间均衡，专用密钥在指定模型内均衡 |
| **故障转移范围** | 优先切换同类型密钥（通用↔通用，专用↔专用） |
| **代理三级配置** | 密钥级 > 渠道级 > 系统级，灵活覆盖 |
| **配额管理** | 按密钥维度管理配额，支持每日重置 |
| **健康检查** | 定时检测代理延迟和可用性，自动标记状态 |
| **统一 RBAC 权限模型** | Role/Permission/RolePermission 三表 + UserRole（系统级）+ ProjectMemberRole（项目级） |
| **权限粒度** | 资源+操作粒度（如 ai_key:create, project:update, episode:read），支持细粒度控制 |
| **权限上下文** | 系统级权限（全局）+ 项目级权限（特定项目），通过 resourceId 区分 |
| **权限继承** | SUPER_ADMIN 拥有所有权限，其他角色需显式分配 |
| **统一权限控制** | 使用 `useRBAC()` Hook 和 `<RBACGuard resource="" action="" projectId?="" />` 组件实现组件级权限控制 |
| **权限守卫层级** | middleware（路由级）→ API 路由（接口级）→ 组件（UI级）三层防护 |
| **向后兼容** | 原有 ProjectMember.role 迁移到 ProjectMemberRole 表，保留数据完整性 |

### 密钥绑定模式示例

```
OpenAI (渠道)
├── 【通用密钥】sk-xxx1 (modelId: null)
│   └── 可用于: gpt-4o, dall-e-3, tts-1, sora...
├── 【通用密钥】sk-xxx2 (modelId: null, capabilities: [IMAGE])
│   └── 仅可用于图像模型: dall-e-3
├── 【专用密钥】sk-xxx3 (modelId: gpt-4o-id)
│   └── 仅用于: gpt-4o (功能继承自模型)
└── 【专用密钥】sk-xxx4 (modelId: gpt-4o-id, capabilities: [TEXT])
    └── 仅用于: gpt-4o，但限制只能使用 TEXT 功能
```

### 密钥选择逻辑

```typescript
// 1. 按需求筛选可用密钥
function selectKeys(providerId, modelId?, capability?) {
  const keys = await prisma.aiApiKey.findMany({
    where: {
      providerId,
      isActive: true,
      // 模型匹配：专用密钥必须匹配，通用密钥放行
      OR: [
        { modelId: null },           // 通用密钥
        { modelId: modelId }         // 专用密钥匹配
      ],
      // 功能匹配
      OR: [
        { capabilities: null },      // 继承模型功能
        { capabilities: { has: capability } }
      ]
    }
  })
  
  // 2. 优先级 + 加权轮询选择
  return selectByPriorityAndWeight(keys)
}
```

---

## 🎯 代码覆盖率要求 - 90%

### 覆盖率目标分解

| 模块 | 目标覆盖率 | 关键覆盖点 |
|------|------------|------------|
| **Repository 层** | 95% | 所有 CRUD、查询方法、错误处理 |
| **Service/Selector 层** | 90% | 负载均衡算法、故障转移逻辑 |
| **API 路由层** | 85% | 所有端点、参数校验、错误响应 |
| **前端组件** | 80% | 表单验证、事件处理、状态变化 |
| **整体平均** | **≥ 90%** | 行覆盖率 + 分支覆盖率 |

### 覆盖率检查配置

```json
// vitest.config.ts 覆盖率配置
{
  "coverage": {
    "provider": "v8",
    "reporter": ["text", "json", "html"],
    "thresholds": {
      "lines": 90,
      "functions": 90,
      "branches": 85,
      "statements": 90
    },
    "exclude": [
      "**/*.d.ts",
      "**/*.config.ts",
      "**/node_modules/**",
      "**/__tests__/**",
      "**/e2e/**"
    ]
  }
}
```

### 未达到覆盖率的补救措施

| 覆盖率 | 措施 |
|--------|------|
| < 90% | 补充边界条件测试 |
| < 85% | 补充错误分支测试 |
| < 80% | 重构代码提高可测试性 |

---

## 📝 备注

### 核心设计要点

**1. 密钥绑定规则**
```
AiApiKey.modelId = null     → 渠道通用密钥（默认）
AiApiKey.modelId = "xxx"    → 模型专用密钥（特殊场景）
```

**2. 功能支持优先级**
```
密钥.capabilities > 模型.capabilities > 默认值
null 表示继承上一层级
```

**3. 数据库关系**
- AiProvider 1:N AiModel（一个渠道多个模型）
- AiProvider 1:N AiApiKey（一个渠道多个密钥，默认）
- AiModel 1:N AiApiKey（一个模型多个专用密钥，可选）

### 实施检查清单

**安全与加密**
- [ ] 所有 API Key 和代理密码使用 AES-256 加密存储
- [ ] 密钥列表默认脱敏显示，点击可查看完整内容
- [ ] 代理支持 HTTP/HTTPS/SOCKS5 三种协议
- [ ] 健康检查可配置检测间隔和目标地址

**密钥-模型设计**
- [ ] **密钥创建时默认不绑定模型（modelId: null）**
- [ ] **支持切换为绑定指定模型**

**统一 RBAC 权限管理 - 本次实现**
- [ ] **创建 Role/Permission/RolePermission 三张表**（核心）
- [ ] **创建 UserRole 表**（用户系统角色关联）
- [ ] **创建 ProjectMemberRole 表**（项目成员角色关联，替代原有 ProjectMember.role 字段）
- [ ] **预定义角色**: SUPER_ADMIN, ADMIN（AI管理）, PROJECT_OWNER, PROJECT_EDITOR, PROJECT_VIEWER
- [ ] **API 路由添加统一权限检查中间件**（支持系统级 + 项目级）
- [ ] **前端实现 useRBAC Hook 和 RBACGuard 组件**（统一接口）
- [ ] **导航菜单根据 RBAC 权限动态显示/隐藏**
- [ ] **无权限操作返回 403**

**测试与质量**
- [ ] **每个 Phase 完成后需运行测试并检查覆盖率**
- [ ] **权限相关测试覆盖所有角色场景**

---

**创建时间**: 2026-03-12 22:00  
**最后更新**: 2026-03-12 23:00 (调整为统一 RBAC 权限方案)
