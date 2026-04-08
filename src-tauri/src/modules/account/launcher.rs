use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};
use crate::modules::account::types::{Account, AccountError, LaunchLogPayload};
use crate::modules::{file_swap, logger, process_killer, win_admin};
use crate::modules::os::OSProvider;
use crate::modules::win32_safe::mutex;
use crate::modules::vault::Vault;
use sysinfo::{ProcessRefreshKind, ProcessesToUpdate};

pub fn launch_game(
    os: &dyn OSProvider,
    app: &AppHandle,
    account: &Account,
    bnet_only: bool,
    _force: bool,
) -> Result<u32, AccountError> {
    // 0. Pre-Maintenance Audit: Look for "Double-Online" accounts to backup
    logger::log_localized(Some(app), "info", "logs.launcher.scanning_env", None, "正在扫描运行环境 (锚点校验)...");
    
    let state = app.state::<crate::state::AppState>();
    state.refresh_game_processes();
    
    let sys = state.sys_lock();
    let _users = state.users_lock();

    // Map: Username -> (HasBnet, HasD2R, D2RPath)
    let mut user_states: std::collections::HashMap<String, (bool, bool, Option<PathBuf>)> = std::collections::HashMap::new();

    let users = sysinfo::Users::new_with_refreshed_list();
    for (_pid, process) in sys.processes() {
        let name_os = process.name();
        let name = name_os.to_string_lossy().to_lowercase();
        if name == "d2r.exe" || name == "battle.net.exe" || name == "d2r" || name == "battle.net" {
            if let Some(user_id) = process.user_id() {
                if let Some(user) = users.get_user_by_id(user_id) {
                    let username = user.name().to_string().to_lowercase();
                    let state = user_states.entry(username).or_insert((false, false, None));
                    
                    if name.contains("battle.net") {
                        state.0 = true;
                    } else if name.contains("d2r") {
                        state.1 = true;
                        // Record D2R path
                        if let Some(exe_path) = process.exe() {
                            state.2 = Some(exe_path.to_path_buf());
                        }
                    }
                }
            }
        }
    }

    // 1. Snapshot Saving & Path Learning
    {
        let mut current_config = state.config_lock();
        let _ = current_config.save(app);
        
        let mut config_changed = false;
        
        for acc in &mut current_config.accounts {
            let normalized_win_user = if let Some(pos) = acc.win_user.find('\\') {
                acc.win_user[pos+1..].to_lowercase()
            } else {
                acc.win_user.to_lowercase()
            };

            if let Some((has_bnet, has_d2r, d2r_path)) = user_states.get(&normalized_win_user) {
                if *has_bnet && *has_d2r {
                    // Valid Double-Online Anchor Found!
                    
                    // A. Record Path (Auto-Learning)
                    if let Some(path) = d2r_path {
                        let path_str = path.to_string_lossy().to_string();
                        logger::log_localized(Some(app), "info", "logs.launcher.anchor_found", Some(serde_json::json!({ "user": acc.win_user, "path": path_str })),
                            &format!("账号 {} 在位，锚点路径: {}", acc.win_user, path_str));
                        
                        if acc.game_path != Some(path_str.clone()) {
                            acc.game_path = Some(path_str.clone());
                            config_changed = true;
                            logger::log_localized(Some(app), "success", "logs.launcher.path_captured", Some(serde_json::json!({ "user": acc.win_user, "path": path_str })),
                                &format!("已捕获 {} 的最新游戏路径: {}", acc.win_user, path_str));
                        }
                    }

                    // B. Rotate Save (Backup)
                    if !acc.skip_config_sync {
                        logger::log_localized(Some(app), "info", "logs.launcher.backing_up", Some(serde_json::json!({ "user": acc.win_user })),
                            &format!("检测到账号 {} 双在位，正在备份快照...", acc.win_user));
                        if let Err(e) = file_swap::rotate_save(app, &acc.id) {
                            tracing::warn!("Backup failed for {}: {}", acc.win_user, e);
                        }
                    }
                }
            }
        }

        if config_changed {
            let _ = current_config.save(app);
        }
    }

    // 2. Cleanup (Kill Bnet/D2R, Mutexes)
    logger::log_localized(Some(app), "info", "logs.launcher.clearing_env", None, "环境归零中...");
    
    // Release the lock before calling killer to prevent deadlocks if killer needs the lock
    // Actually, process_killer_with_sys needs &mut System. We have MutexGuard.
    drop(sys);
    drop(users);

    let killed = {
        let mut sys_lock = state.sys_lock();
        // Since we already refreshed at start, we might not need a full refresh here, 
        // but for safety in "Kill" phase, we do a quick one.
        sys_lock.refresh_processes_specifics(
            ProcessesToUpdate::All,
            true,
            ProcessRefreshKind::nothing().with_exe(sysinfo::UpdateKind::Always)
        );
        process_killer::kill_battle_net_processes_with_sys(&mut sys_lock)
    };

    if killed > 0 {
        logger::log_localized(Some(app), "success", "logs.launcher.killed_processes", Some(serde_json::json!({ "count": killed })),
            &format!("已强制终止 {} 个相关进程", killed));
        // Give OS a moment to release file handles after killing
        logger::log_localized(Some(app), "info", "logs.launcher.waiting_file_handles", None, "等待系统释放文件句柄...");
        std::thread::sleep(std::time::Duration::from_millis(500));
    }

    if !bnet_only {
        if win_admin::enable_debug_privilege() {
            match mutex::close_d2r_mutexes(app) {
                Ok(count) if count > 0 => {
                    logger::log_localized(Some(app), "success", "logs.launcher.closed_mutexes", Some(serde_json::json!({ "count": count })),
                        &format!("已关除 {} 个内核互斥体", count));
                }
                _ => {}
            }
        }
    }

    // 3. Environment Injection (Restore Target Snapshot)
    logger::log_localized(Some(app), "info", "logs.launcher.verifying_permissions", None, "正在校验文件访问权限 (原子锁)...");
    if let Err(e) = file_swap::verify_config_writable() {
         logger::log_localized(Some(app), "error", "logs.launcher.file_occupied_error", Some(serde_json::json!({ "error": e.to_string() })),
             &format!("安全拦截: 战网配置文件仍被占用。原因: {}", e));
         return Err(AccountError::FileSwap(e));
    }

    logger::log_localized(Some(app), "info", "logs.launcher.aligning_files", None, "档案对齐中...");
    
    // 3.1. Ensure we start with a clean Slate (Atomic Cleanup)
    file_swap::delete_config().map_err(|e| {
        logger::log_localized(Some(app), "error", "logs.launcher.cleanup_error", Some(serde_json::json!({ "error": e.to_string() })),
            &format!("环境对齐失败: 无法清理旧档案。{}", e));
        AccountError::FileSwap(e)
    })?;

    // 3.2. Inject target snapshot
    match file_swap::restore_snapshot(app, &account.id) {
        Ok(true) => {
            logger::log_localized(Some(app), "success", "logs.launcher.align_success", None, "环境档案对齐完成");
        }
        Ok(false) => {
            logger::log_localized(Some(app), "info", "logs.launcher.no_snapshot", None, "目标账号无历史快照，使用战网初始环境运行");
        }
        Err(e) => {
            logger::log_localized(Some(app), "error", "logs.launcher.align_critical_error", Some(serde_json::json!({ "error": e.to_string() })),
                &format!("环境对齐严重异常: {}", e));
            return Err(AccountError::FileSwap(e));
        }
    }

    // 4. Execution
    let bnet_path_buf = get_bnet_path().ok_or(AccountError::InvalidPath)?;
    let bnet_path = bnet_path_buf.to_string_lossy().to_string();
    let working_dir = bnet_path_buf.parent().map(|p| p.to_string_lossy().to_string());

    let current_user = os.get_whoami().to_lowercase();
    let target_user = account.win_user.to_lowercase();

    logger::log_localized(Some(app), "info", "logs.launcher.bnet_path", Some(serde_json::json!({ "path": bnet_path })),
        &format!("战网路径: {}", bnet_path));

    if target_user == current_user || target_user == std::env::var("USERNAME").unwrap_or_default().to_lowercase() {
        logger::log_localized(Some(app), "info", "logs.launcher.host_user_detected", None, "检测到宿主用户，开始直接运行战网...");
        let mut cmd = std::process::Command::new(bnet_path);
        if let Some(wd) = working_dir { cmd.current_dir(wd); }
        let child = cmd.spawn().map_err(|e| anyhow::anyhow!("Failed to spawn: {}", e))?;
        logger::log_localized(Some(app), "success", "logs.launcher.launch_success", Some(serde_json::json!({ "pid": child.id() })),
            &format!("已拉起战网 (PID: {})", child.id()));
        Ok(child.id())
    } else {
        // Sandbox launch with credentials
        let (domain, user) = if let Some(pos) = account.win_user.find('\\') {
            (Some(&account.win_user[..pos]), &account.win_user[pos + 1..])
        } else {
            (None, account.win_user.as_str())
        };

        // 1. 安全预检 (Industrial-grade Security Shims)
        // 刷新密码策略：防止由于系统 0x80070532 等策略导致的登录拦截
        if account.auto_fix_password {
            logger::log_localized(Some(app), "info", "logs.launcher.syncing_password_policy", None, "正在同步密码永不过期策略...");
            if let Err(e) = os.set_password_never_expires(user, true) {
                logger::log_localized(Some(app), "warn", "logs.launcher.sync_policy_note", Some(serde_json::json!({ "error": e.to_string() })),
                    &format!("策略同步备注: {}", e));
            }
        }

        // 核心：无损状态擦除。直接清除“下次登录必须修改密码”标记，无需重置密码。
        if let Err(e) = os.clear_password_expiration_flags(user) {
             logger::log_localized(Some(app), "warn", "logs.launcher.security_patch_skipped", Some(serde_json::json!({ "error": e.to_string() })),
                 &format!("安全状态预修补跳过: {}", e));
        }

        let physical_password = match Vault::load_password(app, &account.id) {
            Ok(p) => p,
            Err(e) => {
                logger::log_localized(Some(app), "error", "logs.launcher.vault_error", Some(serde_json::json!({ "error": e.to_string() })),
                    &format!("隔离启动失败: 无法从加密仓提取凭据。{}", e));
                return Err(AccountError::SysInfo(format!("Vault Retrieval Error: {}", e)));
            }
        };

        let result = os.create_process_with_logon(
            user,
            domain,
            &physical_password,
            &bnet_path,
            None,
            working_dir.as_deref(),
        )?;
        
        let _ = app.emit(
            "launch-log",
            LaunchLogPayload {
                account_id: account.id.clone(),
                message: format!("已拉起战网 (PID: {})", result.process_id),
                level: "success".into(),
            },
        );
        Ok(result.process_id)
    }
}

