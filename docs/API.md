# AI Drama Studio - API 接口文档

> **最后更新:** 2026-03-12
> **版本:** 0.1.0

---

## 认证说明

除公开 API 外，所有接口需要在 Header 中携带认证信息：

```http
Authorization: Bearer <jwt_token>
```

---

## 1. 认证 API (Auth)

### 1.1 用户注册

**端点:** `POST /api/auth/local/register`

**请求体:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "张三"
}
```

**响应 (201 Created):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "张三",
    "role": "USER",
    "createdAt": "2026-03-12T10:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 1.2 用户登录

**端点:** `POST /api/auth/local/login`

**请求体:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**响应 (200 OK):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "张三",
    "role": "USER"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "d9f8e7c6b5a4..."
}
```

---

### 1.3 用户登出

**端点:** `POST /api/auth/local/logout`

**请求体:**
```json
{
  "refreshToken": "d9f8e7c6b5a4..."
}
```

**响应 (200 OK):**
```json
{
  "success": true
}
```

---

### 1.4 获取当前用户

**端点:** `GET /api/auth/me`

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**响应 (200 OK):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "张三",
    "avatar": "https://...",
    "role": "USER"
  }
}
```

---

### 1.5 密码重置

**端点:** `POST /api/auth/password/reset`

**请求体:**
```json
{
  "email": "user@example.com"
}
```

**响应 (200 OK):**
```json
{
  "success": true,
  "message": "重置邮件已发送"
}
```

---

### 1.6 密码修改

**端点:** `POST /api/auth/password/change`

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**请求体:**
```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456"
}
```

**响应 (200 OK):**
```json
{
  "success": true
}
```

---

## 2. 项目 API (Projects)

### 2.1 获取项目列表

**端点:** `GET /api/projects`

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| `status` | string | 筛选状态：DRAFT, PROCESSING, COMPLETED, FAILED |
| `page` | number | 页码 (默认 1) |
| `pageSize` | number | 每页数量 (默认 10) |

**响应 (200 OK):**
```json
{
  "projects": [
    {
      "id": "uuid",
      "name": "我的短剧",
      "description": "项目描述",
      "status": "PROCESSING",
      "episodeCount": 10,
      "createdAt": "2026-03-12T10:00:00Z",
      "updatedAt": "2026-03-12T12:00:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "pageSize": 10
}
```

---

### 2.2 创建项目

**端点:** `POST /api/projects`

**请求体:**
```json
{
  "name": "我的短剧",
  "description": "这是一个 AI 生成的短剧项目"
}
```

**响应 (201 Created):**
```json
{
  "project": {
    "id": "uuid",
    "name": "我的短剧",
    "description": "这是一个 AI 生成的短剧项目",
    "status": "DRAFT",
    "userId": "user-uuid",
    "createdAt": "2026-03-12T10:00:00Z"
  }
}
```

---

### 2.3 获取项目详情

**端点:** `GET /api/projects/[id]`

**响应 (200 OK):**
```json
{
  "project": {
    "id": "uuid",
    "name": "我的短剧",
    "description": "项目描述",
    "status": "PROCESSING",
    "episodes": [
      {
        "id": "uuid",
        "number": 1,
        "name": "第一集",
        "status": "COMPLETED"
      }
    ],
    "characters": [...],
    "locations": [...],
    "createdAt": "2026-03-12T10:00:00Z"
  }
}
```

---

### 2.4 更新项目

**端点:** `PUT /api/projects/[id]`

**请求体:**
```json
{
  "name": "更新后的项目名称",
  "description": "更新后的描述",
  "status": "COMPLETED"
}
```

**响应 (200 OK):**
```json
{
  "project": {
    "id": "uuid",
    "name": "更新后的项目名称",
    ...
  }
}
```

---

### 2.5 删除项目

**端点:** `DELETE /api/projects/[id]`

**响应 (200 OK):**
```json
{
  "success": true
}
```

---

### 2.6 获取项目成员

**端点:** `GET /api/projects/[id]/members`

**响应 (200 OK):**
```json
{
  "members": [
    {
      "id": "uuid",
      "name": "张三",
      "email": "user@example.com",
      "role": "OWNER",
      "joinedAt": "2026-03-12T10:00:00Z"
    },
    {
      "id": "uuid",
      "name": "李四",
      "email": "user2@example.com",
      "role": "EDITOR",
      "joinedAt": "2026-03-12T11:00:00Z"
    }
  ]
}
```

---

### 2.7 邀请成员

**端点:** `POST /api/projects/[id]/invite`

**请求体:**
```json
{
  "email": "newmember@example.com",
  "role": "EDITOR"
}
```

**响应 (200 OK):**
```json
{
  "invite": {
    "token": "invite-token-xxx",
    "email": "newmember@example.com",
    "expiresAt": "2026-03-19T10:00:00Z"
  },
  "inviteUrl": "http://localhost:3000/invite/invite-token-xxx"
}
```

---

### 2.8 移除成员

**端点:** `DELETE /api/projects/[id]/members/[userId]`

**响应 (200 OK):**
```json
{
  "success": true
}
```

---

### 2.9 获取我的成员信息

**端点:** `GET /api/projects/[id]/members/me`

**响应 (200 OK):**
```json
{
  "membership": {
    "userId": "uuid",
    "projectId": "uuid",
    "role": "EDITOR",
    "permissions": ["read", "write", "comment"]
  }
}
```

---

### 2.10 获取项目活动

**端点:** `GET /api/projects/[id]/activity`

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| `limit` | number | 返回数量 (默认 20) |

**响应 (200 OK):**
```json
{
  "activities": [
    {
      "id": "uuid",
      "type": "episode.created",
      "userId": "uuid",
      "userName": "张三",
      "description": "创建了第一集",
      "createdAt": "2026-03-12T12:00:00Z"
    }
  ]
}
```

---

### 2.11 项目评论

**端点:** `GET /api/projects/[id]/comments` | `POST /api/projects/[id]/comments`

**GET 响应 (200 OK):**
```json
{
  "comments": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "张三",
      "content": "这个分镜很棒！",
      "parentId": null,
      "replies": [],
      "createdAt": "2026-03-12T12:00:00Z"
    }
  ]
}
```

**POST 请求体:**
```json
{
  "content": "这个分镜很棒！",
  "parentId": null  // 如果是回复评论，填写父评论 ID
}
```

---

## 3. 角色 API (Characters)

### 3.1 获取角色列表

**端点:** `GET /api/characters?projectId=xxx`

**响应 (200 OK):**
```json
{
  "characters": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "name": "张三",
      "gender": "男",
      "ageRange": "约 25 岁",
      "roleLevel": "S",
      "introduction": "主角，性格高冷",
      "profileConfirmed": true,
      "appearances": [
        {
          "id": "uuid",
          "appearanceIndex": 1,
          "changeReason": "初始形象",
          "description": "黑色短发，穿着黑色西装",
          "imageUrls": ["https://..."]
        }
      ]
    }
  ]
}
```

---

### 3.2 创建角色

**端点:** `POST /api/characters`

**请求体:**
```json
{
  "projectId": "uuid",
  "name": "张三",
  "gender": "男",
  "ageRange": "约 25 岁",
  "roleLevel": "S",
  "introduction": "主角，性格高冷",
  "personalityTags": ["高冷", "腹黑"],
  "occupation": "公司总裁",
  "costumeTier": 5,
  "suggestedColors": ["黑色", "金色"]
}
```

**响应 (201 Created):**
```json
{
  "character": {
    "id": "uuid",
    "name": "张三",
    ...
  }
}
```

---

### 3.3 更新角色

**端点:** `PUT /api/characters/[id]`

**请求体:**
```json
{
  "name": "李四",
  "introduction": "更新后的介绍",
  "roleLevel": "A"
}
```

**响应 (200 OK):**
```json
{
  "character": {
    "id": "uuid",
    "name": "李四",
    ...
  }
}
```

---

### 3.4 删除角色

**端点:** `DELETE /api/characters/[id]`

**响应 (200 OK):**
```json
{
  "success": true
}
```

---

## 4. 场景 API (Locations)

### 4.1 获取场景列表

**端点:** `GET /api/locations?projectId=xxx`

**响应 (200 OK):**
```json
{
  "locations": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "name": "咖啡厅",
      "description": "市中心的高档咖啡厅",
      "locationType": "INDOOR",
      "moodColor": "暖黄色",
      "keyElements": ["吧台", "落地窗", "皮质沙发"],
      "locationConfirmed": true
    }
  ]
}
```

---

### 4.2 创建场景

**端点:** `POST /api/locations`

**请求体:**
```json
{
  "projectId": "uuid",
  "name": "咖啡厅",
  "description": "市中心的高档咖啡厅",
  "locationType": "INDOOR",
  "moodColor": "暖黄色",
  "keyElements": ["吧台", "落地窗", "皮质沙发"]
}
```

**响应 (201 Created):**
```json
{
  "location": {
    "id": "uuid",
    "name": "咖啡厅",
    ...
  }
}
```

---

### 4.3 更新场景

**端点:** `PUT /api/locations/[id]`

**请求体:**
```json
{
  "name": "更新后的咖啡厅",
  "moodColor": "蓝色调"
}
```

**响应 (200 OK):**
```json
{
  "location": {
    "id": "uuid",
    "name": "更新后的咖啡厅",
    ...
  }
}
```

---

### 4.4 删除场景

**端点:** `DELETE /api/locations/[id]`

**响应 (200 OK):**
```json
{
  "success": true
}
```

---

## 5. 剧集 API (Episodes)

### 5.1 获取剧集列表

**端点:** `GET /api/episodes?projectId=xxx`

**响应 (200 OK):**
```json
{
  "episodes": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "number": 1,
      "name": "第一集",
      "novelText": "小说原文...",
      "script": {
        "id": "uuid",
        "content": "剧本内容...",
        "status": "COMPLETED"
      },
      "storyboards": [...],
      "status": "COMPLETED"
    }
  ]
}
```

---

### 5.2 创建剧集

**端点:** `POST /api/episodes`

**请求体:**
```json
{
  "projectId": "uuid",
  "number": 1,
  "name": "第一集",
  "novelText": "小说原文内容..."
}
```

**响应 (201 Created):**
```json
{
  "episode": {
    "id": "uuid",
    "projectId": "uuid",
    "number": 1,
    "name": "第一集",
    "status": "DRAFT"
  }
}
```

---

### 5.3 更新剧集

**端点:** `PUT /api/episodes/[id]`

**请求体:**
```json
{
  "name": "更新后的剧名",
  "novelText": "更新后的小说文本"
}
```

**响应 (200 OK):**
```json
{
  "episode": {
    "id": "uuid",
    "name": "更新后的剧名",
    ...
  }
}
```

---

### 5.4 删除剧集

**端点:** `DELETE /api/episodes/[id]`

**响应 (200 OK):**
```json
{
  "success": true
}
```

---

## 6. 生成 API (Generate)

### 6.1 生成剧本

**端点:** `POST /api/generate/script`

**请求体:**
```json
{
  "episodeId": "uuid",
  "novelText": "小说原文...",
  "options": {
    "model": "claude-sonnet-4-6",
    "style": "古装剧",
    "episodeDuration": 120
  }
}
```

**响应 (202 Accepted):**
```json
{
  "task": {
    "id": "task-uuid",
    "type": "SCRIPT_GENERATE",
    "status": "QUEUED",
    "progress": 0
  }
}
```

---

### 6.2 生成分镜

**端点:** `POST /api/generate/scene`

**请求体:**
```json
{
  "episodeId": "uuid",
  "scriptId": "uuid",
  "options": {
    "model": "dall-e-3",
    "style": "写实风格",
    "aspectRatio": "16:9"
  }
}
```

**响应 (202 Accepted):**
```json
{
  "task": {
    "id": "task-uuid",
    "type": "STORYBOARD_GENERATE",
    "status": "QUEUED"
  }
}
```

---

### 6.3 生成角色设计图

**端点:** `POST /api/generate/character`

**请求体:**
```json
{
  "characterId": "uuid",
  "appearanceId": "uuid",
  "options": {
    "model": "midjourney-v6",
    "view": "正面",
    "resolution": "1024x1024"
  }
}
```

**响应 (202 Accepted):**
```json
{
  "task": {
    "id": "task-uuid",
    "type": "CHARACTER_VISUAL_GENERATE",
    "status": "QUEUED"
  }
}
```

---

### 6.4 生成视频

**端点:** `POST /api/generate/video`

**请求体:**
```json
{
  "episodeId": "uuid",
  "storyboardId": "uuid",
  "options": {
    "model": "kling-v1",
    "duration": 5,
    "motion": "中等"
  }
}
```

**响应 (202 Accepted):**
```json
{
  "task": {
    "id": "task-uuid",
    "type": "VIDEO_GENERATE",
    "status": "QUEUED"
  }
}
```

---

### 6.5 生成音频/配音

**端点:** `POST /api/generate/audio`

**请求体:**
```json
{
  "episodeId": "uuid",
  "scriptId": "uuid",
  "options": {
    "model": "elevenlabs-v2",
    "voiceId": "voice-uuid",
    "language": "zh-CN"
  }
}
```

**响应 (202 Accepted):**
```json
{
  "task": {
    "id": "task-uuid",
    "type": "VOICE_GENERATE",
    "status": "QUEUED"
  }
}
```

---

### 6.6 获取任务状态

**端点:** `GET /api/generate/status/[taskId]`

**响应 (200 OK):**
```json
{
  "task": {
    "id": "task-uuid",
    "type": "VIDEO_GENERATE",
    "status": "PROCESSING",
    "progress": 65,
    "result": {
      "videoUrl": "https://..."
    },
    "createdAt": "2026-03-12T10:00:00Z",
    "startedAt": "2026-03-12T10:01:00Z"
  }
}
```

---

## 7. 任务 API (Tasks)

### 7.1 流式获取任务进度

**端点:** `GET /api/tasks/[id]/stream`

**响应:** SSE 流

```
event: task.progress
data: {"taskId": "xxx", "progress": 25, "message": "正在生成..."}

