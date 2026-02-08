use crate::modules::file_swap;
use crate::modules::logger;
use crate::modules::os::OSProvider;
use crate::modules::process_killer;
use crate::modules::win32_safe::mutex;
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::Command;
use tauri::{AppHandle, Emitter};

#[derive(serde::Serialize, Clone, Debug)]
pub struct LaunchLogPayload {
    pub account_id: String,
    pub message: String,
    pub level: String, // "info", "success", "error"
}

#[derive(serde::Deserialize, serde::Serialize, Debug, Clone)]
pub struct Account {
    pub id: String,                   // UUID
    pub win_user: String,             // The bound Windows Username
    pub win_pass: Option<String>,     // Optional (for auto-launch)
    pub bnet_account: String,         // Display only
    pub note: Option<String>,         // Role remarks
    pub avatar: Option<String>,       // Base64 encoded image or library icon ID
    pub password_never_expires: bool, // Support for 0x80070532 fix
}

#[derive(serde::Serialize, Debug, Default, Clone)]
pub struct AccountStatus {
    pub bnet_active: bool,
    pub d2r_active: bool,
}

#[derive(thiserror::Error, Debug)]
pub enum AccountError {
    #[error("Launch failed: {0}")]
    LaunchError(#[from] anyhow::Error),
    #[error("BNET_NOT_FOUND")]
    InvalidPath,
    #[error("File Swap Error: {0}")]
    FileSwap(#[from] file_swap::FileSwapError),
}

pub fn launch_game(
    os: &dyn OSProvider,
    app: &AppHandle,
    account: &Account,
    _game_path: &str,
) -> Result<u32, AccountError> {
    // 1. Cleanup Environment (Kill Bnet and Mutexes)
    logger::log(app, "info", "清理运行环境 (Battle.net & Mutexes)...");
    let killed = process_killer::kill_battle_net_processes();
    if killed > 0 {
        logger::log(
            app,
            "success",
            &format!("已终止 {} 个 Battle.net 进程", killed),
        );
    }

    // Try to enable SeDebugPrivilege to access other users' processes
    if !crate::modules::win_admin::enable_debug_privilege() {
        logger::log(
            app,
            "warn",
            "无法启用调试权限 (SeDebugPrivilege)，句柄清理可能失败",
        );
    }

    match mutex::close_d2r_mutexes(app) {
        Ok(count) => {
            if count > 0 {
                logger::log(app, "success", &format!("已关闭 {} 个 D2R 互斥锁", count));
            } else {
                logger::log(app, "info", "未检测到活动的 D2R 互斥锁");
            }
        }
        Err(e) => {
            logger::log(app, "warn", &format!("互斥锁清理失败: {}", e));
        }
    }

    // 2. Load Config to check Last Active Account
    let mut config =
        crate::modules::config::AppConfig::load(app).map_err(|_| AccountError::InvalidPath)?;

    // 3. Backup (Save Previous): Save CURRENT product.db to Previous Account snapshot
    let mut rotated = false;
    if let Some(last_id) = &config.last_active_account {
        if last_id != &account.id {
            logger::log(
                app,
                "info",
                &format!("正在备份前一个账号配置 (ID: {})...", last_id),
            );
            if let Err(e) = file_swap::rotate_save(app, last_id) {
                // Best Effort
                tracing::warn!("Backup failed: {}", e);
            } else {
                rotated = true;
            }
        }
    }

    // 4. Delete (Clean Slate): Delete current product.db
    file_swap::delete_config()?;

    // 5. Restore (Target): Load target account snapshot
    logger::log(app, "info", "正在切换目标账号配置...");
    if let Err(e) = file_swap::restore_snapshot(app, &account.id) {
        // Rollback: If restore fails and we rotated the previous one, try to put it back
        if rotated {
            if let Some(last_id) = &config.last_active_account {
                let _ = file_swap::restore_snapshot(app, last_id);
            }
        }
        return Err(e.into());
    }

    // 6. Update Last Active Account
    config.last_active_account = Some(account.id.clone());
    let _ = config.save(app);

    // 7. Launch Battle.net
    let bnet_path_buf = get_bnet_path().ok_or(AccountError::InvalidPath)?;
    let bnet_path = bnet_path_buf.to_str().unwrap();

    let working_dir = bnet_path_buf
        .parent()
        .map(|p| p.to_string_lossy().to_string());

    // Logic: Identify Current User vs Sandbox User
    let current_user = os.get_whoami().to_lowercase();
    let target_user = account.win_user.to_lowercase();

    if target_user == current_user
        || target_user == std::env::var("USERNAME").unwrap_or_default().to_lowercase()
    {
        // Direct launch for current user (No password needed)
        let mut cmd = std::process::Command::new(bnet_path);
        if let Some(wd) = working_dir {
            cmd.current_dir(wd);
        }
        let child = cmd
            .spawn()
            .map_err(|e| anyhow::anyhow!("Failed to spawn process: {}", e))?;

        logger::log(app, "success", &format!("游戏已启动 (PID: {})", child.id()));
        Ok(child.id())
    } else {
        // Sandbox launch with credentials
        let (domain, user) = if let Some(pos) = account.win_user.find('\\') {
            (Some(&account.win_user[..pos]), &account.win_user[pos + 1..])
        } else {
            (None, account.win_user.as_str())
        };

        // Pre-flight: Force refresh password policy AND reset password to prevent 0x80070532
        if account.password_never_expires {
            logger::log(app, "info", "正在刷新密码策略 (防止过期拦截)...");
            if let Err(e) = os.set_password_never_expires(user, true) {
                logger::log(app, "warn", &format!("密码策略刷新失败: {}", e));
            }
        }

        // Also reset the password to itself, which clears the "must change at next logon" flag
        if let Some(pass) = &account.win_pass {
            if !pass.is_empty() {
                logger::log(app, "info", "正在重置密码以清除过期标记...");
                if let Err(e) = os.reset_password(user, pass) {
                    logger::log(app, "warn", &format!("密码重置失败: {}", e));
                }
            }
        }

        let result = os.create_process_with_logon(
            user,
            domain,
            account.win_pass.as_deref().unwrap_or(""),
            bnet_path,
            None,
            working_dir.as_deref(),
        )?;

        let _ = app.emit(
            "launch-log",
            LaunchLogPayload {
                account_id: account.id.clone(),
                message: format!("游戏已启动 (PID: {})", result.process_id),
                level: "success".into(),
            },
        );
        Ok(result.process_id)
    }
}

fn get_bnet_path() -> Option<PathBuf> {
    // 1. Try standard hardcoded path
    let standard = PathBuf::from(r"C:\Program Files (x86)\Battle.net\Battle.net.exe");
    if standard.exists() {
        return Some(standard);
    }

    // 2. Try Registry Lookup (Auto-detect)
    // HKLM\SOFTWARE\WOW6432Node\Blizzard Entertainment\Battle.net\Capabilities -> ApplicationIcon
    // Value format: "C:\Path\To\Battle.net.exe",0
    if let Ok(output) = Command::new("reg")
        .args([
            "query",
            r"HKLM\SOFTWARE\WOW6432Node\Blizzard Entertainment\Battle.net\Capabilities",
            "/v",
            "ApplicationIcon",
        ])
        .output()
    {
        let stdout = String::from_utf8_lossy(&output.stdout);
        // Parse: ... REG_SZ    "C:\Program Files (x86)\Battle.net\Battle.net.exe",0
        if let Some(line) = stdout.lines().find(|l| l.contains("ApplicationIcon")) {
            // Simple parsing strategy: find " and "
            if let Some(start) = line.find('"') {
                if let Some(end) = line[start + 1..].find('"') {
                    // Path is between quotes
                    let path_str = &line[start + 1..start + 1 + end];
                    let p = PathBuf::from(path_str);
                    if p.exists() {
                        return Some(p);
                    }
                }
            } else {
                // Fallback: maybe no quotes? Split by REG_SZ
                let parts: Vec<&str> = line.split("REG_SZ").collect();
                if parts.len() > 1 {
                    let val = parts[1].trim();
                    // Remove trailing ",0"
                    let clean_val = val.split(',').next().unwrap_or(val).replace("\"", "");
                    let p = PathBuf::from(clean_val);
                    if p.exists() {
                        return Some(p);
                    }
                }
            }
        }
    }

    None
}

#[tauri::command]
pub fn get_accounts_process_status(
    state: tauri::State<'_, crate::state::AppState>,
    usernames: Vec<String>,
) -> HashMap<String, AccountStatus> {
    let mut sys = state.sys.lock().unwrap();
    let mut users = state.users.lock().unwrap();

    // Refresh user list to handle identity changes/additions
    users.refresh();

    // Granular refresh: only process names and user information
    sys.refresh_processes_specifics(
        sysinfo::ProcessesToUpdate::All,
        false,
        sysinfo::ProcessRefreshKind::nothing().with_user(sysinfo::UpdateKind::Always),
    );

    let mut status_map = HashMap::new();
    for u in &usernames {
        status_map.insert(u.clone(), AccountStatus::default());
    }

    for process in sys.processes().values() {
        let name = process.name().to_string_lossy();
        let is_bnet = name.eq_ignore_ascii_case("Battle.net.exe");
        let is_d2r = name.eq_ignore_ascii_case("D2R.exe");

        if is_bnet || is_d2r {
            if let Some(user_id) = process.user_id() {
                if let Some(user) = users.get_user_by_id(user_id) {
                    let proc_user = user.name().to_lowercase();

                    for requested_user in &usernames {
                        let normalized_requested = if let Some(pos) = requested_user.find('\\') {
                            &requested_user[pos + 1..]
                        } else {
                            requested_user.as_str()
                        }
                        .to_lowercase();

                        if proc_user == normalized_requested {
                            let entry = status_map.get_mut(requested_user).unwrap();
                            if is_bnet {
                                entry.bnet_active = true;
                            }
                            if is_d2r {
                                entry.d2r_active = true;
                            }
                        }
                    }
                }
            }
        }
    }

    status_map
}
