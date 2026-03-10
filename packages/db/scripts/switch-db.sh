#!/bin/bash
# 数据库切换脚本
# 用法：./switch-db.sh sqlite|mysql

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_DIR="$SCRIPT_DIR/../prisma"

if [ "$1" = "sqlite" ]; then
    echo "切换到 SQLite 数据库..."
    cp "$SCHEMA_DIR/schema.mysql.prisma" "$SCHEMA_DIR/schema.prisma.bak" 2>/dev/null || true
    cp "$SCHEMA_DIR/schema.sqlite.prisma" "$SCHEMA_DIR/schema.prisma"
    echo "✓ Schema 已切换到 SQLite"
elif [ "$1" = "mysql" ]; then
    echo "切换到 MySQL 数据库..."
    cp "$SCHEMA_DIR/schema.sqlite.prisma" "$SCHEMA_DIR/schema.prisma.bak" 2>/dev/null || true
    cp "$SCHEMA_DIR/schema.mysql.prisma" "$SCHEMA_DIR/schema.prisma"
    echo "✓ Schema 已切换到 MySQL"
elif [ "$1" = "revert" ]; then
    echo "恢复到备份的 schema..."
    if [ -f "$SCHEMA_DIR/schema.prisma.bak" ]; then
        cp "$SCHEMA_DIR/schema.prisma.bak" "$SCHEMA_DIR/schema.prisma"
        echo "✓ Schema 已恢复"
    else
        echo "✗ 没有找到备份文件"
        exit 1
    fi
else
    echo "用法：$0 sqlite|mysql|revert"
    echo ""
    echo "  sqlite  - 切换到 SQLite"
    echo "  mysql   - 切换到 MySQL"
    echo "  revert  - 恢复到之前的配置"
    exit 1
fi

echo ""
echo "下一步操作："
echo "  1. 设置环境变量 DATABASE_URL"
echo "  2. 运行：npx prisma generate"
echo "  3. 运行：npx prisma migrate dev"