event: task.progress
data: {"taskId": "xxx", "progress": 50, "message": "处理中..."}

event: task.completed
data: {"taskId": "xxx", "progress": 100, "result": {...}}
```

---

### 7.2 获取任务进度快照

**端点:** `GET /api/tasks/[id]/progress`

**响应 (200 OK):**
```json
{
  "task": {
    "id": "task-uuid",
    "type": "VIDEO_GENERATE",
    "status": "PROCESSING",
    "progress": 65,
    "attempt": 0,
    "payload": {...},
    "result": null,
    "errorCode": null,
    "errorMessage": null
  }
}
```

---

## 8. 积分 API (Credits)

### 8.1 获取积分余额

**端点:** `GET /api/credits`

**响应 (200 OK):**
```json
{
  "credits": {
    "userId": "uuid",
    "balance": 1000,
    "currency": "USD",
    "lastUpdated": "2026-03-12T12:00:00Z"
  },
  "usageHistory": [
    {
      "id": "uuid",
      "action": "generate_video",
      "quantity": 1,
      "cost": 10,
      "createdAt": "2026-03-12T11:00:00Z"
    }
  ]
}
```

---

### 8.2 充值积分

**端点:** `POST /api/credits`

**请求体:**
```json
{
  "amount": 100,
  "paymentMethod": "alipay"
}
```

**响应 (200 OK):**
```json
{
  "transaction": {
    "id": "txn-uuid",
    "amount": 100,
    "status": "pending",
    "paymentUrl": "https://..."
  }
}
```

---

## 9. 实时通信 API

### 9.1 SSE 连接

**端点:** `GET /api/sse`

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**响应:** SSE 流

```
event: connected
data: {"clientId": "client-uuid", "timestamp": "2026-03-12T12:00:00Z"}

