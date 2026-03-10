# AI Drama Studio 数据库配置

## 双数据库支持

本项目支持 **MySQL** 和 **SQLite** 两种数据库，可以通过环境变量快速切换。

## 快速开始

### 1. SQLite 模式（推荐用于开发）

```bash
# 复制 SQLite 配置文件
cp .env.sqlite.example .env

# 或直接设置环境变量
export DATABASE_PROVIDER=sqlite
export DATABASE_URL="file:./dev.db"

# 运行迁移
cd packages/db
npx prisma migrate dev --name init
npx prisma generate
```

### 2. MySQL 模式（推荐用于生产）

```bash
# 复制 MySQL 配置文件
cp .env.mysql.example .env

# 或直接设置环境变量
export DATABASE_PROVIDER=mysql
export DATABASE_URL="mysql://root:password@localhost:3306/ai_drama_studio"

# 运行迁移
cd packages/db
npx prisma migrate dev --name init
npx prisma generate
```

## 配置文件说明

### .env.sqlite.example
```bash
DATABASE_PROVIDER=sqlite
DATABASE_URL="file:./dev.db"
```

### .env.mysql.example
```bash
DATABASE_PROVIDER=mysql
DATABASE_URL="mysql://root:aidrama123@localhost:3306/ai_drama_studio"
```

## 切换数据库

### 方式一：使用切换脚本（推荐）

```bash
cd packages/db

# 切换到 SQLite
./scripts/switch-db.sh sqlite

# 切换到 MySQL
./scripts/switch-db.sh mysql

# 恢复到之前的配置
./scripts/switch-db.sh revert
```

### 方式二：手动切换

1. 停止所有运行的服务
2. 修改 `.env` 文件中的 `DATABASE_PROVIDER` 和 `DATABASE_URL`
3. 复制对应的 schema 文件：
   ```bash
   # SQLite
   cp prisma/schema.sqlite.prisma prisma/schema.prisma

   # MySQL
   cp prisma/schema.mysql.prisma prisma/schema.prisma
   ```
4. 运行 `npx prisma generate` 重新生成客户端
5. 运行 `npx prisma migrate dev` 应用迁移

## 迁移文件

- **SQLite 迁移**: `packages/db/prisma/migrations/<timestamp>_init/`
- **MySQL 迁移**: 需要手动创建（切换后运行 `npx prisma migrate dev --name init`）

## 注意事项

| 特性 | SQLite | MySQL |
|------|--------|-------|
| 开发便利 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| 性能 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 并发支持 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 数据迁移 | 手动 | 自动 |
| 部署复杂度 | 低 | 中 |

**重要提示：**
- 切换数据库时，迁移文件会独立保存（SQLite 和 MySQL 各有自己的迁移文件）
- 如果需要频繁切换，建议为每种数据库保留独立的迁移文件目录
- 当前数据库的迁移文件位于 `prisma/migrations/`，切换前请确保已备份

## 已验证的切换流程

**SQLite → MySQL：**
```bash
cd packages/db
./scripts/switch-db.sh mysql
export DATABASE_URL="mysql://root:password@localhost:3306/ai_drama_studio"
npx prisma generate
npx prisma migrate dev --name init  # 创建 MySQL 迁移
npx tsx src/seed.ts                 # 可选：初始化基础数据
```

**MySQL → SQLite：**
```bash
cd packages/db
./scripts/switch-db.sh sqlite
export DATABASE_URL="file:./dev.db"
npx prisma generate
npx prisma migrate dev --name init  # 创建 SQLite 迁移
npx tsx src/seed.ts                 # 可选：初始化基础数据
```

## 常见问题

**Q: 切换数据库后数据会丢失吗？**
A: 是的，切换数据库不会自动迁移数据。需要手动导出和导入。

**Q: 可以在生产环境使用 SQLite 吗？**
A: 不推荐。SQLite 适合开发、测试和小型单机应用。

**Q: 如何备份 SQLite 数据库？**
A: 直接复制 `dev.db` 文件即可。