pub fn get_bnet_path() -> Option<PathBuf> {
    // 1. Try standard hardcoded path
    let standard = PathBuf::from(r"C:\Program Files (x86)\Battle.net\Battle.net.exe");
    if standard.exists() {
        return Some(standard);
    }

    // 2. Try Registry Lookup (Auto-detect)
    use crate::modules::os::windows::utils::to_pcwstr;
    use windows::core::PCWSTR;
    use windows::Win32::System::Registry::{
        RegCloseKey, RegOpenKeyExW, RegQueryValueExW, HKEY_LOCAL_MACHINE, KEY_READ,
        KEY_WOW64_32KEY, REG_VALUE_TYPE,
    };

    unsafe {
        let key_path = to_pcwstr(r"SOFTWARE\Blizzard Entertainment\Battle.net\Capabilities");
        let mut hkey = windows::Win32::System::Registry::HKEY::default();

        if RegOpenKeyExW(
            HKEY_LOCAL_MACHINE,
            PCWSTR(key_path.as_ptr()),
            Some(0),
            KEY_READ | KEY_WOW64_32KEY,
            &mut hkey,
        )
        .is_ok()
        {
            let value_name = to_pcwstr("ApplicationIcon");
            let mut val_type = REG_VALUE_TYPE::default();
            let mut data_size = 0u32;

            let _ = RegQueryValueExW(
                hkey,
                PCWSTR(value_name.as_ptr()),
                None,
                Some(&mut val_type),
                None,
                Some(&mut data_size),
            );

            if data_size > 0 {
                let mut data = vec![0u8; data_size as usize];
                if RegQueryValueExW(
                    hkey,
                    PCWSTR(value_name.as_ptr()),
                    None,
                    Some(&mut val_type),
                    Some(data.as_mut_ptr()),
                    Some(&mut data_size),
                )
                .is_ok()
                {
                    let data_u16 =
                        std::slice::from_raw_parts(data.as_ptr() as *const u16, data.len() / 2);
                    let mut path_str = String::from_utf16_lossy(data_u16);

                    if let Some(pos) = path_str.find('\0') {
                        path_str.truncate(pos);
                    }

                    let clean_path = if let Some(start) = path_str.find('"') {
                        if let Some(end) = path_str[start + 1..].find('"') {
                            &path_str[start + 1..start + 1 + end]
                        } else {
                            &path_str[start + 1..]
                        }
                    } else {
                        path_str.split(',').next().unwrap_or(&path_str).trim()
                    };

                    let p = PathBuf::from(clean_path);
                    if p.exists() {
                        let _ = RegCloseKey(hkey);
                        return Some(p);
                    }
                }
            }
            let _ = RegCloseKey(hkey);
        }
    }

    None
}

