# 纳米漫剧流水线 - API 文档

## 概述

本文档描述了"纳米漫剧流水线"功能的后端 API 接口。所有 API 端点都遵循 RESTful 设计规范。

**基础路径**: `/api/projects/:projectId`

---

## 任务队列管理

### 获取任务列表

```http
GET /api/projects/:projectId/tasks
```

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 按状态过滤 (pending/queued/generating/completed/failed) |
| type | string | 否 | 按类型过滤 |

**响应示例**:
```json
{
  "success": true,
  "tasks": [
    {
      "id": "task_1234567890_abc123",
      "projectId": "proj_001",
      "type": "generate_video",
      "status": "completed",
      "priority": "medium",
      "progress": 100,
      "result": { "url": "/mock/generated.mp4" },
      "payload": { "storyboardId": "sb_001" },
      "createdAt": "2026-03-17T10:00:00Z",
      "updatedAt": "2026-03-17T10:05:00Z",
      "completedAt": "2026-03-17T10:05:00Z"
    }
  ],
  "count": 1
}
```

---

### 提交任务

```http
POST /api/projects/:projectId/tasks
```

**请求体**:
```json
{
  "type": "generate_video",
  "payload": {
    "storyboardId": "sb_001",
    "prompt": "描述提示词",
    "settings": {}
  },
  "priority": "medium"
}
```

**响应示例**:
```json
{
  "success": true,
  "taskId": "task_1234567890_abc123",
  "message": "Task submitted successfully"
}
```

---

### 获取任务状态

```http
GET /api/projects/:projectId/tasks/:taskId
```

**响应示例**:
```json
{
  "success": true,
  "task": {
    "id": "task_1234567890_abc123",
    "status": "generating",
    "progress": 45
  }
}
```

---

### 更新任务状态

```http
PATCH /api/projects/:projectId/tasks/:taskId
```

**请求体**:
```json
{
  "status": "completed",
  "progress": 100,
  "result": { "url": "/path/to/result.mp4" }
}
```

---

### 取消任务

```http
DELETE /api/projects/:projectId/tasks/:taskId
```

**响应示例**:
```json
{
  "success": true,
  "message": "Task cancelled successfully"
}
```

---

## 资产管理

### 获取资产列表

```http
GET /api/projects/:projectId/assets
```

**响应示例**:
```json
{
  "success": true,
  "scenes": [],
  "characters": [],
  "props": []
}
```

---

### 提取资产 (LLM)

```http
POST /api/projects/:projectId/assets/extract
```

**请求体**:
```json
{
  "script": "剧本内容..."
}
```

**响应示例**:
```json
{
  "success": true,
  "taskId": "task_extract_001",
  "message": "Asset extraction task submitted"
}
```

---

### 生成资产图像

```http
POST /api/projects/:projectId/assets/generate
```

**请求体**:
```json
{
  "type": "scene",
  "assetId": "scene_001",
  "prompt": "宴会厅场景，灯光璀璨，豪门婚宴",
  "settings": {
    "model": "nanomi-pro",
    "resolution": "4K"
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "taskId": "task_gen_img_001",
  "message": "Image generation task submitted"
}
```

---

## 分镜脚本

### 拆分分镜 (LLM)

```http
POST /api/projects/:projectId/storyboard/split
```

**请求体**:
```json
{
  "script": "剧本内容...",
  "lensDensity": "standard"
}
```

**响应示例**:
```json
{
  "success": true,
  "taskId": "task_split_001",
  "message": "Storyboard splitting task submitted"
}
```

---

### 生成分镜图

```http
POST /api/projects/:projectId/storyboard/generate
```

**请求体**:
```json
{
  "storyboardId": "sb_001",
  "mode": "single",
  "prompt": "场景描述提示词",
  "referenceImages": [],
  "settings": {
    "model": "jimeng-lite",
    "quantity": 1
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "taskId": "task_sb_img_001",
  "message": "Storyboard image generation task submitted"
}
```

---

## 视频生成

### 生成视频

```http
POST /api/projects/:projectId/video/generate
```

