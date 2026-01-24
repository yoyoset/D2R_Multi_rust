# AI Agent Instructions - D2R Multiplay

> 系统提示词备忘录 | 用于新对话快速上下文注入

---

## 项目概述

**名称：** D2R Multiplay (暗黑破坏神2重制版多开助手)  
**技术栈：** Rust (Tauri 2.0) + TypeScript (React + Vite)  
**核心功能：** 通过 Windows 用户隔离实现 Battle.net 多账户启动，含存档自动切换

---

## 架构原则

### 1. 性能第一

- **禁止** 在高频调用（如进程状态查询）中创建 `System::new_all()`
- **必须** 使用 Tauri State 缓存 `System`/`Users` 实例
- **必须** 使用 `ProcessRefreshKind::nothing()` 进行精细化刷新

### 2. 模块边界清晰

```
win32_safe/  → 仅 Win32 API 封装，不含业务逻辑
account.rs   → 业务编排，不直接调用 Win32
file_swap.rs → 文件操作，不管理进程
```

**禁止** 创建少于 20 行的薄包装层（如已删除的 `isolation.rs`）

### 3. 启动流程顺序固定

```
1. kill_processes() + close_mutexes()    # 清理
2. rotate_save(last_account)             # 备份当前
3. delete_config()                       # 清空
4. restore_snapshot(target_account)      # 恢复目标
5. create_process_with_logon()           # 启动
```

**禁止** 调换顺序或省略步骤

---

## 代码规范

### Rust

- **日志：** 使用 `tracing::{debug, info, warn, error}`，禁止 `println!`
- **错误：** 当前使用 `.map_err(|e| e.to_string())`，未来迁移到 `AppError`
- **异步：** Tauri Command 可用 `async fn`

### TypeScript

- **接口：** 遵循 `src/lib/api.ts` 定义
- **状态：** 使用 React Hooks，避免全局变量
- **懒加载：** 大组件建议使用 `React.lazy()`

---

## 关键依赖 API 注意事项

### sysinfo 0.37+

```rust
// ❌ 错误
ProcessRefreshKind::new()

// ✅ 正确
ProcessRefreshKind::nothing()
```

### Tauri 2.0

```rust
// State 注入
#[tauri::command]
fn cmd(state: tauri::State<'_, AppState>) { }

// 窗口初始不可见
"visible": false  // tauri.conf.json
```

---

## 性能基准

| 操作 | 目标 | 当前 |
|:---|:---|:---|
| 进程状态查询 | <10ms | ~5ms ✅ |
| 窗口启动白屏 | 0ms | 0ms ✅ |
| 存档切换 | <200ms | ~150ms ✅ |

---

## 常见陷阱

1. **忘记使用 State** → 导致性能退化 10 倍
2. **调换启动步骤** → 可能导致存档丢失
3. **使用 println!** → 生产环境无法调试
4. **创建薄包装层** → 增加维护成本

---

## 开发指令示例

```bash
# 检查编译
cargo check

# 前端构建
npm run build

# 完整打包
npm run tauri build

# 开发模式
npm run tauri dev
```

---

## 文档索引

- **技术规格：** `doc/TECHNICAL_SPEC.md`
- **开发规约：** `doc/CODING_STANDARDS.md`
- **用户指南：** `User_Guide.md`

---

**使用方法：** 在新对话开始时，将本文档内容粘贴给 AI，确保它理解项目架构并遵循既定规范。