pub fn get_d2r_path() -> Option<PathBuf> {
    use crate::modules::os::windows::utils::to_pcwstr;
    use windows::core::PCWSTR;
    use windows::Win32::System::Registry::{
        RegCloseKey, RegOpenKeyExW, RegQueryValueExW, HKEY_LOCAL_MACHINE, KEY_READ,
        KEY_WOW64_32KEY, REG_VALUE_TYPE,
    };

    unsafe {
        // Diablo II: Resurrected uninstall key usually contains the path
        let key_path = to_pcwstr(r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Diablo II: Resurrected");
        let mut hkey = windows::Win32::System::Registry::HKEY::default();

        if RegOpenKeyExW(
            HKEY_LOCAL_MACHINE,
            PCWSTR(key_path.as_ptr()),
            Some(0),
            KEY_READ | KEY_WOW64_32KEY,
            &mut hkey,
        )
        .is_ok()
        {
            let value_name = to_pcwstr("InstallLocation");
            let mut val_type = REG_VALUE_TYPE::default();
            let mut data_size = 0u32;

            let _ = RegQueryValueExW(
                hkey,
                PCWSTR(value_name.as_ptr()),
                None,
                Some(&mut val_type),
                None,
                Some(&mut data_size),
            );

            if data_size > 0 {
                let mut data = vec![0u8; data_size as usize];
                if RegQueryValueExW(
                    hkey,
                    PCWSTR(value_name.as_ptr()),
                    None,
                    Some(&mut val_type),
                    Some(data.as_mut_ptr()),
                    Some(&mut data_size),
                )
                .is_ok()
                {
                    let data_u16 =
                        std::slice::from_raw_parts(data.as_ptr() as *const u16, data.len() / 2);
                    let mut path_str = String::from_utf16_lossy(data_u16);

                    if let Some(pos) = path_str.find('\0') {
                        path_str.truncate(pos);
                    }

                    let p = PathBuf::from(path_str.trim());
                    if p.exists() {
                        let _ = RegCloseKey(hkey);
                        return Some(p);
                    }
                }
            }
            let _ = RegCloseKey(hkey);
        }
    }

    None
}

