# D2R-Multi Rust 工业级代码审计报告 (GLM Edition)

**项目**: D2R-Multi Rust (Diablo II: Resurrected 多实例管理器)  
**版本**: 0.6.0  
**审计日期**: 2026-04-08  
**审计框架**: GLM (Ground-Level Microscopy) — 从编译层到商业层的逐层解剖  
**审计员角色**: 工业级商业软件质量评估  
**总体评级**: 🔴 **不可发布** — 存在编译阻断BUG及多个生产级缺陷

---

## 执行摘要

本报告采用 GLM (Ground-Level Microscopy) 方法论，从编译器可见的最底层开始逐层审计。与此前报告不同，本报告发现了**一个编译阻断BUG**（现有报告未识别），以及多个被遗漏的**运行时崩溃隐患**、**资源泄漏**和**架构级设计缺陷**。

### 关键发现一览

| 严重级别 | 数量 | 概述 |
|---------|------|------|
| 🔴 P0 编译阻断 | 1 | `file_swap.rs` 引用未绑定变量 `msg`，代码无法编译 |
| 🔴 P0 运行时崩溃 | 3 | 锁序死锁、Sequence fire-and-forget 错误丢失、后台任务无优雅退出 |
| 🟠 P1 安全缺陷 | 4 | DPAPI 无熵、密码内存未覆写、get_account_password 无鉴权、日志泄露 |
| 🟡 P2 健壮性缺陷 | 6 | 句柄探测线程泄漏、inspector 全量扫描性能、配置竞态、硬编码路径等 |
| 🔵 P3 商业化差距 | 8 | 无测试、Release未优化、无CI/CD、无遥测、无崩溃报告等 |

**结论**: 项目在功能性上已达到较高完成度，但在**编译正确性**、**运行时健壮性**和**商业化合规性**三个维度上均存在不可忽视的缺陷。当前状态**不适合商业发布**。

---

## 第一层：编译器可见缺陷 (Compiler-Visible Defects)

### 🔴 BUG-001: `file_swap.rs` 编译错误 — 未绑定变量 `msg`

**位置**: `src-tauri/src/modules/file_swap.rs` 第27行  
**严重级别**: 🔴 P0 编译阻断  
**影响**: **代码无法通过编译**

**问题代码**:
```rust
fn map_io_error(e: std::io::Error, path: &Path) -> FileSwapError {
    match e.kind() {
        std::io::ErrorKind::PermissionDenied => {
            FileSwapError::PermissionDenied(path.to_string_lossy().to_string())
        }
        _ => {
            // code 32 = ERROR_SHARING_VIOLATION
            if msg.contains("32") || msg.contains("sharing") {  // ⚠️ `msg` 未定义！
                FileSwapError::FileInUse(path.to_string_lossy().to_string())
            } else {
                FileSwapError::Io(e)
            }
        }
    }
}
```

**分析**: `msg` 变量从未声明。正确的变量应该是 `e.to_string()` 或使用 `e.raw_os_error()`。这是一个**明确的编译错误**，说明：
1. 此代码路径从未被编译器检查过，或
2. 存在条件编译导致此函数未被编译，或
3. 项目存在未提交的本地修改

**修复方案**:
```rust
_ => {
    let msg = e.to_string();
    if msg.contains("32") || msg.contains("sharing") {
        FileSwapError::FileInUse(path.to_string_lossy().to_string())
    } else {
        FileSwapError::Io(e)
    }
}
```

**更优修复**: 使用 `e.raw_os_error()` 代替字符串匹配：
```rust
_ => {
    if e.raw_os_error() == Some(32) {
        FileSwapError::FileInUse(path.to_string_lossy().to_string())
    } else {
        FileSwapError::Io(e)
    }
}
```

---

### 🔴 BUG-002: `AdjustTokenPrivileges` 返回值误判

**位置**: `src-tauri/src/modules/win_admin.rs` 第67-70行  
**严重级别**: 🔴 P0 运行时逻辑错误  
**影响**: SeDebugPrivilege 提升可能静默失败，导致 mutex 清理和 handle 枚举不完整

**问题代码**:
```rust
let result = AdjustTokenPrivileges(h_token, false, Some(&tkp), 0, None, None);
let _ = CloseHandle(h_token);
result.is_ok()  // ⚠️ 错误判断！
```

**分析**: 根据 Microsoft 官方文档，`AdjustTokenPrivileges` **即使部分特权提升失败也返回 TRUE**。必须额外调用 `GetLastError()` 检查是否返回 `ERROR_NOT_ALL_ASSIGNED`。当前实现会在特权提升部分失败时误报成功。

