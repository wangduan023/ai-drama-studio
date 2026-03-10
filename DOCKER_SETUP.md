# AI Drama Studio - Docker 环境配置指南

## 配置文件清单

### Docker Compose 文件
| 文件 | 用途 | 说明 |
|------|------|------|
| `docker-compose.yml` | 默认配置 | 适合快速启动和演示 |
| `docker-compose.dev.yml` | 开发环境 | 支持热重载，适合开发调试 |
| `docker-compose.prod.yml` | 生产环境 | 优化配置，资源限制，健康检查 |

### 环境变量示例文件
| 文件 | 用途 |
|------|------|
| `.env.example` | 通用环境变量示例 |
| `.env.docker.example` | Docker 环境专用配置 |
| `.env.mysql.example` | MySQL 本地开发配置 |
| `.env.sqlite.example` | SQLite 本地开发配置 |
| `docker/.env.docker.example` | Docker 容器内部配置 |

### Dockerfile 文件
| 文件 | 用途 |
|------|------|
| `docker/Dockerfile.web` | Web 应用生产镜像 |
| `docker/Dockerfile.web.dev` | Web 应用开发镜像（热重载） |
| `docker/Dockerfile.worker` | Worker 生产镜像 |
| `docker/Dockerfile.worker.dev` | Worker 开发镜像（热重载） |

---

## 服务配置详情

### MySQL 容器
```yaml
镜像: mysql:8.0
容器名: 
  - 默认: ai-drama-studio-mysql
  - 开发: ai-drama-studio-mysql-dev
  - 生产: ai-drama-studio-mysql-prod
端口映射: 13306:3306
数据卷: mysql_data / mysql_dev_data / mysql_prod_data
健康检查: mysqladmin ping
```

### Redis 容器
```yaml
镜像: redis:7-alpine
容器名:
  - 默认: ai-drama-studio-redis
  - 开发: ai-drama-studio-redis-dev
  - 生产: ai-drama-studio-redis-prod
端口映射: 16379:6379
数据卷: redis_data / redis_dev_data / redis_prod_data
持久化: AOF (appendonly yes)
健康检查: redis-cli ping
```

### Web 容器 (Next.js)
```yaml
构建上下文: .
Dockerfile: docker/Dockerfile.web (生产) / docker/Dockerfile.web.dev (开发)
端口映射:
  - 3000:3000 (Web 应用)
  - 3010:3010 (Bull Board 队列管理)
依赖: mysql, redis (健康检查通过后启动)
数据卷:
  - ./data:/app/data (上传文件)
  - ./docker-logs:/app/logs (日志文件)
```

### Worker 容器 (BullMQ)
```yaml
构建上下文: .
Dockerfile: docker/Dockerfile.worker (生产) / docker/Dockerfile.worker.dev (开发)
依赖: mysql, redis (健康检查通过后启动)
数据卷:
  - ./data:/app/data (上传文件)
  - ./docker-logs:/app/logs (日志文件)
生产配置: 支持多副本 (replicas: 2)
```

---

## 网络配置

服务间通过 Docker 网络通信：
- **默认网络**: `ai-drama-network`
- **开发网络**: `ai-drama-dev-network`
- **生产网络**: `ai-drama-prod-network`

内部连接方式：
- MySQL: `mysql:3306`
- Redis: `redis:6379`

---

## 启动命令

### 快速启动（默认配置）
```bash
# 1. 配置环境变量
cp .env.docker.example .env
# 编辑 .env 填入 API Keys

# 2. 启动所有服务
docker compose up -d --build

# 3. 查看日志
docker compose logs -f

# 4. 访问应用
# Web: http://localhost:3000
# Bull Board: http://localhost:3010/admin/queues
```

### 开发模式（热重载）
```bash
# 1. 配置环境变量
cp .env.docker.example .env

# 2. 启动开发环境
docker compose -f docker-compose.dev.yml up -d --build

# 3. 查看日志
docker compose -f docker-compose.dev.yml logs -f

# 4. 停止服务
docker compose -f docker-compose.dev.yml down
```

### 生产模式
```bash
# 1. 配置环境变量（必须）
cp .env.docker.example .env
# 编辑 .env 填入强密码和 API Keys

# 2. 启动生产环境
docker compose -f docker-compose.prod.yml up -d --build

# 3. 查看日志
docker compose -f docker-compose.prod.yml logs -f

# 4. 停止服务
docker compose -f docker-compose.prod.yml down
```

---

## 健康检查配置

| 服务 | 检查方式 | 间隔 | 超时 | 重试次数 |
|------|---------|------|------|----------|
| MySQL | `mysqladmin ping` | 5s | 5s | 30 |
| Redis | `redis-cli ping` | 5s | 5s | 30 |
| Web (生产) | HTTP `/api/health` | 30s | 10s | 3 |

---

## 数据持久化

### 数据卷
| 卷名 | 用途 | 容器路径 |
|------|------|----------|
| `mysql_data` | MySQL 数据库文件 | `/var/lib/mysql` |
| `redis_data` | Redis 数据文件 | `/data` |
| `./data` | 上传文件存储 | `/app/data/uploads` |
| `./docker-logs` | 应用日志 | `/app/logs` |

### 备份数据
```bash
# 备份 MySQL
docker compose exec mysql mysqldump -uroot -paidrama123 ai_drama_studio > backup.sql

# 恢复 MySQL
docker compose exec -T mysql mysql -uroot -paidrama123 ai_drama_studio < backup.sql

# 备份上传文件
tar -czf data-backup.tar.gz ./data
```

---

## 故障排查

### 查看服务状态
```bash
docker compose ps
docker compose logs <service-name>
```

### 进入容器调试
```bash
docker compose exec web sh
docker compose exec worker sh
docker compose exec mysql mysql -uroot -paidrama123
```

### 测试数据库连接
```bash
docker compose exec web sh -c "mysql -h mysql -uroot -paidrama123 -e 'SELECT 1'"
```

### 测试 Redis 连接
```bash
docker compose exec worker sh -c "redis-cli -h redis ping"
```

### 重置所有数据
```bash
# 警告：这将删除所有数据！
docker compose down -v
docker compose up -d --build
```

---

## 验证结果

✅ 所有 Docker Compose 配置已通过验证：
- `docker-compose.yml` ✓
- `docker-compose.dev.yml` ✓
- `docker-compose.prod.yml` ✓

✅ 所有服务配置完整：
- MySQL 8.0 配置正确 ✓
- Redis 7 配置正确 ✓
- Web 应用配置正确 ✓
- Worker 配置正确 ✓
- 网络配置正确 ✓
- 健康检查配置正确 ✓
- 环境变量文档完善 ✓
