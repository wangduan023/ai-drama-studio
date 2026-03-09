# AI Drama Studio - Docker 部署指南

## 快速启动

### 开发模式（支持热重载）

```bash
# 1. 复制环境配置
cp docker/.env.docker .env

# 2. 编辑环境变量（填入 API Keys）
vim .env

# 3. 启动所有服务
docker compose -f docker-compose.dev.yml up -d --build

# 4. 查看日志
docker compose -f docker-compose.dev.yml logs -f

# 5. 访问应用
# Web: http://localhost:3000
# Bull Board: http://localhost:3010/admin/queues

# 6. 停止服务
docker compose -f docker-compose.dev.yml down
```

### 生产模式

```bash
# 1. 复制并编辑环境配置
cp docker/.env.docker .env
vim .env

# 2. 构建并启动
docker compose -f docker-compose.prod.yml up -d --build

# 3. 查看日志
docker compose -f docker-compose.prod.yml logs -f

# 4. 停止服务
docker compose -f docker-compose.prod.yml down
```

### 默认模式（一键启动）

```bash
# 使用 docker-compose.yml（默认配置）
docker compose up -d --build

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f web
docker compose logs -f worker
```

---

## 服务架构

```
┌─────────────────────────────────────────────────────────┐
│                    ai-drama-network                      │
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐          │
│  │   Web    │───▶│  Worker  │───▶│  MySQL   │          │
│  │  :3000   │    │          │    │  :3306   │          │
│  │          │    │          │    │          │          │
│  │  :3010   │    │          │    └──────────┘          │
│  └────┬─────┘    └────┬─────┘                           │
│       │               │                                 │
│       ▼               ▼                                 │
│  ┌──────────┐    ┌──────────┐                          │
│  │  Redis   │◀───│  Volumes │                          │
│  │  :6379   │    │  /app/data                         │
│  └──────────┘    └──────────┘                          │
└─────────────────────────────────────────────────────────┘
```

---

## 环境变量配置

### 核心配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | MySQL 连接字符串 | 自动配置 |
| `REDIS_HOST` | Redis 主机 | `redis` |
| `REDIS_PORT` | Redis 端口 | `6379` |
| `NEXTAUTH_SECRET` | NextAuth 密钥 | 需自定义 |

### AI API 配置

| 变量 | 说明 |
|------|------|
| `OPENAI_API_KEY` | OpenAI API Key |
| `ANTHROPIC_API_KEY` | Anthropic API Key |
| `GOOGLE_API_KEY` | Google Gemini API Key |

---

## 数据持久化

### Volumes

| Volume | 用途 | 路径 |
|--------|------|------|
| `mysql_data` | MySQL 数据 | `/var/lib/mysql` |
| `redis_data` | Redis 数据 | `/data` |
| `./data` | 上传文件 | `/app/data/uploads` |
| `./docker-logs` | 应用日志 | `/app/logs` |

### 备份数据

```bash
# 备份 MySQL 数据
docker compose exec mysql mysqldump -uroot -paidrama123 ai_drama_studio > backup.sql

# 恢复 MySQL 数据
docker compose exec -T mysql mysql -uroot -paidrama123 ai_drama_studio < backup.sql

# 备份上传文件
tar -czf data-backup.tar.gz ./data
```

---

## 常用命令

```bash
# 重启服务
docker compose restart web worker

# 重建容器
docker compose up -d --build --force-recreate

# 进入容器
docker compose exec web sh
docker compose exec worker sh

# 查看资源使用
docker stats

# 清理无用资源
docker compose down -v  # 删除数据卷（谨慎使用）
docker system prune -a  # 清理所有未使用的资源
```

---

## 网络配置

服务间通过 `ai-drama-network` 网络通信：

- Web → MySQL: 使用服务名 `mysql:3306`
- Web → Redis: 使用服务名 `redis:6379`
- Worker → MySQL: 使用服务名 `mysql:3306`
- Worker → Redis: 使用服务名 `redis:6379`

---

## 健康检查

| 服务 | 检查方式 | 间隔 |
|------|---------|------|
| MySQL | `mysqladmin ping` | 5s |
| Redis | `redis-cli ping` | 5s |
| Web | HTTP `/api/health` | 30s |

---

## 故障排查

### Web 服务无法启动

```bash
# 查看日志
docker compose logs web

# 检查数据库连接
docker compose exec web sh -c "mysql -h mysql -uroot -paidrama123 -e 'SELECT 1'"
```

### Worker 无法连接 Redis

```bash
# 测试 Redis 连接
docker compose exec worker sh -c "redis-cli -h redis ping"
```

### 数据库初始化失败

```bash
# 重置数据库
docker compose down -v
docker compose up -d --build
```

---

## 生产环境建议

1. **修改默认密码**
   - MySQL: `MYSQL_ROOT_PASSWORD`
   - NextAuth: `NEXTAUTH_SECRET`

2. **配置 HTTPS**
   - 使用 Nginx 或 Caddy 作为反向代理

3. **扩展 Worker**
   ```yaml
   worker:
     deploy:
       replicas: 4  # 扩展 worker 数量
   ```

4. **监控和告警**
   - 配置日志聚合（ELK / Loki）
   - 配置 Prometheus + Grafana 监控

---

## 技术栈

| 组件 | 版本 | 说明 |
|------|------|------|
| Node.js | 20 | 运行时 |
| Next.js | 15 | Web 框架 |
| Prisma | 6 | ORM |
| BullMQ | 5 | 任务队列 |
| MySQL | 8.0 | 数据库 |
| Redis | 7 | 缓存/队列 |
