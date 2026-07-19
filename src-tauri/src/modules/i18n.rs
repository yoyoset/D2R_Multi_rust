use serde_json::{Map, Value};
use std::collections::HashMap;
use std::sync::{RwLock, LazyLock};

/// Backend i18n module for server-side translations
/// This provides translation support for logs and error messages

static TRANSLATIONS: LazyLock<RwLock<HashMap<String, Map<String, Value>>>> = LazyLock::new(|| RwLock::new(HashMap::new()));
static CURRENT_LANG: LazyLock<RwLock<String>> = LazyLock::new(|| RwLock::new("zh".to_string()));

/// Initialize translations with common log messages
pub fn init_translations() {
    let mut trans = TRANSLATIONS.write().unwrap();
    
    // --- English (Default) ---
    let mut en = Map::new();
    en.insert("logs.status.no_user_info".into(), "Detected D2R.exe (PID={pid}), but could not get user info (Insufficient permissions?)".into());
    en.insert("logs.status.no_path".into(), "Detected D2R.exe (PID={pid}), but could not get execution path".into());
    en.insert("logs.launcher.scanning_env".into(), "Scanning environment (Anchor verification)...".into());
    en.insert("logs.launcher.clearing_env".into(), "Clearing environment...".into());
    en.insert("logs.launcher.killed_processes".into(), "Terminated {count} related processes".into());
    en.insert("logs.launcher.closed_mutexes".into(), "Closed {count} kernel mutexes".into());
    en.insert("logs.launcher.verifying_permissions".into(), "Verifying file access permissions (Atomic lock)...".into());
    en.insert("logs.launcher.align_success".into(), "Environment file alignment complete".into());
    en.insert("logs.launcher.launch_success".into(), "Launched Battle.net (PID: {pid})".into());
    en.insert("logs.config.migration_start".into(), "Starting Vault Security Migration...".into());
    en.insert("logs.config.migration_completed".into(), "Vault Migration Completed Successfully".into());
    en.insert("logs.launcher.waiting_file_handles".into(), "Waiting for system to release file handles...".into());
    en.insert("logs.launcher.file_occupied_error".into(), "Security Interception: Battle.net config file still in use. Reason: {error}".into());
    en.insert("logs.launcher.cleanup_error".into(), "Alignment failed: Unable to clean old files. {error}".into());
    en.insert("logs.launcher.no_snapshot".into(), "No history snapshot found for target account, using clean Battle.net environment".into());
    en.insert("logs.launcher.align_critical_error".into(), "Critical error during file alignment: {error}".into());
    en.insert("logs.launcher.bnet_path".into(), "Battle.net path: {path}".into());
    en.insert("logs.launcher.host_user_detected".into(), "Host user detected, starting Battle.net directly...".into());
    en.insert("logs.launcher.syncing_password_policy".into(), "Syncing password policy (Never Expires)...".into());
    en.insert("logs.launcher.sync_policy_note".into(), "Policy sync remark: {error}".into());
    en.insert("logs.launcher.security_patch_skipped".into(), "Security patch skipped: {error}".into());
    en.insert("logs.launcher.vault_error".into(), "Launch failed: Could not retrieve credentials from vault. {error}".into());
    en.insert("logs.launcher.anchor_found".into(), "Account {user} active, anchor path: {path}".into());
    en.insert("logs.launcher.path_captured".into(), "Captured latest game path for {user}: {path}".into());
    en.insert("logs.launcher.backing_up".into(), "Account {user} double-online detected, backing up snapshot...".into());
    en.insert("logs.launcher.backing_up_owner".into(), "Ledger + baseline verified — backing up previous account {user}'s snapshot (seamless rotation)".into());
    en.insert("logs.launcher.backing_up_owner_plain".into(), "Ledger ownership confirmed - backing up previous account {user}'s snapshot (non-D2R account)".into());
    en.insert("logs.config.baseline_seeded".into(), "Upgrade: seeded baseline paths for {count} account(s) from their existing snapshots".into());
    en.insert("logs.launcher.backup_skipped_no_baseline".into(), "No baseline path set for {user} - auto-backup skipped. Confirm a baseline in the account editor to enable seamless rotation backups.".into());
    en.insert("logs.launcher.backup_skipped_owner".into(), "Skipped auto-backup for {user}: the live Battle.net config belongs to another account (path cross-contamination guard)".into());
    en.insert("logs.launcher.backup_skipped_mismatch".into(), "Skipped auto-backup for {user}: the live Battle.net config does not match this account's baseline path/snapshot (path cross-contamination guard)".into());
    en.insert("logs.launcher.snapshot_baseline_mismatch".into(), "Restored snapshot for {user} does not record its baseline path {path} — the snapshot may be stale or polluted; re-locate the game in Battle.net and save the snapshot again".into());
    en.insert("logs.config.relocate_start".into(), "Starting data relocation to {path}...".into());
    en.insert("logs.config.relocate_success".into(), "Data relocated successfully to {path}".into());
    en.insert("logs.config.relocate_failed".into(), "Data relocation failed: {error}".into());
    
    en.insert("logs.mutex.none_found".into(), "System-wide scan complete, no D2R mutexes hit (Checked {count} handles)".into());
    en.insert("logs.mutex.global_scan".into(), "Performing global system logic lock scan (Cross-Session)...".into());
    en.insert("logs.mutex.probe_timeout".into(), "⚠️ Handle probe timeout (PID: {pid}, Handle: {handle})".into());
    en.insert("logs.mutex.found_and_cleaned".into(), "🎯 Found and cleaned D2R mutex: {name}".into());
    en.insert("logs.mutex.no_processes".into(), "No D2R processes found, skipping mutex cleanup".into());
    en.insert("logs.mutex.debug_priv_failed".into(), "Failed to enable debug privilege, sensing process may be limited".into());
    en.insert("logs.mutex.scanning_system_handles".into(), "Scanning system {count} handles...".into());

    en.insert("logs.config.migration_success".into(), "Snapshot migration success (Initial update protection), recovered login states for {count} accounts".into());
    en.insert("logs.config.rescue_success".into(), "Successfully rescued from old directory: {user} ({id})".into());
    en.insert("logs.config.save_retry".into(), "Failed to save configuration (Attempt {attempt}): {error}. Retrying...".into());
    en.insert("logs.config.temp_write_retry".into(), "Failed to write temporary config (Attempt {attempt}): {error}. Retrying...".into());
    
    en.insert("logs.system.atomic_save".into(), "Atomic configuration persistence pulse: OK".into());
    en.insert("error.game.multi_account_blocked".into(), "Launch Blocked: Simultaneous accounts disabled in settings and another account is already active".into());
    en.insert("error.game.launch_too_soon".into(), "Launch pacing: previous account ({user}) Battle.net is still starting up; wait a moment or force launch".into());
    en.insert("error.game.invalid_path".into(), "Battle.net installation path not found".into());
    en.insert("error.game.user_uninitialized".into(), "Windows account environment initialization incomplete".into());
    en.insert("error.diag.icacls_failed".into(), "icacls inspection failed: {error}".into());
    en.insert("logs.config.readme_snapshot_title".into(), "# D2R Multiplay Account Snapshot Mapping (Auto-generated)".into());
    en.insert("logs.config.readme_snapshot_desc".into(), "This file helps you identify which `.db` files in the `snapshots` folder belong to which account.".into());
    en.insert("logs.config.readme_snapshot_header_user".into(), "Windows User".into());
    en.insert("logs.config.readme_snapshot_header_remark".into(), "Remark".into());
    en.insert("logs.config.readme_snapshot_header_file".into(), "Snapshot File (ID)".into());
    en.insert("logs.config.readme_snapshot_footer".into(), "If you manually move to a new PC or re-add accounts, you can restore login states by renaming files to match the new IDs.".into());

    en.insert("logs.inspector.task_join_error".into(), "Background task join failure: {error}".into());
    en.insert("logs.inspector.nt_query_fail".into(), "Low-level system query failed (NtQuery: 0x{status})".into());
    en.insert("logs.inspector.handle_close_fail".into(), "Failed to close handle 0x{handle} for PID {pid}".into());
    en.insert("status_unknown".into(), "Unknown".into());
    en.insert("status_system".into(), "System".into());
    en.insert("logs.os.user_created_success".into(), "User created successfully".into());
    en.insert("error.os.missing_account_context".into(), "Missing account context for credential verification".into());
    en.insert("error.os.vault_failure_prefix".into(), "Vault Lookup Failure: {error}".into());
    en.insert("error.sequence.invalid_index".into(), "Invalid preset index".into());
    en.insert("error.sequence.not_found".into(), "Preset not found".into());
    en.insert("error.sequence.no_active".into(), "No active sequence".into());
    en.insert("error.sequence.account_not_found".into(), "Account {id} not found".into());
    en.insert("logs.permissions.fixing_start".into(), "> fix_game_permissions (\"{path}\")...".into());
    en.insert("logs.permissions.error_prefix".into(), "Error: {error}".into());
    en.insert("logs.status.refresh_success".into(), "Paths refreshed/completed successfully".into());
    en.insert("captured_game_path".into(), "Captured Game Path".into());
    en.insert("tray.menu.show".into(), "Show Main Interface".into());
    en.insert("tray.menu.quit".into(), "Quit".into());
    trans.insert("en".into(), en);

    // --- Chinese (Simplified) ---
    let mut zh = Map::new();
    zh.insert("logs.status.no_user_info".into(), "检测到 D2R.exe (PID={pid})，但无法获取用户信息（权限不足？）".into());
    zh.insert("logs.status.no_path".into(), "检测到 D2R.exe (PID={pid})，但无法获取执行路径".into());
    zh.insert("logs.launcher.scanning_env".into(), "扫描环境（锚点验证）...".into());
    zh.insert("logs.launcher.clearing_env".into(), "清理环境...".into());
    zh.insert("logs.launcher.killed_processes".into(), "终止了 {count} 个相关进程".into());
    zh.insert("logs.launcher.closed_mutexes".into(), "关闭了 {count} 个内核互斥锁".into());
    zh.insert("logs.launcher.verifying_permissions".into(), "验证文件访问权限（原子锁）...".into());
    zh.insert("logs.launcher.align_success".into(), "环境文件对齐完成".into());
    zh.insert("logs.launcher.launch_success".into(), "启动 Battle.net (PID: {pid})".into());
    zh.insert("logs.config.migration_start".into(), "正在开始保险库安全性迁移...".into());
    zh.insert("logs.config.migration_completed".into(), "保险库迁移成功完成".into());
    zh.insert("logs.launcher.waiting_file_handles".into(), "等待系统释放文件句柄...".into());
    zh.insert("logs.launcher.file_occupied_error".into(), "安全拦截：战网配置文件仍在被占用。原因：{error}".into());
    zh.insert("logs.launcher.cleanup_error".into(), "环境归零失败：无法清理旧档案。{error}".into());
    zh.insert("logs.launcher.no_snapshot".into(), "目标账号无历史快照，使用战网初始环境运行".into());
    zh.insert("logs.launcher.align_critical_error".into(), "环境对齐严重异常：{error}".into());
    zh.insert("logs.launcher.bnet_path".into(), "战网路径：{path}".into());
    zh.insert("logs.launcher.host_user_detected".into(), "检测到宿主用户，开始直接运行战网...".into());
    zh.insert("logs.launcher.syncing_password_policy".into(), "正在同步密码永不过期策略...".into());
    zh.insert("logs.launcher.sync_policy_note".into(), "策略同步备注：{error}".into());
    zh.insert("logs.launcher.security_patch_skipped".into(), "安全状态预修补跳过：{error}".into());
    zh.insert("logs.launcher.vault_error".into(), "隔离启动失败：无法从加密仓提取凭据。{error}".into());
    zh.insert("logs.launcher.anchor_found".into(), "账号 {user} 在位，锚点路径：{path}".into());
    zh.insert("logs.launcher.path_captured".into(), "已捕获 {user} 的最新游戏路径：{path}".into());
    zh.insert("logs.launcher.backing_up".into(), "检测到账号 {user} 双在位，正在备份快照...".into());
    zh.insert("logs.launcher.backing_up_owner".into(), "台账与基准路径双证通过，正在备份上一账号 {user} 的快照（无感轮巡）...".into());
    zh.insert("logs.launcher.backing_up_owner_plain".into(), "台账归属确认，正在备份上一账号 {user} 的快照（非 D2R 账户）...".into());
    zh.insert("logs.config.baseline_seeded".into(), "升级：已从现有快照为 {count} 个账号自动同步基准路径".into());
    zh.insert("logs.launcher.backup_skipped_no_baseline".into(), "{user} 未设置基准路径，已跳过自动备份。到账号编辑中确认基准路径即可启用无感轮巡备份。".into());
    zh.insert("logs.launcher.backup_skipped_owner".into(), "已跳过 {user} 的自动备份：当前战网配置属于其他账号（防串路径保护）".into());
    zh.insert("logs.launcher.backup_skipped_mismatch".into(), "已跳过 {user} 的自动备份：当前战网配置与该账号的基准路径/快照不符（防串路径保护）".into());
    zh.insert("logs.launcher.snapshot_baseline_mismatch".into(), "警告：为 {user} 注入的快照中未找到其基准路径 {path}——该快照可能已过期或被污染；请在战网中重新定位游戏后再保存一次快照".into());
    zh.insert("logs.config.relocate_start".into(), "正在将数据迁移至 {path}...".into());
    zh.insert("logs.config.relocate_success".into(), "数据成功迁移至 {path}".into());
    zh.insert("logs.config.relocate_failed".into(), "数据迁移失败: {error}".into());

    zh.insert("logs.mutex.none_found".into(), "全量扫描完成，未命中任何 D2R 互斥锁（已检查 {count} 个句柄）".into());
    zh.insert("logs.mutex.global_scan".into(), "正在执行全系统逻辑锁扫描 (Cross-Session)...".into());
    zh.insert("logs.mutex.probe_timeout".into(), "⚠️ 句柄探测超时 (PID: {pid}, Handle: {handle})".into());
    zh.insert("logs.mutex.found_and_cleaned".into(), "🎯 发现并清理 D2R 互斥锁：{name}".into());
    zh.insert("logs.mutex.no_processes".into(), "未发现 D2R 进程，跳过互斥锁清理".into());
    zh.insert("logs.mutex.debug_priv_failed".into(), "无法启用调试权限，探测过程可能受限".into());
    zh.insert("logs.mutex.scanning_system_handles".into(), "正在扫描系统 {count} 个句柄...".into());

    zh.insert("logs.config.migration_success".into(), "快照迁移成功（首次升级保护），共自动找回 {count} 个账号的登录状态".into());
    zh.insert("logs.config.rescue_success".into(), "从旧目录搜救成功：{user} ({id})".into());
    zh.insert("logs.config.save_retry".into(), "配置文件保存失败（尝试 {attempt}）：{error}。正在重试...".into());
    zh.insert("logs.config.temp_write_retry".into(), "写临时配置文件失败（尝试 {attempt}）：{error}。正在重试...".into());

    zh.insert("logs.system.atomic_save".into(), "原子配置持久化脉冲: 正常".into());
    zh.insert("error.game.multi_account_blocked".into(), "启动拦截：设置中已禁用多账号同时在线，且当前已有其他账号正在运行".into());
    zh.insert("error.game.launch_too_soon".into(), "启动节流：上一个账号（{user}）的战网还在启动中，请稍候片刻或强制启动".into());
    zh.insert("error.game.invalid_path".into(), "未找到 Battle.net 安装路径".into());
    zh.insert("error.game.user_uninitialized".into(), "Windows 账户环境初始化未完成".into());
    zh.insert("error.diag.icacls_failed".into(), "icacls 权限检查失败：{error}".into());
    zh.insert("logs.config.readme_snapshot_title".into(), "# D2R Multiplay 账号快照映射表 (自动生成)".into());
    zh.insert("logs.config.readme_snapshot_desc".into(), "此文件帮助您识别 `snapshots` 文件夹中的 `.db` 文件分别属于哪个账号。".into());
    zh.insert("logs.config.readme_snapshot_header_user".into(), "Windows 用户".into());
    zh.insert("logs.config.readme_snapshot_header_remark".into(), "备注".into());
    zh.insert("logs.config.readme_snapshot_header_file".into(), "快照文件 (ID)".into());
    zh.insert("logs.config.readme_snapshot_footer".into(), "如果您手动迁移到新电脑或重新添加账号，可以通过重命名文件以匹配新 ID 来恢复登录状态。".into());

    zh.insert("logs.inspector.task_join_error".into(), "后端任务结合失败: {error}".into());
    zh.insert("logs.inspector.nt_query_fail".into(), "底层系统查询失败 (NtQuery: 0x{status})".into());
    zh.insert("logs.inspector.handle_close_fail".into(), "无法关闭 PID {pid} 的句柄 0x{handle}".into());
    zh.insert("status_unknown".into(), "未知".into());
    zh.insert("status_system".into(), "系统".into());
    zh.insert("logs.os.user_created_success".into(), "Windows 用户创建成功".into());
    zh.insert("error.os.missing_account_context".into(), "缺失账号上下文，无法验证凭据".into());
    zh.insert("error.os.vault_failure_prefix".into(), "保险库查询失败: {error}".into());
    zh.insert("error.sequence.invalid_index".into(), "无效的预设索引".into());
    zh.insert("error.sequence.not_found".into(), "未找到预设".into());
    zh.insert("error.sequence.no_active".into(), "当前没有正在进行的序列".into());
    zh.insert("error.sequence.account_not_found".into(), "未找到账号 {id}".into());
    zh.insert("logs.permissions.fixing_start".into(), "> 正在修复权限 (\"{path}\")...".into());
    zh.insert("logs.permissions.error_prefix".into(), "错误: {error}".into());
    zh.insert("logs.status.refresh_success".into(), "路径刷新/补完成功".into());
    zh.insert("captured_game_path".into(), "捕获的游戏路径".into());
    zh.insert("tray.menu.show".into(), "显示主界面".into());
    zh.insert("tray.menu.quit".into(), "退出".into());
    trans.insert("zh".into(), zh);

    // --- Chinese (Traditional) ---
    let mut tw = Map::new();
    tw.insert("logs.status.no_user_info".into(), "檢測到 D2R.exe (PID={pid})，但無法獲取用戶信息（權限不足？）".into());
    tw.insert("logs.status.no_path".into(), "檢測到 D2R.exe (PID={pid})，但無法獲取執行路徑".into());
    tw.insert("logs.launcher.scanning_env".into(), "掃描環境（錨點驗證）...".into());
    tw.insert("logs.launcher.clearing_env".into(), "清理環境...".into());
    tw.insert("logs.launcher.killed_processes".into(), "終止了 {count} 個相關進程".into());
    tw.insert("logs.launcher.closed_mutexes".into(), "關閉了 {count} 個内核互斥鎖".into());
    tw.insert("logs.launcher.verifying_permissions".into(), "驗證文件訪問權限（原子鎖）...".into());
    tw.insert("logs.launcher.align_success".into(), "環境文件對齊完成".into());
    tw.insert("logs.launcher.launch_success".into(), "啟動 Battle.net (PID: {pid})".into());
    tw.insert("logs.config.migration_start".into(), "正在开始保险库安全性遷移...".into());
    tw.insert("logs.config.migration_completed".into(), "保险库遷移成功完成".into());
    tw.insert("logs.launcher.waiting_file_handles".into(), "等待系統釋放文件句柄...".into());
    tw.insert("logs.launcher.file_occupied_error".into(), "安全攔截：戰網配置文件仍在被占用。原因：{error}".into());
    tw.insert("logs.launcher.cleanup_error".into(), "環境歸零失敗：無法清理舊檔案。{error}".into());
    tw.insert("logs.launcher.no_snapshot".into(), "目標帳號無歷史快照，使用戰網初始環境運行".into());
    tw.insert("logs.launcher.align_critical_error".into(), "環境對齊嚴重異常：{error}".into());
    tw.insert("logs.launcher.bnet_path".into(), "戰網路徑：{path}".into());
    tw.insert("logs.launcher.host_user_detected".into(), "檢測到宿主用戶，開始直接運行戰網...".into());
    tw.insert("logs.launcher.syncing_password_policy".into(), "正在同步密碼永不過期策略...".into());
    tw.insert("logs.launcher.sync_policy_note".into(), "策略同步備註：{error}".into());
    tw.insert("logs.launcher.security_patch_skipped".into(), "安全狀態預修補跳過：{error}".into());
    tw.insert("logs.launcher.vault_error".into(), "隔離啟動失敗：無法從加密倉提取憑據。{error}".into());
    tw.insert("logs.launcher.anchor_found".into(), "帳號 {user} 在位，錨點路徑：{path}".into());
    tw.insert("logs.launcher.path_captured".into(), "已捕獲 {user} 的最新遊戲路徑：{path}".into());
    tw.insert("logs.launcher.backing_up".into(), "檢測到帳號 {user} 雙在位，正在備份快照...".into());
    tw.insert("logs.launcher.backing_up_owner".into(), "台賬與基準路徑雙證通過，正在備份上一帳號 {user} 的快照（無感輪巡）...".into());
    tw.insert("logs.launcher.backing_up_owner_plain".into(), "台賬歸屬確認，正在備份上一帳號 {user} 的快照（非 D2R 帳戶）...".into());
    tw.insert("logs.config.baseline_seeded".into(), "升級：已從現有快照為 {count} 個帳號自動同步基準路徑".into());
    tw.insert("logs.launcher.backup_skipped_no_baseline".into(), "{user} 未設定基準路徑，已跳過自動備份。到帳號編輯中確認基準路徑即可啟用無感輪巡備份。".into());
    tw.insert("logs.launcher.backup_skipped_owner".into(), "已跳過 {user} 的自動備份：目前戰網配置屬於其他帳號（防串路徑保護）".into());
    tw.insert("logs.launcher.backup_skipped_mismatch".into(), "已跳過 {user} 的自動備份：目前戰網配置與該帳號的基準路徑/快照不符（防串路徑保護）".into());
    tw.insert("logs.launcher.snapshot_baseline_mismatch".into(), "警告：為 {user} 注入的快照中未找到其基準路徑 {path}——該快照可能已過期或被污染；請在戰網中重新定位遊戲後再儲存一次快照".into());
    tw.insert("logs.config.relocate_start".into(), "正在將資料遷移至 {path}...".into());
    tw.insert("logs.config.relocate_success".into(), "資料成功遷移至 {path}".into());
    tw.insert("logs.config.relocate_failed".into(), "資料遷移失敗: {error}".into());

    tw.insert("logs.mutex.none_found".into(), "全量掃描完成，未命中任何 D2R 互斥鎖（已檢查 {count} 個句柄）".into());
    tw.insert("logs.mutex.global_scan".into(), "正在執行全系統邏輯鎖掃描 (Cross-Session)...".into());
    tw.insert("logs.mutex.probe_timeout".into(), "⚠️ 句柄探測超時 (PID: {pid}, Handle: {handle})".into());
    tw.insert("logs.mutex.found_and_cleaned".into(), "🎯 發現並清理 D2R 互斥體：{name}".into());
    tw.insert("logs.mutex.no_processes".into(), "未發現 D2R 進程，跳過互斥鎖清理".into());
    tw.insert("logs.mutex.debug_priv_failed".into(), "無法啟用調試權限，探測過程可能受限".into());
    tw.insert("logs.mutex.scanning_system_handles".into(), "正在掃描系統 {count} 個句柄...".into());

    tw.insert("logs.config.migration_success".into(), "快照遷移成功（首次升級保護），共自動找回 {count} 個帳號的登錄狀態".into());
    tw.insert("logs.config.rescue_success".into(), "從舊目錄搜救成功：{user} ({id})".into());
    tw.insert("logs.config.save_retry".into(), "配置文件保存失敗（嘗試 {attempt}）：{error}。正在重試...".into());
    tw.insert("logs.config.temp_write_retry".into(), "寫臨時配置文件失敗（嘗試 {attempt}）：{error}。正在重試...".into());

    tw.insert("logs.system.atomic_save".into(), "原子配置持久化脈衝: 正常".into());
    tw.insert("error.game.multi_account_blocked".into(), "啟動攔截：設置中已禁用多帳號同時在線，且當前已有其他帳號正在運行".into());
    tw.insert("error.game.launch_too_soon".into(), "啟動節流：上一個帳號（{user}）的戰網還在啟動中，請稍候片刻或強制啟動".into());
    tw.insert("error.game.invalid_path".into(), "未找到 Battle.net 安裝路徑".into());
    tw.insert("error.game.user_uninitialized".into(), "Windows 帳戶環境初始化未完成".into());
    tw.insert("error.diag.icacls_failed".into(), "icacls 權限檢查失敗：{error}".into());
    tw.insert("logs.config.readme_snapshot_title".into(), "# D2R Multiplay 帳號快照映射表 (自動生成)".into());
    tw.insert("logs.config.readme_snapshot_desc".into(), "此文件幫助您識別 `snapshots` 文件夾中的 `.db` 文件分別屬於哪個帳號。".into());
    tw.insert("logs.config.readme_snapshot_header_user".into(), "Windows 用戶".into());
    tw.insert("logs.config.readme_snapshot_header_remark".into(), "備註".into());
    tw.insert("logs.config.readme_snapshot_header_file".into(), "快照文件 (ID)".into());
    tw.insert("logs.config.readme_snapshot_footer".into(), "如果您手動遷移到新電腦或重新添加帳號，可以通過重命名文件以匹配新 ID 來恢復登錄狀態。".into());

    tw.insert("logs.inspector.task_join_error".into(), "後端任務結合失敗: {error}".into());
    tw.insert("logs.inspector.nt_query_fail".into(), "底層系統查詢失敗 (NtQuery: 0x{status})".into());
    tw.insert("logs.inspector.handle_close_fail".into(), "無法關閉 PID {pid} 的句柄 0x{handle}".into());
    tw.insert("status_unknown".into(), "未知".into());
    tw.insert("status_system".into(), "系統".into());
    tw.insert("logs.os.user_created_success".into(), "Windows 用戶創建成功".into());
    tw.insert("error.os.missing_account_context".into(), "缺失帳號上下文，無法驗證憑據".into());
    tw.insert("error.os.vault_failure_prefix".into(), "保險庫查詢失敗: {error}".into());
    tw.insert("error.sequence.invalid_index".into(), "無效的預設索引".into());
    tw.insert("error.sequence.not_found".into(), "未找到預設".into());
    tw.insert("error.sequence.no_active".into(), "當前沒有正在進行的序列".into());
    tw.insert("error.sequence.account_not_found".into(), "未找到帳號 {id}".into());
    tw.insert("logs.permissions.fixing_start".into(), "> 正在修復權限 (\"{path}\")...".into());
    tw.insert("logs.permissions.error_prefix".into(), "錯誤: {error}".into());
    tw.insert("logs.status.refresh_success".into(), "路徑刷新/補完成功".into());
    tw.insert("captured_game_path".into(), "捕獲的遊戲路徑".into());
    tw.insert("tray.menu.show".into(), "顯示主介面".into());
    tw.insert("tray.menu.quit".into(), "退出".into());
    trans.insert("zh-TW".into(), tw);

    // --- Japanese ---
    let mut ja = Map::new();
    ja.insert("logs.status.no_user_info".into(), "D2R.exe (PID={pid}) を検出しましたが、ユーザー情報を取得できませんでした (権限不足？)".into());
    ja.insert("logs.status.no_path".into(), "D2R.exe (PID={pid}) を検出しましたが、実行パスを取得できませんでした".into());
    ja.insert("logs.launcher.scanning_env".into(), "環境スキャン（アンカー検証）中...".into());
    ja.insert("logs.launcher.clearing_env".into(), "環境クリーンアップ中...".into());
    ja.insert("logs.launcher.killed_processes".into(), "{count} 個の関連プロセスを終了しました".into());
    ja.insert("logs.launcher.closed_mutexes".into(), "{count} 個のカーネルミューテックスを閉じました".into());
    ja.insert("logs.launcher.verifying_permissions".into(), "ファイルアクセス権限を検証中 (アトミックロック)...".into());
    ja.insert("logs.launcher.align_success".into(), "環境ファイルの配置が完了しました".into());
    ja.insert("logs.launcher.launch_success".into(), "Battle.net を起動しました (PID: {pid})".into());
    ja.insert("logs.config.migration_start".into(), "Vault セキュリティ移行を開始しています...".into());
    ja.insert("logs.config.migration_completed".into(), "Vault への移行が正常に完了しました".into());
    ja.insert("logs.launcher.waiting_file_handles".into(), "システムがファイルハンドルを解放するのを待機しています...".into());
    ja.insert("logs.launcher.file_occupied_error".into(), "セキュリティインターセプト：Battle.net構成ファイルがまだ使用中です。理由：{error}".into());
    ja.insert("logs.launcher.cleanup_error".into(), "配置に失敗しました：古いファイルをクリーンアップできません。{error}".into());
    ja.insert("logs.launcher.no_snapshot".into(), "ターゲットアカウントの履歴スナップショットが見つかりません。クリーンなBattle.net環境を使用します".into());
    ja.insert("logs.launcher.align_critical_error".into(), "ファイル配置中にクリティカルエラーが発生しました：{error}".into());
    ja.insert("logs.launcher.bnet_path".into(), "Battle.netパス：{path}".into());
    ja.insert("logs.launcher.host_user_detected".into(), "ホストユーザーを検出しました。Battle.netを直接起動します...".into());
    ja.insert("logs.launcher.syncing_password_policy".into(), "パスワードポリシーを同期しています（無期限設定）...".into());
    ja.insert("logs.launcher.sync_policy_note".into(), "ポリシー同期の備考：{error}".into());
    ja.insert("logs.launcher.security_patch_skipped".into(), "セキュリティパッチがスキップされました：{error}".into());
    ja.insert("logs.launcher.vault_error".into(), "起動に失敗しました：Vaultから資格情報を取得できませんでした。{error}".into());
    ja.insert("logs.launcher.anchor_found".into(), "アカウント {user} がアクティブです。アンカーパス：{path}".into());
    ja.insert("logs.launcher.path_captured".into(), "{user} の最新のゲームパスをキャプチャしました：{path}".into());
    ja.insert("logs.launcher.backing_up".into(), "アカウント {user} の二重オンラインを検出しました。スナップショットをバックアップしています...".into());
    ja.insert("logs.launcher.backing_up_owner".into(), "台帳と基準パスの両方を確認——前のアカウント {user} のスナップショットをバックアップしています（シームレスローテーション）...".into());
    ja.insert("logs.launcher.backing_up_owner_plain".into(), "台帳の所有権を確認——前のアカウント {user} のスナップショットをバックアップしています（非 D2R アカウント）...".into());
    ja.insert("logs.config.baseline_seeded".into(), "アップグレード：既存のスナップショットから {count} 件のアカウントに基準パスを自動設定しました".into());
    ja.insert("logs.launcher.backup_skipped_no_baseline".into(), "{user} に基準パスが設定されていないため、自動バックアップをスキップしました。アカウント編集で基準パスを確認すると、シームレスなローテーションバックアップが有効になります。".into());
    ja.insert("logs.launcher.backup_skipped_owner".into(), "{user} の自動バックアップをスキップしました：現在の Battle.net 設定は別のアカウントに属しています（パス混線防止ガード）".into());
    ja.insert("logs.launcher.backup_skipped_mismatch".into(), "{user} の自動バックアップをスキップしました：現在の Battle.net 設定がこのアカウントの基準パス/スナップショットと一致しません（パス混線防止ガード）".into());
    ja.insert("logs.launcher.snapshot_baseline_mismatch".into(), "警告：{user} に注入されたスナップショットに基準パス {path} が見つかりません——スナップショットが古いか汚染されている可能性があります。Battle.net でゲームを再指定してからスナップショットを保存し直してください".into());
    ja.insert("logs.config.relocate_start".into(), "データを {path} に移行しています...".into());
    ja.insert("logs.config.relocate_success".into(), "データが {path} に正常に移行されました".into());
    ja.insert("logs.config.relocate_failed".into(), "データの移行に失敗しました: {error}".into());

    ja.insert("logs.mutex.none_found".into(), "システム全域のスキャンが完了しました。D2Rミューテックスは見つかりませんでした（{count}個のハンドルを確認）".into());
    ja.insert("logs.mutex.global_scan".into(), "グローバルシステムロジックロックスキャンを実行しています (Cross-Session)...".into());
    ja.insert("logs.mutex.probe_timeout".into(), "⚠️ ハンドルプローブがタイムアウトしました (PID: {pid}, Handle: {handle})".into());
    ja.insert("logs.mutex.found_and_cleaned".into(), "🎯 D2Rミューテックスを検出してクリーンアップしました：{name}".into());
    ja.insert("logs.mutex.no_processes".into(), "D2Rプロセスが見つかりませんでした。ミューテックスのクリーンアップをスキップします".into());
    ja.insert("logs.mutex.debug_priv_failed".into(), "デバッグ権限の有効化に失敗しました。プロセスの検出が制限される可能性があります".into());
    ja.insert("logs.mutex.scanning_system_handles".into(), "システムの {count} 個のハンドルをスキャンしています...".into());

    ja.insert("logs.config.migration_success".into(), "スナップショットの移行に成功しました（初回更新保護）。{count}個のアカウントのログイン状態を回復しました".into());
    ja.insert("logs.config.rescue_success".into(), "古いディレクトリからの救出に成功しました：{user} ({id})".into());
    ja.insert("logs.config.save_retry".into(), "構成の保存に失敗しました（試行 {attempt}）：{error}。再試行しています...".into());
    ja.insert("logs.config.temp_write_retry".into(), "一時的な構成の書き込みに失敗しました（試行 {attempt}）：{error}。再試行しています...".into());

    ja.insert("logs.system.atomic_save".into(), "アトミック構成の永続化パルス: 正常".into());
    ja.insert("error.game.multi_account_blocked".into(), "起動をブロックしました：設定で複数アカウントの同時オンラインが禁止されており、既に別のアカウントがアクティブです".into());
    ja.insert("error.game.launch_too_soon".into(), "起動ペーシング：前のアカウント（{user}）の Battle.net がまだ起動中です。少し待つか強制起動してください".into());
    ja.insert("error.game.invalid_path".into(), "Battle.net インストールパスが見つかりません".into());
    ja.insert("error.game.user_uninitialized".into(), "Windows アカウント環境の初期化が未完了です".into());
    ja.insert("error.diag.icacls_failed".into(), "icacls アクセス権限チェックに失敗しました：{error}".into());
    ja.insert("logs.config.readme_snapshot_title".into(), "# D2R Multiplay アカウントスナップショットマッピング (自動生成)".into());
    ja.insert("logs.config.readme_snapshot_desc".into(), "このファイルは、`snapshots` フォルダ内の `.db` ファイルがどのアカウントに属しているかを識別するのに役立ちます。".into());
    ja.insert("logs.config.readme_snapshot_header_user".into(), "Windows ユーザー".into());
    ja.insert("logs.config.readme_snapshot_header_remark".into(), "備考".into());
    ja.insert("logs.config.readme_snapshot_header_file".into(), "スナップショットファイル (ID)".into());
    ja.insert("logs.config.readme_snapshot_footer".into(), "手動で新しい PC に移行したり、アカウントを再追加したりした場合は、新しい ID に合わせてファイル名を変更することでログイン状態を復元できます。".into());

    ja.insert("logs.inspector.task_join_error".into(), "バックグラウンドタスクの同期に失敗しました: {error}".into());
    ja.insert("ja.insert".into(), "ja.insert".into()); // Correction: I won't use ja.insert here, let's follow the pattern
    ja.insert("logs.inspector.nt_query_fail".into(), "低レベルのシステムクエリに失敗しました (NtQuery: 0x{status})".into());
    ja.insert("logs.inspector.handle_close_fail".into(), "PID {pid} のハンドル 0x{handle} を閉じることができませんでした".into());
    ja.insert("status_unknown".into(), "不明".into());
    ja.insert("status_system".into(), "システム".into());
    ja.insert("logs.os.user_created_success".into(), "Windowsユーザーが正常に作成されました".into());
    ja.insert("error.os.missing_account_context".into(), "アカウントコンテキストが不足しているため、資格情報を検証できません".into());
    ja.insert("error.os.vault_failure_prefix".into(), "Vaultの検索に失敗しました: {error}".into());
    ja.insert("error.sequence.invalid_index".into(), "無効なプリセットインデックス".into());
    ja.insert("error.sequence.not_found".into(), "プリセットが見つかりません".into());
    ja.insert("error.sequence.no_active".into(), "現在アクティブなシーケンスはありません".into());
    ja.insert("error.sequence.account_not_found".into(), "アカウント {id} が見つかりません".into());
    ja.insert("logs.permissions.fixing_start".into(), "> アクセス権限を修復しています (\"{path}\")...".into());
    ja.insert("logs.permissions.error_prefix".into(), "エラー: {error}".into());
    ja.insert("logs.status.refresh_success".into(), "パスのリフレッシュ/補完が正常に完了しました".into());
    ja.insert("captured_game_path".into(), "キャプチャされたゲームパス".into());
    ja.insert("tray.menu.show".into(), "メイン画面を表示".into());
    ja.insert("tray.menu.quit".into(), "終了".into());
    trans.insert("ja".into(), ja);

    // --- Korean ---
    let mut ko = Map::new();
    ko.insert("logs.status.no_user_info".into(), "D2R.exe (PID={pid})를 감지했지만 사용자 정보를 가져올 수 없습니다 (권한 부족?)".into());
    ko.insert("logs.status.no_path".into(), "D2R.exe (PID={pid})를 감지했지만 실행 경로를 가져올 수 없습니다".into());
    ko.insert("logs.launcher.scanning_env".into(), "환경 스캔(앵커 확인) 중...".into());
    ko.insert("logs.launcher.clearing_env".into(), "환경 정리 중...".into());
    ko.insert("logs.launcher.killed_processes".into(), "{count}개의 관련 프로세스를 종료했습니다".into());
    ko.insert("logs.launcher.closed_mutexes".into(), "{count}개의 커널 뮤텍스를 닫았습니다".into());
    ko.insert("logs.launcher.verifying_permissions".into(), "파일 액세스 권한 확인 중 (원자적 잠금)...".into());
    ko.insert("logs.launcher.align_success".into(), "환경 파일 정렬 완료".into());
    ko.insert("logs.launcher.launch_success".into(), "배틀넷 실행 완료 (PID: {pid})".into());
    ko.insert("logs.config.migration_start".into(), "Vault 보안 마이그레이션 시작 중...".into());
    ko.insert("logs.config.migration_completed".into(), "Vault 마이그레이션이 성공적으로 완료되었습니다".into());
    ko.insert("logs.launcher.waiting_file_handles".into(), "시스템이 파일 핸들을 해제할 때까지 대기 중...".into());
    ko.insert("logs.launcher.file_occupied_error".into(), "보안 차단: 배틀넷 설정 파일이 아직 사용 중입니다. 이유: {error}".into());
    ko.insert("logs.launcher.cleanup_error".into(), "환경 정리 실패: 이전 파일을 정리할 수 없습니다. {error}".into());
    ko.insert("logs.launcher.no_snapshot".into(), "대상 계정의 기록 스냅샷을 찾을 수 없습니다. 깨끗한 배틀넷 환경을 사용합니다".into());
    ko.insert("logs.launcher.align_critical_error".into(), "파일 정렬 중 치명적인 오류 발생: {error}".into());
    ko.insert("logs.launcher.bnet_path".into(), "배틀넷 경로: {path}".into());
    ko.insert("logs.launcher.host_user_detected".into(), "호스트 사용자 감지됨, 배틀넷을 직접 실행합니다...".into());
    ko.insert("logs.launcher.syncing_password_policy".into(), "비밀번호 정책(만료되지 않음) 동기화 중...".into());
    ko.insert("logs.launcher.sync_policy_note".into(), "정책 동기화 참고: {error}".into());
    ko.insert("logs.launcher.security_patch_skipped".into(), "보안 패치 건너뜀: {error}".into());
    ko.insert("logs.launcher.vault_error".into(), "실행 실패: Vault에서 자격 증명을 가져올 수 없습니다. {error}".into());
    ko.insert("logs.launcher.anchor_found".into(), "계정 {user} 활성 상태, 앵커 경로: {path}".into());
    ko.insert("error.diag.icacls_failed".into(), "icacls 권한 확인 실패: {error}".into());
    ko.insert("logs.launcher.path_captured".into(), "{user}의 최신 게임 경로를 캡처했습니다: {path}".into());
    ko.insert("logs.launcher.backing_up".into(), "계정 {user} 이중 온라인 감지됨, 스냅샷 백업 중...".into());
    ko.insert("logs.launcher.backing_up_owner".into(), "장부와 기준 경로 이중 확인 완료 — 이전 계정 {user} 의 스냅샷을 백업하는 중 (무감 로테이션)...".into());
    ko.insert("logs.launcher.backing_up_owner_plain".into(), "장부 소유권 확인 — 이전 계정 {user} 의 스냅샷을 백업하는 중 (비 D2R 계정)...".into());
    ko.insert("logs.config.baseline_seeded".into(), "업그레이드: 기존 스냅샷에서 {count} 개 계정의 기준 경로를 자동 설정했습니다".into());
    ko.insert("logs.launcher.backup_skipped_no_baseline".into(), "{user} 에 기준 경로가 설정되지 않아 자동 백업을 건너뛰었습니다. 계정 편집에서 기준 경로를 확인하면 무감 로테이션 백업이 활성화됩니다.".into());
    ko.insert("logs.launcher.backup_skipped_owner".into(), "{user} 의 자동 백업을 건너뛰었습니다: 현재 배틀넷 설정이 다른 계정 소유입니다 (경로 혼선 방지 가드)".into());
    ko.insert("logs.launcher.backup_skipped_mismatch".into(), "{user} 의 자동 백업을 건너뛰었습니다: 현재 배틀넷 설정이 이 계정의 기준 경로/스냅샷과 일치하지 않습니다 (경로 혼선 방지 가드)".into());
    ko.insert("logs.launcher.snapshot_baseline_mismatch".into(), "경고: {user} 에 주입된 스냅샷에서 기준 경로 {path} 를 찾을 수 없습니다 — 스냅샷이 오래되었거나 오염되었을 수 있습니다. 배틀넷에서 게임을 다시 지정한 후 스냅샷을 다시 저장하세요".into());
    ko.insert("logs.config.relocate_start".into(), "데이터를 {path}로 마이그레이션 중...".into());
    ko.insert("logs.config.relocate_success".into(), "데이터가 {path}로 성공적으로 마이그레이션되었습니다".into());
    ko.insert("logs.config.relocate_failed".into(), "데이터 마이그레이션 실패: {error}".into());

    ko.insert("logs.mutex.none_found".into(), "시스템 전체 스캔 완료, D2R 뮤텍스가 발견되지 않았습니다 ({count}개 핸들 확인됨)".into());
    ko.insert("logs.mutex.global_scan".into(), "글로벌 시스템 로직 잠금 스캔 수행 중 (Cross-Session)...".into());
    ko.insert("logs.mutex.probe_timeout".into(), "⚠️ 핸들 프로브 시간 초과 (PID: {pid}, 핸들: {handle})".into());
    ko.insert("logs.mutex.found_and_cleaned".into(), "🎯 D2R 뮤텍스를 찾아 정리했습니다: {name}".into());
    ko.insert("logs.mutex.no_processes".into(), "D2R 프로세스를 찾을 수 없습니다. 뮤텍스 정리를 건너뜁니다".into());
    ko.insert("logs.mutex.debug_priv_failed".into(), "디버그 권한을 활성화하지 못했습니다. 프로세스 감지가 제한될 수 있습니다".into());
    ko.insert("logs.mutex.scanning_system_handles".into(), "시스템 {count}개 핸들을 스캔 중...".into());

    ko.insert("logs.config.migration_success".into(), "스냅샷 마이그레이션 성공(초기 업데이트 보호), {count}개 계정의 로그인 상태를 복구했습니다".into());
    ko.insert("logs.config.rescue_success".into(), "이전 디렉토리에서 성공적으로 구조함: {user} ({id})".into());
    ko.insert("logs.config.save_retry".into(), "포기 실패(시도 {attempt}): {error}. 다시 시도 중...".into());
    ko.insert("logs.config.temp_write_retry".into(), "임시 구성 쓰기 실패(시도 {attempt}): {error}. 다시 시도 중...".into());

    ko.insert("logs.system.atomic_save".into(), "원자적 구성 지속성 펄스: 정상".into());
    ko.insert("error.game.multi_account_blocked".into(), "실행 차단: 설정에서 여러 계정의 동시 접속이 비활성화되어 있고 이미 다른 계정이 실행 중입니다".into());
    ko.insert("error.game.launch_too_soon".into(), "실행 페이싱: 이전 계정({user})의 배틀넷이 아직 시작 중입니다. 잠시 기다리거나 강제 실행하십시오".into());
    ko.insert("error.game.invalid_path".into(), "Battle.net 설치 경로를 찾을 수 없습니다".into());
    ko.insert("error.game.user_uninitialized".into(), "Windows 계정 환경 초기화가 완료되지 않았습니다".into());
    ko.insert("logs.config.readme_snapshot_title".into(), "# D2R Multiplay 계정 스냅샷 매핑 (자동 생성)".into());
    ko.insert("logs.config.readme_snapshot_desc".into(), "이 파일은 `snapshots` 폴더의 `.db` 파일이 어떤 계정에 속하는지 확인하는 데 도움이 됩니다.".into());
    ko.insert("logs.config.readme_snapshot_header_user".into(), "Windows 사용자".into());
    ko.insert("logs.config.readme_snapshot_header_remark".into(), "메모".into());
    ko.insert("logs.config.readme_snapshot_header_file".into(), "스냅샷 파일 (ID)".into());
    ko.insert("logs.config.readme_snapshot_footer".into(), "수동으로 새 PC로 이동하거나 계정을 다시 추가하는 경우, 새 ID에 맞게 파일 이름을 변경하여 로그인 상태를 복구할 수 있습니다.".into());

    ko.insert("logs.inspector.task_join_error".into(), "백그라운드 작업 조인 실패: {error}".into());
    ko.insert("logs.inspector.nt_query_fail".into(), "하위 수준 시스템 쿼리 실패 (NtQuery: 0x{status})".into());
    ko.insert("logs.inspector.handle_close_fail".into(), "PID {pid}의 핸들 0x{handle}을 닫지 못했습니다".into());
    ko.insert("status_unknown".into(), "알 수 없음".into());
    ko.insert("status_system".into(), "시스템".into());
    ko.insert("logs.os.user_created_success".into(), "Windows 사용자가 성공적으로 생성되었습니다".into());
    ko.insert("error.os.missing_account_context".into(), "계정 컨텍스트가 누락되어 자격 증명을 확인할 수 없습니다".into());
    ko.insert("error.os.vault_failure_prefix".into(), "Vault 조회 실패: {error}".into());
    ko.insert("error.sequence.invalid_index".into(), "유효하지 않은 프리셋 인덱스".into());
    ko.insert("error.sequence.not_found".into(), "프리셋을 찾을 수 없습니다".into());
    ko.insert("error.sequence.no_active".into(), "현재 활성화된 시퀀스가 없습니다".into());
    ko.insert("error.sequence.account_not_found".into(), "계정 {id}을(를) 찾을 수 없습니다".into());
    ko.insert("logs.permissions.fixing_start".into(), "> 권한 수정 중 (\"{path}\")...".into());
    ko.insert("logs.permissions.error_prefix".into(), "오류: {error}".into());
    ko.insert("logs.status.refresh_success".into(), "경로 새로고침/완료 성공".into());
    ko.insert("captured_game_path".into(), "캡처된 게임 경로".into());
    ko.insert("tray.menu.show".into(), "메인 화면 표시".into());
    ko.insert("tray.menu.quit".into(), "종료".into());
    trans.insert("ko".into(), ko);
}

