# 记忆管理功能

为了替代无法下载的 `thedotmack/claude-mem` 插件，我们已经创建了一个本地的记忆管理脚本。

## 如何使用

### 添加记忆
```bash
./scripts/claude-mem.sh add "重要的信息或决定"
```

### 查看所有记忆
```bash
./scripts/claude-mem.sh show
```

### 搜索记忆
```bash
./scripts/claude-mem.sh search "关键词"
```

### 编辑记忆文件
```bash
./scripts/claude-mem.sh update
```

## 记忆存储位置
所有记忆都存储在 `./memory/MEMORY.md` 文件中，您可以直接编辑此文件。

## 功能特点
- 日期戳记记录
- 搜索功能
- 文本编辑
- 持久化存储

此脚本提供与原始插件类似的基本记忆管理功能。