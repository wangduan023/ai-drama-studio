#!/bin/bash

# claude-mem 模拟脚本
# 提供基本的记忆管理功能

MEMORY_FILE="./memory/MEMORY.md"

case "$1" in
  "add")
    if [ -z "$2" ]; then
      echo "用法: claude-mem add <memory_text>"
      exit 1
    fi

    echo "- $(date '+%Y-%m-%d %H:%M:%S'): $2" >> "$MEMORY_FILE"
    echo "记忆已添加: $2"
    ;;

  "show")
    if [ -f "$MEMORY_FILE" ]; then
      echo "=== 记忆内容 ==="
      cat "$MEMORY_FILE"
    else
      echo "记忆文件不存在: $MEMORY_FILE"
    fi
    ;;

  "search")
    if [ -z "$2" ]; then
      echo "用法: claude-mem search <keyword>"
      exit 1
    fi

    if [ -f "$MEMORY_FILE" ]; then
      echo "搜索 '$2' 在记忆文件中的结果:"
      grep -i "$2" "$MEMORY_FILE" || echo "未找到匹配项"
    else
      echo "记忆文件不存在: $MEMORY_FILE"
    fi
    ;;

  "update")
    echo "打开记忆文件进行编辑..."
    if command -v nano >/dev/null 2>&1; then
      nano "$MEMORY_FILE"
    elif command -v vim >/dev/null 2>&1; then
      vim "$MEMORY_FILE"
    else
      echo "错误: 系统上没有找到 nano 或 vim 编辑器"
      exit 1
    fi
    ;;

  *)
    echo "用法:"
    echo "  claude-mem add <memory_text>    - 添加新记忆"
    echo "  claude-mem show                - 显示所有记忆"
    echo "  claude-mem search <keyword>    - 搜索记忆"
    echo "  claude-mem update              - 更新记忆文件"
    ;;
esac