**修复方案**:
```rust
let result = AdjustTokenPrivileges(h_token, false, Some(&tkp), 0, None, None);
let _ = CloseHandle(h_token);

if result.is_err() {
    return false;
}

// 关键：必须检查 ERROR_NOT_ALL_ASSIGNED
let last_error = windows::Win32::Foundation::GetLastError();
last_error.0 != windows::Win32::Foundation::WIN32_ERROR::ERROR_NOT_ALL_ASSIGNED.0 as u32
```

---

## 第二层：运行时崩溃与数据丢失 (Runtime Crashes & Data Loss)

### 🔴 BUG-003: `launch_game` 锁序反转导致潜在死锁

**位置**: `src-tauri/src/modules/account/launcher.rs` 第20-108行  
**严重级别**: 🔴 P0 运行时死锁  
**影响**: 用户启动游戏时应用可能冻结

**问题分析**:
```rust
pub fn launch_game(...) -> Result<u32, AccountError> {
    let state = app.state::<crate::state::AppState>();
    state.refresh_game_processes();  // 获取 sys 锁 -> 释放
    
    let sys = state.sys_lock();       // ① 获取 sys 锁
    let _users = state.users_lock();  // ② 获取 users 锁 (sys 锁仍持有)
    
    // ... 使用 sys + users ...
    
    drop(sys);      // ③ 释放 sys 锁
    drop(users);    // ④ 释放 users 锁
    
    let mut sys_lock = state.sys_lock();  // ⑤ 再次获取 sys 锁
    process_killer::kill_battle_net_processes_with_sys(&mut sys_lock)  // ⑥ 使用 sys 锁
}
```

**死锁场景**: 如果另一个线程（如 `maintain_account_statuses`）按 `config -> sys` 顺序获取锁，而 `launch_game` 按 `sys -> config` 顺序获取锁，就会产生 ABBA 死锁。

**实际代码证据**:
- `launcher.rs`: `sys_lock()` → `config_lock()` (第23行 → 第55行)
- `status.rs`: `config_lock()` → `sys_lock()` (第19行 → 第33行)

**两个线程的锁获取顺序相反！这是经典的 ABBA 死锁模式。**

**修复方案**:
1. 建立全局锁获取顺序规范：`config -> users -> sys -> status -> sequence`
2. 在 `launch_game` 中，先释放 sys/users 锁，再获取 config 锁
3. 更优方案：减少跨锁操作，将需要的数据一次性拷贝出来

---

### 🔴 BUG-004: Sequence `trigger_current_step` 错误被静默吞噬

**位置**: `src-tauri/src/modules/account/sequence.rs` 第211-221行  
**严重级别**: 🔴 P0 逻辑缺陷  
**影响**: 序列步骤启动失败时，用户无任何反馈，序列卡在当前步骤

**问题代码**:
```rust
tauri::async_runtime::spawn_blocking(move || {
    // ⚠️ 错误被捕获后仅 emit 日志，不影响序列状态
    if let Err(e) = launch_game(&*os, &app_handle, &account_clone, true, false) {
        let _ = app_handle.emit("launch-log", LaunchLogPayload {
            account_id: account_clone.id.clone(),
            message: format!("logs.sequence.launch_failed|{{\"error\":\"{}\"}}", e),
            level: "error".into(),
        });
    }
});
```

**分析**: `spawn_blocking` 返回的 `JoinHandle` 被丢弃，意味着：
1. 如果 `launch_game` panic，panic 会被静默吸收
2. 无论启动成功与否，序列都会继续推进到下一步
3. 用户可能看到"序列完成"但实际没有任何游戏被启动

**修复方案**:
```rust
let handle = tauri::async_runtime::spawn_blocking(move || {
    launch_game(&*os, &app_handle, &account_clone, true, false)
});

// 在 next_sequence_step 被调用前，检查上一步的结果
tokio::spawn(async move {
    match handle.await {
        Ok(Ok(pid)) => { /* 成功 */ },
        Ok(Err(e)) => { 
            // 标记当前步骤失败，暂停序列
            app_handle.emit("sequence-step-failed", ...);
        },
        Err(_) => { /* panic */ },
    }
});
```

---

### 🔴 BUG-005: 后台任务无优雅退出机制

**位置**: `src-tauri/src/lib.rs` 第112-114行  
**严重级别**: 🔴 P0 数据完整性  
**影响**: 关闭应用时，正在执行的操作可能被中断，导致配置文件损坏

**问题分析**:
```rust
tauri::async_runtime::spawn(modules::account::window::maintain_window_titles(handle.clone()));
tauri::async_runtime::spawn(modules::account::status::maintain_account_statuses(handle.clone()));
tauri::async_runtime::spawn(modules::os::windows::maintenance::maintain_memory_footprint(handle.clone()));
```

