# AI Drama Studio - 部署指南

> **最后更新:** 2026-03-12
> **版本:** 0.1.0

---

## 1. 部署方式概览

| 方式 | 适用场景 | 复杂度 |
|------|----------|--------|
| Docker Compose | 生产/测试环境 | 低 |
| 本地开发 | 开发环境 | 低 |
| Kubernetes | 大规模生产环境 | 中 |
| 云平台部署 | AWS/GCP/Azure | 中 |

---

## 2. Docker Compose 部署（推荐）

### 2.1 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 8GB+ RAM
- 4 核 + CPU

### 2.2 启动服务

```bash
# 进入项目目录
cd ai-drama-studio

# 启动所有服务（后台运行）
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 2.3 服务组件

| 服务 | 容器名 | 端口 | 说明 |
|------|--------|------|------|
| MySQL | ai-drama-studio-mysql | 13306:3306 | 数据库 |
| Redis | ai-drama-studio-redis | 16379:6379 | 缓存/队列 |
| Web | ai-drama-studio-web | 3000:3000 | Next.js 应用 |
| Worker | ai-drama-studio-worker | - | BullMQ 后台任务 |
| Bull Board | (内置于 Web) | 3010:3010 | 队列管理面板 |

### 2.4 访问地址

| 服务 | URL |
|------|-----|
| Web 应用 | http://localhost:3000 |
| Bull Board | http://localhost:3010/admin/queues |

### 2.5 数据库初始化

```bash
# 进入 Web 容器
docker-compose exec web bash

# 推送数据库结构
npx prisma db push

# (可选) 插入种子数据
npm run db:seed
```

### 2.6 停止服务

```bash
# 正常停止
docker-compose down

# 停止并删除数据卷（谨慎使用）
docker-compose down -v
```

---

## 3. 本地开发部署

### 3.1 环境要求

```bash
# Node.js
node -v  # >= 20.0.0

# pnpm
pnpm -v  # >= 8.0.0

# MySQL (可选，也可用 Docker)
mysql -V # 8.0+

# Redis (可选，也可用 Docker)
redis-server -v # 7.0+
```

### 3.2 安装步骤

```bash
# 克隆仓库
git clone https://github.com/your-org/ai-drama-studio.git
cd ai-drama-studio

# 安装依赖
pnpm install

# 生成 Prisma 客户端
pnpm db:generate

# 复制环境变量文件
cp apps/web/.env.example apps/web/.env.local
```

### 3.3 配置环境变量

编辑 `apps/web/.env.local`:

```bash
# 数据库
DATABASE_URL="mysql://root:password@localhost:13306/ai_drama_studio"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"

# 认证
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# AI API Keys
OPENAI_API_KEY="sk-xxx"
ANTHROPIC_API_KEY="sk-ant-xxx"
GOOGLE_API_KEY="xxx"
```

### 3.4 启动开发服务

```bash
# 方式 1: 使用 Docker 启动基础设施
docker-compose up -d mysql redis

# 方式 2: 本地启动所有服务
pnpm dev

# 方式 3: 分别启动
# 终端 1 - Web 服务
pnpm dev:web

# 终端 2 - Worker
pnpm dev:worker
```

### 3.5 数据库迁移

```bash
# 开发环境迁移
pnpm db:migrate

# 生产环境迁移
pnpm db:migrate:deploy

# 插入种子数据
pnpm db:seed
```

---

## 4. 生产环境配置

### 4.1 环境变量

创建 `.env.production`:

```bash
# ===== 数据库 =====
DATABASE_URL="mysql://user:password@mysql-host:3306/ai_drama_studio"

# ===== Redis =====
REDIS_HOST="redis-host"
REDIS_PORT="6379"
REDIS_PASSWORD="your-redis-password"

# ===== 认证 =====
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generate-a-strong-secret-key"

# ===== AI API Keys =====
OPENAI_API_KEY="sk-xxx"
ANTHROPIC_API_KEY="sk-ant-xxx"
GOOGLE_API_KEY="xxx"
# 根据需要添加更多...

