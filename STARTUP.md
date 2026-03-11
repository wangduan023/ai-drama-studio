# AI Drama Studio - 项目启动指南

## 快速启动

### 1. 一键启动（推荐）

```bash
cd /home/ubuntu/dev/ai-drama-studio

# 后台启动所有服务
pnpm dev &

# 或前台启动（能看到日志）
pnpm dev
```

服务启动后访问：http://localhost:3000

---

## 手动分步启动

### 步骤1：启动数据库（Docker）

```bash
# 启动 MySQL 和 Redis
cd /home/ubuntu/dev/ai-drama-studio
docker-compose up -d mysql redis

# 验证状态
docker ps
```

### 步骤2：数据库迁移

```bash
# 生成 Prisma Client
cd packages/db
pnpm db:generate

# 执行迁移（如需要）
pnpm db:migrate:dev

# 或重置数据库
pnpm db:migrate:reset --force
```

### 步骤3：启动 Web 服务

```bash
# 终端1：启动 Next.js 开发服务器
cd apps/web
pnpm dev

# 或后台运行
nohup pnpm dev > /tmp/web.log 2>&1 &
```

### 步骤4：启动 Worker

```bash
# 终端2：启动任务处理器
cd apps/worker
pnpm dev

# 或后台运行
nohup pnpm dev > /tmp/worker.log 2>&1 &
```

---

## 常用命令

### 后台运行（推荐用于长时间运行）

```bash
cd /home/ubuntu/dev/ai-drama-studio

# 方式1：使用 pnpm dev（自动同时启动 web 和 worker）
nohup pnpm dev > /tmp/dev.log 2>&1 &

# 查看日志
tail -f /tmp/dev.log

# 停止服务
pkill -f "pnpm dev"
```

### 查看服务状态

```bash
# 查看端口占用
lsof -i:3000  # Web
lsof -i:13306 # MySQL
lsof -i:16379 # Redis

# 查看 Docker 容器
docker ps

# 查看进程
ps aux | grep -E "next|worker"
```

### 停止服务

```bash
# 停止所有服务
pkill -9 -f "pnpm dev|next dev|tsx watch"

# 停止 Docker
docker-compose down
```

---

## 验证启动成功

### 1. 检查端口

```bash
# Web 服务
curl http://localhost:3000/api/projects

# MySQL
docker exec ai-drama-studio-mysql-dev mysql -uroot -paidrama123 -e "SELECT 1"

# Redis
docker exec ai-drama-studio-redis-dev redis-cli ping
```

### 2. 浏览器访问

- 首页：http://localhost:3000
- 项目库：http://localhost:3000/projects
- 角色库：http://localhost:3000/library/characters
- 场景库：http://localhost:3000/library/locations

---

## 故障排查

### 问题1：端口 3000 被占用

```bash
# 查找占用进程
lsof -i:3000

# 终止进程
kill -9 <PID>

# 或更换端口
cd apps/web
PORT=3001 pnpm dev
```

### 问题2：数据库连接失败

```bash
# 检查 MySQL 容器
docker ps | grep mysql

# 重启 MySQL
docker-compose restart mysql

# 检查日志
docker logs ai-drama-studio-mysql-dev
```

### 问题3：依赖缺失

```bash
# 重新安装依赖
pnpm install

# 生成 Prisma Client
cd packages/db
pnpm db:generate
```

---

## 配置文件

### 环境变量

```bash
# 主环境配置
cat .env

# Web 应用配置
cat apps/web/.env

# Worker 配置
cat apps/worker/.env
```

### 关键配置项

| 配置项 | 文件 | 说明 |
|--------|------|------|
| DATABASE_URL | .env | MySQL 连接字符串 |
| REDIS_HOST | .env | Redis 地址 |
| NEXT_PUBLIC_API_URL | apps/web/.env | API 基础地址 |
```

---

## 现在可以运行

```bash
cd /home/ubuntu/dev/ai-drama-studio
pnpm dev
```

然后访问 http://localhost:3000