三个后台任务的退出机制：
```rust
// window.rs / status.rs
if state.is_quitting.load(std::sync::atomic::Ordering::SeqCst) {
    break;  // ⚠️ 仅在轮询检查时退出
}
```

**问题**:
1. `is_quitting` 仅在 `CloseRequested` 事件中设置，但 Tauri 的 `app.exit(0)` 可能绕过此事件
2. 任务在 `tokio::time::sleep` 期间无法响应退出信号（5秒延迟）
3. `spawn_blocking` 中的操作（如文件保存）可能被强制中断
4. 日志线程使用 `std::sync::mpsc`，其 `recv()` 是阻塞的，无法被 `is_quitting` 终止

**修复方案**:
1. 使用 `CancellationToken` 替代 `is_quitting` 原子变量
2. 将 `tokio::time::sleep` 改为 `tokio::select! { _ = cancel_token.cancelled() => break, _ = sleep => continue }`
3. 日志线程使用异步 channel 或在关闭时发送终止信号

---

## 第三层：安全缺陷 (Security Defects)

### 🟠 SEC-001: DPAPI 加密无熵参数 — 降级攻击风险

**位置**: `src-tauri/src/modules/vault.rs` 第67-70行  
**严重级别**: 🟠 P1  
**影响**: 任何在同一 Windows 用户会话下运行的进程都可以解密 Vault 数据

**问题代码**:
```rust
if CryptProtectData(
    &data_in,
    PCWSTR::null(),   // 无描述
    None,              // ⚠️ 无熵 (entropy)！
    None,              // 无 reserved
    None,              // 无提示
    CRYPTPROTECT_UI_FORBIDDEN,
    &mut data_out,
).is_ok() { ... }
```

**分析**: DPAPI 的 `pOptionalEntropy` 参数为 `None`，意味着：
1. 仅依赖 Windows 用户凭据作为加密密钥
2. 任何以同一用户身份运行的恶意软件都可以调用 `CryptUnprotectData` 解密密码
3. 如果攻击者获取了用户的 Windows 凭据（如通过 LSASS dump），可以直接离线解密

**商业级修复**:
```rust
// 使用应用层熵增加解密难度
static ENTROPY: &[u8] = b"D2R-Multi-2026-Vault-Key-Derivation-Salt";
let entropy_blob = CRYPT_INTEGER_BLOB {
    cbData: ENTROPY.len() as u32,
    pbData: ENTROPY.as_ptr() as *mut u8,
};

CryptProtectData(
    &data_in,
    PCWSTR::null(),
    Some(&entropy_blob),  // ✅ 添加熵
    None,
    None,
    CRYPTPROTECT_UI_FORBIDDEN,
    &mut data_out,
)
```

**注意**: 熵本身也需保护。更优方案是使用 TPM 或 Windows Credential Manager。

---

### 🟠 SEC-002: `get_account_password` 命令无鉴权

**位置**: `src-tauri/src/commands/config.rs` 第13-21行  
**严重级别**: 🟠 P1  
**影响**: 任何前端代码（包括 XSS 注入）都可以调用此命令获取所有账户密码

**问题代码**:
```rust
#[tauri::command]
pub fn get_account_password(
    _state: tauri::State<'_, crate::state::AppState>,  // ⚠️ _state 未使用
    app: tauri::AppHandle,
    id: String,  // ⚠️ 无鉴权，任何 ID 都可查询
) -> Result<String, String> {
    Vault::load_password(&app, &id).map_err(|e| format!("Vault Lookup Failure: {}", e))
}
```

**分析**:
1. 此命令接受任意 `id` 参数，返回对应账户的**明文密码**
2. 无调用次数限制，可被暴力枚举
3. 无审计日志记录密码查询操作
4. 前端 `api.ts` 第123行直接暴露此函数

**修复方案**:
1. 添加调用频率限制（如每分钟最多3次）
2. 记录所有密码查询的审计日志
3. 考虑是否真的需要前端直接获取明文密码（设计层面避免）
4. 至少添加 Windows 用户鉴权确认

---

### 🟠 SEC-003: 密码明文在内存中未被安全覆写

**位置**: `src-tauri/src/modules/account/launcher.rs` 第217-224行  
**严重级别**: 🟠 P1  
**影响**: 内存转储可获取用户密码

**问题代码**:
```rust
let physical_password = match Vault::load_password(app, &account.id) {
    Ok(p) => p,  // ⚠️ 明文密码作为普通 String 存在于栈上
    Err(e) => { return Err(...); }
};

let result = os.create_process_with_logon(
    user, domain, &physical_password, &bnet_path, None, working_dir.as_deref(),
)?;
// ⚠️ physical_password 在此之后由 Rust 自动 drop，但内存未被覆写！
```

**分析**: Rust 的 `String::drop()` 仅释放堆内存，**不会将内容覆写为零**。密码在 `drop` 后仍然驻留在内存中，直到该内存页被重用。

