use crate::modules;
use crate::modules::vault::Vault;
use tauri::{Emitter, Manager};

#[tauri::command]
pub fn get_config(
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<modules::config::AppConfig, String> {
    let config = state.config_lock();
    Ok(config.redacted())
}

#[tauri::command]
pub fn get_account_password(
    _state: tauri::State<'_, crate::state::AppState>,
    app: tauri::AppHandle,
    id: String,
) -> Result<String, String> {
    // 强制物理级读取 (Vault-First)
    Vault::load_password(&app, &id).map_err(|e| format!("error.os.vault_failure_prefix|{{\"error\":\"{}\"}}", e))
}

#[tauri::command]
pub fn save_config(
    state: tauri::State<'_, crate::state::AppState>,
    app: tauri::AppHandle,
    config: modules::config::AppConfig,
) -> Result<(), String> {
    use crate::modules::logger;
    
    logger::info_key(Some(&app), "logs.config.sync_start", None);

    let mut updated_config = config;

    // 1. Vault Sync: Iterate through incoming accounts and isolate credentials
    for account in &mut updated_config.accounts {
        if let Some(pass) = &account.win_pass {
            if pass != "********" {
                // New password provided -> Commit to Vault
                if let Err(e) = Vault::save_password(&app, &account.id, pass) {
                     logger::error_key(Some(&app), "logs.config.vault_sync_failed", Some(serde_json::json!({ "id": account.id, "error": e.to_string() })));
                     return Err(format!("error.os.vault_failure|{{\"error\":\"{}\"}}", e));
                }
            }
        }
        
        // 2. Zero-Trust Enforcement: Ensure no passwords ever touch the config.json
        account.win_pass = None;
    }

    // 3. Persist non-sensitive JSON state
    updated_config.save(&app).map_err(|e| e.to_string())?;

    // 4. Update memory cache (AppState also stays zero-trust)
    {
        let mut cached = state.config_lock();
        *cached = updated_config.clone();
        
        // Sync backend language (Industrial Hardening)
        if let Some(lang) = &updated_config.language {
            crate::modules::i18n::set_language(lang);
        }
    }

    // Industrial Hardening: Manual emit after memory cache is settled to prevent race conditions
    let _ = app.emit("config-updated", ());

    logger::success_key(Some(&app), "logs.config.sync_success", None);
    Ok(())
}

#[tauri::command]
pub async fn run_migration(
    app: tauri::AppHandle,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<(), String> {
    use crate::modules::logger;
    logger::info_key(Some(&app), "logs.config.migration_start", None);

    // 1. Force load the RAW config without skipping serialize (to catch old passwords)
    let path = app.path().app_data_dir().map_err(|e: tauri::Error| e.to_string())?.join("config.json");
    if !path.exists() { return Ok(()); }

    let content = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    
    // We use a temporary untyped JSON to catch the passwords before they are skipped by types.rs
    let mut root: serde_json::Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    if let Some(accounts) = root.get_mut("accounts").and_then(|a| a.as_array_mut()) {
        let total = accounts.len();
        for (idx, account_val) in accounts.iter_mut().enumerate() {
            let id = account_val.get("id").and_then(|v| v.as_str()).unwrap_or_default();
            let win_pass = account_val.get("win_pass").and_then(|v| v.as_str());
            
            if let Some(pass) = win_pass {
                if pass != "********" {
                    let _ = app.emit("migration-progress", format!("logs.config.migration_encrypting|{{\"idx\":{},\"total\":{},\"id\":\"{}\"}}", idx + 1, total, id));
                    if let Err(e) = Vault::save_password(&app, id, pass) {
                        logger::error_key(Some(&app), "logs.config.vault_sync_failed", Some(serde_json::json!({ "id": id, "error": e.to_string() })));
                        // Skip deletion if encryption failed, so it can be retried next time
                        continue;
                    }
                }
            }
            
            // Physical deletion of password field ONLY IF MIGRATED (or field is empty)
            if let Some(obj) = account_val.as_object_mut() {
                obj.remove("win_pass");
            }
        }
    }

    // 2. Write back sanitized config.json
    let cleaned_content = serde_json::to_string_pretty(&root).map_err(|e| e.to_string())?;
    std::fs::write(app.path().app_data_dir().map_err(|e: tauri::Error| e.to_string())?.join("config.json"), cleaned_content).map_err(|e| e.to_string())?;

    // 3. Refresh memory cache
    let new_config = modules::config::AppConfig::load(&app).map_err(|e| e.to_string())?;
    {
        let mut cached = state.config_lock();
        *cached = new_config;
    }

    // Manual emit after memory cache is settled
    let _ = app.emit("config-updated", ());

    logger::success_key(Some(&app), "logs.config.migration_completed", None);
    Ok(())
}

#[tauri::command]
pub fn update_tray_language(app: tauri::AppHandle, _lang: String) -> Result<(), String> {
    crate::tray::update_tray_lang(&app).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn check_vault_integrity(
    app: tauri::AppHandle,
    state: tauri::State<'_, crate::state::AppState>,
) -> Vec<String> {
    let config = state.config_lock();
    let mut missing = Vec::new();

    for account in &config.accounts {
        let exists = Vault::exists(&app, &account.id);
        tracing::debug!("Vulnerability Probe: Account {} (win: {}) existence: {}", account.id, account.win_user, exists);
        if !exists {
            missing.push(account.id.clone());
        }
    }

    missing
}
