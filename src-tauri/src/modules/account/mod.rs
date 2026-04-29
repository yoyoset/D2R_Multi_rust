pub mod types;
pub mod launcher;
pub mod status;
pub mod diag;
pub mod window;
pub mod sequence;

use std::collections::HashMap;
use tauri::{AppHandle, State};
use crate::state::AppState;
use crate::modules::file_swap;
pub use crate::modules::account::types::{Account, AccountStatus, DiagnosticResult};
pub use crate::modules::account::launcher::{launch_game, get_bnet_path, get_d2r_path};

#[tauri::command]
pub fn save_account_snapshot(
    app: AppHandle,
    account_id: String,
) -> Result<(), String> {
    file_swap::rotate_save(&app, &account_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn resolve_launch_conflict(
    app: AppHandle,
    account_id: String,
    action: String, // "delete" or "reset"
) -> Result<(), String> {
    match action.as_str() {
        "delete" => {
            file_swap::delete_config().map_err(|e| e.to_string())?;
        }
        "reset" => {
            file_swap::delete_config().map_err(|e| e.to_string())?;
            file_swap::delete_snapshot(&app, &account_id).map_err(|e| e.to_string())?;
        }
        _ => return Err("Invalid action".to_string()),
    }
    Ok(())
}

#[tauri::command]
pub fn get_accounts_process_status(
    state: State<'_, AppState>,
    usernames: Vec<String>,
) -> Result<HashMap<String, AccountStatus>, String> {
    let status_cache = state.status_lock();
    let mut results = HashMap::new();
    
    for username in usernames {
        if let Some(status) = status_cache.get(&username) {
            results.insert(username, status.clone());
        } else {
            // If not in cache yet, return a default "Offline" status
            results.insert(username, AccountStatus::default());
        }
    }
    
    Ok(results)
}

#[tauri::command]
pub async fn get_system_env_diagnostics() -> Result<Vec<DiagnosticResult>, String> {
    diag::get_system_env_diagnostics().await
}

#[tauri::command]
pub async fn get_game_path_diagnostics(game_path: String) -> Result<Vec<DiagnosticResult>, String> {
    diag::get_game_path_diagnostics(game_path).await
}

#[tauri::command]
pub async fn get_running_game_paths(app: AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        status::get_running_game_paths(app)
    }).await.map_err(|e| format!("Task execution failed: {}", e))?
}
