# AI Drama Studio开发计划（更新版）

## 项目概述
AI Drama Studio是一个AI驱动的短剧创作平台，旨在为用户提供从剧本创作到视频生成的完整解决方案。当前项目已实现基础的项目管理、角色管理、剧集管理、场景管理等功能，但需要补充用户认证、AI集成、商业功能等关键特性。

## 当前状态
- ✅ 项目管理
- ✅ 角色管理
- ✅ 剧集管理
- ✅ 场景管理
- ✅ 任务系统
- ✅ 完整的测试体系
- ❌ 用户认证系统（缺失）
- ❌ AI内容生成（缺失）
- ❌ 商业功能（缺失）

## 开发计划

### Phase 1: 本地用户名密码认证系统 (Week 1-2)
#### 目标
实现完整的本地用户名密码认证系统，为平台的安全性和用户数据隔离打下基础。

#### 具体任务
1. **认证系统架构**
   - 设计User表结构（email, passwordHash, name, role等）
   - 实现bcrypt密码哈希
   - 创建会话管理机制

2. **数据库模型**
   - `packages/db/prisma/schema.prisma`: 添加User模型
   - 用户角色枚举（USER, PREMIUM, ADMIN）
   - 用户资料扩展模型（Profile）

3. **认证API路由**
   - `/api/auth/local/register`: 本地用户注册
   - `/api/auth/local/login`: 本地用户登录
   - `/api/auth/local/logout`: 用户登出
   - `/api/auth/me`: 获取当前用户信息

4. **认证页面**
   - `/login`: 登录页面
   - `/register`: 注册页面
   - `/profile`: 用户资料页面

5. **认证中间件**
   - 保护私有路由
   - 会话验证
   - 用户权限检查

6. **密码安全**
   - 密码强度验证
   - 密码重置功能
   - 会话过期处理

7. **用户管理**
   - 用户资料编辑
   - 头像上传
   - 偏好设置

#### 验收标准
- 用户能够使用邮箱和密码注册
- 用户能够使用邮箱和密码登录
- 用户资料信息能够正确保存和更新
- 未认证用户无法访问受保护资源
- 密码安全验证正常工作

#### 实现细节
- 密码使用bcrypt进行哈希加密（salt rounds: 12）
- 实现JWT令牌管理（有效期：7天）
- 支持记住我功能（长时效令牌：30天）
- 防止暴力破解（限制尝试次数）

### Phase 2: AI内容生成系统 (Week 3-6)
#### 目标
集成AI服务，实现剧本、角色、场景、音视频等内容的自动生成能力。

#### 具体任务
1. **AI客户端包完善**
   - `packages/ai-client`: 统一AI服务接口
   - 支持OpenAI、Anthropic、Google等多家提供商
   - 实现负载均衡和故障转移

2. **AI生成API路由**
   - `/api/generate/script`: 剧本生成
   - `/api/generate/character`: 角色生成
   - `/api/generate/scene`: 场景生成
   - `/api/generate/audio`: 音频生成
   - `/api/generate/video`: 视频合成

3. **任务队列系统**
   - 扩展后台任务系统
   - 实现AI生成任务队列
   - 任务状态跟踪

4. **实时进度更新**
   - SSE事件流实现实时进度
   - WebSocket实时通信（备用方案）
   - 进度UI组件

5. **积分系统**
   - 用户积分管理
   - 积分扣除逻辑
   - 生成成本计算

6. **前端生成组件**
   - AI生成器界面
   - 生成参数配置
   - 结果展示组件

#### 验收标准
- AI生成任务能够成功排队和处理
- 生成进度能够实时更新给用户
- 积分系统正常工作
- 生成的AI内容符合预期质量

### Phase 3: 团队协作功能 (Week 7-8)
#### 目标
实现多人协作功能，支持团队共同创作项目。