**请求体**:
```json
{
  "storyboardId": "sb_001",
  "mode": "image-to-video",
  "prompt": "视频生成提示词",
  "referenceImages": [],
  "settings": {
    "model": "vidu-1.5",
    "duration": 5,
    "quantity": 1,
    "quality": "high",
    "cameraMotion": "none",
    "specialEffect": "normal"
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "taskId": "task_video_001",
  "message": "Video generation task submitted"
}
```

---

## 配音与对口型

### 生成配音 (TTS)

```http
POST /api/projects/:projectId/dubbing/generate
```

**请求体**:
```json
{
  "storyboardId": "sb_001",
  "dialogues": [
    {
      "id": "d1",
      "characterId": "c1",
      "text": "台词内容"
    }
  ],
  "characterVoices": {
    "c1": "v1"
  },
  "settings": {
    "model": "azure-tts",
    "defaultSpeed": 1.0,
    "defaultVolume": 1.0
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "taskId": "task_dubbing_001",
  "message": "Dubbing generation task submitted"
}
```

---

### 生成对口型

```http
POST /api/projects/:projectId/lipsync/generate
```

**请求体**:
```json
{
  "storyboardId": "sb_001",
  "videoUrl": "/path/to/video.mp4",
  "audioUrl": "/path/to/audio.mp3"
}
```

**响应示例**:
```json
{
  "success": true,
  "taskId": "task_lipsync_001",
  "message": "Lipsync generation task submitted"
}
```

---

## 视频导出

### 导出视频

```http
POST /api/projects/:projectId/export
```

**请求体**:
```json
{
  "resolution": "1080p",
  "format": "mp4",
  "includeSubtitles": true,
  "includeDubbing": true,
  "includeMusic": true,
  "timeline": {}
}
```

**响应示例**:
```json
{
  "success": true,
  "taskId": "task_export_001",
  "cost": 20,
  "message": "Video export task submitted"
}
```

---

## 任务类型枚举

| 类型 | 值 | 说明 |
|------|-----|------|
| 资产提取 | `extract_assets` | LLM 提取场景/角色/道具 |
| 场景图生成 | `generate_scene_image` | AI 生成场景图像 |
| 角色图生成 | `generate_character_image` | AI 生成角色图像 |
| 道具图生成 | `generate_prop_image` | AI 生成道具图像 |
| 分镜拆分 | `split_storyboard` | LLM 拆分剧本为分镜 |
| 分镜图生成 | `generate_storyboard_image` | AI 生成分镜图 |
| 对话作图 | `chat_generate_image` | 对话式生成图像 |
| 九宫格生成 | `generate_grid_nine` | 生成 9 个机位图 |
| 视频生成 | `generate_video` | 图生视频 |
| 多参生视频 | `generate_multi_param_video` | 多参考图视频 |
| 首尾帧视频 | `generate_frame_video` | 首尾帧过渡视频 |
| 配音生成 | `generate_dubbing` | TTS 配音 |
| 对口型 | `generate_lipsync` | 唇形同步 |
| 视频导出 | `export_video` | 最终视频导出 |

---

## 任务状态枚举

| 状态 | 值 | 说明 |
|------|-----|------|
| 待处理 | `pending` | 任务已提交，等待处理 |
| 排队中 | `queued` | 任务已进入队列 |
| 生成中 | `generating` | 正在处理中 |
| 已完成 | `completed` | 任务成功完成 |
| 失败 | `failed` | 任务处理失败 |

---

## 错误响应

所有 API 错误返回统一格式：

```json
{
  "error": "错误描述信息"
}
```

**常见 HTTP 状态码**:
- `200` - 成功
- `400` - 请求参数错误
- `404` - 资源未找到
- `500` - 服务器内部错误

---

## 开发说明

### 本地开发环境

当前实现使用内存队列 (`InMemoryTaskQueue`)，适用于开发和测试环境。

### 生产环境部署

生产环境应使用 Redis + BullMQ 实现持久化任务队列：

```typescript
import { BullMQTaskQueue } from '@/lib/task-queue/bullmq'

const queue = new BullMQTaskQueue({
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  }
})
```

### Worker 处理器

后台任务处理器运行示例：

```bash
node -r tsx apps/web/lib/workers/task-processor.ts
```

---

*文档版本：v1.0*
*创建日期：2026-03-17*