# ===== 存储配置 =====
STORAGE_TYPE="s3"  # local | s3 | oss
STORAGE_LOCAL_PATH="/data/uploads"

# S3 配置（如使用）
AWS_ACCESS_KEY_ID="xxx"
AWS_SECRET_ACCESS_KEY="xxx"
AWS_BUCKET_NAME="your-bucket"
AWS_REGION="us-east-1"

# ===== Bull Board =====
BULL_BOARD_HOST="0.0.0.0"
BULL_BOARD_PORT="3010"
BULL_BOARD_BASE_PATH="/admin/queues"

# ===== 日志配置 =====
LOG_LEVEL="INFO"
LOG_FORMAT="json"
LOG_SERVICE="ai-drama-studio"

# ===== 内部密钥 =====
CRON_SECRET="your-cron-secret"
INTERNAL_TASK_TOKEN="your-task-token"
API_ENCRYPTION_KEY="your-encryption-key"
```

### 4.2 生成安全密钥

```bash
# 生成 NEXTAUTH_SECRET
openssl rand -base64 32

# 生成 API_ENCRYPTION_KEY
openssl rand -hex 32
```

### 4.3 构建生产镜像

```bash
# 构建 Web 镜像
docker-compose build web

# 构建 Worker 镜像
docker-compose build worker

# 或直接使用 dockerfile
docker build -f docker/Dockerfile.web -t ai-drama-studio-web:latest .
docker build -f docker/Dockerfile.worker -t ai-drama-studio-worker:latest .
```

---

## 5. Kubernetes 部署

### 5.1 资源文件示例

```yaml
# k8s/web-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-drama-web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-drama-web
  template:
    metadata:
      labels:
        app: ai-drama-web
    spec:
      containers:
      - name: web
        image: ai-drama-studio-web:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: ai-drama-secrets
              key: database-url
        - name: REDIS_HOST
          value: "redis-master"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: ai-drama-web
spec:
  selector:
    app: ai-drama-web
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

### 5.2 Worker 部署

```yaml
# k8s/worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-drama-worker
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ai-drama-worker
  template:
    spec:
      containers:
      - name: worker
        image: ai-drama-studio-worker:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: ai-drama-secrets
              key: database-url
        - name: REDIS_HOST
          value: "redis-master"
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

### 5.3 应用部署

```bash
# 创建 Secret
kubectl create secret generic ai-drama-secrets \
  --from-literal=database-url="mysql://..." \
  --from-literal=redis-password="xxx" \
  --from-literal=nextauth-secret="xxx"

# 应用配置
kubectl apply -f k8s/web-deployment.yaml
kubectl apply -f k8s/worker-deployment.yaml
```

---

## 6. 云平台部署

### 6.1 AWS 部署

#### 使用 ECS + RDS + ElastiCache

```bash
# 1. 创建 RDS MySQL 实例
aws rds create-db-instance \
  --db-instance-identifier ai-drama-db \
  --db-instance-class db.t3.medium \
  --engine mysql \
  --engine-version 8.0 \
  --master-username admin \
  --master-user-password your-password \
  --allocated-storage 100

# 2. 创建 ElastiCache Redis
aws elasticache create-cache-cluster \
  --cache-cluster-id ai-drama-redis \
  --engine redis \
  --cache-node-type cache.t3.medium \
  --num-cache-nodes 1

# 3. 创建 ECR 仓库
aws ecr create-repository --repository-name ai-drama-web
aws ecr create-repository --repository-name ai-drama-worker

# 4. 推送镜像
docker tag ai-drama-studio-web:latest <account>.dkr.ecr.region.amazonaws.com/ai-drama-web:latest
docker push <account>.dkr.ecr.region.amazonaws.com/ai-drama-web:latest
```

### 6.2 Vercel 部署 (Web)

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
cd apps/web
vercel

# 生产部署
vercel --prod
```