#### 具体任务
1. **协作系统API**
   - `/api/projects/[id]/invite`: 邀请协作者
   - `/api/projects/[id]/members`: 成员管理
   - `/api/projects/[id]/comments`: 评论系统

2. **权限管理**
   - 项目角色分配（OWNER, EDITOR, VIEWER）
   - 权限验证中间件
   - 访问日志记录

3. **实时协作**
   - WebSocket连接管理
   - 实时编辑同步
   - 冲突解决机制

4. **前端协作组件**
   - 协作者管理面板
   - 评论界面
   - 在线状态指示

#### 验收标准
- 多个用户可以同时参与项目
- 权限控制准确无误
- 实时协作功能流畅
- 评论系统正常工作

### Phase 4: 商业功能 (Week 9-11)
#### 目标
实现商业化功能，支持订阅和支付系统。

#### 具体任务
1. **订阅系统**
   - `/api/subscriptions`: 订阅管理API
   - Stripe集成
   - 计划管理（FREE, PROFESSIONAL, BUSINESS）

2. **支付系统**
   - 支付页面
   - 支付成功回调处理
   - 退款处理

3. **积分充值**
   - `/api/credits/purchase`: 积分购买
   - 积分余额管理
   - 消费记录

4. **计费系统**
   - 使用量统计
   - 发票生成
   - 账单管理

5. **定价页面**
   - `/pricing`: 定价页面
   - 订阅管理页面
   - 账单历史页面

#### 验收标准
- 支付流程顺畅
- 订阅管理功能正常
- 积分系统准确工作
- 发票生成正确

### Phase 5: 内容分发与版权保护 (Week 12-13)
#### 目标
实现内容发布和版权保护功能。

#### 具体任务
1. **发布系统**
   - `/api/publish`: 内容发布API
   - 支持多平台（YouTube, TikTok, etc.）
   - 发布状态跟踪

2. **版权保护**
   - 数字水印生成
   - 版权信息嵌入
   - 抄袭检测集成

3. **内容审核**
   - 自动内容审核
   - 人工审核工作流
   - 审核状态管理

4. **发布组件**
   - 发布向导
   - 平台配置
   - 发布历史

#### 验收标准
- 内容可以发布到指定平台
- 版权保护功能生效
- 审核流程正常工作

### Phase 6: 性能优化与安全加固 (Week 14-15)
#### 目标
提升系统性能和安全性。

#### 具体任务
1. **性能优化**
   - 数据库查询优化
   - 缓存策略实现
   - CDN集成

2. **安全加固**
   - 输入验证和过滤
   - API限流
   - 数据加密

3. **监控和日志**
   - 应用性能监控
   - 错误追踪系统
   - 审计日志

4. **负载测试**
   - 压力测试
   - 性能基准测试
   - 优化调整

#### 验收标准
- 系统响应时间满足要求
- 安全漏洞得到修复
- 监控系统正常工作
- 性能指标达标

## 技术栈

### 前端
- **框架**: Next.js 15
- **组件库**: Shadcn UI
- **状态管理**: React Query
- **表单处理**: React Hook Form + Zod
- **认证**: 本地实现JWT认证

### 后端
- **数据库**: PostgreSQL + Prisma ORM
- **密码加密**: bcrypt
- **JWT**: jsonwebtoken
- **队列系统**: BullMQ + Redis
- **AI服务**: OpenAI, Anthropic, Google等
- **支付**: Stripe
- **实时通信**: Server-Sent Events (SSE)

### 基础设施
- **部署**: Vercel + Docker
- **缓存**: Redis
- **CDN**: Cloudflare (待集成)
- **监控**: Sentry (待集成)

## 风险与缓解

### 风险1: 密码安全性问题
- **缓解**: 使用强密码哈希算法(bcrypt)，实施密码强度验证

### 风险2: 用户数据泄露
- **缓解**: 实施数据加密、访问控制和审计日志

