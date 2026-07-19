use crate::modules;
use crate::modules::vault::Vault;
use tauri::Emitter;

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

    // 3. Backend-authoritative fields: the frontend never edits these, so its
    // copy may be stale (fetched before a launch updated them). Merging from
    // the current cache prevents a full-config save from silently reverting
    // the live-db ownership ledger and reopening the path-contamination hole.
    // (active_sequence / auto-learned game_path share this clobber pattern but
    // predate the ledger; left as-is for now.)
    {
        let cached = state.config_lock();
        updated_config.live_db_owner = cached.live_db_owner.clone();
        updated_config.baseline_seed_report = cached.baseline_seed_report.clone();
        updated_config.baseline_seed_done = cached.baseline_seed_done;
    }

    // 4. Persist non-sensitive JSON state
    updated_config.save(&app).map_err(|e| e.to_string())?;

    // 5. Update memory cache (AppState also stays zero-trust)
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
    let path = crate::modules::data_root::get_data_root(&app).join("config.json");
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
    std::fs::write(crate::modules::data_root::get_data_root(&app).join("config.json"), cleaned_content).map_err(|e| e.to_string())?;

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

#[tauri::command]
pub fn get_data_location_info(
    app: tauri::AppHandle,
) -> crate::modules::data_root::DataLocationInfo {
    crate::modules::data_root::get_location_info(&app)
}

#[tauri::command]
pub async fn relocate_data(
    app: tauri::AppHandle,
    state: tauri::State<'_, crate::state::AppState>,
    new_path: String,
) -> Result<String, String> {
    use crate::modules::{data_root, vault::Vault, logger};

    // 1. Validate
    data_root::validate_target_path(&new_path)?;

    let old_root = data_root::get_data_root(&app);
    let new_root = std::path::PathBuf::from(&new_path);

    if old_root == new_root {
        return Err("Target path is same as current".to_string());
    }

    let _ = std::fs::create_dir_all(&new_root);

    // 2. Copy config.json
    let old_config = old_root.join("config.json");
    if old_config.exists() {
        std::fs::copy(&old_config, new_root.join("config.json")).map_err(|e| e.to_string())?;
    }
    let old_bak = old_root.join("config.json.bak");
    if old_bak.exists() {
        let _ = std::fs::copy(&old_bak, new_root.join("config.json.bak"));
    }

    // 3. Copy snapshots
    let old_snapshots = old_root.join("snapshots");
    if old_snapshots.exists() {
        let new_snapshots = new_root.join("snapshots");
        let _ = std::fs::create_dir_all(&new_snapshots);
        if let Ok(entries) = std::fs::read_dir(&old_snapshots) {
            for entry in entries.flatten() {
                let dest = new_snapshots.join(entry.file_name());
                let _ = std::fs::copy(entry.path(), dest);
            }
        }
    }

    // 4. Re-encrypt vault data (DPAPI decrypt → re-encrypt at new location)
    let config = state.config_lock().clone();
    let mut migrated = 0u32;
    let mut failed = 0u32;
    let new_accounts = new_root.join("accounts");
    let _ = std::fs::create_dir_all(&new_accounts);

    for account in &config.accounts {
        match Vault::load_password(&app, &account.id) {
            Ok(password) => {
                // Re-encrypt at new location
                let acct_dir = new_accounts.join(&account.id);
                let _ = std::fs::create_dir_all(&acct_dir);
                let encrypted = Vault::encrypt_dpapi_public(password.as_bytes());
                match encrypted {
                    Ok(data) => {
                        if std::fs::write(acct_dir.join("secret.bin"), data).is_ok() {
                            migrated += 1;
                        } else { failed += 1; }
                    }
                    Err(_) => { failed += 1; }
                }
            }
            Err(_) => { failed += 1; }
        }
    }

    // 5. Write data_path.txt
    data_root::set_data_path(&new_path)?;

    // Industrial Hardening: Reload config immediately into memory state
    let config = crate::modules::config::AppConfig::load(&app).map_err(|e| e.to_string())?;
    let mut cached = state.config_lock();
    *cached = config;

    logger::info_key(Some(&app), "logs.config.relocate_success", Some(serde_json::json!({
        "path": new_path, "migrated": migrated, "failed": failed
    })));

    Ok(format!("Migrated: {}, Failed: {}", migrated, failed))
}

#[tauri::command]
pub fn validate_all_vault_entries(
    app: tauri::AppHandle,
    state: tauri::State<'_, crate::state::AppState>,
) -> Vec<serde_json::Value> {
    let config = state.config_lock().clone();
    let mut issues = Vec::new();

    for account in &config.accounts {
        match crate::modules::vault::Vault::load_password(&app, &account.id) {
            Ok(_) => {} // Decrypt succeeded
            Err(e) => {
                issues.push(serde_json::json!({
                    "id": account.id,
                    "win_user": account.win_user,
                    "reason": format!("{}", e)
                }));
            }
        }
    }
    issues
}

#[tauri::command]
pub fn check_config_exists(app: tauri::AppHandle) -> bool {
    let path = crate::modules::data_root::get_data_root(&app).join("config.json");
    path.exists()
}

#[tauri::command]
pub fn set_data_root(
    app: tauri::AppHandle,
    state: tauri::State<'_, crate::state::AppState>,
    new_path: String
) -> Result<(), String> {
    crate::modules::data_root::set_data_path(&new_path)?;
    // Industrial Hardening: Reload config immediately into memory state
    let config = crate::modules::config::AppConfig::load(&app).map_err(|e| e.to_string())?;
    let mut cached = state.config_lock();
    *cached = config;
    Ok(())
}