**环境变量配置:**
在 Vercel Dashboard 添加:
- `DATABASE_URL`
- `REDIS_HOST` (需要外部 Redis 服务)
- `NEXTAUTH_SECRET`
- `OPENAI_API_KEY` 等

### 6.3 Railway/Render 部署

```bash
# Railway CLI
npm i -g @railway/cli
railway login
railway init
railway up
```

---

## 7. 监控与日志

### 7.1 日志收集

```yaml
# docker-compose.logging.yml
version: '3.8'
services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./loki:/etc/loki

  promtail:
    image: grafana/promtail:latest
    volumes:
      - ./docker-logs:/var/log/containers
      - ./promtail:/etc/promtail

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
```

### 7.2 健康检查端点

```typescript
// GET /api/health
{
  "status": "ok",
  "timestamp": "2026-03-12T10:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "queue": "ready"
  }
}
```

---

## 8. 备份与恢复

### 8.1 MySQL 备份

```bash
# 备份
docker-compose exec mysql mysqldump \
  -u root -paidrama123 \
  ai_drama_studio > backup-$(date +%Y%m%d).sql

# 恢复
docker-compose exec -T mysql mysql \
  -u root -paidrama123 \
  ai_drama_studio < backup-20260312.sql
```

### 8.2 Redis 备份

```bash
# 触发 RDB 保存
docker-compose exec redis redis-cli BGSAVE

# 复制 RDB 文件
docker cp ai-drama-studio-redis:/data/dump.rdb ./backup-redis/dump.rdb
```

---

## 9. 故障排查

### 9.1 常见问题

**问题 1: Web 服务无法连接数据库**

```bash
# 检查数据库容器
docker-compose ps mysql

# 查看数据库日志
docker-compose logs mysql

# 测试连接
docker-compose exec web mysql -h mysql -u root -paidrama123 -e "SELECT 1"
```

**问题 2: Worker 无法连接 Redis**

```bash
# 检查 Redis 容器
docker-compose ps redis

# 查看 Redis 日志
docker-compose logs redis

# 测试连接
docker-compose exec worker redis-cli -h redis ping
```

**问题 3: Bull Board 无法访问**

```bash
# 检查端口占用
lsof -i :3010

# 查看 Web 服务日志
docker-compose logs web | grep "Bull Board"
```

### 9.2 性能优化

```bash
# 查看容器资源使用
docker stats

# 调整 Worker 并发数
# 编辑 docker-compose.yml
QUEUE_CONCURRENCY_IMAGE: "20"  # 降低并发
QUEUE_CONCURRENCY_VIDEO: "20"
```

---

## 10. 扩容策略

### 10.1 水平扩容

```bash
# 增加 Worker 实例
docker-compose up -d --scale worker=3

# Web 服务扩容（需要负载均衡）
docker-compose up -d --scale web=3
```

### 10.2 队列分区

```typescript
// 按任务类型分离队列
const queues = {
  HIGH_PRIORITY: 'drama:high',
  IMAGE: 'drama:image',
  VIDEO: 'drama:video',
  VOICE: 'drama:voice',
}

// 不同 Worker 处理不同队列
// Worker 1: 高优先级队列
// Worker 2: 图像队列
// Worker 3: 视频队列
```

---

## 附录

### A. Docker 文件参考

**Dockerfile.web:**
```dockerfile
FROM node:20-alpine AS base

# 依赖阶段
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# 构建阶段
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm && pnpm build

# 生产阶段
FROM base AS runner
WORKDIR /app
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

### B. 检查清单

部署前检查:

- [ ] 环境变量已配置
- [ ] 数据库连接正常
- [ ] Redis 连接正常
- [ ] AI API Keys 已配置
- [ ] 存储路径权限正确
- [ ] 防火墙规则已配置
- [ ] SSL 证书已安装（生产）
- [ ] 备份策略已配置
- [ ] 监控告警已配置