### 风险3: AI生成成本过高
- **缓解**: 实现精确的成本计算和积分系统，提供多种定价方案

### 风险4: 生成内容质量不稳定
- **缓解**: 提供内容审核功能，建立质量反馈机制

## 成功指标

### 用户指标
- 注册用户数: >1000
- 活跃用户数: >300
- 付费转化率: >5%

### 业务指标
- AI生成任务成功率: >95%
- 平均响应时间: <2秒
- 系统可用性: >99%

### 质量指标
- 测试覆盖率: >80%
- 严重bug数量: <5
- 用户满意度: >4.0/5.0

## 里程碑

| 日期 | 里程碑 | 完成标志 |
|------|--------|----------|
| Week 2 | 本地认证完成 | 用户可以使用邮箱密码注册和登录，访问个人资料 |
| Week 6 | AI生成完成 | 用户可以通过AI生成剧本、角色、场景 |
| Week 8 | 协作功能完成 | 多人可以协作编辑同一个项目 |
| Week 11 | 商业功能完成 | 用户可以订阅付费计划并充值积分 |
| Week 13 | 发布功能完成 | 用户可以将作品发布到各大平台 |
| Week 15 | 正式上线 | 系统稳定运行，满足生产环境要求 |

## 详细Phase 1实现方案

### 数据库设计
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String    // bcrypt哈希后的密码
  name          String?
  avatar        String?
  role          UserRole  @default(USER)
  isActive      Boolean   @default(true)
  emailVerified Boolean   @default(false)
  lastLoginAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  profile       Profile?
  projects      Project[]

  @@map("users")
}

model Profile {
  id           String @id @default(cuid())
  userId       String @unique @relation(fields: [user], references: [id])
  user         User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  bio          String?
  website      String?
  preferences  Json?   // 存储用户偏好设置
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@map("profiles")
}
```

### 认证实现
```typescript
// apps/web/lib/auth/local.ts
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db';

interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export async function registerLocalUser(data: RegisterData) {
  // 验证输入
  if (!data.email || !data.password) {
    throw new Error('Email and password are required');
  }

  // 检查用户是否已存在
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email }
  });

  if (existingUser) {
    throw new Error('User already exists');
  }

  // 验证密码强度
  if (data.password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  // 加密密码
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(data.password, saltRounds);

  // 创建用户
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash: hashedPassword,
      name: data.name,
      role: 'USER',
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    }
  });

  // 为用户创建默认资料
  await prisma.profile.create({
    data: {
      userId: user.id,
    }
  });

  return user;
}

export async function loginLocalUser(email: string, password: string) {
  // 查找用户
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      profile: true
    }
  });

  if (!user || !user.isActive) {
    throw new Error('Invalid credentials');
  }

  // 验证密码
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  // 更新最后登录时间
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  // 生成JWT令牌
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
    },
    token
  };
}

export async function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      }
    });

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  } catch (error) {
    return null;
  }
}
```

### 认证API路由示例
```typescript
// apps/web/app/api/auth/local/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { registerLocalUser } from '@/lib/auth/local';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // 注册用户
    const user = await registerLocalUser({
      email,
      password,
      name
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt
      }
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Registration failed' },
      { status: 400 }
    );
  }
}
```

## 资源需求

### 人力资源
- 前端开发: 1人
- 后端开发: 1人
- AI集成专家: 0.5人（顾问）
- UI/UX设计师: 0.5人（前期）

### 基础设施
- 数据库实例
- Redis缓存实例
- 队列处理服务
- AI服务API密钥费用
- CDN和存储服务

## 预算估算
- 开发人力成本: $150K - $200K
- 基础设施费用: $500 - $2000/月
- AI服务费用: $1000 - $5000/月（根据使用量）
- 第三方服务费用: $200 - $500/月

## 后续规划
- 高级AI功能（视频理解、风格迁移）
- 移动端应用开发
- 社区功能
- 企业版功能
- 国际化支持