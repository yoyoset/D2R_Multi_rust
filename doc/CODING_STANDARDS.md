# D2R Multiplay - 开发规约

> 版本: v2.0 (2026-01-24) | 基于架构优化教训制定

---

## 1. 性能规约

### 1.1 禁止在循环或高频调用中创建昂贵实例

❌ **禁止：**
```rust
fn get_process_status() {
    let sys = System::new_all();  // 每次分配 ~2MB
    // ...
}
```

✅ **正确：**
```rust
#[tauri::command]
fn get_process_status(state: tauri::State<AppState>) {
    let mut sys = state.sys.lock().unwrap();  // 复用缓存
    sys.refresh_processes_specifics(
        ProcessesToUpdate::All,
        false,
        ProcessRefreshKind::nothing()  // 精细化刷新
    );
}
```

**规则：** 对于 `System`、`Users` 等重量级对象，必须使用 Tauri State 或 `lazy_static!` 缓存。

---

### 1.2 使用精细化刷新 API

❌ **禁止：**
```rust
sys.refresh_processes(ProcessesToUpdate::All, true);  // 更新所有信息
```

✅ **正确：**
```rust
sys.refresh_processes_specifics(
    ProcessesToUpdate::All,
    false,                              // 不更新子进程
    ProcessRefreshKind::nothing()       // 仅进程名
);
```

**依据：** 进程状态查询仅需判断进程是否存在，无需 CPU/内存统计。

---

## 2. 代码结构规约

### 2.1 禁止创建薄包装层

❌ **禁止：** 少于 20 行且仅调用另一个模块的文件

```rust
// isolation.rs (14 行，已删除)
pub fn kill_d2r_mutexes() -> Result<usize, IsolationError> {
    let count = mutex::close_d2r_mutexes()?;  // 仅转发调用
    Ok(count)
}
```

✅ **正确：** 直接调用底层模块
```rust
// lib.rs
modules::win32_safe::mutex::close_d2r_mutexes()
```

**规则：** 如果模块仅包含单一函数且逻辑少于 20 行，应合并到调用方或被调用方。

---

### 2.2 模块职责单一性

每个模块应有清晰的边界：

| 层级 | 职责 | 示例 |
|:---|:---|:---|
| **win32_safe/** | Win32 API 封装、错误转换 | `create_process_with_logon()` |
| **业务逻辑** | 编排调用、状态管理 | `launch_game()` |
| **文件操作** | 存档备份/恢复 | `rotate_save()` |

**禁止：** 在 `win32_safe/` 中读取配置文件或执行业务逻辑。

---

## 3. 日志规约

### 3.1 禁止在生产代码中使用 println!

❌ **禁止：**
```rust
println!("Deleted config: {:?}", path);
```

✅ **正确：**
```rust
tracing::debug!("Deleted config: {:?}", path);
```

**规则：** 所有日志必须使用 `tracing` 宏：
- `debug!` - 调试信息
- `info!` - 一般信息
- `warn!` - 警告
- `error!` - 错误

---

### 3.2 前端日志打通

**配置：** 添加 `tauri-plugin-log` 将 Rust 日志输出到浏览器控制台。

```rust
.plugin(tauri_plugin_log::Builder::default().build())
```

---

## 4. 错误处理规约

### 4.1 统一错误类型（计划中）

**目标：** 创建 `src-tauri/src/error.rs`

```rust
#[derive(Error, Debug)]
pub enum AppError {
    #[error("Win32 操作失败: {0}")]
    Win32(#[from] anyhow::Error),
    #[error("配置错误: {0}")]
    Config(String),
    #[error("IO 错误: {0}")]
    Io(#[from] std::io::Error),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.to_string())
    }
}
```

**当前妥协：** 使用 `.map_err(|e| e.to_string())` 转为 `String`

---

## 5. 窗口管理规约

### 5.1 防止白屏

**规则：**
1. `tauri.conf.json` 中设置 `visible: false`
2. `index.html` 中添加内联深色背景
3. React 挂载后调用 `getCurrentWindow().show()`

❌ **禁止：** 窗口默认可见且无背景色

---

## 6. 前端规约

### 6.1 懒加载（推荐）

```tsx
const Dashboard = lazy(() => import("./components/views/Dashboard"));
```

### 6.2 状态机模式（推荐）

```typescript
type LaunchPhase = 'idle' | 'cleaning' | 'swapping' | 'launching' | 'done';
```

---

## 7. 版本依赖规约

### 7.1 锁定关键版本

```toml
sysinfo = "0.37.2"  # 0.37+ API 变更: ProcessRefreshKind::nothing()
windows = "0.62.2"
```

**规则：** 升级前必须检查 API 兼容性。

---

## 8. Git 提交规约

**格式：** `<type>: <description>`

- `feat:` 新功能
- `fix:` bug 修复
- `perf:` 性能优化
- `refactor:` 重构
- `docs:` 文档更新

**示例：** `perf: use Tauri State for process status cache (10x faster)`
