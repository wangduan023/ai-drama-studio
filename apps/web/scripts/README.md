# 数据初始化和测试脚本

本目录包含用于数据初始化和测试的脚本。

## 脚本说明

### 1. seed.ts - 数据库种子脚本

创建测试数据，包括：
- 测试用户 (`test@example.com`)
- 测试项目（"我的第一个短剧"）
- 测试角色（张三、李四、王五）
- 测试场景（咖啡厅、城市公园、主角公寓）
- 测试剧集和剧本
- 测试分镜

**使用方法：**
```bash
pnpm db:seed
```

**环境变量：**
- `DATABASE_URL` - 数据库连接字符串（必需）

---

### 2. verify-db.mjs - 数据库验证脚本

验证数据库状态：
- 检查数据库连接
- 统计各表数据量
- 验证表结构完整性
- 验证关联关系
- 检查索引

**使用方法：**
```bash
pnpm db:verify
```

**输出示例：**
```
📊 Counting Records
========================================
   👤 Users: 1
   📁 Projects: 1 (active: 1)
   🎭 Characters: 3 (active: 3)
   🎬 Locations: 3 (active: 3)
   🎥 Episodes: 1 (active: 1)
```

---

### 3. test-api.mjs - API 测试脚本

测试所有 API 端点：
- **Projects API**: GET / POST / PUT / DELETE
- **Tasks API**: GET / POST
- **SSE API**: 测试 SSE 连接

**使用方法：**
```bash
# 确保服务已启动
pnpm dev

# 运行测试
pnpm test:api
```

**环境变量：**
- `API_URL` - API 基础 URL（默认: http://localhost:3000）

**自定义 API URL：**
```bash
API_URL=http://localhost:3001 pnpm test:api
```

---

## 快速开始

### 首次设置

1. **安装依赖**
   ```bash
   pnpm install
   ```

2. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，设置 DATABASE_URL
   ```

3. **运行数据库迁移**
   ```bash
   cd packages/db
   pnpm db:migrate
   ```

### 日常使用

```bash
# 1. 验证数据库连接
pnpm db:verify

# 2. 填充测试数据
pnpm db:seed

# 3. 启动开发服务器
pnpm dev

# 4. 在另一个终端运行 API 测试
pnpm test:api
```

---

## 故障排除

### 数据库连接失败

```
❌ Connection failed: Can't reach database server
```

**解决方案：**
1. 检查 `.env` 文件中的 `DATABASE_URL`
2. 确保数据库服务正在运行
3. 检查网络连接和防火墙设置

### 表不存在

```
❌ projects (missing)
```

**解决方案：**
```bash
cd packages/db
pnpm db:migrate
# 或
pnpm db:push
```

### API 测试连接失败

```
❌ Cannot connect to http://localhost:3000
```

**解决方案：**
1. 确保开发服务器已启动：`pnpm dev`
2. 检查 `API_URL` 环境变量
3. 检查端口是否被占用

---

## 依赖说明

| 包名 | 版本 | 用途 |
|------|------|------|
| `@prisma/client` | ^6.1.0 | 数据库客户端 |
| `tsx` | ^4.19.2 | TypeScript 执行器 |

---

## 扩展脚本

如需添加新的测试数据或 API 测试用例，请编辑对应的脚本文件：

- **添加测试数据**: 编辑 `seed.ts`
- **添加 API 测试**: 编辑 `test-api.mjs`
- **添加验证项**: 编辑 `verify-db.mjs`