event: task.progress
data: {"taskId": "xxx", "projectId": "yyy", "progress": 50}

event: task.completed
data: {"taskId": "xxx", "projectId": "yyy", "result": {...}}
```

---

### 9.2 Socket.IO 连接

**端点:** `GET /api/socket`

**连接示例:**
```javascript
const socket = io('/api/socket', {
  auth: { token: 'jwt-token' }
})

socket.on('connect', () => {
  console.log('Connected to socket')
})

socket.on('task:progress', (data) => {
  console.log('Task progress:', data)
})

socket.on('task:completed', (data) => {
  console.log('Task completed:', data)
})
```

---

## 10. 邀请 API (Invite)

### 10.1 处理邀请链接

**端点:** `GET /api/invite/[token]`

**响应 (200 OK):**
```json
{
  "invite": {
    "token": "invite-token",
    "projectId": "uuid",
    "projectName": "我的短剧",
    "inviterId": "uuid",
    "inviterName": "张三",
    "role": "EDITOR",
    "expiresAt": "2026-03-19T10:00:00Z",
    "isValid": true
  }
}
```

**接受邀请 (POST):**
```json
{
  "accept": true
}
```

**响应 (200 OK):**
```json
{
  "success": true,
  "membership": {
    "projectId": "uuid",
    "role": "EDITOR"
  }
}
```

---

## 错误响应

### 通用错误格式

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述信息",
    "details": {}
  }
}
```

