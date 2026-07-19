use crate::modules;
use crate::state;

#[tauri::command]
pub fn clear_logs() -> Result<(), String> {
    modules::logger::clear_logs();
    Ok(())
}

#[tauri::command]
pub fn nuke_reset(
    state: tauri::State<'_, state::AppState>,
    app: tauri::AppHandle,
) -> Result<String, String> {
    // 1. Kill everything
    let killed = modules::process_killer::kill_all_related_processes();

    // 2. Delete global config
    let _ = modules::file_swap::delete_config();

    // 3. Clear all snapshots
    let _ = modules::file_swap::clear_all_snapshots(&app);

    // 4. Also cleanup archives for a true deep reset
    let _ = modules::file_swap::cleanup_bnet_archives();

    state.set_live_db_owner(&app, None);

    Ok(format!(
        "Nuke complete: {} processes killed. All state and archives cleared.",
        killed
    ))
}

#[tauri::command]
pub fn cleanup_archives(
    state: tauri::State<'_, state::AppState>,
    app: tauri::AppHandle,
) -> Result<String, String> {
    let msg = modules::file_swap::cleanup_bnet_archives().map_err(|e| e.to_string())?;
    // cleanup removes the live product.db, so nobody owns the slot anymore.
    state.set_live_db_owner(&app, None);
    Ok(msg)
}

#[tauri::command]
pub fn manual_backup_save(
    state: tauri::State<'_, state::AppState>,
    app: tauri::AppHandle,
    account_id: String,
) -> Result<String, String> {
    modules::file_swap::rotate_save(&app, &account_id).map_err(|e| e.to_string())?;
    // A manual backup is the user declaring "the current live config is this
    // account's" — record that so subsequent auto-backups stay authorized.
    state.set_live_db_owner(&app, Some(account_id));
    Ok("Backup successful".to_string())
}

#[tauri::command]
pub fn manual_delete_config(
    state: tauri::State<'_, state::AppState>,
    app: tauri::AppHandle,
) -> Result<String, String> {
    modules::file_swap::delete_config().map_err(|e| e.to_string())?;
    state.set_live_db_owner(&app, None);
    Ok("Config deleted".to_string())
}

#[tauri::command]
pub fn manual_restore_config(
    state: tauri::State<'_, state::AppState>,
    app: tauri::AppHandle,
    account_id: String,
) -> Result<String, String> {
    let restored = modules::file_swap::restore_snapshot(&app, &account_id).map_err(|e| e.to_string())?;
    if restored {
        state.set_live_db_owner(&app, Some(account_id));
    }
    Ok("Restore successful".to_string())
}

#[tauri::command]
pub fn manual_launch_process(
    state: tauri::State<'_, state::AppState>,
    username: String,
    password: Option<String>,
) -> Result<String, String> {
    // 使用自动检测路径而非硬编码
    let bnet_path_buf = crate::modules::account::launcher::get_bnet_path()
        .ok_or_else(|| "Battle.net not found. Please ensure Battle.net is installed.".to_string())?;
    let bnet_path = bnet_path_buf.to_string_lossy().to_string();
    let working_dir = bnet_path_buf.parent().map(|p| p.to_string_lossy().to_string());

    let res = state
        .os
        .create_process_with_logon(
            &username,
            None,
            password.as_deref().unwrap_or(""),
            &bnet_path,
            None,
            working_dir.as_deref(),
        )
        .map_err(|e| e.to_string())?;

    Ok(format!("Launched PID: {}", res.process_id))
}
#[tauri::command]
pub fn get_latest_changelog() -> Result<String, String> {
    const CHANGELOG: &str = include_str!("../../../CHANGELOG.md");
    let entries: Vec<&str> = CHANGELOG.split("\n## [").collect();
    if entries.len() < 2 {
        return Ok("No changelog entries found.".to_string());
    }
    let first_version_section = entries[1];
    Ok(format!("## [{}", first_version_section))
}

#[tauri::command]
pub fn open_log_file(_app: tauri::AppHandle) -> Result<(), String> {
    if let Some(log_path) = modules::logger::get_log_path() {
        if log_path.exists() {
            #[cfg(target_os = "windows")]
            {
                std::process::Command::new("explorer")
                    .arg("/select,")
                    .arg(log_path.to_string_lossy().to_string())
                    .spawn()
                    .map_err(|e| e.to_string())?;
            }
            #[cfg(not(target_os = "windows"))]
            {
                // Fallback for other OS if ever supported
                return Err("Unsupported OS".to_string());
            }
        } else {
            return Err("Log file does not exist yet.".to_string());
        }
    } else {
        return Err("Could not determine log path.".to_string());
    }
    Ok(())
}
