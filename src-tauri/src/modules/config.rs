use crate::modules::account::Account;
use std::fs::{self, File};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter};
use fd_lock::RwLock;

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone, Default)]
pub struct SequencePreset {
    pub name: String,
    pub accounts: Vec<String>, // Account IDs
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone, Default)]
pub struct ActiveSequenceState {
    pub preset_index: usize,
    pub preset_name: String,
    pub current_index: usize,
    pub queue: Vec<String>, // Account IDs
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone, Default)]
pub struct AppConfig {
    pub accounts: Vec<Account>,
    pub game_path: String,
    pub last_active_account: Option<String>,
    pub theme_color: Option<String>,
    pub close_to_tray: Option<bool>,
    pub language: Option<String>,
    pub enable_logging: Option<bool>,
    pub has_shown_guide: Option<bool>,
    pub dashboard_view_mode: Option<String>,
    pub advanced_launch_mode: Option<bool>,
    pub last_notified_version: Option<String>,
    pub enable_window_rename: Option<bool>,
    pub window_rename_format: Option<String>,
    #[serde(default)]
    pub sequence_presets: [Option<SequencePreset>; 3],
    #[serde(default)]
    pub active_sequence: Option<ActiveSequenceState>,
    #[serde(default)]
    pub snapshot_migration_v060: Option<bool>,
    /// Whether the user has dismissed the "remember to save the last account's
    /// snapshot manually" reminder banner (acknowledged by typing "yes").
    #[serde(default)]
    pub snapshot_reminder_dismissed: Option<bool>,
}

#[derive(thiserror::Error, Debug)]
pub enum ConfigError {
    #[error("IO Error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Serialization Error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Path Error")]
    Path,
}

impl AppConfig {
    /// Returns a redacted version of the config for safe passing to frontend or logs
    pub fn redacted(&self) -> Self {
        let mut redacted = self.clone();
        for account in &mut redacted.accounts {
            // Memory is already zero-trust (None), but we can add a visual hint for the UI
            // if we know a password exists in the Vault physically.
            account.win_pass = Some("********".to_string());
        }
        redacted
    }

    fn get_config_path(app: &AppHandle) -> Option<PathBuf> {
        Some(crate::modules::data_root::get_data_root(app).join("config.json"))
    }