### 常见错误码

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| `UNAUTHORIZED` | 401 | 未认证 |
| `FORBIDDEN` | 403 | 无权限 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `BAD_REQUEST` | 400 | 请求参数错误 |
| `CONFLICT` | 409 | 资源冲突 |
| `RATE_LIMITED` | 429 | 请求频率超限 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |

---

## 速率限制

| API 类别 | 限制 |
|----------|------|
| 认证 API | 10 次/分钟 |
| 项目 API | 100 次/分钟 |
| 生成 API | 20 次/分钟 |
| 任务 API | 60 次/分钟 |

---

## 附录

### A. 枚举值参考

**ProjectStatus:**
- `DRAFT` - 草稿
- `PROCESSING` - 处理中
- `COMPLETED` - 已完成
- `FAILED` - 失败
- `PAUSED` - 暂停

**TaskStatus:**
- `QUEUED` - 已入队
- `PROCESSING` - 处理中
- `COMPLETED` - 已完成
- `FAILED` - 失败
- `RETRYING` - 重试中

**CharacterRoleLevel:**
- `S` - 绝对主角
- `A` - 核心配角
- `B` - 重要配角
- `C` - 次要角色
- `D` - 群众演员

**LocationType:**
- `INDOOR` - 室内
- `OUTDOOR` - 室外
- `NATURE` - 自然
- `BUILDING` - 建筑
- `FANTASY` - 幻想

---

### B. SDK 使用示例

```typescript
// 使用客户端 SDK
import { createClient } from '@ai-drama-studio/client'

const client = createClient({
  baseUrl: 'http://localhost:3000',
  token: 'jwt-token'
})

// 获取项目列表
const projects = await client.projects.list()

// 创建项目
const project = await client.projects.create({
  name: '我的短剧',
  description: '项目描述'
})

// 生成剧本
const task = await client.generate.script({
  episodeId: 'episode-uuid',
  novelText: '小说原文...'
})

// 监听任务进度
client.tasks.watch(task.id, {
  onProgress: (progress) => console.log(progress),
  onComplete: (result) => console.log(result),
  onError: (error) => console.error(error)
})
```
