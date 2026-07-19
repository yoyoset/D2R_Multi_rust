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
    state: State<'_, AppState>,
    app: AppHandle,
    account_id: String,
) -> Result<(), String> {
    file_swap::rotate_save(&app, &account_id).map_err(|e| e.to_string())?;
    // A deliberate snapshot save declares the live config as this account's.
    state.set_live_db_owner(&app, Some(account_id));
    Ok(())
}

#[tauri::command]
pub fn resolve_launch_conflict(
    state: State<'_, AppState>,
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
    // Both actions remove the live config; nobody owns the slot now.
    state.set_live_db_owner(&app, None);
    Ok(())
}

/// Game paths recorded inside an account's snapshot — shown in the account
/// editor as suggestions for the user-confirmed baseline path.
#[tauri::command]
pub fn get_snapshot_game_paths(app: AppHandle, account_id: String) -> Vec<String> {
    file_swap::snapshot_game_paths(&app, &account_id)
}

/// Read-only content check: does the live product.db plausibly belong to this
/// account? Same rules as the pre-launch backup gate — the user-confirmed
/// baseline path when set, otherwise the account's snapshot. Returns "match",
/// "mismatch", or "unknown" (undetermined). Used by the sequencer's
/// Finish & Back Up button to refuse capturing a live file that was rewritten
/// out-of-band after the sequence ended.
#[tauri::command]
pub fn verify_live_config(
    state: State<'_, AppState>,
    app: AppHandle,
    account_id: String,
) -> String {
    let baseline = {
        let config = state.config_lock();
        config
            .accounts
            .iter()
            .find(|a| a.id == account_id)
            .and_then(|a| a.baseline_path.clone())
            .map(|b| b.trim().to_string())
            .filter(|b| !b.is_empty())
    };

    let result = match baseline {
        Some(b) => file_swap::live_config_contains_path(&b),
        None => file_swap::live_config_matches_snapshot(&app, &account_id),
    };

    match result {
        Some(true) => "match".to_string(),
        Some(false) => "mismatch".to_string(),
        None => "unknown".to_string(),
    }
}

/// Arbitrate a stashed baseline conflict (pending_{id}.db).
/// action = "discard": cancel the backup, delete the disputed copy.
/// action = "adopt": the disputed copy becomes the account's snapshot and its
/// (single) game path becomes the new baseline. Returns the adopted path.
#[tauri::command]
pub fn resolve_baseline_conflict(
    state: State<'_, AppState>,
    app: AppHandle,
    account_id: String,
    action: String,
) -> Result<Option<String>, String> {
    match action.as_str() {
        "discard" => {
            file_swap::resolve_pending(&app, &account_id, false).map_err(|e| e.to_string())?;
            Ok(None)
        }
        "adopt" => {
            // The account must still exist to receive the new baseline.
            {
                let config = state.config_lock();
                if !config.accounts.iter().any(|a| a.id == account_id) {
                    return Err("error.baseline.account_missing".to_string());
                }
            }
            let adopted = file_swap::resolve_pending(&app, &account_id, true)
                .map_err(|e| e.to_string())?
                .ok_or("error.baseline.pending_missing")?;
            {
                let mut config = state.config_lock();
                if let Some(acc) = config.accounts.iter_mut().find(|a| a.id == account_id) {
                    acc.baseline_path = Some(adopted.clone());
                }
                config.save(&app).map_err(|e| e.to_string())?;
            }
            Ok(Some(adopted))
        }
        _ => Err("Invalid action".to_string()),
    }
}

/// Acknowledge the baseline-seeding upgrade report: clears it so the dialog
/// stops appearing on startup.
#[tauri::command]
pub fn ack_baseline_seed_report(state: State<'_, AppState>, app: AppHandle) -> Result<(), String> {
    let mut config = state.config_lock();
    if config.baseline_seed_report.is_some() {
        config.baseline_seed_report = None;
        config.save(&app).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Re-surface unresolved baseline conflicts after an app restart: pending
/// copies survive on disk but their dialogs died with the previous process.
/// Orphan pendings (account deleted meanwhile) are cleaned up.
#[tauri::command]
pub fn rescan_pending_conflicts(state: State<'_, AppState>, app: AppHandle) -> usize {
    use tauri::Emitter;
    let accounts: Vec<Account> = {
        let config = state.config_lock();
        config.accounts.clone()
    };

    let mut surfaced = 0;
    for id in file_swap::list_pending_ids(&app) {
        match accounts.iter().find(|a| a.id == id) {
            Some(acc) => {
                let live_paths = file_swap::pending_game_paths(&app, &id);
                let baseline = acc.baseline_path.clone().unwrap_or_default();
                let _ = app.emit("baseline-conflict", serde_json::json!({
                    "account_id": id,
                    "user": acc.win_user,
                    "baseline": baseline,
                    "live_paths": live_paths,
                }));
                surfaced += 1;
            }
            None => file_swap::discard_pending(&app, &id),
        }
    }
    surfaced
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
