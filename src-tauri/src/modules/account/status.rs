use std::time::Duration;
use tauri::{AppHandle, Manager};
use sysinfo::{ProcessRefreshKind, ProcessesToUpdate};
use super::launcher::get_d2r_path;
use crate::modules::logger;

pub async fn maintain_account_statuses(app: AppHandle, mut shutdown_rx: tokio::sync::broadcast::Receiver<()>) {
    let check_interval = Duration::from_secs(5);
    
    loop {
        if shutdown_rx.try_recv().is_ok() {
            break;
        }
        
        tokio::time::sleep(check_interval).await;

        let state = app.state::<crate::state::AppState>();
        let usernames = {
            let config = state.config_lock();
            config.accounts.iter().map(|a| a.win_user.clone()).collect::<Vec<String>>()
        };

        if usernames.is_empty() {
            continue;
        }

        let usernames_clone = usernames.clone();
        let os = state.os.clone();
        let app_handle = app.clone();
        
        let statuses = tauri::async_runtime::spawn_blocking(move || {
            let app_state = app_handle.state::<crate::state::AppState>();
            let sys = app_state.sys_lock();
            
            // INDUSTRIAL UPGRADE: Purely PID-based optimized scan (EnumProcesses)
            os.get_multiple_process_status(
                &sys,
                &usernames_clone,
                &["Battle.net.exe", "Agent.exe"],
                &["D2R.exe"],
            ).unwrap_or_default()
        }).await.unwrap_or_default();

        // 2. Update Cache
        {
            let mut status_cache = state.status_lock();
            *status_cache = statuses;
        }
    }
}

pub fn get_running_game_paths(app: AppHandle) -> Result<(), String> {
    let state = app.state::<crate::state::AppState>();
    let mut sys = state.sys_lock();
    let mut users = state.users_lock();

    // 强制刷新系统用户列表，防止运行期间新建账号导致后续探测 `user_info` 失明
    users.refresh();

    sys.refresh_processes_specifics(
        ProcessesToUpdate::All,
        true,
        ProcessRefreshKind::nothing()
            .with_user(sysinfo::UpdateKind::Always)
            .with_exe(sysinfo::UpdateKind::Always)
    );

    // Username -> Path
    use std::collections::HashMap;
    let mut detected_paths = HashMap::new();

    for (pid, process) in sys.processes() {
        let name = process.name().to_string_lossy().to_lowercase();
        if name == "d2r.exe" {
            let user_info = process.user_id().and_then(|id| users.get_user_by_id(id));
            let exe_path = process.exe();
            
            match (user_info, exe_path) {
                (Some(user), Some(path)) => {
                    let user_name = user.name().to_string().to_lowercase();
                    let path_str = path.to_string_lossy().to_string();
                    detected_paths.insert(user_name, path_str);
                },
                (None, _) => {
                    logger::log_localized(Some(&app), "warn", "logs.status.no_user_info", Some(serde_json::json!({ "pid": pid.as_u32() })), "logs.status.no_user_info");
                },
                (_, None) => {
                    logger::log_localized(Some(&app), "warn", "logs.status.no_path", Some(serde_json::json!({ "pid": pid.as_u32() })), "logs.status.no_path");
                }
            }
        }
    }

    let mut changed = false;
    {
        let mut config = state.config_lock();
        let global_default = get_d2r_path().map(|p| p.to_string_lossy().to_string());

        for acc in &mut config.accounts {
            let normalized_win_user = if let Some(pos) = acc.win_user.find('\\') {
                acc.win_user[pos+1..].to_lowercase()
            } else {
                acc.win_user.to_lowercase()
            };

            let new_path = if let Some(path) = detected_paths.get(&normalized_win_user) {
                Some(path.clone())
            } else {
                global_default.clone()
            };

            if let Some(p) = new_path {
                if acc.game_path != Some(p.clone()) {
                    acc.game_path = Some(p);
                    changed = true;
                }
            }
        }

        if changed {
            config.save(&app).map_err(|e| e.to_string())?;
        }
    }

    if changed {
        logger::log_localized(Some(&app), "success", "logs.status.refresh_success", None, "logs.status.refresh_success");
    }

    Ok(())
}