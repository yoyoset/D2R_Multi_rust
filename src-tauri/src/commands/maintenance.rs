use crate::modules;
use crate::state;

#[tauri::command]
pub fn clear_logs() -> Result<(), String> {
    modules::logger::clear_logs();
    Ok(())
}

#[tauri::command]
pub fn nuke_reset(app: tauri::AppHandle) -> Result<String, String> {
    // 1. Kill everything
    let killed = modules::process_killer::kill_all_related_processes();

    // 2. Delete global config
    let _ = modules::file_swap::delete_config();

    // 3. Clear all snapshots
    let _ = modules::file_swap::clear_all_snapshots(&app);

    // 4. Also cleanup archives for a true deep reset
    let _ = modules::file_swap::cleanup_bnet_archives();

    Ok(format!(
        "Nuke complete: {} processes killed. All state and archives cleared.",
        killed
    ))
}

#[tauri::command]
pub fn cleanup_archives() -> Result<String, String> {
    modules::file_swap::cleanup_bnet_archives().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn manual_backup_save(app: tauri::AppHandle, account_id: String) -> Result<String, String> {
    modules::file_swap::rotate_save(&app, &account_id).map_err(|e| e.to_string())?;
    Ok("Backup successful".to_string())
}

#[tauri::command]
pub fn manual_delete_config() -> Result<String, String> {
    modules::file_swap::delete_config().map_err(|e| e.to_string())?;
    Ok("Config deleted".to_string())
}

#[tauri::command]
pub fn manual_restore_config(app: tauri::AppHandle, account_id: String) -> Result<String, String> {
    modules::file_swap::restore_snapshot(&app, &account_id).map_err(|e| e.to_string())?;
    Ok("Restore successful".to_string())
}

#[tauri::command]
pub fn manual_launch_process(
    state: tauri::State<'_, state::AppState>,
    username: String,
    password: Option<String>,
) -> Result<String, String> {
    let bnet_path = r"C:\Program Files (x86)\Battle.net\Battle.net.exe";
    let working_dir = std::path::Path::new(bnet_path)
        .parent()
        .map(|p| p.to_string_lossy().to_string());

    let res = state
        .os
        .create_process_with_logon(
            &username,
            None,
            password.as_deref().unwrap_or(""),
            bnet_path,
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