**修复方案**:
```rust
// 使用 zeroize crate
use zeroize::Zeroize;

let mut physical_password = match Vault::load_password(app, &account.id) {
    Ok(p) => p,
    Err(e) => return Err(...),
};

let result = os.create_process_with_logon(
    user, domain, &physical_password, &bnet_path, None, working_dir.as_deref(),
)?;

// 立即安全覆写密码内存
physical_password.zeroize();
```

需要在 `Cargo.toml` 中添加 `zeroize = "1"` 依赖。

---

### 🟠 SEC-004: 日志文件存储在程序目录，权限不当

**位置**: `src-tauri/src/modules/logger.rs` 第85-92行  
**严重级别**: 🟠 P1  
**影响**: 其他用户可能读取日志中的敏感信息

**问题代码**:
```rust
pub fn get_log_path() -> Option<PathBuf> {
    if let Ok(mut exe_path) = std::env::current_exe() {
        exe_path.pop();
        exe_path.push(LOG_FILENAME);
        return Some(exe_path);
    }
    None
}
```

**分析**:
1. 日志文件存储在可执行文件所在目录（通常是 `Program Files`），该目录需要管理员权限写入
2. 如果以管理员身份运行，日志文件对所有用户可读
3. 日志中包含用户名、错误详情等敏感信息
4. 标准 Windows 应用应将日志存储在 `%LOCALAPPDATA%` 或 `%APPDATA%`

**修复方案**:
```rust
pub fn get_log_path() -> Option<PathBuf> {
    // 优先使用 AppData
    if let Ok(app_data) = std::env::var("LOCALAPPDATA") {
        let log_dir = PathBuf::from(app_data)
            .join("D2R-Multi")
            .join("logs");
        let _ = std::fs::create_dir_all(&log_dir);
        return Some(log_dir.join(LOG_FILENAME));
    }
    // 回退到可执行文件目录
    if let Ok(mut exe_path) = std::env::current_exe() {
        exe_path.pop();
        exe_path.push(LOG_FILENAME);
        return Some(exe_path);
    }
    None
}
```

---

## 第四层：健壮性缺陷 (Robustness Defects)

### 🟡 ROB-001: 句柄名称探测线程泄漏

**位置**: `src-tauri/src/modules/win32_safe/mutex.rs` 第276-318行  
**严重级别**: 🟡 P2  
**影响**: 每次探测创建一个线程，系统级扫描时可能创建数千个短命线程

**问题代码**:
```rust
thread::spawn(move || {
    // NtQueryObject 可能永久挂起（某些 handle 类型）
    let status = NtQueryObject(...);
    // ...
    let _ = tx.send(Some(s));
});

let result = rx.recv_timeout(Duration::from_millis(1500)).unwrap_or_else(|_| {
    // ⚠️ 超时后，线程可能仍在运行！
    None
});
```

**分析**:
1. 每次调用 `get_handle_name_safe` 创建一个 `std::thread`
2. 如果 `NtQueryObject` 挂起，线程在 1.5s 超时后继续存在
3. 系统可能有数万个句柄，每次扫描创建数千个线程
4. 线程资源（栈内存 ~2MB/线程）累积可能导致内存压力
5. 线程无法被取消，只能等待其自然结束

**修复方案**:
1. 使用线程池（`rayon` 或自定义）限制并发线程数
2. 预过滤句柄类型，跳过已知会挂起的类型（如 `Key`、`ALPC Port`）
3. 设置全局扫描超时上限

---

### 🟡 ROB-002: Inspector 全量系统句柄扫描性能问题

**位置**: `src-tauri/src/modules/win32_safe/inspector.rs` 第69-121行  
**严重级别**: 🟡 P2  
**影响**: 前端打开 Inspector 面板时可能导致 UI 卡顿

**问题分析**:
```rust
pub fn list_process_handles(app: &tauri::AppHandle, pid: u32) -> Result<Vec<HandleInfo>, anyhow::Error> {
    // ⚠️ 每次调用都分配 1MB 缓冲区并查询全部系统句柄
    let mut size: u32 = 0x100000;
    let mut buffer: Vec<u8> = vec![0; size as usize];
    
    // ⚠️ 对目标 PID 的每个句柄都调用 get_handle_name_detailed
    // 每个 handle 创建一个线程用于 NtQueryObject 超时保护
    for i in 0..info.number_of_handles {
        let entry = *handles_ptr.add(i);
        if entry.unique_process_id as u32 == pid {
            if let Some(handle_info) = get_handle_name_detailed(app, pid, entry.handle_value) {
                // 每个 handle 查询耗时 200ms+
                handle_results.push(handle_info);
            }
        }
    }
}
```