/// Translate with fallback (used for compatibility with existing log_localized calls)
pub fn translate_with_fallback(key: &str, args: &Option<serde_json::Value>, fallback: &str) -> String {
    let lang = if let Ok(current) = CURRENT_LANG.read() {
        current.clone()
    } else {
        "zh".to_string()
    };
    
    let translated = translate(key, &lang, args);
    
    // If translation is same as key, use fallback
    if translated == key {
        fallback.to_string()
    } else {
        translated
    }
}

pub fn translate(key: &str, lang: &str, args: &Option<serde_json::Value>) -> String {
    let trans = TRANSLATIONS.read().unwrap();
    let template = trans.get(lang)
        .and_then(|t| t.get(key))
        .or_else(|| trans.get("en").and_then(|t| t.get(key)))
        .and_then(|v| v.as_str())
        .unwrap_or(key);
    
    if let Some(args_obj) = args {
        if let Some(obj) = args_obj.as_object() {
            let mut result = template.to_string();
            for (k, v) in obj {
                let placeholder = format!("{{{}}}", k);
                let replacement = match v {
                    Value::String(s) => s.clone(),
                    Value::Number(n) => n.to_string(),
                    _ => v.to_string(),
                };
                result = result.replace(&placeholder, &replacement);
            }
            return result;
        }
    }
    template.to_string()
}

pub fn set_language(lang: &str) {
    if let Ok(mut current) = CURRENT_LANG.write() {
        *current = lang.to_string();
    }
}

pub fn init() {
    init_translations();
}