    pub fn load(app: &AppHandle) -> Result<Self, ConfigError> {
        let path = Self::get_config_path(app).ok_or(ConfigError::Path)?;

        if !path.exists() {
            // Create default config if not exists
            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent).map_err(ConfigError::Io)?;
            }
            let default_config = AppConfig::default();
            default_config.save(app)?;
            return Ok(default_config);
        }

        let content = fs::read_to_string(path).map_err(ConfigError::Io)?;
        let config: AppConfig = serde_json::from_str(&content).map_err(ConfigError::Json)?;

        // INDUSTRIAL UPGRADE: Zero-Trust Memory
        // We no longer load passwords into AppState permanently.
        
        // Snapshot migration rescue (v0.6.0): Logic patch for "First update" users
        if config.snapshot_migration_v060.unwrap_or(false) == false {
            let mut updated_config = config.clone();
            if let Ok(count) = Self::run_snapshot_migration(app, &updated_config) {
                if count > 0 {
                    crate::modules::logger::info_key(None, "logs.config.migration_success", Some(serde_json::json!({ "count": count })));
                }
            }
            updated_config.snapshot_migration_v060 = Some(true);
            let _ = updated_config.save(app);
            return Ok(updated_config);
        }

        Ok(config)
    }

    /// Check if encryption migration from AppConfig to Vault is needed
    pub fn is_migration_needed(app: &AppHandle) -> bool {
        let path = match Self::get_config_path(app) {
            Some(p) => p,
            None => return false,
        };

        if !path.exists() { return false; }

        let content = match fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => return false,
        };

        content.contains("\"win_pass\":") && !content.contains("\"win_pass\":null")
    }

    pub fn save(&self, app: &AppHandle) -> Result<(), ConfigError> {
        let path = Self::get_config_path(app).ok_or(ConfigError::Path)?;
        let tmp_path = path.with_extension("json.tmp");
        let bak_path = path.with_extension("json.bak");

        let content = serde_json::to_string_pretty(self).map_err(ConfigError::Json)?;

        let mut attempts = 0;
        let max_attempts = 5;

        while attempts < max_attempts {
            // Industrial Hardening: Advisory File Locking (Cross-Process Safety)
            let lock_file_path = path.with_extension("lock");
            let lock_file = match File::create(&lock_file_path) {
                Ok(f) => f,
                Err(e) => return Err(ConfigError::Io(e)),
            };
            let mut lock = RwLock::new(lock_file);
            
            // Try to acquire exclusive lock
            let _lock_guard = match lock.try_write() {
                Ok(guard) => guard,
                Err(_) => {
                    // Lock held by another process/thread
                    attempts += 1;
                    std::thread::sleep(std::time::Duration::from_millis(100));
                    continue;
                }
            };

            match fs::write(&tmp_path, &content) {
                Ok(_) => {
                    if path.exists() {
                        let _ = fs::copy(&path, &bak_path);
                    }

                    match fs::rename(&tmp_path, &path) {
                        Ok(_) => {
                            let _ = Self::generate_mapping_readme(app, self);
                            let _ = app.emit("config-updated", ());
                            return Ok(());
                        },
                        Err(e) if attempts < max_attempts - 1 => {
                            use crate::modules::logger;
                            logger::warn_key(None, "logs.config.save_retry", Some(serde_json::json!({ "attempt": attempts + 1, "error": e.to_string() })));
                            std::thread::sleep(std::time::Duration::from_millis(100 * 2u64.pow(attempts)));
                        }
                        Err(e) => return Err(ConfigError::Io(e)),
                    }
                }
                Err(e) if attempts < max_attempts - 1 => {
                    use crate::modules::logger;
                    logger::warn_key(None, "logs.config.temp_write_retry", Some(serde_json::json!({ "attempt": attempts + 1, "error": e.to_string() })));
                    std::thread::sleep(std::time::Duration::from_millis(100 * 2u64.pow(attempts)));
                }
                Err(e) => return Err(ConfigError::Io(e)),
            }
            attempts += 1;
        }

        Err(ConfigError::Io(std::io::Error::new(
            std::io::ErrorKind::Other,
            "error.config.save_failed",
        )))
    }

    pub fn generate_mapping_readme(app: &AppHandle, config: &AppConfig) -> Result<(), ConfigError> {
        let snapshot_dir = crate::modules::data_root::get_data_root(app).join("snapshots");
        if !snapshot_dir.exists() {
            let _ = fs::create_dir_all(&snapshot_dir);
        }

        let lang = config.language.as_deref().unwrap_or("zh");
        use crate::modules::i18n;

        let readme_path = snapshot_dir.join("README_SNAPSHOTS.md");

        let mut content = format!("{}\n\n", i18n::translate("logs.config.readme_snapshot_title", lang, &None));
        content.push_str(&format!("{}\n\n", i18n::translate("logs.config.readme_snapshot_desc", lang, &None)));
        
        let h_user = i18n::translate("logs.config.readme_snapshot_header_user", lang, &None);
        let h_remark = i18n::translate("logs.config.readme_snapshot_header_remark", lang, &None);
        let h_file = i18n::translate("logs.config.readme_snapshot_header_file", lang, &None);

        content.push_str(&format!("| {} | {} | {} |\n", h_user, h_remark, h_file));
        content.push_str("| :--- | :--- | :--- |\n");

        for acc in &config.accounts {
            let note = acc.note.as_deref().unwrap_or("-");
            content.push_str(&format!("| {} | {} | product_{}.db |\n", acc.win_user, note, acc.id));
        }

        content.push_str("\n\n> [!NOTE]\n");
        content.push_str(&format!("> {}\n", i18n::translate("logs.config.readme_snapshot_footer", lang, &None)));

        fs::write(readme_path, content).map_err(ConfigError::Io)?;
        Ok(())
    }

    /// Automated Snapshot Rescue Engine: Uses .bak files to recover snapshots lost due to ID changes
    pub fn run_snapshot_migration(app: &AppHandle, config: &AppConfig) -> Result<usize, String> {
        let app_data = crate::modules::data_root::get_data_root(app);
        let bak_path = app_data.join("config.json.bak");
        
        if !bak_path.exists() {
            return Ok(0);
        }

        // 1. Parse backup file to map Old ID -> Username
        let bak_content = fs::read_to_string(&bak_path).map_err(|e| e.to_string())?;
        let bak_json: serde_json::Value = serde_json::from_str(&bak_content).map_err(|e| e.to_string())?;
        
        let mut old_id_to_user = std::collections::HashMap::new();
        if let Some(accounts) = bak_json.get("accounts").and_then(|a| a.as_array()) {
            for acc in accounts {
                if let (Some(id), Some(user)) = (acc.get("id").and_then(|v| v.as_str()), acc.get("win_user").and_then(|v| v.as_str())) {
                    old_id_to_user.insert(id.to_string(), user.to_lowercase());
                }
            }
        }

        if old_id_to_user.is_empty() {
            return Ok(0);
        }

        // 2. Map Username -> Current ID in new configuration
        let mut user_to_new_id = std::collections::HashMap::new();
        for acc in &config.accounts {
            user_to_new_id.insert(acc.win_user.to_lowercase(), acc.id.clone());
        }

        // 3. Scan snapshot directory for recovery
        let snapshot_dir = app_data.join("snapshots");
        
        // Industrial Rescue: Also scan legacy AppData paths (e.g. users upgrading from v0.3.x)
        let mut potential_dirs = vec![snapshot_dir.clone()];
        if let Some(roaming) = app_data.parent() {
            let old_dir = roaming.join("d2r-rust").join("snapshots");
            if old_dir.exists() && old_dir != snapshot_dir {
                potential_dirs.push(old_dir);
            }
        }

        let mut migrated_count = 0;
        
        for dir in potential_dirs {
            if !dir.exists() { continue; }
            let entries = match fs::read_dir(&dir) {
                Ok(e) => e,
                Err(_) => continue,
            };

            for entry in entries {
                let entry = match entry { Ok(e) => e, Err(_) => continue };
                let path = entry.path();
                let filename = path.file_name().and_then(|n| n.to_str()).unwrap_or("");

                // Identify format: product_{UUID}.db
                if filename.starts_with("product_") && filename.ends_with(".db") {
                    let uuid = &filename["product_".len()..filename.len() - ".db".len()];
                    
                    // A: Attempt to match with loaded config
                    if let Some(user) = old_id_to_user.get(uuid) {
                        if let Some(current_id) = user_to_new_id.get(user) {
                            let target_path = snapshot_dir.join(format!("product_{}.db", current_id));
                            if !target_path.exists() {
                                if fs::copy(&path, &target_path).is_ok() {
                                    migrated_count += 1;
                                    crate::modules::logger::info_key(None, "logs.config.rescue_success", Some(serde_json::json!({ "user": user, "id": current_id })));
                                }
                            }
                        }
                    }
                }
            }
        }

        // 4. Generate latest mapping README
        let _ = Self::generate_mapping_readme(app, config);

        Ok(migrated_count)
    }
}