**性能预估**: 一个有 200 个句柄的进程，扫描耗时 = 200 × 200ms = 40秒。这在 Tauri 同步命令中会阻塞整个 UI。

**修复方案**:
1. 将 `get_process_handles` 改为 `async` 命令
2. 使用 `spawn_blocking` 避免阻塞 Tauri 主线程
3. 实现增量/分页返回
4. 缓存句柄类型索引，避免重复查询

---

### 🟡 ROB-003: `nuke_reset` 缺乏确认和事务性

**位置**: `src-tauri/src/commands/maintenance.rs` 第11-28行  
**严重级别**: 🟡 P2  
**影响**: 一次误操作可删除所有用户数据

**问题代码**:
```rust
#[tauri::command]
pub fn nuke_reset(app: tauri::AppHandle) -> Result<String, String> {
    // ⚠️ 无确认步骤，直接执行
    let killed = modules::process_killer::kill_all_related_processes();
    let _ = modules::file_swap::delete_config();          // ⚠️ 错误被忽略
    let _ = modules::file_swap::clear_all_snapshots(&app); // ⚠️ 错误被忽略
    let _ = modules::file_swap::cleanup_bnet_archives();   // ⚠️ 错误被忽略
    // ...
}
```

**分析**:
1. 无二次确认机制，前端一次误点击即触发
2. 三个 destructive 操作的错误全部被 `let _` 忽略
3. 无回滚机制：如果 `delete_config` 成功但 `clear_all_snapshots` 失败，系统处于不一致状态
4. 不删除 Vault 中的密码数据，重置后密码或与账户不匹配

**修复方案**:
1. 后端添加 `confirm_token` 机制：先请求 token，再用 token 触发
2. 记录所有 destructive 操作的审计日志
3. 实现两阶段提交或至少记录每步操作结果
4. 考虑是否应同时清理 Vault 数据

---

### 🟡 ROB-004: `manual_launch_process` 硬编码路径

**位置**: `src-tauri/src/commands/maintenance.rs` 第54-77行  
**严重级别**: 🟡 P2  
**影响**: 非 standard 安装路径的用户无法使用此功能

**问题代码**:
```rust
pub fn manual_launch_process(
    state: tauri::State<'_, state::AppState>,
    username: String,
    password: Option<String>,
) -> Result<String, String> {
    let bnet_path = r"C:\Program Files (x86)\Battle.net\Battle.net.exe";  // ⚠️ 硬编码！
    // ...
    password.as_deref().unwrap_or(""),  // ⚠️ 空密码直接传递给 CreateProcessWithLogonW
```

**分析**:
1. 硬编码路径不适用于自定义安装位置
2. `launcher.rs` 中已有 `get_bnet_path()` 自动检测逻辑，但此处未使用
3. 空密码传递给 `CreateProcessWithLogonW` 可能导致意外行为
4. 此命令接受任意 `username` 和 `password` 参数，无额外鉴权

---

### 🟡 ROB-005: `config.save()` 重试逻辑中 `bak` 备份可能失败

**位置**: `src-tauri/src/modules/config.rs` 第139行  
**严重级别**: 🟡 P2  
**影响**: 系统崩溃时可能无法恢复配置

**问题代码**:
```rust
if path.exists() {
    let _ = fs::copy(&path, &bak_path);  // ⚠️ 备份失败被忽略
}
```

**分析**: 如果磁盘空间不足或权限问题导致备份失败，主配置仍会被覆盖。如果此时 `rename` 也失败，可能丢失所有配置。

---

### 🟡 ROB-006: 前端 `useEffect` 依赖数组包含不稳定的引用

**位置**: `src/hooks/useAppCore.tsx` 第285行  
**严重级别**: 🟡 P2  
**影响**: 可能导致无限重渲染或事件监听器泄漏

**问题代码**:
```typescript
}, [checkAdminStatus, checkUpdateOnLaunch, validateAccounts, checkVersionUpdate, 
    addLog, showBlocking, t, config.active_sequence?.preset_index]);
```

**分析**:
1. `config.active_sequence?.preset_index` 每次渲染都会创建新的临时值
2. 每次依赖变化时，旧的事件监听器被卸载、新的被创建
3. `validateAccounts` 内部依赖 `showBlocking`，但两者同时出现在依赖数组中，可能导致循环
4. `init` 函数在每次 effect 运行时执行，包括 `getConfig()` 等网络请求

---

## 第五层：架构与设计缺陷 (Architecture & Design)

### ARCH-001: Release 配置未优化

**位置**: `src-tauri/Cargo.toml` 第39-43行

```toml
[profile.release]
panic = "abort"
codegen-units = 16    # ⚠️ 过多，影响优化
lto = false           # ⚠️ 未启用 LTO
strip = false         # ⚠️ 未剥离符号
```

**影响**:
- 二进制体积过大（包含调试符号）
- 运行时性能未充分发挥
- 逆向工程更容易（符号未剥离）

**商业级配置**:
```toml
[profile.release]
panic = "abort"
codegen-units = 1     # 最大优化
lto = true            # 跨 crate 优化
strip = true          # 剥离调试符号
opt-level = "s"       # 或 "z" 最小体积, 或 3 最大性能
```

---

### ARCH-002: 日志系统自实现，未使用 `tracing` 生态

**位置**: `src-tauri/src/modules/logger.rs`

**问题分析**:
1. `Cargo.toml` 已引入 `tracing` 和 `tracing-subscriber`，但仅用于零散的 `tracing::info!` 调用
2. 自实现的 `logger.rs` 功能与 `tracing` 重复，但缺少：
   - 结构化日志（tracing 的 span）
   - 与 `tracing-appender` 的文件轮转
   - 与 `sentry`/`bugsnag` 的集成能力
3. 两套日志系统并存，日志可能丢失或不一致

**修复方案**: 统一到 `tracing` 生态，使用 `tracing-appender` 进行文件轮转，移除自实现的 `logger.rs`。

---

### ARCH-003: 锁策略与 `parking_lot` 使用不当

**位置**: `src-tauri/src/state.rs`

**问题分析**:
1. 使用 `parking_lot::Mutex` 是正确的选择（非中毒），但所有数据结构都使用 `Mutex` 而非 `RwLock`
2. 读多写少的场景（如 `config`、`account_statuses`）应使用 `RwLock` 允许并发读
3. `MutexGuard` 被包装为公开方法，但方法名 `config_lock()` 暗示"获取锁"而非"获取配置的只读引用"

**修复方案**:
```rust
pub config: RwLock<crate::modules::config::AppConfig>,
pub account_statuses: RwLock<HashMap<String, AccountStatus>>,

pub fn config_read(&self) -> RwLockReadGuard<'_, AppConfig> { self.config.read() }
pub fn config_write(&self) -> RwLockWriteGuard<'_, AppConfig> { self.config.write() }
```

---

### ARCH-004: `HandleGuard` 的 `is_invalid()` 判断不完整

**位置**: `src-tauri/src/modules/win32_safe/handle.rs` 第9行

```rust
fn drop(&mut self) {
    if !self.0.is_invalid() {  // ⚠️ 仅检查 INVALID_HANDLE_VALUE (-1)
        unsafe { let _ = CloseHandle(self.0); }
    }
}
```

**分析**: Windows HANDLE 的无效值有两种：
- `INVALID_HANDLE_VALUE` (-1)：用于 `CreateFile` 等函数
- `NULL` (0)：用于大多数其他函数

当前实现不会关闭 NULL 句柄（`is_invalid()` 对 NULL 返回 true），但实际上 NULL 句柄不应该被关闭，所以这里逻辑恰好正确。但 `is_valid()` 方法会错误地将 NULL 报告为有效。

---

## 第六层：前端特定缺陷 (Frontend-Specific)

### FE-001: 密码字段在前端 State 中明文传递

**位置**: `src/hooks/useAppCore.tsx` + `src/lib/api.ts`

**问题分析**:
```typescript
// api.ts
export interface Account {
    win_pass?: string;  // ⚠️ 明文密码在 TypeScript 内存中
}

// useAppCore.tsx - handleLaunch 中
const account = config.accounts.find(a => a.id === selectedAccountId);
await performLaunch(account, bnetOnly);
// ⚠️ account.win_pass 可能包含明文密码（redacted 后应为 "********"）
```

**风险**:
1. React DevTools 可直接查看 `win_pass` 值
2. 密码值存在于 JavaScript 堆中，无法被安全覆写
3. `launchGame` API 调用将整个 account 对象（含密码）通过 IPC 传递

**修复方案**: 前端永远不应持有或传递密码。启动流程应仅传递 `account_id`，由后端从 Vault 读取密码。

---

### FE-002: 前端更新 URL 指向错误仓库

**位置**: `src/hooks/useAppCore.tsx` 第69行

```typescript
onClick: () => { openUrl("https://github.com/SquareUncle/d2r-rust/releases/latest"); }
```

**分析**: 项目的 `origin` remote 是 `https://github.com/yoyoset/D2R_Multi_rust`，但更新链接指向 `SquareUncle/d2r-rust`。这会导致：
1. 用户点击更新链接后 404 或到达错误仓库
2. 可能泄露开发者的其他仓库信息

---

### FE-003: 事件监听器未正确清理

**位置**: `src/hooks/useAppCore.tsx` 第250-284行

```typescript
const unlisten = listen('launch-log', (event: any) => { ... });
const unlistenResumption = listen('sequence-resumption-ready', () => { ... });
const unlistenMigration = listen('migration-required', () => { ... });

return () => {
    unlisten.then(f => f());           // ⚠️ Promise 可能未 resolved
    unlistenResumption.then(f => f());
    unlistenMigration.then(f => f());
};
```

**分析**: `listen()` 返回 `Promise<UnlistenFn>`。在 cleanup 函数中使用 `.then()` 意味着：
1. 如果 Promise 在组件卸载后才 resolve，`f()` 可能操作已卸载的组件
2. 如果 Promise reject，监听器永远不会被清理

**修复方案**: 使用 `useEffect` 的 async cleanup 模式或 `useRef` 存储 unlisten 函数。

---

## 第七层：商业化合规性差距 (Commercial Compliance Gaps)

### BIZ-001: 无自动化测试

**现状**: 项目中不存在任何测试代码。

**商业级要求**:
- Rust: 核心模块单元测试覆盖率 ≥ 60%
- 前端: 组件测试覆盖率 ≥ 40%
- 集成测试: 关键用户流程（添加账户、启动游戏、序列执行）
- E2E 测试: 至少覆盖核心启动流程

---

### BIZ-002: 无 CI/CD 流水线

**现状**: 项目根目录有 `scripts/` 目录，但缺少 GitHub Actions 或其他 CI 配置。

**商业级要求**:
- PR 检查：`cargo clippy`、`cargo test`、`npm run build`
- 自动构建：Windows NSIS 安装包
- 自动发布：tag 触发 GitHub Release
- 代码签名：Authenticode 签名（否则 SmartScreen 会警告）

---

### BIZ-003: 无崩溃报告机制

**现状**: 应用崩溃时无遥测数据。

**商业级要求**:
- 集成 Sentry / Crashpad 收集崩溃转储
- 实现结构化错误上报
- 添加用户选择退出选项（隐私合规）

---

### BIZ-004: 无代码签名

**位置**: `src-tauri/tauri.conf.json` bundle 配置

**分析**: Windows SmartScreen 会对未签名的应用显示"无法识别的应用"警告，严重影响用户信任度。

**商业级要求**:
- 购买 EV 代码签名证书（约 $400/年）
- 配置 Tauri 的 NSIS 签名流程
- 考虑使用 Windows Store 分发

---

### BIZ-005: CSP 策略过严可能阻塞更新

**位置**: `src-tauri/tauri.conf.json` 第43行

```json
"security": {
    "csp": "default-src 'self'; img-src 'self' data:;"
}
```

**分析**: Tauri 的自动更新器通过 HTTPS 下载更新包，当前的 CSP 策略可能阻止更新请求。需要确认 `connect-src` 是否需要包含更新服务器域名。

---

### BIZ-006: 隐私政策与数据合规

**现状**: 项目有 `PRIVACY_POLICY.md` 和 `PRIVACY_POLICY_CN.md`，但需审查：
1. 收集了哪些用户数据（账户名、密码、游戏路径）
2. 数据存储位置和加密方式
3. 数据保留和删除策略
4. GDPR/CCPA 合规性

---

### BIZ-007: 更新服务器安全性

**位置**: `src-tauri/tauri.conf.json` 第70行

```json
"endpoints": ["https://update.squareuncle.com/d2r-rust/latest.json"]
```

**分析**:
1. 更新服务器使用 HTTPS ✅
2. 配置了公钥验证 ✅
3. 但未验证 `update.squareuncle.com` 的证书是否正确配置
4. 未实现回退更新源
5. 无更新完整性校验失败的用户提示

---

### BIZ-008: 国际化 (i18n) 不完整

**现状**: 前端有 5 种语言的翻译文件（en, zh-CN, zh-TW, ja, ko），但：
1. 后端 `tray.rs` 硬编码了 4 种语言的翻译
2. 日志系统使用 `log_localized` 但 fallback 消息是英文
3. 错误消息混合使用 i18n key 和硬编码英文
4. 无 RTL 语言支持（阿拉伯语、希伯来语）

---

## 修复路线图 (Remediation Roadmap)

### 第一阶段：编译与运行时修复（1-2天）

| 优先级 | 任务 | 预计工时 |
|--------|------|----------|
| P0 | 修复 `file_swap.rs` 编译错误 (BUG-001) | 0.5h |
| P0 | 修复 `AdjustTokenPrivileges` 返回值判断 (BUG-002) | 1h |
| P0 | 修复锁序死锁 (BUG-003) | 4h |
| P0 | 修复 Sequence 错误丢失 (BUG-004) | 4h |
| P0 | 实现后台任务优雅退出 (BUG-005) | 4h |

### 第二阶段：安全修复（3-5天）

| 优先级 | 任务 | 预计工时 |
|--------|------|----------|
| P1 | DPAPI 添加熵参数 (SEC-001) | 2h |
| P1 | `get_account_password` 鉴权 (SEC-002) | 4h |
| P1 | 密码内存安全覆写 (SEC-003) | 2h |
| P1 | 日志文件路径修复 (SEC-004) | 2h |
| P1 | 前端密码传递架构重构 (FE-001) | 8h |

### 第三阶段：健壮性修复（1周）

| 优先级 | 任务 | 预计工时 |
|--------|------|----------|
| P2 | 句柄探测线程池化 (ROB-001) | 4h |
| P2 | Inspector 异步化 (ROB-002) | 4h |
| P2 | `nuke_reset` 确认机制 (ROB-003) | 2h |
| P2 | 修复硬编码路径 (ROB-004) | 1h |
| P2 | Release 配置优化 (ARCH-001) | 1h |
| P2 | 日志统一到 tracing (ARCH-002) | 8h |

### 第四阶段：商业化准备（2-3周）

| 优先级 | 任务 | 预计工时 |
|--------|------|----------|
| P3 | 添加核心模块单元测试 | 40h |
| P3 | CI/CD 流水线搭建 | 8h |
| P3 | 崩溃报告集成 | 8h |
| P3 | 代码签名 | 4h |
| P3 | i18n 完整性审查 | 8h |
| P3 | 隐私合规审查 | 4h |

---

## 代码质量评分 (GLM 评分体系)

| 维度 | 评分 | GLM 评价 |
|------|------|----------|
| **编译正确性** | 3/10 | 存在编译阻断BUG，不可接受 |
| **运行时安全** | 4/10 | 死锁风险、错误丢失、无优雅退出 |
| **安全设计** | 5/10 | DPAPI 正确但无纵深防御，密码管理存在缺陷 |
| **错误处理** | 4/10 | 大量 `let _` 忽略错误，`unwrap_or_default` 掩盖问题 |
| **性能设计** | 6/10 | 锁策略基本合理，但 Inspector 和 Handle 探测有瓶颈 |
| **代码可维护性** | 5/10 | 模块化尚可，但双日志系统、硬编码路径、魔法数字多 |
| **前端质量** | 5/10 | `as any` 滥用、事件监听器管理不当、密码明文传递 |
| **商业化就绪度** | 3/10 | 无测试、无CI、无崩溃报告、无代码签名 |

**综合评分: 4.4/10** — 需要系统性修复后方可商业化

> ⚠️ 注意：本评分低于此前报告的 5.9/10，原因在于本报告发现了此前报告遗漏的编译阻断BUG (BUG-001) 和运行时死锁 (BUG-003)，以及更多安全缺陷。

---

## 附录 A: 锁序分析

```
全局锁获取顺序规范（建议）：

config_lock  ─────┐
                  │
users_lock   ─────┤
                  │  必须按此顺序获取
sys_lock     ─────┤  严禁反向获取
                  │
status_lock  ─────┤
                  │
sequence_lock ────┘

当前违规点：
- launcher.rs: sys → config（违反）
- status.rs: config → sys（违反）
- 两个路径构成 ABBA 死锁
```

## 附录 B: 重复代码检测

| 重复模块 | 文件1 | 文件2 | 说明 |
|---------|-------|-------|------|
| `close_remote_handle` | `mutex.rs:321` | `inspector.rs:138` | 完全相同的函数 |
| `SYSTEM_HANDLE_TABLE_ENTRY_INFO_EX` | `mutex.rs:40` | `inspector.rs:38` | 相同的结构体定义 |
| `UNICODE_STRING` | `mutex.rs:58` | `inspector.rs:56` | 相同的结构体定义 |
| NtQuerySystemInformation FFI | `mutex.rs:15` | `inspector.rs:15` | 相同的 FFI 声明 |
| Handle name query logic | `mutex.rs:276` | `inspector.rs:210` | 几乎相同的超时探测逻辑 |

**建议**: 将重复代码提取到 `win32_safe` 模块的公共子模块中。

## 附录 C: 资源泄漏清单

| 资源 | 位置 | 泄漏场景 |
|------|------|---------|
| 线程 | `mutex.rs:279` | NtQueryObject 挂起时线程永不退出 |
| 线程 | `inspector.rs:213` | 同上 |
| HANDLE | `launcher.rs:189` | `cmd.spawn()` 返回的 Child 未被管理 |
| 内存 | `state.rs:sys` | System 对象仅增量添加，从不缩减 |
| 日志文件句柄 | `logger.rs:39` | 每次写入都重新打开文件，无复用 |

---

*GLM 审计报告 v1.0 — 2026-04-08*  
*本报告基于源代码静态分析，未进行动态测试。部分问题需在运行时验证。*